/**
 * Repository de Perfis
 *
 * Acesso a dados de perfis/workspaces.
 * Cada usuario pode ter multiplos perfis, cada um isolando seus dados financeiros.
 */

import { supabase } from '../lib/supabase.js'
import type { Perfil, CriarPerfilInput, AtualizarPerfilInput } from '../schemas/perfil.js'

export const perfilRepository = {
  /**
   * Lista todos os perfis ativos de um usuario
   * Retorna perfil padrao primeiro, depois ordenado por nome
   */
  async findByUsuarioId(usuarioId: string): Promise<Perfil[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('ativo', true)
      .order('is_perfil_padrao', { ascending: false })
      .order('nome')

    if (error) throw error
    return data || []
  },

  /**
   * Lista todos os perfis de um usuario (incluindo inativos)
   */
  async findAllByUsuarioId(usuarioId: string): Promise<Perfil[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('is_perfil_padrao', { ascending: false })
      .order('nome')

    if (error) throw error
    return data || []
  },

  /**
   * Busca perfil por ID
   */
  async findById(id: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Busca perfil por ID validando que pertence ao usuario
   */
  async findByIdAndUsuario(id: string, usuarioId: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Busca o perfil padrao de um usuario
   */
  async findPerfilPadrao(usuarioId: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('is_perfil_padrao', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Cria perfil padrao para contas legadas que nao tem perfil
   * Usa o nome do usuario como nome do perfil
   */
  async criarPerfilPadraoLegado(usuarioId: string, nomeUsuario: string): Promise<Perfil> {
    const { data, error } = await supabase
      .from('perfis')
      .insert({
        nome: nomeUsuario,
        descricao: null,
        cor: '#6366F1',
        icone: 'User',
        usuario_id: usuarioId,
        is_perfil_padrao: true,
        ativo: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Cria novo perfil para um usuario
   * Nota: O trigger no banco ja cria as configuracoes padrao automaticamente
   */
  async create(input: CriarPerfilInput, usuarioId: string): Promise<Perfil> {
    const { data, error } = await supabase
      .from('perfis')
      .insert({
        nome: input.nome,
        descricao: input.descricao || null,
        cor: input.cor || '#6366F1',
        icone: input.icone || 'User',
        usuario_id: usuarioId,
        is_perfil_padrao: false,
        ativo: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Atualiza perfil (verifica se pertence ao usuario)
   */
  async update(id: string, input: AtualizarPerfilInput, usuarioId: string): Promise<Perfil> {
    const { data, error } = await supabase
      .from('perfis')
      .update(input)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Arquiva perfil (soft delete) - nao permite arquivar perfil padrao
   */
  async arquivar(id: string, usuarioId: string): Promise<Perfil> {
    // Primeiro verifica se nao e o perfil padrao
    const perfil = await this.findByIdAndUsuario(id, usuarioId)
    if (!perfil) {
      throw new Error('Perfil nao encontrado')
    }
    if (perfil.is_perfil_padrao) {
      throw new Error('Nao e possivel arquivar o perfil padrao')
    }

    const { data, error } = await supabase
      .from('perfis')
      .update({ ativo: false })
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Reativa um perfil arquivado
   */
  async reativar(id: string, usuarioId: string): Promise<Perfil> {
    const { data, error } = await supabase
      .from('perfis')
      .update({ ativo: true })
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Remove perfil permanentemente - nao permite deletar perfil padrao
   * CUIDADO: Isso deleta TODOS os dados do perfil (lancamentos, configs, etc)
   */
  async delete(id: string, usuarioId: string): Promise<void> {
    // Primeiro verifica se nao e o perfil padrao
    const perfil = await this.findByIdAndUsuario(id, usuarioId)
    if (!perfil) {
      throw new Error('Perfil nao encontrado')
    }
    if (perfil.is_perfil_padrao) {
      throw new Error('Nao e possivel excluir o perfil padrao')
    }

    const { error } = await supabase
      .from('perfis')
      .delete()
      .eq('id', id)
      .eq('usuario_id', usuarioId)

    if (error) throw error
  },

  /**
   * Valida se um perfil pertence ao usuario e esta ativo
   * Usado como middleware de seguranca antes de operacoes em lancamentos/configs
   */
  async validarPerfilDoUsuario(perfilId: string, usuarioId: string): Promise<Perfil> {
    const perfil = await this.findByIdAndUsuario(perfilId, usuarioId)

    if (!perfil) {
      throw new Error('Perfil nao encontrado ou nao pertence ao usuario')
    }

    if (!perfil.ativo) {
      throw new Error('Perfil esta arquivado e nao pode ser usado')
    }

    return perfil
  },
}
