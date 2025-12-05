/**
 * Repository de Autenticação
 *
 * Acesso a dados de usuários e sessões.
 */

import { supabase } from '../lib/supabase.js'
import type { Usuario, Sessao } from '../schemas/auth.js'
import crypto from 'crypto'

interface UsuarioComSenha extends Usuario {
  senha_hash: string
}

export const authRepository = {
  /**
   * Busca usuário por email
   */
  async findByEmail(email: string): Promise<UsuarioComSenha | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Busca usuário por ID
   */
  async findById(id: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Cria novo usuário
   */
  async createUsuario(
    nome: string,
    email: string,
    senhaHash: string
  ): Promise<Usuario> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        nome,
        email: email.toLowerCase(),
        senha_hash: senhaHash,
      })
      .select('id, nome, email, created_at, updated_at')
      .single()

    if (error) throw error
    return data
  },

  /**
   * Cria configurações padrão para um novo usuário
   */
  async createDefaultConfigs(userId: string): Promise<void> {
    const configs = [
      { user_id: userId, chave: 'entradas_auto_recebido', valor: 'false' },
      { user_id: userId, chave: 'saidas_auto_pago', valor: 'false' },
      { user_id: userId, chave: 'mostrar_concluidos_discretos', valor: 'true' },
    ]

    const { error } = await supabase.from('configuracoes').insert(configs)
    if (error) throw error
  },

  /**
   * Cria sessão para usuário
   */
  async createSessao(userId: string): Promise<Sessao> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 dias

    const { data, error } = await supabase
      .from('sessoes')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Busca sessão por token
   */
  async findSessaoByToken(token: string): Promise<Sessao | null> {
    const { data, error } = await supabase
      .from('sessoes')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Remove sessão (logout)
   */
  async deleteSessao(token: string): Promise<void> {
    const { error } = await supabase.from('sessoes').delete().eq('token', token)
    if (error) throw error
  },

  /**
   * Remove sessões expiradas (limpeza)
   */
  async cleanExpiredSessions(): Promise<void> {
    const { error } = await supabase
      .from('sessoes')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) throw error
  },
}
