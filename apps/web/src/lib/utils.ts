import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarMoeda(valor: number | undefined | null): string {
  const safeValue = valor ?? 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safeValue)
}

export function getMesAtual(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatarMesAno(mes: string): string {
  const [year, month] = mes.split('-')
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return `${meses[parseInt(month) - 1]} ${year}`
}

// Alias para compatibilidade
export const formatarMes = formatarMesAno

export function navegarMes(mesAtual: string, direcao: 'anterior' | 'proximo'): string {
  const [year, month] = mesAtual.split('-').map(Number)
  let novoMes = month
  let novoAno = year

  if (direcao === 'anterior') {
    novoMes -= 1
    if (novoMes < 1) {
      novoMes = 12
      novoAno -= 1
    }
  } else {
    novoMes += 1
    if (novoMes > 12) {
      novoMes = 1
      novoAno += 1
    }
  }

  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}
