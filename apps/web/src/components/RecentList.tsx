/**
 * RecentList Component
 *
 * Lista dos últimos lançamentos com data relativa.
 * Memoizado para evitar re-renders desnecessários.
 */

import React, { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Plus, Inbox } from 'lucide-react'
import { StatusCircle } from './StatusCircle'
import { Button } from '@/components/ui/button'
import { formatarMoeda, cn } from '@/lib/utils'
import type { Lancamento } from '@/lib/api'

interface RecentListProps {
  lancamentos: Lancamento[]
  onItemClick: (lancamento: Lancamento) => void
  onToggle: (id: string) => void
  onVerTodos?: () => void
  showVerTodos?: boolean
  onAddEntrada?: () => void
  onAddSaida?: () => void
}

// Formata a data do lançamento para exibição
// Usa data_prevista se disponível, senão extrai do mês
function formatarDataLancamento(lancamento: Lancamento): string {
  // Se tem data_prevista, usa ela
  if (lancamento.data_prevista) {
    const [ano, mes, diaStr] = lancamento.data_prevista.split('-')
    const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(diaStr))
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    data.setHours(0, 0, 0, 0)

    // Só mostra "Hoje" ou "Ontem" se for realmente no mês atual
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    const mesLancamento = lancamento.mes

    if (mesAtual === mesLancamento) {
      const diffDias = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDias === 0) return 'Hoje'
      if (diffDias === -1) return 'Ontem'
    }

    // Formata como "12 jul"
    return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
  }

  // Se não tem data_prevista, mostra apenas o mês
  const [ano, mesNum] = lancamento.mes.split('-')
  const nomeMes = new Date(parseInt(ano), parseInt(mesNum) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
  return nomeMes
}

// Item individual memoizado
const RecentListItem = React.memo(function RecentListItem({
  lancamento,
  onItemClick,
  onToggle,
}: {
  lancamento: Lancamento
  onItemClick: (lancamento: Lancamento) => void
  onToggle: (id: string) => void
}) {
  const dataFormatada = useMemo(
    () => formatarDataLancamento(lancamento),
    [lancamento.data_prevista, lancamento.mes]
  )

  const handleToggle = useCallback(
    () => onToggle(lancamento.id),
    [lancamento.id, onToggle]
  )

  const handleClick = useCallback(
    () => onItemClick(lancamento),
    [lancamento, onItemClick]
  )

  return (
    <div className="flex items-center gap-2 min-h-[56px] border-b border-border last:border-0">
      <StatusCircle checked={lancamento.concluido} onChange={handleToggle} />

      <button
        type="button"
        onClick={handleClick}
        className="flex-1 flex justify-between items-center py-3 text-left min-h-touch"
        aria-label={`Editar ${lancamento.nome}, ${lancamento.tipo === 'entrada' ? 'entrada' : 'saída'} de ${formatarMoeda(lancamento.valor)}`}
      >
        <div className={cn('flex flex-col min-w-0 flex-1', lancamento.concluido && 'opacity-50')}>
          <div className="flex items-center gap-1.5">
            <span className="text-corpo text-foreground truncate max-w-[140px] sm:max-w-[200px]">{lancamento.nome}</span>
            {lancamento.is_agrupador && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-azul/10 text-azul border border-azul/20">
                <Layers className="w-2.5 h-2.5" />
                Grupo
              </span>
            )}
          </div>
          <span className="text-micro text-muted-foreground">{dataFormatada}</span>
        </div>
        <div className="flex items-center gap-2">
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
  )
})

export const RecentList = React.memo(function RecentList({
  lancamentos,
  onItemClick,
  onToggle,
  onVerTodos,
  showVerTodos = true,
  onAddEntrada,
  onAddSaida,
}: RecentListProps) {
  if (lancamentos.length === 0) {
    return (
      <div className="py-10 px-4 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
          <Inbox className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Nenhum lançamento neste mês
        </p>
        {(onAddEntrada || onAddSaida) && (
          <div className="flex items-center justify-center gap-2">
            {onAddEntrada && (
              <Button
                onClick={onAddEntrada}
                size="sm"
                variant="outline"
                className="border-verde/30 text-verde hover:bg-verde/5"
              >
                <Plus className="w-4 h-4 mr-1" />
                Entrada
              </Button>
            )}
            {onAddSaida && (
              <Button
                onClick={onAddSaida}
                size="sm"
                variant="outline"
                className="border-rosa/30 text-rosa hover:bg-rosa/5"
              >
                <Plus className="w-4 h-4 mr-1" />
                Saída
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {lancamentos.map((lancamento) => (
        <RecentListItem
          key={lancamento.id}
          lancamento={lancamento}
          onItemClick={onItemClick}
          onToggle={onToggle}
        />
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
})
