/**
 * Repository de Configurações
 *
 * Acesso a dados de configurações do usuário.
 * Todas as queries são filtradas por user_id.
 */

import { supabase } from '../lib/supabase.js'
import type { Configuracao } from '../schemas/configuracao.js'

export const configuracaoRepository = {
  /**
   * Lista todas as configurações de um usuário
   */
  async findAll(userId: string): Promise<Configuracao[]> {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    // Parse JSONB values
    return (data || []).map(config => ({
      ...config,
      valor: typeof config.valor === 'string' ? JSON.parse(config.valor) : config.valor,
    }))
  },

  /**
   * Busca configuração específica de um usuário
   */
  async findByChave(chave: string, userId: string): Promise<Configuracao | null> {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('chave', chave)
      .eq('user_id', userId)
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
   * Atualiza configuração de um usuário
   */
  async update(chave: string, valor: boolean | string | number, userId: string): Promise<Configuracao> {
    const { data, error } = await supabase
      .from('configuracoes')
      .update({ valor: JSON.stringify(valor) })
      .eq('chave', chave)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return {
      ...data,
      valor: typeof data.valor === 'string' ? JSON.parse(data.valor) : data.valor,
    }
  },
}
