/**
 * Service de Perfis
 *
 * Logica de negocios para gerenciamento de perfis/workspaces.
 */

import { perfilRepository } from '../repositories/perfil.repository.js'
import type { Perfil, CriarPerfilInput, AtualizarPerfilInput, PerfisResponse } from '../schemas/perfil.js'

export const perfilService = {
  /**
   * Lista todos os perfis ativos de um usuario
   * Retorna tambem qual e o perfil padrao
   */
  async listarPerfis(usuarioId: string): Promise<PerfisResponse> {
    const perfis = await perfilRepository.findByUsuarioId(usuarioId)
    const perfilPadrao = perfis.find(p => p.is_perfil_padrao) || null

    return {
      perfis,
      perfil_atual: perfilPadrao,
    }
  },

  /**
   * Lista todos os perfis incluindo arquivados
   */
  async listarTodosPerfis(usuarioId: string): Promise<Perfil[]> {
    return perfilRepository.findAllByUsuarioId(usuarioId)
  },

  /**
   * Busca um perfil especifico do usuario
   */
  async buscarPerfil(id: string, usuarioId: string): Promise<Perfil | null> {
    return perfilRepository.findByIdAndUsuario(id, usuarioId)
  },

  /**
   * Busca o perfil padrao do usuario
   */
  async buscarPerfilPadrao(usuarioId: string): Promise<Perfil | null> {
    return perfilRepository.findPerfilPadrao(usuarioId)
  },

  /**
   * Cria novo perfil
   * Limite: maximo 10 perfis ativos por usuario (previne abuso)
   */
  async criarPerfil(input: CriarPerfilInput, usuarioId: string): Promise<Perfil> {
    // Verifica limite de perfis ativos
    const perfisAtivos = await perfilRepository.findByUsuarioId(usuarioId)
    if (perfisAtivos.length >= 10) {
      throw new Error('Limite maximo de 10 perfis atingido')
    }

    // Verifica se ja existe perfil ATIVO com mesmo nome
    const nomeExistente = perfisAtivos.find(
      p => p.nome.toLowerCase() === input.nome.toLowerCase()
    )
    if (nomeExistente) {
      throw new Error('Ja existe um perfil com este nome')
    }

    return perfilRepository.create(input, usuarioId)
  },

  /**
   * Atualiza perfil existente
   */
  async atualizarPerfil(id: string, input: AtualizarPerfilInput, usuarioId: string): Promise<Perfil> {
    // Verifica se perfil existe e pertence ao usuario
    const perfil = await perfilRepository.findByIdAndUsuario(id, usuarioId)
    if (!perfil) {
      throw new Error('Perfil nao encontrado')
    }

    // Se estiver alterando o nome, verifica duplicidade apenas em perfis ativos
    if (input.nome && input.nome.toLowerCase() !== perfil.nome.toLowerCase()) {
      const perfisAtivos = await perfilRepository.findByUsuarioId(usuarioId)
      const nomeExistente = perfisAtivos.find(
        p => p.id !== id && p.nome.toLowerCase() === input.nome!.toLowerCase()
      )
      if (nomeExistente) {
        throw new Error('Ja existe um perfil com este nome')
      }
    }

    // Nao permite desativar perfil padrao via update
    if (input.ativo === false && perfil.is_perfil_padrao) {
      throw new Error('Nao e possivel arquivar o perfil padrao')
    }

    return perfilRepository.update(id, input, usuarioId)
  },

  /**
   * Arquiva perfil (soft delete)
   */
  async arquivarPerfil(id: string, usuarioId: string): Promise<Perfil> {
    return perfilRepository.arquivar(id, usuarioId)
  },

  /**
   * Reativa perfil arquivado
   */
  async reativarPerfil(id: string, usuarioId: string): Promise<Perfil> {
    return perfilRepository.reativar(id, usuarioId)
  },

  /**
   * Deleta perfil permanentemente
   * CUIDADO: Remove todos os dados do perfil!
   */
  async deletarPerfil(id: string, usuarioId: string): Promise<void> {
    return perfilRepository.delete(id, usuarioId)
  },

  /**
   * Valida se um perfil pode ser usado pelo usuario
   * Usado antes de operacoes em lancamentos/configs
   */
  async validarAcesso(perfilId: string, usuarioId: string): Promise<Perfil> {
    return perfilRepository.validarPerfilDoUsuario(perfilId, usuarioId)
  },
}
