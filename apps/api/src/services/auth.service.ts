/**
 * Service de Autenticação
 *
 * Lógica de negócio para registro, login e validação de sessões.
 */

import bcrypt from 'bcrypt'
import { authRepository } from '../repositories/auth.repository.js'
import type {
  RegistrarUsuarioInput,
  LoginInput,
  AuthResponse,
  Usuario,
} from '../schemas/auth.js'

const SALT_ROUNDS = 10

export const authService = {
  /**
   * Registra um novo usuário
   */
  async registrar(input: RegistrarUsuarioInput): Promise<AuthResponse> {
    // Verifica se email já existe
    const existente = await authRepository.findByEmail(input.email)
    if (existente) {
      throw new Error('Este email já está cadastrado')
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(input.senha, SALT_ROUNDS)

    // Cria usuário
    const usuario = await authRepository.createUsuario(
      input.nome,
      input.email,
      senhaHash
    )

    // Cria configurações padrão
    await authRepository.createDefaultConfigs(usuario.id)

    // Cria sessão
    const sessao = await authRepository.createSessao(usuario.id)

    return {
      usuario,
      token: sessao.token,
    }
  },

  /**
   * Realiza login do usuário
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Busca usuário
    const usuario = await authRepository.findByEmail(input.email)
    if (!usuario) {
      throw new Error('Email ou senha incorretos')
    }

    // Verifica senha
    const senhaCorreta = await bcrypt.compare(input.senha, usuario.senha_hash)
    if (!senhaCorreta) {
      throw new Error('Email ou senha incorretos')
    }

    // Cria sessão
    const sessao = await authRepository.createSessao(usuario.id)

    // Remove senha_hash do retorno
    const { senha_hash: _, ...usuarioSemSenha } = usuario

    return {
      usuario: usuarioSemSenha,
      token: sessao.token,
    }
  },

  /**
   * Realiza logout (invalida sessão)
   */
  async logout(token: string): Promise<void> {
    await authRepository.deleteSessao(token)
  },

  /**
   * Valida token e retorna usuário
   */
  async validarToken(token: string): Promise<Usuario | null> {
    const sessao = await authRepository.findSessaoByToken(token)
    if (!sessao) {
      return null
    }

    const usuario = await authRepository.findById(sessao.user_id)
    return usuario
  },

  /**
   * Retorna dados do usuário atual
   */
  async me(token: string): Promise<Usuario> {
    const usuario = await this.validarToken(token)
    if (!usuario) {
      throw new Error('Sessão inválida ou expirada')
    }
    return usuario
  },
}
