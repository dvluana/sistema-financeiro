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
   * Busca totais agregados por mês usando função SQL otimizada
   */
  async getTotaisPorMes(meses: string[], ctx: ContextoUsuario | string): Promise<Array<{
    mes: string
    tipo: 'entrada' | 'saida'
    total: number
  }>> {
    // Apenas suporta contexto com perfilId (não mais fallback para userId)
    if (typeof ctx === 'string') {
      throw new Error('getTotaisPorMes requer ContextoUsuario com perfilId')
    }

    const { data, error } = await supabase
      .rpc('get_totais_por_mes', {
        p_perfil_id: ctx.perfilId,
        p_meses: meses,
      })

    if (error) throw error

    return (data || []).map((row: { mes: string; tipo: string; total: number }) => ({
      mes: row.mes,
      tipo: row.tipo as 'entrada' | 'saida',
      total: Number(row.total),
    }))
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
   * Busca gastos agrupados por categoria usando função SQL otimizada
   */
  async getGastosPorCategoria(meses: string[], ctx: ContextoUsuario | string): Promise<Array<{
    categoria_id: string | null
    categoria_nome: string
    categoria_icone: string | null
    categoria_cor: string | null
    total: number
  }>> {
    // Apenas suporta contexto com perfilId
    if (typeof ctx === 'string') {
      throw new Error('getGastosPorCategoria requer ContextoUsuario com perfilId')
    }

    const { data, error } = await supabase
      .rpc('get_gastos_por_categoria', {
        p_perfil_id: ctx.perfilId,
        p_meses: meses,
      })

    if (error) throw error

    // Processa resultado, verificando categorias padrão que podem não estar no banco
    return (data || []).map((row: {
      categoria_id: string | null
      categoria_nome: string
      categoria_icone: string | null
      categoria_cor: string | null
      total: number
    }) => {
      // Se tem categoria_id mas nome está vazio, pode ser categoria padrão
      if (row.categoria_id && isCategoriaPadrao(row.categoria_id)) {
        const catPadrao = getCategoriaPadraoById(row.categoria_id)
        if (catPadrao) {
          return {
            categoria_id: row.categoria_id,
            categoria_nome: catPadrao.nome,
            categoria_icone: catPadrao.icone,
            categoria_cor: catPadrao.cor,
            total: Number(row.total),
          }
        }
      }

      return {
        categoria_id: row.categoria_id,
        categoria_nome: row.categoria_nome,
        categoria_icone: row.categoria_icone,
        categoria_cor: row.categoria_cor,
        total: Number(row.total),
      }
    })
  },
}
