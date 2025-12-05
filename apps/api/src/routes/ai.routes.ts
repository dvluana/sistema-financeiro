/**
 * AI Routes
 *
 * Rotas para integração com IA (Gemini) para parsing de lançamentos.
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.middleware.js'
import { aiService } from '../services/ai.service.js'

interface ParseLancamentosBody {
  texto: string
  mes: string
}

export async function aiRoutes(app: FastifyInstance) {
  /**
   * POST /api/ai/parse-lancamentos
   *
   * Interpreta texto livre e extrai lançamentos financeiros usando IA.
   */
  app.post<{ Body: ParseLancamentosBody }>(
    '/api/ai/parse-lancamentos',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const { texto, mes } = request.body

        if (!texto || typeof texto !== 'string') {
          return reply.status(400).send({ error: 'Texto é obrigatório' })
        }

        if (!mes || typeof mes !== 'string') {
          return reply.status(400).send({ error: 'Mês é obrigatório (formato YYYY-MM)' })
        }

        const result = await aiService.parseLancamentos(texto, mes)

        return reply.send(result)
      } catch (error) {
        console.error('Erro ao processar lançamentos com IA:', error)
        return reply.status(500).send({ error: 'Erro ao processar lançamentos' })
      }
    }
  )
}
