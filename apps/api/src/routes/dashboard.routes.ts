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
   */
  app.get(
    '/api/dashboard',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.usuario!.id
        const data = await dashboardService.getDashboard(userId)
        return reply.send(data)
      } catch (error) {
        console.error('Erro ao buscar dashboard:', error)
        return reply.status(500).send({ error: 'Erro ao buscar dados da dashboard' })
      }
    }
  )
}
