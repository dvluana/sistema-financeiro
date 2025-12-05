import { z } from 'zod'

export const atualizarConfiguracaoSchema = z.object({
  valor: z.union([z.boolean(), z.string(), z.number()]),
})

export interface Configuracao {
  id: string
  chave: string
  valor: boolean | string | number
  updated_at: string
}
