/**
 * API Client
 *
 * Módulo responsável pela comunicação com o backend.
 * Centraliza todas as chamadas HTTP e tratamento de erros.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

// Chave para armazenar token no localStorage
const TOKEN_KEY = 'auth_token'

/**
 * Tipos de dados da API
 */
export interface Usuario {
  id: string
  nome: string
  email: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  usuario: Usuario
  token: string
}

export interface Lancamento {
  id: string
  tipo: 'entrada' | 'saida'
  nome: string
  valor: number
  concluido: boolean
  data_prevista: string | null
  mes: string
  created_at: string
  updated_at: string
}

export interface Totais {
  entradas: number
  jaEntrou: number
  faltaEntrar: number
  saidas: number
  jaPaguei: number
  faltaPagar: number
  saldo: number
}

export interface LancamentoResponse {
  mes: string
  entradas: Lancamento[]
  saidas: Lancamento[]
  totais: Totais
}

export interface CriarLancamentoInput {
  tipo: 'entrada' | 'saida'
  nome: string
  valor: number
  mes: string
  concluido?: boolean
  data_prevista?: string | null
}

export interface AtualizarLancamentoInput {
  nome?: string
  valor?: number
  data_prevista?: string | null
  concluido?: boolean
}

export interface Configuracao {
  id: string
  chave: string
  valor: boolean | string | number
  updated_at: string
}

/**
 * Erro personalizado para erros da API
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Funções de gerenciamento de token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Função auxiliar para fazer requisições HTTP
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = true
): Promise<T> {
  const url = `${API_URL}${endpoint}`

  // Headers base
  const headers: HeadersInit = {}

  // Adiciona Content-Type se houver body
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  // Adiciona Authorization se necessário
  if (requiresAuth) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new ApiError(response.status, error.error || 'Erro na requisição')
  }

  return response.json()
}

/**
 * API de Autenticação
 */
export const authApi = {
  /**
   * Registra novo usuário
   */
  register: (data: { nome: string; email: string; senha: string }): Promise<AuthResponse> =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),

  /**
   * Realiza login
   */
  login: (data: { email: string; senha: string }): Promise<AuthResponse> =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),

  /**
   * Realiza logout
   */
  logout: (): Promise<{ message: string }> =>
    request('/api/auth/logout', {
      method: 'POST',
    }),

  /**
   * Retorna usuário autenticado
   */
  me: (): Promise<Usuario> =>
    request('/api/auth/me'),
}

/**
 * API de Lançamentos
 */
export const lancamentosApi = {
  /**
   * Lista lançamentos de um mês específico
   */
  listar: (mes: string): Promise<LancamentoResponse> =>
    request(`/api/lancamentos?mes=${mes}`),

  /**
   * Cria um novo lançamento
   */
  criar: (data: CriarLancamentoInput): Promise<LancamentoResponse> =>
    request('/api/lancamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Atualiza um lançamento existente
   */
  atualizar: (id: string, data: AtualizarLancamentoInput): Promise<LancamentoResponse> =>
    request(`/api/lancamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Alterna o status de conclusão (pago/recebido)
   */
  toggleConcluido: (id: string): Promise<LancamentoResponse> =>
    request(`/api/lancamentos/${id}/concluido`, {
      method: 'PATCH',
    }),

  /**
   * Remove um lançamento
   */
  excluir: (id: string): Promise<LancamentoResponse> =>
    request(`/api/lancamentos/${id}`, {
      method: 'DELETE',
    }),
}

/**
 * API de Configurações
 */
export const configuracoesApi = {
  /**
   * Lista todas as configurações
   */
  listar: (): Promise<Configuracao[]> =>
    request('/api/configuracoes'),

  /**
   * Atualiza uma configuração
   */
  atualizar: (chave: string, valor: boolean | string | number): Promise<Configuracao> =>
    request(`/api/configuracoes/${chave}`, {
      method: 'PUT',
      body: JSON.stringify({ valor }),
    }),
}
