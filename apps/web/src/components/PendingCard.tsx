/**
 * PendingCard Component
 *
 * Card que mostra valores pendentes (falta entrar ou falta pagar).
 * Exibe "Tudo certo" quando não há pendências.
 */

import { Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PendingCardProps {
  tipo: 'entrada' | 'saida'
  valor: number
  quantidade: number
  onClick: () => void
}

export function PendingCard({ tipo, valor, quantidade, onClick }: PendingCardProps) {
  const temPendentes = valor > 0

  const titulo = tipo === 'entrada' ? 'Falta entrar' : 'Falta pagar'
  const corValor = tipo === 'entrada' ? 'text-verde' : 'text-vermelho'

  return (
    <Card
      as="button"
      onClick={onClick}
      className={cn(
        'flex-1 text-left cursor-pointer hover:border-rosa/50 transition-colors min-h-[88px]',
        !temPendentes && 'bg-verde-bg/30'
      )}
    >
      <p className="text-pequeno text-neutro-600 mb-1">{titulo}</p>

      {temPendentes ? (
        <>
          <p className={cn('text-titulo-card font-semibold', corValor)}>
            {formatarMoeda(valor)}
          </p>
          <p className="text-micro text-neutro-400 mt-1">
            {quantidade} {quantidade === 1 ? 'item' : 'itens'}
          </p>
        </>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <Check className="w-5 h-5 text-verde" />
          <span className="text-corpo text-verde font-medium">Tudo certo</span>
        </div>
      )}
    </Card>
  )
}
