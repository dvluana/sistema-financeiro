/**
 * Rotas de Categorias
 *
 * Endpoints para gerenciamento de categorias de lançamentos.
 */

import { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { categoriaService } from '../services/categoria.service.js'
import { criarCategoriaSchema, atualizarCategoriaSchema, tipoLancamento } from '../schemas/categoria.js'
import { requireAuth, getRequiredContext } from '../middleware/auth.middleware.js'

export async function categoriaRoutes(app: FastifyInstance) {
  // Aplicar autenticação em todas as rotas
  app.addHook('preHandler', requireAuth)

  /**
   * GET /api/categorias
   * Lista todas as categorias do usuário/perfil
   */
  app.get('/', async (request, reply) => {
    try {
      const ctx = getRequiredContext(request)
      const categorias = await categoriaService.listar(ctx)
      return reply.send(categorias)
    } catch (error) {
      request.log.error(error, 'Erro ao listar categorias')
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * GET /api/categorias/tipo/:tipo
   * Lista categorias por tipo (entrada ou saida)
   */
  app.get('/tipo/:tipo', async (request, reply) => {
    try {
      const ctx = getRequiredContext(request)
      const { tipo } = request.params as { tipo: string }

      // Valida o tipo
      const tipoValidado = tipoLancamento.safeParse(tipo)
      if (!tipoValidado.success) {
        return reply.status(400).send({ error: 'Tipo inválido. Use "entrada" ou "saida"' })
      }

      const categorias = await categoriaService.listarPorTipo(tipoValidado.data, ctx)
      return reply.send(categorias)
    } catch (error) {
      request.log.error(error, 'Erro ao listar categorias por tipo')
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * GET /api/categorias/:id
   * Busca categoria por ID
   */
  app.get('/:id', async (request, reply) => {
    try {
      const ctx = getRequiredContext(request)
      const { id } = request.params as { id: string }

      const categoria = await categoriaService.buscarPorId(id, ctx)
      if (!categoria) {
        return reply.status(404).send({ error: 'Categoria não encontrada' })
      }

      return reply.send(categoria)
    } catch (error) {
      request.log.error(error, 'Erro ao buscar categoria')
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * POST /api/categorias
   * Cria nova categoria
   */
  app.post('/', async (request, reply) => {
    try {
      const ctx = getRequiredContext(request)
      const input = criarCategoriaSchema.parse(request.body)

      const categoria = await categoriaService.criar(input, ctx)
      return reply.status(201).send(categoria)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      request.log.error(error, 'Erro ao criar categoria')
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * PUT /api/categorias/:id
   * Atualiza categoria existente
   */
  app.put('/:id', async (request, reply) => {
    try {
      const ctx = getRequiredContext(request)
      const { id } = request.params as { id: string }
      const input = atualizarCategoriaSchema.parse(request.body)

      const categoria = await categoriaService.atualizar(id, input, ctx)
      return reply.send(categoria)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      request.log.error(error, 'Erro ao atualizar categoria')
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * DELETE /api/categorias/:id
   * Remove categoria
   */
  app.delete('/:id', async (request, reply) => {
    try {
      const ctx = getRequiredContext(request)
      const { id } = request.params as { id: string }

      await categoriaService.excluir(id, ctx)
      return reply.status(204).send()
    } catch (error) {
      request.log.error(error, 'Erro ao excluir categoria')
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
