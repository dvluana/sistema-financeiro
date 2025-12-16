/**
 * Rotas de Autenticação
 *
 * Endpoints para registro, login e logout de usuários.
 */

import { FastifyInstance } from 'fastify'
import { authService } from '../services/auth.service.js'
import { registrarUsuarioSchema, loginSchema } from '../schemas/auth.js'
import { requireAuth, invalidateTokenCache } from '../middleware/auth.middleware.js'

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/register
   * Registra um novo usuário
   */
  app.post('/api/auth/register', async (request, reply) => {
    try {
      const input = registrarUsuarioSchema.parse(request.body)
      const result = await authService.registrar(input)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Este email já está cadastrado') {
          return reply.status(409).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * POST /api/auth/login
   * Realiza login do usuário
   */
  app.post('/api/auth/login', async (request, reply) => {
    try {
      const input = loginSchema.parse(request.body)
      const result = await authService.login(input)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Email ou senha incorretos') {
          return reply.status(401).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * POST /api/auth/logout
   * Realiza logout (invalida sessão)
   */
  app.post(
    '/api/auth/logout',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const token = request.headers.authorization?.split(' ')[1]
        if (token) {
          // Invalida cache do token antes de logout no banco
          invalidateTokenCache(token)
          await authService.logout(token)
        }
        return { message: 'Logout realizado com sucesso' }
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({ error: error.message })
        }
        throw error
      }
    }
  )

  /**
   * GET /api/auth/me
   * Retorna dados do usuário autenticado
   */
  app.get(
    '/api/auth/me',
    { preHandler: [requireAuth] },
    async (request) => {
      return request.usuario
    }
  )
}
