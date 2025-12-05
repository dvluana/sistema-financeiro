/**
 * RecentList Component
 *
 * Lista dos últimos lançamentos com data relativa.
 */

import { StatusCircle } from './StatusCircle'
import { formatarMoeda } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Lancamento } from '@/lib/api'

interface RecentListProps {
  lancamentos: Lancamento[]
  onItemClick: (lancamento: Lancamento) => void
  onToggle: (id: string) => void
  onVerTodos: () => void
}

function formatarDataRelativa(dataStr: string): string {
  const data = new Date(dataStr)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)

  // Normaliza as datas para comparação
  const dataFormatada = data.toDateString()
  const hojeFormatada = hoje.toDateString()
  const ontemFormatada = ontem.toDateString()

  if (dataFormatada === hojeFormatada) {
    return 'Hoje'
  }
  if (dataFormatada === ontemFormatada) {
    return 'Ontem'
  }

  // Formata como "12 nov"
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
}

export function RecentList({
  lancamentos,
  onItemClick,
  onToggle,
  onVerTodos,
}: RecentListProps) {
  if (lancamentos.length === 0) {
    return (
      <div className="text-center py-6 text-neutro-400 text-corpo">
        Nenhum lançamento recente
      </div>
    )
  }

  return (
    <div>
      {lancamentos.map((lancamento) => (
        <div
          key={lancamento.id}
          className="flex items-center gap-2 min-h-[56px] border-b border-neutro-200 last:border-0"
        >
          <StatusCircle
            checked={lancamento.concluido}
            onChange={() => onToggle(lancamento.id)}
          />

          <button
            type="button"
            onClick={() => onItemClick(lancamento)}
            className="flex-1 flex justify-between items-center py-3 text-left min-h-touch"
          >
            <div className="flex flex-col">
              <span className="text-corpo text-neutro-900 truncate">
                {lancamento.nome}
              </span>
              <span className="text-micro text-neutro-400">
                {formatarDataRelativa(lancamento.created_at)}
              </span>
            </div>
            <span
              className={cn(
                'text-corpo-medium',
                lancamento.tipo === 'entrada' ? 'text-verde' : 'text-vermelho'
              )}
            >
              {lancamento.tipo === 'entrada' ? '+' : '-'}
              {formatarMoeda(lancamento.valor)}
            </span>
          </button>
        </div>
      ))}

      {/* Botão Ver todos */}
      <button
        type="button"
        onClick={onVerTodos}
        className="w-full py-3 text-rosa text-corpo font-medium hover:bg-rosa-light/30 transition-colors rounded-lg mt-2"
      >
        Ver todos
      </button>
    </div>
  )
}
