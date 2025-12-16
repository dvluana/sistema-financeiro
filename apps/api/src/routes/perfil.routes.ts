/**
 * Rotas de Perfis
 *
 * Endpoints para gerenciamento de perfis/workspaces.
 * Todas as rotas requerem autenticacao.
 */

import { FastifyInstance } from 'fastify'
import { perfilService } from '../services/perfil.service.js'
import { criarPerfilSchema, atualizarPerfilSchema } from '../schemas/perfil.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export async function perfilRoutes(app: FastifyInstance) {
  // Aplica autenticacao em todas as rotas
  app.addHook('preHandler', requireAuth)

  /**
   * GET /api/perfis
   * Lista todos os perfis ativos do usuario
   */
  app.get('/api/perfis', async (request) => {
    const userId = request.usuario!.id
    const result = await perfilService.listarPerfis(userId)
    return result
  })

  /**
   * GET /api/perfis/todos
   * Lista todos os perfis incluindo arquivados
   */
  app.get('/api/perfis/todos', async (request) => {
    const userId = request.usuario!.id
    const result = await perfilService.listarTodosPerfis(userId)
    return { perfis: result }
  })

  /**
   * GET /api/perfis/padrao
   * Retorna o perfil padrao do usuario
   */
  app.get('/api/perfis/padrao', async (request, reply) => {
    const userId = request.usuario!.id
    const result = await perfilService.buscarPerfilPadrao(userId)

    if (!result) {
      return reply.status(404).send({ error: 'Perfil padrao nao encontrado' })
    }

    return result
  })

  /**
   * GET /api/perfis/:id
   * Busca perfil especifico
   */
  app.get<{ Params: { id: string } }>('/api/perfis/:id', async (request, reply) => {
    const { id } = request.params
    const userId = request.usuario!.id
    const result = await perfilService.buscarPerfil(id, userId)

    if (!result) {
      return reply.status(404).send({ error: 'Perfil nao encontrado' })
    }

    return result
  })

  /**
   * POST /api/perfis
   * Cria novo perfil
   */
  app.post('/api/perfis', async (request, reply) => {
    try {
      const input = criarPerfilSchema.parse(request.body)
      const userId = request.usuario!.id
      const result = await perfilService.criarPerfil(input, userId)
      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * PUT /api/perfis/:id
   * Atualiza perfil existente
   */
  app.put<{ Params: { id: string } }>('/api/perfis/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const input = atualizarPerfilSchema.parse(request.body)
      const userId = request.usuario!.id
      const result = await perfilService.atualizarPerfil(id, input, userId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Perfil nao encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * PATCH /api/perfis/:id/arquivar
   * Arquiva perfil (soft delete)
   */
  app.patch<{ Params: { id: string } }>('/api/perfis/:id/arquivar', async (request, reply) => {
    try {
      const { id } = request.params
      const userId = request.usuario!.id
      const result = await perfilService.arquivarPerfil(id, userId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Perfil nao encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        if (error.message === 'Nao e possivel arquivar o perfil padrao') {
          return reply.status(400).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * PATCH /api/perfis/:id/reativar
   * Reativa perfil arquivado
   */
  app.patch<{ Params: { id: string } }>('/api/perfis/:id/reativar', async (request, reply) => {
    try {
      const { id } = request.params
      const userId = request.usuario!.id
      const result = await perfilService.reativarPerfil(id, userId)
      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Perfil nao encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  /**
   * DELETE /api/perfis/:id
   * Remove perfil permanentemente
   * CUIDADO: Remove todos os dados do perfil!
   */
  app.delete<{ Params: { id: string } }>('/api/perfis/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const userId = request.usuario!.id
      await perfilService.deletarPerfil(id, userId)
      return { success: true, message: 'Perfil removido com sucesso' }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Perfil nao encontrado') {
          return reply.status(404).send({ error: error.message })
        }
        if (error.message === 'Nao e possivel excluir o perfil padrao') {
          return reply.status(400).send({ error: error.message })
        }
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })
}
