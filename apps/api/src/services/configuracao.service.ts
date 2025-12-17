/**
 * Service de Configurações
 *
 * Lógica de negócio para preferências do usuário/perfil.
 */

import { configuracaoRepository } from '../repositories/configuracao.repository.js'
import type { Configuracao } from '../schemas/configuracao.js'
import type { ContextoUsuario } from '../repositories/lancamento.repository.js'

// Tipo para contexto: pode ser string (userId legado) ou ContextoUsuario completo
type Contexto = ContextoUsuario | string

export const configuracaoService = {
  /**
   * Lista configurações do usuário/perfil
   */
  async listar(ctx: Contexto): Promise<Configuracao[]> {
    return configuracaoRepository.findAll(ctx)
  },

  /**
   * Atualiza uma configuração
   */
  async atualizar(chave: string, valor: boolean | string | number, ctx: Contexto): Promise<Configuracao> {
    const config = await configuracaoRepository.findByChave(chave, ctx)
    if (!config) {
      throw new Error('Configuração não encontrada')
    }

    return configuracaoRepository.update(chave, valor, ctx)
  },
}
