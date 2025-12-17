/**
 * HeroCard Component
 *
 * Card principal compacto mostrando resumo financeiro do mês.
 * Layout otimizado para ocupar menos espaço vertical.
 */

import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatarMes } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface HeroCardProps {
  mesSelecionado: string
  totalEntradas?: number
  totalSaidas?: number
  saldo?: number
  onMesAnterior: () => void
  onMesProximo: () => void
  onMesAtual: () => void
  podeAvancar: boolean
}

export function HeroCard({
  mesSelecionado,
  totalEntradas = 0,
  totalSaidas = 0,
  saldo = 0,
  onMesAnterior,
  onMesProximo,
  onMesAtual,
  podeAvancar,
}: HeroCardProps) {
  // Calcula porcentagem de gastos vs entradas
  const percentualGasto = totalEntradas > 0
    ? Math.min((totalSaidas / totalEntradas) * 100, 100)
    : 0

  // Status do saldo
  const saldoPositivo = saldo > 0
  const saldoNegativo = saldo < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      {/* Header - Navegação do mês */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMesAnterior}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <motion.h2
            key={mesSelecionado}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-semibold capitalize px-1"
          >
            {formatarMes(mesSelecionado)}
          </motion.h2>

          <Button
            variant="ghost"
            size="icon"
            onClick={onMesProximo}
            disabled={!podeAvancar}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onMesAtual}
          className="text-xs h-7 px-2.5"
        >
          <Calendar className="w-3 h-3 mr-1" />
          Hoje
        </Button>
      </div>

      {/* Saldo principal - Compacto */}
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground mb-0.5">
          {saldoPositivo ? 'Saldo positivo' : saldoNegativo ? 'Saldo negativo' : 'Saldo'}
        </p>
        <p className={cn(
          "text-3xl font-bold",
          saldoPositivo && "text-verde",
          saldoNegativo && "text-vermelho"
        )}>
          <span className="text-sm font-normal text-muted-foreground mr-1">R$</span>
          {Math.abs(saldo || 0).toFixed(2).replace('.', ',')}
        </p>
      </div>

      {/* Grid: Entradas | Saídas | Proporção */}
      <div className="grid grid-cols-3 gap-3">
        {/* Entradas */}
        <div className="p-3 rounded-xl bg-verde/5 border border-verde/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-verde" />
            <span className="text-xs text-muted-foreground">Entradas</span>
          </div>
          <p className="text-base font-semibold text-verde">
            R$ {(totalEntradas || 0).toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Saídas */}
        <div className="p-3 rounded-xl bg-rosa/5 border border-rosa/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-rosa" />
            <span className="text-xs text-muted-foreground">Saídas</span>
          </div>
          <p className="text-base font-semibold text-rosa">
            R$ {(totalSaidas || 0).toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Proporção de gastos */}
        <div className="p-3 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Gastos</span>
            <span className="text-xs font-medium">{percentualGasto.toFixed(0)}%</span>
          </div>
          <Progress
            value={percentualGasto}
            className="h-2 mt-2"
            indicatorClassName={cn(
              "transition-all",
              percentualGasto > 100 ? "bg-vermelho" :
              percentualGasto > 80 ? "bg-amber-500" :
              percentualGasto > 60 ? "bg-yellow-500" :
              "bg-verde"
            )}
          />
        </div>
      </div>
    </motion.div>
  )
}
