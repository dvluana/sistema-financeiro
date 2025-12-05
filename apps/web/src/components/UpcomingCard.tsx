/**
 * UpcomingCard Component
 *
 * Card que mostra próximos vencimentos (saídas pendentes nos próximos 7 dias).
 * Permite tocar em um item para editar/marcar como pago.
 */

import { Card } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/utils'

interface Vencimento {
  id: string
  nome: string
  valor: number
  data_prevista: string
}

interface UpcomingCardProps {
  vencimentos: Vencimento[]
  onItemClick: (id: string) => void
}

/**
 * Extrai o dia do mês de uma data
 */
function getDia(dataStr: string): number {
  const [, , dia] = dataStr.split('-')
  return parseInt(dia, 10)
}

export function UpcomingCard({ vencimentos, onItemClick }: UpcomingCardProps) {
  const temVencimentos = vencimentos.length > 0

  return (
    <Card className={!temVencimentos ? 'bg-[#E8F5E9]' : undefined}>
      <h2 className="text-[16px] font-semibold text-neutro-900 mb-3">
        Próximos vencimentos
      </h2>

      {temVencimentos ? (
        <div className="space-y-0">
          {vencimentos.map((vencimento) => (
            <button
              key={vencimento.id}
              type="button"
              onClick={() => onItemClick(vencimento.id)}
              className="w-full flex items-center gap-3 h-[48px] hover:bg-neutro-100 -mx-2 px-2 rounded-lg transition-colors"
            >
              {/* Badge do dia */}
              <span className="text-[13px] font-medium text-neutro-700 bg-[#F7F7F7] px-2 py-1 rounded-full shrink-0">
                Dia {getDia(vencimento.data_prevista)}
              </span>

              {/* Nome */}
              <span className="flex-1 text-[15px] text-[#222222] text-left truncate">
                {vencimento.nome}
              </span>

              {/* Valor */}
              <span className="text-[15px] font-medium text-[#D93025] shrink-0">
                {formatarMoeda(vencimento.valor)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-[#717171]">
          Nenhum vencimento nos próximos dias ✓
        </p>
      )}
    </Card>
  )
}
