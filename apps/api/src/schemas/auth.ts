/**
 * Schemas de Autenticação
 *
 * Validação de dados para registro e login de usuários.
 */

import { z } from 'zod'

// Validação de senha forte (OWASP compliant)
const senhaForteSchema = z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')

export const registrarUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  senha: senhaForteSchema,
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

export interface PerfilBasico {
  id: string
  nome: string
  cor: string
  icone: string
  is_perfil_padrao: boolean
}

export interface AuthResponse {
  usuario: Usuario
  token: string
  perfil_padrao: PerfilBasico
}
