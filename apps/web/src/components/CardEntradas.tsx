/**
 * CardEntradas Component
 *
 * Card que exibe a lista de entradas (receitas) do mês.
 * Header com totalizadores sempre visíveis para melhor UX.
 */

import { Plus, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ItemLista } from '@/components/ItemLista'
import { formatarMoeda } from '@/lib/utils'
import type { Lancamento } from '@/lib/api'

interface CardEntradasProps {
  entradas: Lancamento[]
  jaEntrou: number
  faltaEntrar: number
  mostrarConcluidosDiscretos: boolean
  onToggle: (id: string) => void
  onEdit: (lancamento: Lancamento) => void
  onAdd: () => void
}

export function CardEntradas({
  entradas,
  jaEntrou,
  faltaEntrar,
  mostrarConcluidosDiscretos,
  onToggle,
  onEdit,
  onAdd,
}: CardEntradasProps) {
  const isEmpty = entradas.length === 0
  const total = jaEntrou + faltaEntrar

  return (
    <Card className="border-l-4 border-l-verde overflow-hidden">
      {/* Header com totalizadores sempre visíveis */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-verde/10">
            <TrendingUp className="w-4 h-4 text-verde" />
          </div>
          <div>
            <h3 className="text-titulo-card text-verde leading-tight">Entradas</h3>
            <p className="text-micro text-muted-foreground">{entradas.length} {entradas.length === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>

        {/* Mini totalizadores */}
        {!isEmpty && (
          <div className="flex gap-3 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recebido</p>
              <p className="text-corpo-medium font-semibold text-verde">{formatarMoeda(jaEntrou)}</p>
            </div>
            <div className="border-l border-border pl-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pendente</p>
              <p className="text-corpo-medium font-semibold text-muted-foreground">{formatarMoeda(faltaEntrar)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      {!isEmpty && total > 0 && (
        <div className="mb-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-verde rounded-full transition-all duration-500"
              style={{ width: `${Math.min((jaEntrou / total) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {isEmpty ? (
          <p className="text-corpo text-muted-foreground text-center py-8">
            Nenhuma entrada ainda
          </p>
        ) : (
          <div className="space-y-0">
            {entradas.map((entrada) => (
              <ItemLista
                key={entrada.id}
                tipo="entrada"
                nome={entrada.nome}
                valor={entrada.valor}
                dataPrevista={entrada.data_prevista}
                concluido={entrada.concluido}
                categoria={entrada.categoria}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={() => onToggle(entrada.id)}
                onEdit={() => onEdit(entrada)}
              />
            ))}
          </div>
        )}

        {/* Botão adicionar */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-verde hover:text-verde-hover hover:bg-verde-bg"
          onClick={onAdd}
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar entrada
        </Button>
      </CardContent>
    </Card>
  )
}
