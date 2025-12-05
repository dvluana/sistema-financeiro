/**
 * UpcomingCard Component
 *
 * Grid responsivo de cards com próximos vencimentos.
 * Design minimalista e adaptativo.
 */

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
  isLoading?: boolean
}

/**
 * Formata a data para exibição amigável
 */
function formatarData(dataStr: string): string {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [ano, mes, diaStr] = dataStr.split('-')
  const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(diaStr))
  data.setHours(0, 0, 0, 0)

  const dia = parseInt(diaStr, 10)
  const diffDias = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return 'Hoje'
  if (diffDias === 1) return 'Amanhã'
  if (diffDias < 0) return 'Atrasado'
  return `Dia ${dia}`
}

export function UpcomingCard({ vencimentos, onItemClick, onVerTodos, isLoading = false }: UpcomingCardProps) {
  // Limita a 4 itens no grid
  const vencimentosExibidos = vencimentos.slice(0, 4)
  const temMais = vencimentos.length > 4

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-corpo-medium text-neutro-900">
            Próximos vencimentos
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-neutro-200 rounded-xl p-3">
              <div className="h-4 w-10 bg-neutro-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-full bg-neutro-200 rounded animate-pulse mb-1" />
              <div className="h-4 w-12 bg-neutro-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Estado vazio
  if (vencimentos.length === 0) {
    return null
  }

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
            className="flex items-center gap-0.5 text-pequeno text-neutro-500 hover:text-neutro-700 transition-colors"
          >
            Ver todos
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid responsivo de cards */}
      <div className={cn(
        'grid gap-2',
        vencimentosExibidos.length === 1 && 'grid-cols-1',
        vencimentosExibidos.length === 2 && 'grid-cols-2',
        vencimentosExibidos.length === 3 && 'grid-cols-3',
        vencimentosExibidos.length >= 4 && 'grid-cols-4',
      )}>
        {vencimentosExibidos.map((vencimento) => {
          const label = formatarData(vencimento.data_prevista)
          const isAtrasado = label === 'Atrasado'
          const isHoje = label === 'Hoje'

          return (
            <button
              key={vencimento.id}
              type="button"
              onClick={() => onItemClick(vencimento.id)}
              className={cn(
                'flex flex-col p-3 rounded-xl border transition-all text-left',
                'hover:shadow-sm active:scale-[0.98]',
                'bg-white border-neutro-200'
              )}
            >
              {/* Badge do dia */}
              <span className={cn(
                'self-start text-[10px] font-medium px-1.5 py-0.5 rounded mb-2',
                isAtrasado
                  ? 'bg-vermelho/10 text-vermelho'
                  : isHoje
                    ? 'bg-rosa/10 text-rosa'
                    : 'bg-neutro-100 text-neutro-500'
              )}>
                {label}
              </span>

              {/* Nome */}
              <p className="text-[13px] text-neutro-700 truncate mb-1 leading-tight">
                {vencimento.nome}
              </p>

              {/* Valor */}
              <p className="text-pequeno font-semibold text-neutro-900">
                {formatarMoeda(vencimento.valor)}
              </p>
            </button>
          )
        })}
      </div>

      {/* Link "Ver mais" se tiver mais de 4 */}
      {temMais && onVerTodos && (
        <button
          type="button"
          onClick={onVerTodos}
          className="w-full text-center text-micro text-neutro-400 hover:text-neutro-600 transition-colors py-1"
        >
          +{vencimentos.length - 4} vencimentos
        </button>
      )}
    </div>
  )
}
