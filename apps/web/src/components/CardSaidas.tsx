/**
 * CardSaidas Component
 *
 * Card que exibe a lista de saídas (despesas) do mês.
 * Header com totalizadores sempre visíveis para melhor UX.
 */

import { Plus, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ItemLista } from '@/components/ItemLista'
import { formatarMoeda } from '@/lib/utils'
import type { Lancamento } from '@/lib/api'

interface CardSaidasProps {
  saidas: Lancamento[]
  jaPaguei: number
  faltaPagar: number
  mostrarConcluidosDiscretos: boolean
  onToggle: (id: string) => void
  onEdit: (lancamento: Lancamento) => void
  onAdd: () => void
}

export function CardSaidas({
  saidas,
  jaPaguei,
  faltaPagar,
  mostrarConcluidosDiscretos,
  onToggle,
  onEdit,
  onAdd,
}: CardSaidasProps) {
  const isEmpty = saidas.length === 0
  const total = jaPaguei + faltaPagar

  return (
    <Card className="border-l-4 border-l-rosa overflow-hidden">
      {/* Header com totalizadores sempre visíveis */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rosa/10">
            <TrendingDown className="w-4 h-4 text-rosa" />
          </div>
          <div>
            <h3 className="text-titulo-card text-rosa leading-tight">Saídas</h3>
            <p className="text-micro text-neutro-500">{saidas.length} {saidas.length === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>

        {/* Mini totalizadores */}
        {!isEmpty && (
          <div className="flex gap-3 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-neutro-400">Pago</p>
              <p className="text-corpo-medium font-semibold text-rosa">{formatarMoeda(jaPaguei)}</p>
            </div>
            <div className="border-l border-neutro-200 pl-3">
              <p className="text-[10px] uppercase tracking-wide text-neutro-400">Pendente</p>
              <p className="text-corpo-medium font-semibold text-neutro-600">{formatarMoeda(faltaPagar)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Barra de progresso */}
      {!isEmpty && total > 0 && (
        <div className="mb-4">
          <div className="h-1.5 bg-neutro-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-rosa rounded-full transition-all duration-500"
              style={{ width: `${Math.min((jaPaguei / total) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {isEmpty ? (
          <p className="text-corpo text-neutro-600 text-center py-8">
            Nenhuma saída ainda
          </p>
        ) : (
          <div className="space-y-0">
            {saidas.map((saida) => (
              <ItemLista
                key={saida.id}
                tipo="saida"
                nome={saida.nome}
                valor={saida.valor}
                dataPrevista={saida.data_prevista}
                concluido={saida.concluido}
                categoria={saida.categoria}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={() => onToggle(saida.id)}
                onEdit={() => onEdit(saida)}
              />
            ))}
          </div>
        )}

        {/* Botão adicionar */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-rosa hover:text-rosa-hover hover:bg-rosa-light"
          onClick={onAdd}
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar saída
        </Button>
      </CardContent>
    </Card>
  )
}
