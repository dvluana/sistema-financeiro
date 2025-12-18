/**
 * Rotas de Lançamentos
 *
 * Endpoints para CRUD de lançamentos financeiros.
 * Todas as rotas requerem autenticação.
 */

import { FastifyInstance } from 'fastify'
import { lancamentoService } from '../services/lancamento.service.js'
import {
  criarLancamentoSchema,
  atualizarLancamentoSchema,
  criarLancamentoRecorrenteSchema,
  criarLancamentosBatchSchema,
  criarFilhoSchema,
  mesQuerySchema,
  atualizarRecorrenciaSchema,
  excluirRecorrenciaSchema,
} from '../schemas/lancamento.js'
import { requireAuth, getRequiredContext } from '../middleware/auth.middleware.js'

export async function lancamentoRoutes(app: FastifyInstance) {
  // Aplica autenticação em todas as rotas
  app.addHook('preHandler', requireAuth)

  /**
   * GET /api/lancamentos?mes=YYYY-MM
   * Lista lançamentos do mês com totalizadores
   * Rate limit: 100 requisições por minuto
   */
  app.get('/api/lancamentos', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    try {
      const query = mesQuerySchema.parse(request.query)
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.listarPorMes(query.mes, ctx)
      return result
    } catch (error) {
      if (error instanceof Error && error.message.includes('inválido')) {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * POST /api/lancamentos
   * Cria novo lançamento
   * Rate limit: 60 requisições por minuto
   */
  app.post('/api/lancamentos', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    try {
      const input = criarLancamentoSchema.parse(request.body)
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.criar(input, ctx)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * POST /api/lancamentos/batch
   * Cria múltiplos lançamentos em uma única requisição
   * Rate limit: 30 requisições por minuto
   */
  app.post('/api/lancamentos/batch', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    try {
      const input = criarLancamentosBatchSchema.parse(request.body)
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.criarLote(input.lancamentos, ctx)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * POST /api/lancamentos/recorrente
   * Cria lançamentos recorrentes (mensal ou parcelas)
   */
  app.post('/api/lancamentos/recorrente', async (request, reply) => {
    try {
      const input = criarLancamentoRecorrenteSchema.parse(request.body)
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.criarRecorrente(input, ctx)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * PUT /api/lancamentos/:id
   * Atualiza lançamento existente
   */
  app.put<{ Params: { id: string } }>('/api/lancamentos/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const input = atualizarLancamentoSchema.parse(request.body)
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.atualizar(id, input, ctx)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Lançamento não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * PATCH /api/lancamentos/:id/concluido
   * Alterna status de conclusão
   */
  app.patch<{ Params: { id: string } }>('/api/lancamentos/:id/concluido', async (request, reply) => {
    try {
      const { id } = request.params
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.toggleConcluido(id, ctx)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Lançamento não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * DELETE /api/lancamentos/:id?force=true
   * Remove lançamento
   *
   * Query params:
   * - force (boolean, optional): Se true, confirma exclusão de agrupador com filhos
   */
  app.delete<{
    Params: { id: string }
    Querystring: { force?: string }
  }>('/api/lancamentos/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const { force } = request.query
      const ctx = getRequiredContext(request)

      // Converte force string para boolean
      const forceBoolean = force === 'true' || force === '1'

      const result = await lancamentoService.excluir(id, ctx, forceBoolean)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Lançamento não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        // Erro de confirmação de exclusão (agrupador com filhos)
        if (error.message.includes('possui') && error.message.includes('filhos')) {
          return reply.status(409).send({
            error: error.message,
            requiresConfirmation: true
          })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  // ========================================
  // ROTAS DE AGRUPADORES (Filhos)
  // ========================================

  /**
   * GET /api/lancamentos/:id/filhos
   * Lista filhos de um agrupador
   */
  app.get<{ Params: { id: string } }>('/api/lancamentos/:id/filhos', async (request, reply) => {
    try {
      const { id } = request.params
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.listarFilhos(id, ctx)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agrupador não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        if (error.message === 'Lançamento não é um agrupador') {
          return reply.status(400).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * POST /api/lancamentos/:id/filhos
   * Cria filho para um agrupador
   */
  app.post<{ Params: { id: string } }>('/api/lancamentos/:id/filhos', async (request, reply) => {
    try {
      const { id } = request.params
      const input = criarFilhoSchema.parse(request.body)
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.criarFilho(id, input, ctx)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agrupador não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        if (error.message === 'Lançamento não é um agrupador') {
          return reply.status(400).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * GET /api/lancamentos/:id/agrupador
   * Busca agrupador com todos os filhos
   */
  app.get<{ Params: { id: string } }>('/api/lancamentos/:id/agrupador', async (request, reply) => {
    try {
      const { id } = request.params
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.buscarAgrupador(id, ctx)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agrupador não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * PUT /api/lancamentos/:filhoId/mover/:novoParentId
   * Move um filho para outro agrupador
   *
   * Permite reorganizar itens entre cartões/grupos do mesmo mês e tipo.
   * Ex: Mover uma compra do Nubank para o Itaú.
   */
  app.put<{ Params: { filhoId: string; novoParentId: string } }>(
    '/api/lancamentos/:filhoId/mover/:novoParentId',
    async (request, reply) => {
      try {
        const { filhoId, novoParentId } = request.params
        const ctx = getRequiredContext(request)
        const result = await lancamentoService.moverFilho(filhoId, novoParentId, ctx)
        return result
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('não encontrado')) {
            return reply.status(404).send({ error: error.message })
          }
          return reply.status(400).send({ error: error.message })
        }
        throw error
      }
    }
  )

  // ========================================
  // ROTAS DE RECORRÊNCIA (Operações em Lote)
  // ========================================

  /**
   * GET /api/lancamentos/:id/recorrencia
   * Retorna informações sobre a série de recorrência de um lançamento
   * Usado para mostrar preview no dialog de edição/exclusão
   */
  app.get<{ Params: { id: string } }>('/api/lancamentos/:id/recorrencia', async (request, reply) => {
    try {
      const { id } = request.params
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.infoRecorrencia(id, ctx)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Lançamento não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * PUT /api/lancamentos/:id/recorrencia
   * Atualiza lançamentos da recorrência em lote
   *
   * Body: {
   *   escopo: 'apenas_este' | 'este_e_proximos' | 'todos',
   *   dados: { nome?, valor?, categoria_id?, data_prevista?, concluido? },
   *   campos?: ['nome', 'valor', ...] // Opcional: quais campos propagar
   * }
   */
  app.put<{ Params: { id: string } }>('/api/lancamentos/:id/recorrencia', async (request, reply) => {
    try {
      const { id } = request.params
      const input = atualizarRecorrenciaSchema.parse(request.body)
      const ctx = getRequiredContext(request)
      const result = await lancamentoService.atualizarRecorrencia(
        id,
        input.escopo,
        input.dados,
        ctx
      )
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Lançamento não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * DELETE /api/lancamentos/:id/recorrencia?escopo=apenas_este|este_e_proximos|todos
   * Exclui lançamentos da recorrência em lote
   */
  app.delete<{
    Params: { id: string }
    Querystring: { escopo?: string }
  }>('/api/lancamentos/:id/recorrencia', async (request, reply) => {
    try {
      const { id } = request.params
      const { escopo: escopoRaw } = request.query

      // Valida escopo
      const input = excluirRecorrenciaSchema.parse({ escopo: escopoRaw || 'apenas_este' })
      const ctx = getRequiredContext(request)

      const result = await lancamentoService.excluirRecorrencia(
        id,
        input.escopo,
        ctx
      )
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Lançamento não encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })
}
