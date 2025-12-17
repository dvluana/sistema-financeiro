/**
 * HeroCard Component
 *
 * Card principal modernizado mostrando resumo financeiro do mês.
 * Design atualizado com gradientes suaves e animações.
 */

import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatarMes } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  const saldoStatus = saldo > 0 ? 'positivo' : saldo < 0 ? 'negativo' : 'neutro'
  
  const saldoConfig = {
    positivo: {
      color: 'text-verde',
      bgColor: 'bg-verde/10',
      borderColor: 'border-verde/20',
      icon: TrendingUp,
      label: 'Saldo positivo',
    },
    negativo: {
      color: 'text-vermelho',
      bgColor: 'bg-vermelho/10',
      borderColor: 'border-vermelho/20',
      icon: TrendingDown,
      label: 'Saldo negativo',
    },
    neutro: {
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-border',
      icon: Calendar,
      label: 'Saldo zerado',
    },
  }[saldoStatus]

  const StatusIcon = saldoConfig.icon

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative overflow-hidden",
          "rounded-2xl border border-border",
          "bg-gradient-to-br from-background via-background to-muted/30",
          "p-6 shadow-sm"
        )}
      >
        {/* Background decorativo */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-2xl" />

        {/* Header com navegação de mês */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMesAnterior}
                  className="h-8 w-8 rounded-lg hover:bg-primary/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mês anterior</TooltipContent>
            </Tooltip>

            <motion.h2 
              key={mesSelecionado}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-lg lg:text-xl font-semibold capitalize px-2"
            >
              {formatarMes(mesSelecionado)}
            </motion.h2>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMesProximo}
                  disabled={!podeAvancar}
                  className="h-8 w-8 rounded-lg hover:bg-primary/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {podeAvancar ? 'Próximo mês' : 'Não é possível avançar'}
              </TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onMesAtual}
                className="text-xs h-8 px-3"
              >
                <Calendar className="w-3 h-3 mr-1" />
                Hoje
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ir para o mês atual</TooltipContent>
          </Tooltip>
        </div>

        {/* Saldo principal */}
        <div className="relative space-y-6">
          <motion.div
            key={`${mesSelecionado}-${saldo}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs px-2 py-0.5",
                  saldoConfig.bgColor,
                  saldoConfig.borderColor,
                  saldoConfig.color
                )}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {saldoConfig.label}
              </Badge>
            </div>
            
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <motion.span 
                className={cn(
                  "text-4xl font-bold",
                  saldoConfig.color
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {Math.abs(saldo || 0).toFixed(2).replace('.', ',')}
              </motion.span>
            </div>
          </motion.div>

          {/* Cards de entradas e saídas */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={cn(
                "p-4 rounded-xl",
                "bg-gradient-to-br from-verde/5 to-verde/10",
                "border border-verde/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-verde">Entradas</span>
                <TrendingUp className="w-4 h-4 text-verde/50" />
              </div>
              <p className="text-xl font-bold text-verde">
                R$ {(totalEntradas || 0).toFixed(2).replace('.', ',')}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className={cn(
                "p-4 rounded-xl",
                "bg-gradient-to-br from-rosa/5 to-rosa/10",
                "border border-rosa/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-rosa">Saídas</span>
                <TrendingDown className="w-4 h-4 text-rosa/50" />
              </div>
              <p className="text-xl font-bold text-rosa">
                R$ {(totalSaidas || 0).toFixed(2).replace('.', ',')}
              </p>
            </motion.div>
          </div>

          {/* Barra de progresso de gastos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Proporção de gastos</span>
              <span className="font-medium">
                {percentualGasto.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={percentualGasto} 
              className="h-2"
              indicatorClassName={cn(
                "transition-all duration-500",
                percentualGasto > 100 ? "bg-vermelho" :
                percentualGasto > 80 ? "bg-amber-500" :
                percentualGasto > 60 ? "bg-yellow-500" :
                "bg-verde"
              )}
            />
            <p className="text-xs text-muted-foreground text-center">
              {percentualGasto > 100 
                ? 'Gastos acima das entradas!'
                : percentualGasto > 80
                ? 'Atenção com os gastos'
                : percentualGasto > 60
                ? 'Gastos moderados'
                : 'Gastos controlados'
              }
            </p>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}