/**
 * RecentList Component
 *
 * Lista dos últimos lançamentos com data relativa.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { StatusCircle } from './StatusCircle'
import { EmptyState } from './EmptyState'
import { formatarMoeda, cn } from '@/lib/utils'
import type { Lancamento } from '@/lib/api'

interface RecentListProps {
  lancamentos: Lancamento[]
  onItemClick: (lancamento: Lancamento) => void
  onToggle: (id: string) => void
  onVerTodos?: () => void
  showVerTodos?: boolean
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
  showVerTodos = true,
}: RecentListProps) {
  if (lancamentos.length === 0) {
    return <EmptyState variant="default" />
  }

  return (
    <div>
      {lancamentos.map((lancamento) => (
        <div
          key={lancamento.id}
          className="flex items-center gap-2 min-h-[56px] border-b border-border last:border-0"
        >
          <StatusCircle
            checked={lancamento.concluido}
            onChange={() => onToggle(lancamento.id)}
          />

          <button
            type="button"
            onClick={() => onItemClick(lancamento)}
            className="flex-1 flex justify-between items-center py-3 text-left min-h-touch"
            aria-label={`Editar ${lancamento.nome}, ${lancamento.tipo === 'entrada' ? 'entrada' : 'saída'} de ${formatarMoeda(lancamento.valor)}`}
          >
            <div className={cn(
              'flex flex-col',
              lancamento.concluido && 'opacity-50'
            )}>
              <span className="text-corpo text-foreground truncate">
                {lancamento.nome}
              </span>
              <span className="text-micro text-muted-foreground">
                {formatarDataRelativa(lancamento.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Tag Recebido/Pago (sempre viva) */}
              <AnimatePresence>
                {lancamento.concluido && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                      lancamento.tipo === 'entrada'
                        ? 'bg-verde/10 text-verde border-verde/20'
                        : 'bg-vermelho/10 text-vermelho border-vermelho/20'
                    )}
                  >
                    {lancamento.tipo === 'entrada' ? 'Recebido' : 'Pago'}
                  </motion.span>
                )}
              </AnimatePresence>
              <span
                className={cn(
                  'text-corpo-medium',
                  lancamento.tipo === 'entrada' ? 'text-verde' : 'text-vermelho',
                  lancamento.concluido && 'opacity-50'
                )}
              >
                {lancamento.tipo === 'entrada' ? '+' : '-'}
                {formatarMoeda(lancamento.valor)}
              </span>
            </div>
          </button>
        </div>
      ))}

      {/* Botão Ver todos */}
      {showVerTodos && onVerTodos && (
        <button
          type="button"
          onClick={onVerTodos}
          className="w-full py-3 text-rosa text-corpo font-medium hover:bg-primary/10 transition-colors rounded-lg mt-2"
        >
          Ver todos
        </button>
      )}
    </div>
  )
}
