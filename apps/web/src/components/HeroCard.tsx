/**
 * HeroCard Component
 *
 * Card principal da dashboard mostrando resumo do mês atual.
 * Exibe saldo, total de entradas e saídas.
 */

import { ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatarMoeda, formatarMesAno } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface HeroCardProps {
  mes: string
  saldo: number
  totalEntradas: number
  totalSaidas: number
  onClick: () => void
}

export function HeroCard({
  mes,
  saldo,
  totalEntradas,
  totalSaidas,
  onClick,
}: HeroCardProps) {
  const corSaldo = saldo > 0 ? 'text-verde' : saldo < 0 ? 'text-vermelho' : 'text-neutro-900'

  return (
    <Card
      as="button"
      onClick={onClick}
      className="w-full text-left cursor-pointer hover:border-rosa/50 transition-colors relative"
    >
      {/* Mês */}
      <p className="text-pequeno text-neutro-600 mb-1">{formatarMesAno(mes)}</p>

      {/* Saldo */}
      <p className={cn('text-[32px] font-bold leading-tight', corSaldo)}>
        {formatarMoeda(saldo)}
      </p>

      {/* Entradas e Saídas */}
      <div className="flex gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <ArrowUp className="w-4 h-4 text-verde" />
          <span className="text-pequeno text-neutro-700">
            {formatarMoeda(totalEntradas)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDown className="w-4 h-4 text-vermelho" />
          <span className="text-pequeno text-neutro-700">
            {formatarMoeda(totalSaidas)}
          </span>
        </div>
      </div>

      {/* Chevron indicando que é clicável */}
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutro-300" />
    </Card>
  )
}
