/**
 * Rotas de Configurações
 *
 * Endpoints para preferências do usuário.
 * Todas as rotas requerem autenticação.
 */

import { FastifyInstance } from 'fastify'
import { configuracaoService } from '../services/configuracao.service.js'
import { atualizarConfiguracaoSchema } from '../schemas/configuracao.js'
import { requireAuth, getRequiredContext } from '../middleware/auth.middleware.js'

export async function configuracaoRoutes(app: FastifyInstance) {
  // Aplica autenticação em todas as rotas
  app.addHook('preHandler', requireAuth)

  /**
   * GET /api/configuracoes
   * Lista configurações do usuário/perfil
   */
  app.get('/api/configuracoes', async (request) => {
    const ctx = getRequiredContext(request)
    return configuracaoService.listar(ctx)
  })

  /**
   * PUT /api/configuracoes/:chave
   * Atualiza uma configuração
   */
  app.put<{ Params: { chave: string } }>('/api/configuracoes/:chave', async (request, reply) => {
    try {
      const { chave } = request.params
      const { valor } = atualizarConfiguracaoSchema.parse(request.body)
      const ctx = getRequiredContext(request)
      const result = await configuracaoService.atualizar(chave, valor, ctx)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Configuração não encontrada') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })
}
