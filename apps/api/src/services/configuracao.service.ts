/**
 * Service de Configurações
 *
 * Lógica de negócio para preferências do usuário.
 */

import { configuracaoRepository } from '../repositories/configuracao.repository.js'
import type { Configuracao } from '../schemas/configuracao.js'

export const configuracaoService = {
  /**
   * Lista configurações do usuário
   */
  async listar(userId: string): Promise<Configuracao[]> {
    return configuracaoRepository.findAll(userId)
  },

  /**
   * Atualiza uma configuração
   */
  async atualizar(chave: string, valor: boolean | string | number, userId: string): Promise<Configuracao> {
    const config = await configuracaoRepository.findByChave(chave, userId)
    if (!config) {
      throw new Error('Configuração não encontrada')
    }

    return configuracaoRepository.update(chave, valor, userId)
  },
}
