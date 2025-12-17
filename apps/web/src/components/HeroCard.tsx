/**
 * HeroCard Component
 *
 * Card principal mostrando resumo financeiro do mês.
 * Estrutura: Navegação → Saldo → Entradas/Saídas → Barra de gastos
 */

import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatarMes, formatarMoeda } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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

  // Cor da barra de gastos
  const corBarra = percentualGasto > 100
    ? "bg-vermelho"
    : percentualGasto > 80
      ? "bg-amber-500"
      : percentualGasto > 60
        ? "bg-yellow-500"
        : "bg-verde"

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

      {/* Saldo principal */}
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground mb-0.5">Saldo</p>
        <p className={cn(
          "text-3xl font-bold tabular-nums",
          saldoPositivo && "text-verde",
          saldoNegativo && "text-vermelho"
        )}>
          {saldoNegativo && "-"}
          {formatarMoeda(Math.abs(saldo))}
        </p>
      </div>

      {/* Entradas e Saídas - Grid 2 colunas */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Entradas */}
        <div className="p-3 rounded-xl bg-verde/5 border border-verde/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-verde" />
            <span className="text-xs text-muted-foreground">Entradas</span>
          </div>
          <p className="text-base font-semibold text-verde tabular-nums">
            {formatarMoeda(totalEntradas)}
          </p>
        </div>

        {/* Saídas */}
        <div className="p-3 rounded-xl bg-rosa/5 border border-rosa/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-rosa" />
            <span className="text-xs text-muted-foreground">Saídas</span>
          </div>
          <p className="text-base font-semibold text-rosa tabular-nums">
            {formatarMoeda(totalSaidas)}
          </p>
        </div>
      </div>

      {/* Barra de gastos - Embaixo, 100% largura */}
      <div className="p-3 rounded-xl bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Gastos do mês
          </span>
          <span className={cn(
            "text-xs font-semibold",
            percentualGasto > 80 ? "text-vermelho" : "text-foreground"
          )}>
            {percentualGasto.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", corBarra)}
            initial={{ width: 0 }}
            animate={{ width: `${percentualGasto}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        {totalEntradas > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            {percentualGasto <= 60 && "Ótimo! Você está gastando pouco."}
            {percentualGasto > 60 && percentualGasto <= 80 && "Atenção aos gastos."}
            {percentualGasto > 80 && percentualGasto <= 100 && "Cuidado! Gastos elevados."}
            {percentualGasto > 100 && "Alerta! Gastos excedem as entradas."}
          </p>
        )}
      </div>
    </motion.div>
  )
}
