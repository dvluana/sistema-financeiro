/**
 * Repository da Dashboard
 *
 * Acesso a dados para a dashboard.
 * Busca dados consolidados para múltiplos meses.
 */

import { supabase } from '../lib/supabase.js'
import type { Lancamento } from '../schemas/lancamento.js'

export const dashboardRepository = {
  /**
   * Lista lançamentos de múltiplos meses para um usuário
   */
  async findByMeses(meses: string[], userId: string): Promise<Lancamento[]> {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .in('mes', meses)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Lista os últimos N lançamentos de qualquer mês
   */
  async findRecent(userId: string, limit: number = 5): Promise<Lancamento[]> {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  /**
   * Busca totais agregados por mês
   */
  async getTotaisPorMes(meses: string[], userId: string): Promise<Array<{
    mes: string
    tipo: 'entrada' | 'saida'
    total: number
  }>> {
    const { data, error } = await supabase
      .from('lancamentos')
      .select('mes, tipo, valor')
      .in('mes', meses)
      .eq('user_id', userId)

    if (error) throw error

    // Agrupa manualmente (Supabase JS client não suporta GROUP BY direto)
    const totais: Record<string, { entradas: number; saidas: number }> = {}

    for (const item of data || []) {
      if (!totais[item.mes]) {
        totais[item.mes] = { entradas: 0, saidas: 0 }
      }
      if (item.tipo === 'entrada') {
        totais[item.mes].entradas += Number(item.valor)
      } else {
        totais[item.mes].saidas += Number(item.valor)
      }
    }

    const result: Array<{ mes: string; tipo: 'entrada' | 'saida'; total: number }> = []
    for (const [mes, valores] of Object.entries(totais)) {
      result.push({ mes, tipo: 'entrada', total: valores.entradas })
      result.push({ mes, tipo: 'saida', total: valores.saidas })
    }

    return result
  },

  /**
   * Busca próximos vencimentos (saídas pendentes nos próximos 7 dias)
   */
  async findProximosVencimentos(userId: string, limit: number = 5): Promise<Array<{
    id: string
    nome: string
    valor: number
    data_prevista: string
  }>> {
    const hoje = new Date()
    const seteDias = new Date()
    seteDias.setDate(hoje.getDate() + 7)

    const hojeStr = hoje.toISOString().split('T')[0]
    const seteDiasStr = seteDias.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('lancamentos')
      .select('id, nome, valor, data_prevista')
      .eq('user_id', userId)
      .eq('tipo', 'saida')
      .eq('concluido', false)
      .gte('data_prevista', hojeStr)
      .lte('data_prevista', seteDiasStr)
      .order('data_prevista', { ascending: true })
      .limit(limit)

    if (error) throw error
    return (data || []).filter(d => d.data_prevista !== null) as Array<{
      id: string
      nome: string
      valor: number
      data_prevista: string
    }>
  },
}
