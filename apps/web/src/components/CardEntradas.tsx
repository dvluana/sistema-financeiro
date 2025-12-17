/**
 * CardEntradas Component
 *
 * Card modernizado para exibir entradas financeiras.
 * Design atualizado com melhor hierarquia visual e interações.
 */

import { useState } from 'react'
import { ChevronRight, Plus, TrendingUp, DollarSign, Check, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatarMoeda } from '@/lib/utils'
import { ItemListaWrapper } from './ItemListaWrapper'
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

  // Separa entradas pendentes e recebidas
  const entradasPendentes = entradas.filter(e => !e.concluido)
  const entradasRecebidas = entradas.filter(e => e.concluido)
  
  // Mostra apenas as 3 primeiras quando não expandido
  const entradasVisiveis = expandido 
    ? entradas 
    : entradas.slice(0, 3)

  const totalEntradas = totalRecebido + totalPendente
  const percentualRecebido = totalEntradas > 0 
    ? (totalRecebido / totalEntradas) * 100 
    : 0

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-verde/10">
              <TrendingUp className="w-4 h-4 text-verde" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Entradas</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {entradas.length} {entradas.length === 1 ? 'item' : 'itens'}
              </CardDescription>
            </div>
          </div>

          <Button
            onClick={onAdd}
            size="sm"
            className="bg-verde hover:bg-verde/90 text-white"
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
            <span className="text-lg font-bold text-verde">
              {formatarMoeda(totalEntradas)}
            </span>
          </div>

          {/* Barra de progresso visual */}
          <div className="space-y-2">
            <div className="flex gap-1 h-2">
              <motion.div
                className="bg-verde rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentualRecebido}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <div className="flex-1 bg-verde/20 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-verde">
                <Check className="w-3 h-3" />
                Recebido: {formatarMoeda(totalRecebido)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                Pendente: {formatarMoeda(totalPendente)}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de entradas */}
        {entradas.length === 0 ? (
          <div className="py-10 px-4 text-center">
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
              expandido ? "max-h-[400px]" : "max-h-[280px]"
            )}>
              <div className="divide-y">
                <AnimatePresence mode="popLayout">
                  {entradasVisiveis.map((entrada) => (
                    <motion.div
                      key={entrada.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
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
            {entradas.length > 3 && (
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
                    {expandido ? 'Mostrar menos' : `Ver todas (${entradas.length})`}
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
        {entradas.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-center gap-3">
            {entradasPendentes.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {entradasPendentes.length} pendente{entradasPendentes.length > 1 ? 's' : ''}
              </span>
            )}
            {entradasRecebidas.length > 0 && (
              <span className="text-xs text-verde flex items-center gap-1">
                <Check className="w-3 h-3" />
                {entradasRecebidas.length} recebida{entradasRecebidas.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}