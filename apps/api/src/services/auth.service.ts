/**
 * Service de Autenticação
 *
 * Lógica de negócio para registro, login e validação de sessões.
 */

import bcrypt from 'bcrypt'
import { authRepository } from '../repositories/auth.repository.js'
import { perfilRepository } from '../repositories/perfil.repository.js'
import type {
  RegistrarUsuarioInput,
  LoginInput,
  AuthResponse,
  Usuario,
  PerfilBasico,
} from '../schemas/auth.js'

const SALT_ROUNDS = 10

export const authService = {
  /**
   * Registra um novo usuário
   * O trigger no banco cria automaticamente o perfil padrão
   */
  async registrar(input: RegistrarUsuarioInput): Promise<AuthResponse> {
    // Verifica se email já existe
    const existente = await authRepository.findByEmail(input.email)
    if (existente) {
      throw new Error('Este email já está cadastrado')
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(input.senha, SALT_ROUNDS)

    // Cria usuário (trigger cria perfil padrão automaticamente)
    const usuario = await authRepository.createUsuario(
      input.nome,
      input.email,
      senhaHash
    )

    // Busca o perfil padrão criado pelo trigger
    const perfilPadrao = await perfilRepository.findPerfilPadrao(usuario.id)
    if (!perfilPadrao) {
      throw new Error('Erro ao criar perfil padrão')
    }

    // Cria sessão
    const sessao = await authRepository.createSessao(usuario.id)

    return {
      usuario,
      token: sessao.token,
      perfil_padrao: {
        id: perfilPadrao.id,
        nome: perfilPadrao.nome,
        cor: perfilPadrao.cor,
        icone: perfilPadrao.icone,
        is_perfil_padrao: perfilPadrao.is_perfil_padrao,
      },
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

    // Busca o perfil padrão, ou cria um para contas legadas
    let perfilPadrao = await perfilRepository.findPerfilPadrao(usuario.id)
    if (!perfilPadrao) {
      // Conta legada sem perfil - cria automaticamente
      perfilPadrao = await perfilRepository.criarPerfilPadraoLegado(usuario.id, usuario.nome)
    }

    // Cria sessão
    const sessao = await authRepository.createSessao(usuario.id)

    // Remove senha_hash do retorno
    const { senha_hash: _, ...usuarioSemSenha } = usuario

    return {
      usuario: usuarioSemSenha,
      token: sessao.token,
      perfil_padrao: {
        id: perfilPadrao.id,
        nome: perfilPadrao.nome,
        cor: perfilPadrao.cor,
        icone: perfilPadrao.icone,
        is_perfil_padrao: perfilPadrao.is_perfil_padrao,
      },
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
