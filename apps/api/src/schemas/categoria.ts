import { z } from 'zod'

export const tipoLancamento = z.enum(['entrada', 'saida'])

export const criarCategoriaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  tipo: tipoLancamento,
  icone: z.string().max(50).optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional(),
  ordem: z.number().int().min(0).optional(),
})

export const atualizarCategoriaSchema = z.object({
  nome: z.string().min(1).max(50).optional(),
  icone: z.string().max(50).optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  ordem: z.number().int().min(0).optional(),
})

export type TipoLancamento = z.infer<typeof tipoLancamento>
export type CriarCategoriaInput = z.infer<typeof criarCategoriaSchema>
export type AtualizarCategoriaInput = z.infer<typeof atualizarCategoriaSchema>

export interface Categoria {
  id: string
  nome: string
  tipo: TipoLancamento
  icone: string | null
  cor: string | null
  ordem: number
  user_id: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}
