/**
 * Repository de Lançamentos
 *
 * Acesso a dados de lançamentos financeiros.
 * Todas as queries são filtradas por user_id para isolamento de dados.
 */

import { supabase } from '../lib/supabase.js'
import type { Lancamento, CriarLancamentoInput, AtualizarLancamentoInput } from '../schemas/lancamento.js'

export const lancamentoRepository = {
  /**
   * Lista lançamentos de um mês para um usuário
   * Inclui dados da categoria relacionada
   */
  async findByMes(mes: string, userId: string): Promise<Lancamento[]> {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('mes', mes)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Cria novo lançamento para um usuário
   */
  async create(input: CriarLancamentoInput, userId: string): Promise<Lancamento> {
    const { data, error } = await supabase
      .from('lancamentos')
      .insert({ ...input, user_id: userId })
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Atualiza lançamento (verifica se pertence ao usuário)
   */
  async update(id: string, input: AtualizarLancamentoInput, userId: string): Promise<Lancamento> {
    const { data, error } = await supabase
      .from('lancamentos')
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Alterna status de conclusão (verifica se pertence ao usuário)
   */
  async toggleConcluido(id: string, userId: string): Promise<Lancamento> {
    // Busca estado atual
    const { data: current, error: fetchError } = await supabase
      .from('lancamentos')
      .select('concluido')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError

    // Alterna o valor
    const { data, error } = await supabase
      .from('lancamentos')
      .update({ concluido: !current.concluido })
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Remove lançamento (verifica se pertence ao usuário)
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lancamentos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },

  /**
   * Busca lançamento por ID (verifica se pertence ao usuário)
   */
  async findById(id: string, userId: string): Promise<Lancamento | null> {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },
}
