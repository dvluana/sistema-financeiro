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
      const userId = request.usuario!.id
      const result = await lancamentoService.listarPorMes(query.mes, userId)
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
      const userId = request.usuario!.id
      const result = await lancamentoService.criar(input, userId)
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
      const userId = request.usuario!.id
      const result = await lancamentoService.atualizar(id, input, userId)
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
      const userId = request.usuario!.id
      const result = await lancamentoService.toggleConcluido(id, userId)
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
      const userId = request.usuario!.id
      const result = await lancamentoService.excluir(id, userId)
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
