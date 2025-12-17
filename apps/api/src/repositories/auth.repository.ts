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
    expiresAt.setDate(expiresAt.getDate() + 90) // 90 dias

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
   * Busca sessão por token e renova automaticamente se válida
   * Limite absoluto: 180 dias desde a criação (segurança contra token roubado)
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

    if (data) {
      // Verifica idade máxima absoluta da sessão (180 dias)
      const createdAt = new Date(data.created_at)
      const maxAgeMs = 180 * 24 * 60 * 60 * 1000 // 180 dias em ms
      const sessionAge = Date.now() - createdAt.getTime()

      if (sessionAge > maxAgeMs) {
        // Sessão muito antiga, invalida por segurança
        await supabase.from('sessoes').delete().eq('token', token)
        return null
      }

      // Renova a sessão para mais 90 dias a cada uso
      // Mas respeita o limite absoluto de 180 dias
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 90)

      // Não renovar além do limite absoluto
      const absoluteMaxDate = new Date(createdAt.getTime() + maxAgeMs)
      const finalExpiresAt = newExpiresAt > absoluteMaxDate ? absoluteMaxDate : newExpiresAt

      await supabase
        .from('sessoes')
        .update({ expires_at: finalExpiresAt.toISOString() })
        .eq('token', token)
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
