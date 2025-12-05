/**
 * Schemas de Autenticação
 *
 * Validação de dados para registro e login de usuários.
 */

import { z } from 'zod'

export const registrarUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
})

export type RegistrarUsuarioInput = z.infer<typeof registrarUsuarioSchema>
export type LoginInput = z.infer<typeof loginSchema>

export interface Usuario {
  id: string
  nome: string
  email: string
  created_at: string
  updated_at: string
}

export interface Sessao {
  id: string
  user_id: string
  token: string
  expires_at: string
  created_at: string
}

export interface AuthResponse {
  usuario: Usuario
  token: string
}
