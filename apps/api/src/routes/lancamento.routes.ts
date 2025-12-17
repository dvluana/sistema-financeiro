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
} from '../schemas/lancamento.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export async function lancamentoRoutes(app: FastifyInstance) {
  // Aplica autenticação em todas as rotas
  app.addHook('preHandler', requireAuth)

  /**
   * GET /api/lancamentos?mes=YYYY-MM
   * Lista lançamentos do mês com totalizadores
   */
  app.get('/api/lancamentos', async (request, reply) => {
    try {
      const query = mesQuerySchema.parse(request.query)
      // Usa contexto (perfil) se disponível, senão fallback para userId
      const ctx = request.contexto || request.usuario!.id
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
   */
  app.post('/api/lancamentos', async (request, reply) => {
    try {
      const input = criarLancamentoSchema.parse(request.body)
      const ctx = request.contexto || request.usuario!.id
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
   */
  app.post('/api/lancamentos/batch', async (request, reply) => {
    try {
      const input = criarLancamentosBatchSchema.parse(request.body)
      const ctx = request.contexto || request.usuario!.id
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
      const ctx = request.contexto || request.usuario!.id
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
      const ctx = request.contexto || request.usuario!.id
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
      const ctx = request.contexto || request.usuario!.id
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
   * DELETE /api/lancamentos/:id
   * Remove lançamento
   */
  app.delete<{ Params: { id: string } }>('/api/lancamentos/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const ctx = request.contexto || request.usuario!.id
      const result = await lancamentoService.excluir(id, ctx)
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
      const ctx = request.contexto || request.usuario!.id
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
      const ctx = request.contexto || request.usuario!.id
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
      const ctx = request.contexto || request.usuario!.id
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
}
