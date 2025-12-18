/**
 * RecorrenciaActionDialog Component
 *
 * Dialog para confirmar edição ou exclusão de lançamentos recorrentes.
 * Permite escolher o escopo da operação:
 * - apenas_este: apenas o lançamento atual
 * - este_e_proximos: este e todos os próximos
 * - todos: todos da série (passados e futuros)
 */

import { useState } from 'react'
import { Loader2, AlertTriangle, Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EscopoRecorrencia, InfoRecorrencia, Lancamento } from '@/lib/api'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface RecorrenciaActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lancamento: Lancamento | null
  action: 'editar' | 'excluir'
  infoRecorrencia: InfoRecorrencia | null
  isLoading?: boolean
  onConfirm: (escopo: EscopoRecorrencia) => void
}

// Componente de opção de escopo
function EscopoOption({
  selected,
  onSelect,
  label,
  description,
  count,
  warning,
  disabled,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  description: string
  count: number
  warning?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-muted-foreground/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
              selected ? 'border-primary bg-primary' : 'border-muted-foreground'
            )}
          >
            {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className="text-sm font-bold text-muted-foreground tabular-nums">
          {count}
        </span>
      </div>
      {warning && (
        <div className="mt-2 ml-7 flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </div>
      )}
    </button>
  )
}

export function RecorrenciaActionDialog({
  open,
  onOpenChange,
  lancamento,
  action,
  infoRecorrencia,
  isLoading,
  onConfirm,
}: RecorrenciaActionDialogProps) {
  const [escopo, setEscopo] = useState<EscopoRecorrencia>('apenas_este')

  // Se lançamento não tem recorrencia_id, não mostra opções de escopo
  const isRecorrente = infoRecorrencia?.recorrenciaId != null

  // Reset escopo quando dialog abre
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEscopo('apenas_este')
    }
    onOpenChange(open)
  }

  if (!lancamento) return null

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {action === 'excluir' && (
              <span className="p-1.5 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
            {action === 'editar' ? 'Salvar alterações' : 'Excluir lançamento'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRecorrente ? (
              action === 'editar'
                ? 'Este lançamento faz parte de uma série recorrente. Aplicar alterações para:'
                : 'Este lançamento faz parte de uma série recorrente. Excluir:'
            ) : (
              action === 'editar'
                ? `Salvar alterações em "${lancamento.nome}"?`
                : `Tem certeza que deseja excluir "${lancamento.nome}"?`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isRecorrente && infoRecorrencia ? (
          <div className="space-y-2 py-2">
            {/* Info da série */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {infoRecorrencia.primeiroMes}
              </span>
              <ChevronRight className="w-3 h-3" />
              <span>
                {infoRecorrencia.ultimoMes}
              </span>
              <span className="ml-auto font-medium">
                {infoRecorrencia.total} lançamentos
              </span>
            </div>

            {/* Opções de escopo */}
            <div className="space-y-2">
              <EscopoOption
                selected={escopo === 'apenas_este'}
                onSelect={() => setEscopo('apenas_este')}
                label="Apenas este lançamento"
                description={lancamento.mes}
                count={1}
              />

              <EscopoOption
                selected={escopo === 'este_e_proximos'}
                onSelect={() => setEscopo('este_e_proximos')}
                label="Este e todos os próximos"
                description={`De ${lancamento.mes} até ${infoRecorrencia.ultimoMes}`}
                count={infoRecorrencia.contagemPorEscopo.este_e_proximos}
                disabled={infoRecorrencia.contagemPorEscopo.este_e_proximos <= 1}
              />

              <EscopoOption
                selected={escopo === 'todos'}
                onSelect={() => setEscopo('todos')}
                label="Todos da série"
                description={`De ${infoRecorrencia.primeiroMes} até ${infoRecorrencia.ultimoMes}`}
                count={infoRecorrencia.contagemPorEscopo.todos}
                warning={
                  infoRecorrencia.concluidos > 0
                    ? `${infoRecorrencia.concluidos} já ${action === 'editar' ? 'pagos/recebidos' : 'marcados como pagos'}`
                    : undefined
                }
              />
            </div>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              {action === 'editar'
                ? 'As alterações serão salvas neste lançamento.'
                : 'Esta ação não pode ser desfeita.'}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(isRecorrente ? escopo : 'apenas_este')}
            disabled={isLoading}
            className={cn(
              action === 'excluir' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {action === 'editar' ? 'Salvar' : 'Excluir'}
            {isRecorrente && escopo !== 'apenas_este' && (
              <span className="ml-1 opacity-80">
                ({escopo === 'este_e_proximos'
                  ? infoRecorrencia?.contagemPorEscopo.este_e_proximos
                  : infoRecorrencia?.contagemPorEscopo.todos})
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
