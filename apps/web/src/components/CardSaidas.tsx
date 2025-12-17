/**
 * CardSaidas Component
 *
 * Card para exibir saídas financeiras e agrupadores.
 * Estrutura: Header → Lista → Resumo (barra no final)
 */

import { useState } from 'react'
import {
  ChevronDown,
  Plus,
  TrendingDown,
  CreditCard,
  Check,
  Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatarMoeda } from '@/lib/utils'
import { ItemListaWrapper } from './ItemListaWrapper'
import { ItemListaAgrupado } from './ItemListaAgrupado'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import type { Lancamento } from '@/lib/api'

interface CardSaidasProps {
  saidas: Lancamento[]
  agrupadores: Lancamento[]
  totalPago?: number
  totalPendente?: number
  onAdd: () => void
  onEdit: (lancamento: Lancamento) => void
  onToggle: (lancamento: Lancamento) => void
  onAddFilho?: (agrupador: Lancamento) => void
  onEditFilho?: (filho: Lancamento, agrupador: Lancamento) => void
  onToggleFilho?: (filho: Lancamento) => void
  mostrarConcluidosDiscretos?: boolean
}

export function CardSaidas({
  saidas,
  agrupadores,
  totalPago = 0,
  totalPendente = 0,
  onAdd,
  onEdit,
  onToggle,
  onAddFilho,
  onEditFilho,
  onToggleFilho,
  mostrarConcluidosDiscretos = false,
}: CardSaidasProps) {
  const [expandido, setExpandido] = useState(false)

  // Combina saídas normais (não agrupadores) com agrupadores
  // Filtra saídas para não duplicar agrupadores que já estão na lista de agrupadores
  const saidasNormais = saidas.filter(s => !s.is_agrupador)
  const todosItens = [...saidasNormais, ...agrupadores].sort((a, b) => {
    if (a.data_prevista && b.data_prevista) {
      return a.data_prevista.localeCompare(b.data_prevista)
    }
    return a.nome.localeCompare(b.nome)
  })

  const itensVisiveis = expandido
    ? todosItens
    : todosItens.slice(0, 5)

  const totalSaidas = totalPago + totalPendente
  const percentualPago = totalSaidas > 0
    ? (totalPago / totalSaidas) * 100
    : 0

  const totalAgrupadores = agrupadores.length

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      {/* Header simples */}
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rosa/10">
              <TrendingDown className="w-4 h-4 text-rosa" />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-none">Saídas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {todosItens.length} {todosItens.length === 1 ? 'item' : 'itens'}
                {totalAgrupadores > 0 && (
                  <span className="ml-1 text-muted-foreground/70">
                    ({totalAgrupadores} {totalAgrupadores === 1 ? 'grupo' : 'grupos'})
                  </span>
                )}
              </p>
            </div>
          </div>

          <Button
            onClick={onAdd}
            size="sm"
            className="bg-rosa hover:bg-rosa/90 text-white h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Lista de saídas (foco principal) */}
        {todosItens.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Nenhuma saída neste mês
            </p>
            <Button
              onClick={onAdd}
              size="sm"
              variant="outline"
              className="border-rosa/30 text-rosa hover:bg-rosa/5"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar saída
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className={cn(
              "w-full",
              expandido ? "max-h-[500px]" : "max-h-[360px]"
            )}>
              <div className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {itensVisiveis.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      {item.is_agrupador ? (
                        <ItemListaAgrupado
                          agrupador={item}
                          onEdit={() => onEdit(item)}
                          onToggle={() => onToggle(item)}
                          onAddFilho={() => onAddFilho && onAddFilho(item)}
                          onEditFilho={(filho) => onEditFilho && onEditFilho(filho, item)}
                          onToggleFilho={(filho) => onToggleFilho && onToggleFilho(filho)}
                          mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                        />
                      ) : (
                        <ItemListaWrapper
                          lancamento={item}
                          onEdit={() => onEdit(item)}
                          onToggle={() => onToggle(item)}
                          mostrarConcluidoDiscreto={mostrarConcluidosDiscretos && item.concluido}
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Botão expandir/recolher */}
            {todosItens.length > 5 && (
              <button
                type="button"
                onClick={() => setExpandido(!expandido)}
                className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 border-t"
              >
                {expandido ? 'Mostrar menos' : `Ver todos (${todosItens.length})`}
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform",
                  expandido && "rotate-180"
                )} />
              </button>
            )}

            {/* Resumo no final */}
            <div className="border-t bg-muted/30 px-4 py-3 space-y-2.5">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-rosa">
                  {formatarMoeda(totalSaidas)}
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-rosa rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentualPago}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              {/* Pago / Pendente */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-rosa">
                  <Check className="w-3 h-3" />
                  Pago: {formatarMoeda(totalPago)}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Pendente: {formatarMoeda(totalPendente)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
