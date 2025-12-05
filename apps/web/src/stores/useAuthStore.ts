/**
 * Store de Autenticação - Zustand
 *
 * Gerencia o estado de autenticação do usuário:
 * - Login/Logout
 * - Registro
 * - Verificação de sessão
 */

import { create } from 'zustand'
import {
  authApi,
  setToken,
  removeToken,
  getToken,
  ApiError,
  type Usuario,
} from '@/lib/api'

interface AuthState {
  // Estado
  usuario: Usuario | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Ações
  login: (email: string, senha: string) => Promise<void>
  register: (nome: string, email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  /**
   * Realiza login do usuário
   */
  login: async (email: string, senha: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await authApi.login({ email, senha })
      setToken(response.token)
      set({
        usuario: response.usuario,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao fazer login',
      })
      throw error
    }
  },

  /**
   * Registra novo usuário
   */
  register: async (nome: string, email: string, senha: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await authApi.register({ nome, email, senha })
      setToken(response.token)
      set({
        usuario: response.usuario,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao criar conta',
      })
      throw error
    }
  },

  /**
   * Realiza logout
   */
  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignora erro de logout (pode estar com token inválido)
    } finally {
      removeToken()
      set({
        usuario: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  /**
   * Verifica se há sessão ativa
   */
  checkAuth: async () => {
    const token = getToken()

    if (!token) {
      set({ isLoading: false, isAuthenticated: false })
      return
    }

    try {
      const usuario = await authApi.me()
      set({
        usuario,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      // Só remove o token se for erro de autenticação (401/403)
      // Erros de rede ou servidor não devem deslogar o usuário
      const isAuthError = error instanceof ApiError &&
        (error.status === 401 || error.status === 403)

      if (isAuthError) {
        removeToken()
        set({
          usuario: null,
          isAuthenticated: false,
          isLoading: false,
        })
      } else {
        // Em caso de erro de rede, mantém o usuário logado (assume válido)
        set({ isLoading: false, isAuthenticated: true })
      }
    }
  },

  /**
   * Limpa erro
   */
  clearError: () => set({ error: null }),
}))
