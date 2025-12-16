import { z } from 'zod'

// Schema para criar novo perfil
export const criarPerfilSchema = z.object({
  nome: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
  descricao: z.string().max(500).nullable().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Formato de cor invalido (use #RRGGBB)').optional(),
  icone: z.string().max(50).optional(),
})

// Schema para atualizar perfil
export const atualizarPerfilSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  descricao: z.string().max(500).nullable().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icone: z.string().max(50).optional(),
  ativo: z.boolean().optional(),
})

// Tipos inferidos dos schemas
export type CriarPerfilInput = z.infer<typeof criarPerfilSchema>
export type AtualizarPerfilInput = z.infer<typeof atualizarPerfilSchema>

// Interface completa do perfil (retornado do banco)
export interface Perfil {
  id: string
  nome: string
  descricao: string | null
  cor: string
  icone: string
  usuario_id: string
  is_perfil_padrao: boolean
  ativo: boolean
  created_at: string
  updated_at: string
}

// Response para listar perfis
export interface PerfisResponse {
  perfis: Perfil[]
  perfil_atual: Perfil | null
}
