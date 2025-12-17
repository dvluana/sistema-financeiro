/**
 * Repository da Dashboard
 *
 * Acesso a dados para a dashboard.
 * Busca dados consolidados para múltiplos meses.
 * Todas as queries são filtradas por perfil_id para isolamento de dados.
 */

import { supabase } from '../lib/supabase.js'
import type { Lancamento } from '../schemas/lancamento.js'
import { getCategoriaPadraoById, isCategoriaPadrao } from '../constants/categorias-padrao.js'
import type { ContextoUsuario } from './lancamento.repository.js'

export const dashboardRepository = {
  /**
   * Lista lançamentos de múltiplos meses para um usuário/perfil
   */
  async findByMeses(meses: string[], ctx: ContextoUsuario | string): Promise<Lancamento[]> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .in('mes', meses)
      .eq(filterColumn, filterValue)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Lista os últimos N lançamentos de um mês específico
   */
  async findRecentByMes(ctx: ContextoUsuario | string, mes: string, limit: number = 5): Promise<Lancamento[]> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq(filterColumn, filterValue)
      .eq('mes', mes)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  /**
   * Busca totais agregados por mês
   */
  async getTotaisPorMes(meses: string[], ctx: ContextoUsuario | string): Promise<Array<{
    mes: string
    tipo: 'entrada' | 'saida'
    total: number
  }>> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .select('mes, tipo, valor')
      .in('mes', meses)
      .eq(filterColumn, filterValue)

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
  async findProximosVencimentos(ctx: ContextoUsuario | string, limit: number = 5): Promise<Array<{
    id: string
    nome: string
    valor: number
    data_prevista: string
  }>> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const hoje = new Date()
    const seteDias = new Date()
    seteDias.setDate(hoje.getDate() + 7)

    const hojeStr = hoje.toISOString().split('T')[0]
    const seteDiasStr = seteDias.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('lancamentos')
      .select('id, nome, valor, data_prevista')
      .eq(filterColumn, filterValue)
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

  /**
   * Busca vencimentos pendentes de um mês específico (saídas não concluídas)
   */
  async findVencimentosByMes(ctx: ContextoUsuario | string, mes: string, limit: number = 5): Promise<Array<{
    id: string
    nome: string
    valor: number
    data_prevista: string
  }>> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .select('id, nome, valor, data_prevista')
      .eq(filterColumn, filterValue)
      .eq('mes', mes)
      .eq('tipo', 'saida')
      .eq('concluido', false)
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

  /**
   * Busca gastos agrupados por categoria nos últimos N meses
   */
  async getGastosPorCategoria(meses: string[], ctx: ContextoUsuario | string): Promise<Array<{
    categoria_id: string | null
    categoria_nome: string
    categoria_icone: string | null
    categoria_cor: string | null
    total: number
  }>> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        valor,
        categoria_id,
        categoria:categorias(id, nome, icone, cor)
      `)
      .in('mes', meses)
      .eq(filterColumn, filterValue)
      .eq('tipo', 'saida')

    if (error) throw error

    // Agrupa por categoria
    const porCategoria: Record<string, {
      categoria_id: string | null
      categoria_nome: string
      categoria_icone: string | null
      categoria_cor: string | null
      total: number
    }> = {}

    for (const item of data || []) {
      const catId = item.categoria_id || 'sem-categoria'

      // Tenta buscar categoria do banco ou das padrão (do código)
      let catNome = 'Sem categoria'
      let catIcone: string | null = null
      let catCor: string | null = '#6B7280'

      if (item.categoria_id) {
        // Verifica se é categoria padrão (do código)
        if (isCategoriaPadrao(item.categoria_id)) {
          const catPadrao = getCategoriaPadraoById(item.categoria_id)
          if (catPadrao) {
            catNome = catPadrao.nome
            catIcone = catPadrao.icone
            catCor = catPadrao.cor
          }
        } else {
          // Categoria do banco (pode vir como array ou objeto dependendo do Supabase)
          const catData = item.categoria
          const cat = Array.isArray(catData) ? catData[0] : catData
          if (cat && typeof cat === 'object' && 'nome' in cat) {
            catNome = cat.nome as string
            catIcone = cat.icone as string | null
            catCor = cat.cor as string | null
          }
        }
      }

      if (!porCategoria[catId]) {
        porCategoria[catId] = {
          categoria_id: item.categoria_id,
          categoria_nome: catNome,
          categoria_icone: catIcone,
          categoria_cor: catCor,
          total: 0,
        }
      }
      porCategoria[catId].total += Number(item.valor)
    }

    // Converte para array e ordena por valor (maior primeiro)
    return Object.values(porCategoria).sort((a, b) => b.total - a.total)
  },
}
