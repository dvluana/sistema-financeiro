/**
 * Rotas de Categorias
 *
 * Endpoints para gerenciamento de categorias de lançamentos.
 */

import { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { categoriaService } from '../services/categoria.service.js'
import { criarCategoriaSchema, atualizarCategoriaSchema, tipoLancamento } from '../schemas/categoria.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export async function categoriaRoutes(app: FastifyInstance) {
  // Aplicar autenticação em todas as rotas
  app.addHook('preHandler', requireAuth)

  /**
   * GET /api/categorias
   * Lista todas as categorias do usuário
   */
  app.get('/', async (request, reply) => {
    try {
      const userId = request.usuario!.id
      const categorias = await categoriaService.listar(userId)
      return reply.send(categorias)
    } catch (error) {
      console.error('Erro ao listar categorias:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * GET /api/categorias/tipo/:tipo
   * Lista categorias por tipo (entrada ou saida)
   */
  app.get('/tipo/:tipo', async (request, reply) => {
    try {
      const userId = request.usuario!.id
      const { tipo } = request.params as { tipo: string }

      // Valida o tipo
      const tipoValidado = tipoLancamento.safeParse(tipo)
      if (!tipoValidado.success) {
        return reply.status(400).send({ error: 'Tipo inválido. Use "entrada" ou "saida"' })
      }

      const categorias = await categoriaService.listarPorTipo(tipoValidado.data, userId)
      return reply.send(categorias)
    } catch (error) {
      console.error('Erro ao listar categorias por tipo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * GET /api/categorias/:id
   * Busca categoria por ID
   */
  app.get('/:id', async (request, reply) => {
    try {
      const userId = request.usuario!.id
      const { id } = request.params as { id: string }

      const categoria = await categoriaService.buscarPorId(id, userId)
      if (!categoria) {
        return reply.status(404).send({ error: 'Categoria não encontrada' })
      }

      return reply.send(categoria)
    } catch (error) {
      console.error('Erro ao buscar categoria:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * POST /api/categorias
   * Cria nova categoria
   */
  app.post('/', async (request, reply) => {
    try {
      const userId = request.usuario!.id
      const input = criarCategoriaSchema.parse(request.body)

      const categoria = await categoriaService.criar(input, userId)
      return reply.status(201).send(categoria)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro ao criar categoria:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * PUT /api/categorias/:id
   * Atualiza categoria existente
   */
  app.put('/:id', async (request, reply) => {
    try {
      const userId = request.usuario!.id
      const { id } = request.params as { id: string }
      const input = atualizarCategoriaSchema.parse(request.body)

      const categoria = await categoriaService.atualizar(id, input, userId)
      return reply.send(categoria)
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro ao atualizar categoria:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * DELETE /api/categorias/:id
   * Remove categoria
   */
  app.delete('/:id', async (request, reply) => {
    try {
      const userId = request.usuario!.id
      const { id } = request.params as { id: string }

      await categoriaService.excluir(id, userId)
      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
