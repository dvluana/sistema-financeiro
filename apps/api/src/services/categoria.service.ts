/**
 * Service de Categorias
 *
 * Lógica de negócio para gerenciamento de categorias.
 */

import { categoriaRepository } from '../repositories/categoria.repository.js'
import type { Categoria, CriarCategoriaInput, AtualizarCategoriaInput, TipoLancamento } from '../schemas/categoria.js'
import type { ContextoUsuario } from '../repositories/lancamento.repository.js'

// Tipo para contexto: pode ser string (userId legado) ou ContextoUsuario completo
type Contexto = ContextoUsuario | string

export const categoriaService = {
  /**
   * Lista todas as categorias disponíveis para o usuário/perfil
   */
  async listar(ctx: Contexto): Promise<Categoria[]> {
    return categoriaRepository.findAll(ctx)
  },

  /**
   * Lista categorias por tipo
   */
  async listarPorTipo(tipo: TipoLancamento, ctx: Contexto): Promise<Categoria[]> {
    return categoriaRepository.findByTipo(tipo, ctx)
  },

  /**
   * Busca categoria por ID
   */
  async buscarPorId(id: string, ctx: Contexto): Promise<Categoria | null> {
    return categoriaRepository.findById(id, ctx)
  },

  /**
   * Cria nova categoria
   */
  async criar(input: CriarCategoriaInput, ctx: Contexto): Promise<Categoria> {
    return categoriaRepository.create(input, ctx)
  },

  /**
   * Atualiza categoria existente
   */
  async atualizar(id: string, input: AtualizarCategoriaInput, ctx: Contexto): Promise<Categoria> {
    return categoriaRepository.update(id, input, ctx)
  },

  /**
   * Remove categoria
   */
  async excluir(id: string, ctx: Contexto): Promise<void> {
    return categoriaRepository.delete(id, ctx)
  },
}
