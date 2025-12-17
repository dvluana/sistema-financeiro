import { z } from 'zod'

// Tipo de lançamento: apenas 'entrada' ou 'saida'
// Agrupador NÃO é um tipo - é uma propriedade (is_agrupador)
export const tipoLancamento = z.enum(['entrada', 'saida'])

export const criarLancamentoSchema = z.object({
  tipo: tipoLancamento,
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de mês inválido (YYYY-MM)'),
  concluido: z.boolean().optional().default(false),
  data_prevista: z.string().nullable().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_agrupador: z.boolean().optional().default(false),
})

export const atualizarLancamentoSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  valor: z.number().positive().optional(),
  data_prevista: z.string().nullable().optional(),
  concluido: z.boolean().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
})

export const criarLancamentoRecorrenteSchema = z.object({
  tipo: z.enum(['entrada', 'saida']), // Recorrente não suporta agrupador
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  mes_inicial: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de mês inválido (YYYY-MM)'),
  dia_previsto: z.number().min(1).max(31).nullable().optional(),
  concluido: z.boolean().optional().default(false),
  categoria_id: z.string().uuid().nullable().optional(),
  recorrencia: z.object({
    tipo: z.enum(['mensal', 'parcelas']),
    quantidade: z.number().min(2).max(60),
  }),
})

export const mesQuerySchema = z.object({
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de mês inválido'),
})

export const criarLancamentosBatchSchema = z.object({
  lancamentos: z.array(criarLancamentoSchema).min(1).max(50),
})

// Schema para criar filho de um agrupador (não permite tipo agrupador)
export const criarFilhoSchema = z.object({
  tipo: z.enum(['entrada', 'saida']),
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  concluido: z.boolean().optional().default(false),
  data_prevista: z.string().nullable().optional(),
  categoria_id: z.string().uuid().nullable().optional(),
})

export type TipoLancamento = z.infer<typeof tipoLancamento>
export type CriarFilhoInput = z.infer<typeof criarFilhoSchema>
export type CriarLancamentoInput = z.infer<typeof criarLancamentoSchema>
export type AtualizarLancamentoInput = z.infer<typeof atualizarLancamentoSchema>

export interface Categoria {
  id: string
  nome: string
  tipo: TipoLancamento
  icone: string | null
  cor: string | null
  ordem: number
  is_default: boolean
}

export interface Lancamento {
  id: string
  tipo: TipoLancamento
  nome: string
  valor: number
  concluido: boolean
  data_prevista: string | null
  mes: string
  categoria_id: string | null
  parent_id: string | null
  is_agrupador: boolean
  categoria?: Categoria | null
  filhos?: Lancamento[]
  created_at: string
  updated_at: string
}

export interface LancamentoResponse {
  mes: string
  entradas: Lancamento[]
  saidas: Lancamento[]
  agrupadores: Lancamento[]
  totais: {
    entradas: number
    jaEntrou: number
    faltaEntrar: number
    saidas: number
    jaPaguei: number
    faltaPagar: number
    saldo: number
  }
}
