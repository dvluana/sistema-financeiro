/**
 * Service de Categorias
 *
 * Lógica de negócio para gerenciamento de categorias.
 */

import { categoriaRepository } from '../repositories/categoria.repository.js'
import type { Categoria, CriarCategoriaInput, AtualizarCategoriaInput, TipoLancamento } from '../schemas/categoria.js'

export const categoriaService = {
  /**
   * Lista todas as categorias disponíveis para o usuário
   */
  async listar(userId: string): Promise<Categoria[]> {
    return categoriaRepository.findAll(userId)
  },

  /**
   * Lista categorias por tipo
   */
  async listarPorTipo(tipo: TipoLancamento, userId: string): Promise<Categoria[]> {
    return categoriaRepository.findByTipo(tipo, userId)
  },

  /**
   * Busca categoria por ID
   */
  async buscarPorId(id: string, userId: string): Promise<Categoria | null> {
    return categoriaRepository.findById(id, userId)
  },

  /**
   * Cria nova categoria
   */
  async criar(input: CriarCategoriaInput, userId: string): Promise<Categoria> {
    return categoriaRepository.create(input, userId)
  },

  /**
   * Atualiza categoria existente
   */
  async atualizar(id: string, input: AtualizarCategoriaInput, userId: string): Promise<Categoria> {
    return categoriaRepository.update(id, input, userId)
  },

  /**
   * Remove categoria
   */
  async excluir(id: string, userId: string): Promise<void> {
    return categoriaRepository.delete(id, userId)
  },
}
