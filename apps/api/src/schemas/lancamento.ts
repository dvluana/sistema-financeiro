import { z } from 'zod'

// Tipo de lançamento: apenas 'entrada' ou 'saida'
// Agrupador NÃO é um tipo - é uma propriedade (is_agrupador)
export const tipoLancamento = z.enum(['entrada', 'saida'])

// Modo de cálculo do valor de um agrupador
export const valorModo = z.enum(['soma', 'fixo'])

// Helper: aceita UUID, null, undefined ou string vazia (converte vazia para null)
const optionalUuid = z
  .string()
  .nullable()
  .optional()
  .transform(val => (val === '' ? null : val))
  .refine(val => val === null || val === undefined || z.string().uuid().safeParse(val).success, {
    message: 'Invalid uuid',
  })

export const criarLancamentoSchema = z.object({
  tipo: tipoLancamento,
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de mês inválido (YYYY-MM)'),
  concluido: z.boolean().optional().default(false),
  data_prevista: z.string().nullable().optional(),
  categoria_id: optionalUuid,
  parent_id: optionalUuid,
  is_agrupador: z.boolean().optional().default(false),
  valor_modo: valorModo.optional().default('soma'),
})

export const atualizarLancamentoSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  valor: z.number().positive().optional(),
  data_prevista: z.string().nullable().optional(),
  concluido: z.boolean().optional(),
  categoria_id: optionalUuid,
  valor_modo: valorModo.optional(),
})

export const criarLancamentoRecorrenteSchema = z.object({
  tipo: z.enum(['entrada', 'saida']),
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  valor: z.number().min(0, 'Valor deve ser zero ou maior'), // Permite 0 para agrupadores com soma
  mes_inicial: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato de mês inválido (YYYY-MM)'),
  dia_previsto: z.number().min(1).max(31).nullable().optional(),
  concluido: z.boolean().optional().default(false),
  categoria_id: optionalUuid,
  is_agrupador: z.boolean().optional().default(false),
  valor_modo: valorModo.optional().default('soma'),
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
  categoria_id: optionalUuid,
})

export type TipoLancamento = z.infer<typeof tipoLancamento>
export type ValorModo = z.infer<typeof valorModo>
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
  valor_modo: ValorModo
  valor_calculado?: number  // Calculado no service baseado em valor_modo
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
