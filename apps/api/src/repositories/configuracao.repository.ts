/**
 * Repository de Configurações
 *
 * Acesso a dados de configurações do usuário/perfil.
 * Todas as queries são filtradas por perfil_id para isolamento de dados.
 */

import { supabase } from '../lib/supabase.js'
import type { Configuracao } from '../schemas/configuracao.js'
import type { ContextoUsuario } from './lancamento.repository.js'

export const configuracaoRepository = {
  /**
   * Lista todas as configurações de um usuário/perfil
   */
  async findAll(ctx: ContextoUsuario | string): Promise<Configuracao[]> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq(filterColumn, filterValue)

    if (error) throw error

    // Parse JSONB values
    return (data || []).map(config => ({
      ...config,
      valor: typeof config.valor === 'string' ? JSON.parse(config.valor) : config.valor,
    }))
  },

  /**
   * Busca configuração específica de um usuário/perfil
   */
  async findByChave(chave: string, ctx: ContextoUsuario | string): Promise<Configuracao | null> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('chave', chave)
      .eq(filterColumn, filterValue)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return {
      ...data,
      valor: typeof data.valor === 'string' ? JSON.parse(data.valor) : data.valor,
    }
  },

  /**
   * Atualiza configuração de um usuário/perfil
   */
  async update(chave: string, valor: boolean | string | number, ctx: ContextoUsuario | string): Promise<Configuracao> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('configuracoes')
      .update({ valor: JSON.stringify(valor) })
      .eq('chave', chave)
      .eq(filterColumn, filterValue)
      .select()
      .single()

    if (error) throw error

    return {
      ...data,
      valor: typeof data.valor === 'string' ? JSON.parse(data.valor) : data.valor,
    }
  },
}
