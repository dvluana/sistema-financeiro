/**
 * AI Routes
 *
 * Rotas para integração com IA (Gemini) para parsing de lançamentos.
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.middleware.js'
import { aiService } from '../services/ai.service.js'

// Input validation schema
const parseLancamentosSchema = z.object({
  texto: z
    .string()
    .min(1, 'Texto é obrigatório')
    .max(10000, 'Texto muito longo (máximo 10.000 caracteres)'),
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato YYYY-MM'),
})

type ParseLancamentosBody = z.infer<typeof parseLancamentosSchema>

export async function aiRoutes(app: FastifyInstance) {
  /**
   * POST /api/ai/parse-lancamentos
   *
   * Interpreta texto livre e extrai lançamentos financeiros usando IA.
   * Rate limited to 20 requests per minute per user.
   */
  app.post<{ Body: ParseLancamentosBody }>(
    '/api/ai/parse-lancamentos',
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      // Validate input
      const validation = parseLancamentosSchema.safeParse(request.body)

      if (!validation.success) {
        const errorMessage = validation.error.errors
          .map(e => e.message)
          .join(', ')
        return reply.status(400).send({ error: errorMessage })
      }

      const { texto, mes } = validation.data

      try {
        const result = await aiService.parseLancamentos(texto, mes)
        return reply.send(result)
      } catch (error) {
        request.log.error(error, 'Erro ao processar lançamentos com IA')
        return reply.status(500).send({ error: 'Erro ao processar lançamentos' })
      }
    }
  )
}
