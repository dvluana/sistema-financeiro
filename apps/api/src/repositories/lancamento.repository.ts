/**
 * Repository de Lançamentos
 *
 * Acesso a dados de lançamentos financeiros.
 * Todas as queries são filtradas por user_id para isolamento de dados.
 */

import { supabase } from '../lib/supabase.js'
import type { Lancamento, CriarLancamentoInput, AtualizarLancamentoInput, CriarFilhoInput } from '../schemas/lancamento.js'

export const lancamentoRepository = {
  /**
   * Lista lançamentos de um mês para um usuário
   * Inclui dados da categoria relacionada
   * Retorna apenas lançamentos raiz (parent_id IS NULL)
   * Para agrupadores, inclui os filhos aninhados
   */
  async findByMes(mes: string, userId: string): Promise<Lancamento[]> {
    // Busca lançamentos raiz (sem parent_id)
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('mes', mes)
      .eq('user_id', userId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!data) return []

    // Busca filhos dos agrupadores
    const agrupadores = data.filter(l => l.tipo === 'agrupador')
    if (agrupadores.length > 0) {
      const agrupadorIds = agrupadores.map(a => a.id)
      const { data: filhos, error: filhosError } = await supabase
        .from('lancamentos')
        .select(`
          *,
          categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
        `)
        .in('parent_id', agrupadorIds)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (filhosError) throw filhosError

      // Agrupa filhos por parent_id
      const filhosPorPai = (filhos || []).reduce((acc, filho) => {
        if (!acc[filho.parent_id]) acc[filho.parent_id] = []
        acc[filho.parent_id].push(filho)
        return acc
      }, {} as Record<string, Lancamento[]>)

      // Anexa filhos aos agrupadores
      data.forEach(l => {
        if (l.tipo === 'agrupador') {
          l.filhos = filhosPorPai[l.id] || []
        }
      })
    }

    return data
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

  /**
   * Cria múltiplos lançamentos de uma vez (batch insert)
   */
  async createMany(inputs: CriarLancamentoInput[], userId: string): Promise<{ criados: number }> {
    const records = inputs.map(input => ({
      ...input,
      user_id: userId,
    }))

    const { error } = await supabase
      .from('lancamentos')
      .insert(records)

    if (error) throw error
    return { criados: records.length }
  },

  /**
   * Busca filhos de um agrupador
   */
  async findFilhos(parentId: string, userId: string): Promise<Lancamento[]> {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('parent_id', parentId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Cria um filho para um agrupador
   */
  async createFilho(parentId: string, input: CriarFilhoInput, mes: string, userId: string): Promise<Lancamento> {
    const { data, error } = await supabase
      .from('lancamentos')
      .insert({
        ...input,
        mes,
        parent_id: parentId,
        user_id: userId,
      })
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Busca agrupador por ID com seus filhos
   */
  async findAgrupadorComFilhos(id: string, userId: string): Promise<Lancamento | null> {
    const agrupador = await this.findById(id, userId)
    if (!agrupador || agrupador.tipo !== 'agrupador') return null

    const filhos = await this.findFilhos(id, userId)
    agrupador.filhos = filhos

    return agrupador
  },
}
