/**
 * Repository de Categorias
 *
 * Acesso a dados de categorias de lançamentos.
 * Usuários podem ver categorias padrão e suas próprias.
 */

import { supabase } from '../lib/supabase.js'
import type { Categoria, CriarCategoriaInput, AtualizarCategoriaInput, TipoLancamento } from '../schemas/categoria.js'

export const categoriaRepository = {
  /**
   * Lista todas as categorias disponíveis para um usuário
   * Inclui categorias padrão (is_default = true) e do próprio usuário
   */
  async findAll(userId: string): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .order('ordem', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Lista categorias por tipo (entrada ou saida)
   */
  async findByTipo(tipo: TipoLancamento, userId: string): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('tipo', tipo)
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .order('ordem', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Busca categoria por ID
   */
  async findById(id: string, userId: string): Promise<Categoria | null> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Cria nova categoria para um usuário
   */
  async create(input: CriarCategoriaInput, userId: string): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        ...input,
        user_id: userId,
        is_default: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Atualiza categoria (apenas do próprio usuário, não as padrão)
   */
  async update(id: string, input: AtualizarCategoriaInput, userId: string): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_default', false)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Remove categoria (apenas do próprio usuário, não as padrão)
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_default', false)

    if (error) throw error
  },
}
