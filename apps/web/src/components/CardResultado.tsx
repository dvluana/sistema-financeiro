/**
 * CardResultado Component
 *
 * Card que exibe o resumo financeiro do mês:
 * - Total de entradas
 * - Total de saídas
 * - Saldo (entradas - saídas)
 *
 * O saldo é colorido de acordo com o valor:
 * - Verde: positivo
 * - Vermelho: negativo
 * - Neutro: zero
 */

import { Card, CardContent } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CardResultadoProps {
  totalEntradas: number
  totalSaidas: number
  saldo: number
}

export function CardResultado({
  totalEntradas,
  totalSaidas,
  saldo,
}: CardResultadoProps) {
  // Determina a cor do saldo baseado no valor
  const saldoColor = saldo > 0
    ? 'text-verde'
    : saldo < 0
      ? 'text-vermelho'
      : 'text-neutro-900'

  return (
    <Card className="border-l-4 border-l-azul bg-gradient-to-r from-white to-azul-bg/30">
      <CardContent className="p-0 space-y-3">
        {/* Linha: Entradas */}
        <div className="flex justify-between items-center">
          <span className="text-corpo text-neutro-600">Entradas</span>
          <span className="text-corpo-medium text-verde">
            {formatarMoeda(totalEntradas)}
          </span>
        </div>

        {/* Linha: Saídas */}
        <div className="flex justify-between items-center">
          <span className="text-corpo text-neutro-600">Saídas</span>
          <span className="text-corpo-medium text-rosa">
            {formatarMoeda(totalSaidas)}
          </span>
        </div>

        {/* Divisor */}
        <div className="border-t border-neutro-200" />

        {/* Linha: Saldo */}
        <div className="flex justify-between items-center">
          <span className="text-corpo-medium text-neutro-900">Saldo</span>
          <span className={cn('text-destaque', saldoColor)}>
            {formatarMoeda(saldo)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
