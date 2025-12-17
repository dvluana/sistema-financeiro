/**
 * CardSaidas Component
 *
 * Card modernizado para exibir saídas financeiras e agrupadores.
 * Design atualizado com melhor hierarquia visual e suporte a itens agrupados.
 */

import { useState } from 'react'
import { 
  ChevronRight, 
  Plus, 
  TrendingDown, 
  CreditCard, 
  Check, 
  Clock,
  Package
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
  CardDescription,
  CardHeader,
  CardTitle,
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

  // Combina saídas normais e agrupadores
  const todosItens = [...saidas, ...agrupadores].sort((a, b) => {
    // Ordena por data prevista, depois por nome
    if (a.data_prevista && b.data_prevista) {
      return a.data_prevista.localeCompare(b.data_prevista)
    }
    return a.nome.localeCompare(b.nome)
  })

  // Separa pendentes e pagos
  const itensPendentes = todosItens.filter(item => {
    if (item.is_agrupador && item.filhos) {
      return item.filhos.some(f => !f.concluido)
    }
    return !item.concluido
  })

  const itensPagos = todosItens.filter(item => {
    if (item.is_agrupador && item.filhos) {
      return item.filhos.every(f => f.concluido)
    }
    return item.concluido
  })

  // Mostra apenas os primeiros itens quando não expandido
  const itensVisiveis = expandido 
    ? todosItens 
    : todosItens.slice(0, 4)

  const totalSaidas = totalPago + totalPendente
  const percentualPago = totalSaidas > 0 
    ? (totalPago / totalSaidas) * 100 
    : 0

  // Conta agrupadores e itens simples
  const totalAgrupadores = agrupadores.length
  // const totalSaidasSimples = saidas.length

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rosa/10">
              <TrendingDown className="w-4 h-4 text-rosa" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Saídas</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {todosItens.length} {todosItens.length === 1 ? 'item' : 'itens'}
                {totalAgrupadores > 0 && (
                  <span className="ml-1">
                    ({totalAgrupadores} {totalAgrupadores === 1 ? 'grupo' : 'grupos'})
                  </span>
                )}
              </CardDescription>
            </div>
          </div>

          <Button
            onClick={onAdd}
            size="sm"
            className="bg-rosa hover:bg-rosa/90 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Resumo de valores */}
        <div className="px-4 py-3 space-y-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold text-rosa">
              {formatarMoeda(totalSaidas)}
            </span>
          </div>

          {/* Barra de progresso visual */}
          <div className="space-y-2">
            <div className="flex gap-1 h-2">
              <motion.div
                className="bg-rosa rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentualPago}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <div className="flex-1 bg-rosa/20 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-rosa">
                <Check className="w-3 h-3" />
                Pago: {formatarMoeda(totalPago)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                Pendente: {formatarMoeda(totalPendente)}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de saídas */}
        {todosItens.length === 0 ? (
          <div className="py-10 px-4 text-center">
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
              <div className="divide-y">
                <AnimatePresence mode="popLayout">
                  {itensVisiveis.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
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
            {todosItens.length > 4 && (
              <motion.div 
                className="border-t"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => setExpandido(!expandido)}
                  className="w-full py-3 h-auto text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1">
                    {expandido ? 'Mostrar menos' : `Ver todas (${todosItens.length})`}
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      expandido ? "rotate-90" : ""
                    )} />
                  </span>
                </Button>
              </motion.div>
            )}
          </>
        )}

        {/* Indicadores de status */}
        {todosItens.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-center gap-3 flex-wrap">
            {itensPendentes.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {itensPendentes.length} pendente{itensPendentes.length > 1 ? 's' : ''}
              </span>
            )}
            {itensPagos.length > 0 && (
              <span className="text-xs text-verde flex items-center gap-1">
                <Check className="w-3 h-3" />
                {itensPagos.length} paga{itensPagos.length > 1 ? 's' : ''}
              </span>
            )}
            {totalAgrupadores > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Package className="w-3 h-3" />
                {totalAgrupadores} grupo{totalAgrupadores > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}