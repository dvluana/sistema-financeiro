/**
 * UpcomingCard Component
 *
 * Carrossel horizontal de cards com próximos vencimentos.
 * Mostra até 3 vencimentos com opção de ver todos.
 */

import { useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatarMoeda, cn } from '@/lib/utils'

interface Vencimento {
  id: string
  nome: string
  valor: number
  data_prevista: string
}

interface UpcomingCardProps {
  vencimentos: Vencimento[]
  onItemClick: (id: string) => void
  onVerTodos?: () => void
}

/**
 * Formata a data para exibição amigável
 */
function formatarData(dataStr: string): { dia: number; label: string } {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [ano, mes, diaStr] = dataStr.split('-')
  const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(diaStr))
  data.setHours(0, 0, 0, 0)

  const dia = parseInt(diaStr, 10)
  const diffDias = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return { dia, label: 'Hoje' }
  if (diffDias === 1) return { dia, label: 'Amanhã' }
  if (diffDias < 0) return { dia, label: 'Atrasado' }
  return { dia, label: `Dia ${dia}` }
}

export function UpcomingCard({ vencimentos, onItemClick, onVerTodos }: UpcomingCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Limita a 3 itens no carrossel
  const vencimentosExibidos = vencimentos.slice(0, 3)
  const temMais = vencimentos.length > 3

  return (
    <div className="space-y-3">
      {/* Header com título e "Ver todos" */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-corpo-medium text-neutro-900">
          Próximos vencimentos
        </h2>
        {onVerTodos && (
          <button
            type="button"
            onClick={onVerTodos}
            className="flex items-center gap-0.5 text-pequeno text-rosa hover:text-rosa-hover transition-colors"
          >
            Ver todos
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Carrossel de cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {vencimentosExibidos.map((vencimento) => {
          const { label } = formatarData(vencimento.data_prevista)
          const isAtrasado = label === 'Atrasado'
          const isHoje = label === 'Hoje'

          return (
            <button
              key={vencimento.id}
              type="button"
              onClick={() => onItemClick(vencimento.id)}
              className={cn(
                'flex-shrink-0 w-[140px] p-3 rounded-xl border transition-all',
                'hover:shadow-md active:scale-[0.98]',
                isAtrasado
                  ? 'bg-vermelho-bg border-vermelho/20'
                  : isHoje
                    ? 'bg-rosa-light border-rosa/20'
                    : 'bg-white border-neutro-200'
              )}
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Badge do dia */}
              <span className={cn(
                'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2',
                isAtrasado
                  ? 'bg-vermelho text-white'
                  : isHoje
                    ? 'bg-rosa text-white'
                    : 'bg-neutro-100 text-neutro-600'
              )}>
                {label}
              </span>

              {/* Nome */}
              <p className="text-pequeno font-medium text-neutro-900 truncate mb-1">
                {vencimento.nome}
              </p>

              {/* Valor */}
              <p className={cn(
                'text-corpo font-semibold',
                isAtrasado ? 'text-vermelho' : 'text-vermelho'
              )}>
                {formatarMoeda(vencimento.valor)}
              </p>
            </button>
          )
        })}

        {/* Card "Ver mais" se tiver mais de 3 */}
        {temMais && onVerTodos && (
          <button
            type="button"
            onClick={onVerTodos}
            className={cn(
              'flex-shrink-0 w-[100px] p-3 rounded-xl border border-dashed border-neutro-300',
              'flex flex-col items-center justify-center gap-1',
              'hover:bg-neutro-100 active:scale-[0.98] transition-all'
            )}
            style={{ scrollSnapAlign: 'start' }}
          >
            <span className="text-[24px] text-neutro-400">+{vencimentos.length - 3}</span>
            <span className="text-micro text-neutro-500">Ver mais</span>
          </button>
        )}
      </div>
    </div>
  )
}
