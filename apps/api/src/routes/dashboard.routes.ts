/**
 * Routes da Dashboard
 *
 * Endpoint GET /api/dashboard para dados consolidados.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { dashboardService } from '../services/dashboard.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export async function dashboardRoutes(app: FastifyInstance) {
  /**
   * GET /api/dashboard
   * Retorna dados consolidados para a dashboard
   * @query mes - Mês no formato YYYY-MM (opcional, default: mês atual)
   */
  app.get(
    '/api/dashboard',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.usuario!.id
        const mes = (request.query as { mes?: string }).mes
        const data = await dashboardService.getDashboard(userId, mes)
        return reply.send(data)
      } catch (error) {
        request.log.error(error, 'Erro ao buscar dashboard')
        return reply.status(500).send({ error: 'Erro ao buscar dados da dashboard' })
      }
    }
  )
}
