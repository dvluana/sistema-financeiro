/**
 * CardEntradas Component
 *
 * Card para exibir entradas financeiras.
 * Estrutura: Header → Lista → Resumo (barra no final)
 */

import { useState } from 'react'
import { ChevronDown, Plus, TrendingUp, DollarSign, Check, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatarMoeda } from '@/lib/utils'
import { ItemListaWrapper } from './ItemListaWrapper'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import type { Lancamento } from '@/lib/api'

interface CardEntradasProps {
  entradas: Lancamento[]
  totalRecebido?: number
  totalPendente?: number
  onAdd: () => void
  onEdit: (lancamento: Lancamento) => void
  onToggle: (lancamento: Lancamento) => void
  mostrarConcluidosDiscretos?: boolean
}

export function CardEntradas({
  entradas,
  totalRecebido = 0,
  totalPendente = 0,
  onAdd,
  onEdit,
  onToggle,
  mostrarConcluidosDiscretos = false,
}: CardEntradasProps) {
  const [expandido, setExpandido] = useState(false)

  const entradasVisiveis = expandido
    ? entradas
    : entradas.slice(0, 5)

  const totalEntradas = totalRecebido + totalPendente
  const percentualRecebido = totalEntradas > 0
    ? (totalRecebido / totalEntradas) * 100
    : 0

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      {/* Header simples */}
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-verde/10">
              <TrendingUp className="w-4 h-4 text-verde" />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-none">Entradas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entradas.length} {entradas.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
          </div>

          <Button
            onClick={onAdd}
            size="sm"
            className="bg-verde hover:bg-verde/90 text-white h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Lista de entradas (foco principal) */}
        {entradas.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Nenhuma entrada neste mês
            </p>
            <Button
              onClick={onAdd}
              size="sm"
              variant="outline"
              className="border-verde/30 text-verde hover:bg-verde/5"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar entrada
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className={cn(
              "w-full",
              expandido ? "max-h-[300px] sm:max-h-[400px]" : "max-h-[240px] sm:max-h-[300px]"
            )}>
              <div className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {entradasVisiveis.map((entrada) => (
                    <motion.div
                      key={entrada.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ItemListaWrapper
                        lancamento={entrada}
                        onEdit={() => onEdit(entrada)}
                        onToggle={() => onToggle(entrada)}
                        mostrarConcluidoDiscreto={mostrarConcluidosDiscretos && entrada.concluido}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Botão expandir/recolher */}
            {entradas.length > 5 && (
              <button
                type="button"
                onClick={() => setExpandido(!expandido)}
                className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 border-t"
              >
                {expandido ? 'Mostrar menos' : `Ver todos (${entradas.length})`}
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
                <span className="text-lg font-bold text-verde">
                  {formatarMoeda(totalEntradas)}
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-verde rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentualRecebido}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              {/* Recebido / Pendente */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-verde">
                  <Check className="w-3 h-3" />
                  Recebido: {formatarMoeda(totalRecebido)}
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
