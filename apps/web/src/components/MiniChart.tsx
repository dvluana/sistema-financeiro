/**
 * MiniChart Component
 *
 * Gráfico de barras moderno com barras sobrepostas.
 * Design impactante com gradientes e animações suaves.
 * Navegação de período e tooltip interativo.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MesData {
  mes: string
  label: string
  entradas: number
  saidas: number
}

interface MiniChartProps {
  dados: MesData[]
  periodo?: string
  onMesClick?: (mes: string) => void
  onPeriodoAnterior?: () => void
  onPeriodoProximo?: () => void
  podeVoltar?: boolean
  podeAvancar?: boolean
  isLoading?: boolean
}

// Altura máxima das barras em pixels
const ALTURA_MAX = 120
// Altura mínima para barras com valor > 0
const ALTURA_MIN = 8

/**
 * Calcula altura proporcional da barra
 */
function calcularAltura(valor: number, maxValor: number): number {
  if (maxValor === 0 || valor === 0) return 0
  const altura = (valor / maxValor) * ALTURA_MAX
  return Math.max(altura, ALTURA_MIN)
}

/**
 * Formata o período para exibição (ex: "Jul - Dez 2025")
 */
function formatarPeriodo(dados: MesData[]): string {
  if (dados.length === 0) return ''

  const primeiro = dados[0]
  const ultimo = dados[dados.length - 1]

  const [anoInicio] = primeiro.mes.split('-')
  const [anoFim] = ultimo.mes.split('-')

  if (anoInicio === anoFim) {
    return `${primeiro.label} - ${ultimo.label} ${anoFim}`
  }
  return `${primeiro.label} ${anoInicio} - ${ultimo.label} ${anoFim}`
}

export function MiniChart({
  dados,
  periodo,
  onMesClick,
  onPeriodoAnterior,
  onPeriodoProximo,
  podeVoltar = false,
  podeAvancar = false,
  isLoading = false,
}: MiniChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isPressing, setIsPressing] = useState(false)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Encontra o maior valor para escala (entre entradas e saídas)
  const maxValor = Math.max(...dados.flatMap(d => [d.entradas, d.saidas]), 1)

  // Calcula totais do período
  const totalEntradas = dados.reduce((acc, d) => acc + d.entradas, 0)
  const totalSaidas = dados.reduce((acc, d) => acc + d.saidas, 0)

  // Período formatado
  const periodoDisplay = periodo || formatarPeriodo(dados)

  // Limpa timeout do tooltip ao desmontar
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
      if (pressTimer) {
        clearTimeout(pressTimer)
      }
    }
  }, [pressTimer])

  const handleBarClick = (index: number) => {
    // Se já está ativo, desativa
    if (activeIndex === index) {
      setActiveIndex(null)
      return
    }

    setActiveIndex(index)

    // Auto-hide tooltip após 3 segundos
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveIndex(null)
    }, 3000)
  }

  const handlePressStart = (index: number) => {
    setIsPressing(true)
    const timer = setTimeout(() => {
      // Long press - navega para o mês
      if (onMesClick) {
        onMesClick(dados[index].mes)
      }
    }, 500)
    setPressTimer(timer)
  }

  const handlePressEnd = () => {
    setIsPressing(false)
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }

  // Click fora fecha tooltip
  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-bar]')) return
    setActiveIndex(null)
  }

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-neutro-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-neutro-200 rounded animate-pulse" />
        </div>
        {/* Barras skeleton */}
        <div className="flex items-end justify-between gap-3 h-[140px]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-8 bg-neutro-200 rounded-t-md animate-pulse"
                style={{ height: `${40 + Math.random() * 60}px` }}
              />
              <div className="h-4 w-8 bg-neutro-200 rounded mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Estado vazio
  if (dados.length === 0 || dados.every(d => d.entradas === 0 && d.saidas === 0)) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rosa" />
              <span className="text-micro text-neutro-600">Entradas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-neutro-300" />
              <span className="text-micro text-neutro-600">Saídas</span>
            </div>
          </div>
        </div>
        {/* Barras fantasma */}
        <div className="flex items-end justify-between gap-3 h-[140px] relative">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-8 h-10 bg-neutro-100 rounded-t-md" />
              <span className="text-[11px] font-medium mt-2 text-neutro-400">---</span>
            </div>
          ))}
          {/* Mensagem centralizada */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-pequeno text-neutro-400 bg-white/80 px-3 py-1.5 rounded-lg">
              Sem lançamentos neste período
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3" onClick={handleContainerClick}>
      {/* Header com legenda e navegação */}
      <div className="flex items-center justify-between">
        {/* Legenda com totais */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rosa" />
            <span className="text-micro text-neutro-600">Entradas</span>
            <span className="text-micro font-semibold text-verde ml-0.5">
              {formatarMoeda(totalEntradas)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutro-300" />
            <span className="text-micro text-neutro-600">Saídas</span>
            <span className="text-micro font-semibold text-vermelho ml-0.5">
              {formatarMoeda(totalSaidas)}
            </span>
          </div>
        </div>

        {/* Navegação de período */}
        {(onPeriodoAnterior || onPeriodoProximo) && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPeriodoAnterior}
              disabled={!podeVoltar}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
                'hover:bg-neutro-100 active:scale-95',
                !podeVoltar && 'opacity-30 cursor-not-allowed'
              )}
              aria-label="Período anterior"
            >
              <ChevronLeft className="w-4 h-4 text-neutro-600" />
            </button>
            <span className="text-micro text-neutro-500 min-w-[90px] text-center">
              {periodoDisplay}
            </span>
            <button
              type="button"
              onClick={onPeriodoProximo}
              disabled={!podeAvancar}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
                'hover:bg-neutro-100 active:scale-95',
                !podeAvancar && 'opacity-30 cursor-not-allowed'
              )}
              aria-label="Próximo período"
            >
              <ChevronRight className="w-4 h-4 text-neutro-600" />
            </button>
          </div>
        )}
      </div>

      {/* Gráfico de barras sobrepostas */}
      <div className="flex items-end justify-between gap-3 h-[140px]">
        {dados.map((item, index) => {
          const alturaEntradas = calcularAltura(item.entradas, maxValor)
          const alturaSaidas = calcularAltura(item.saidas, maxValor)
          const isActive = activeIndex === index
          const saldo = item.entradas - item.saidas

          return (
            <motion.div
              key={item.mes}
              className="flex-1 flex flex-col items-center relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Tooltip */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-[90px] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  >
                    <div className="bg-white border border-neutro-300 px-3 py-2.5 rounded-lg shadow-lg whitespace-nowrap">
                      <p className="text-micro font-semibold text-neutro-900 mb-1.5">
                        {item.label} {item.mes.split('-')[0]}
                      </p>
                      <div className="space-y-1">
                        <p className="text-micro text-neutro-600">
                          Entrou <span className="font-medium text-verde">{formatarMoeda(item.entradas)}</span>
                        </p>
                        <p className="text-micro text-neutro-600">
                          Saiu <span className="font-medium text-vermelho">{formatarMoeda(item.saidas)}</span>
                        </p>
                        <p className="text-micro font-medium pt-1 border-t border-neutro-200">
                          Saldo{' '}
                          <span className={saldo >= 0 ? 'text-verde' : 'text-vermelho'}>
                            {saldo >= 0 ? '+' : ''}{formatarMoeda(saldo)}
                          </span>
                        </p>
                      </div>
                      {/* Seta do tooltip */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-neutro-300 rotate-45" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Container das barras sobrepostas */}
              <button
                type="button"
                data-bar
                onClick={() => handleBarClick(index)}
                onMouseDown={() => handlePressStart(index)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(index)}
                onTouchEnd={handlePressEnd}
                className={cn(
                  'relative w-full flex justify-center h-[120px] items-end',
                  'rounded-md transition-all',
                  isActive && 'bg-neutro-100/50',
                  isPressing && 'scale-105'
                )}
              >
                {/* Barra de saídas (trás) - cinza */}
                <motion.div
                  className="absolute bottom-0 w-8 bg-neutro-200 rounded-t-md"
                  initial={{ height: 0 }}
                  animate={{ height: alturaSaidas }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: 'easeOut',
                  }}
                />

                {/* Barra de entradas (frente) - gradiente rosa */}
                <motion.div
                  className={cn(
                    'relative w-8 rounded-t-md',
                    'bg-gradient-to-t from-rosa to-[#FF6B81]',
                    isActive && 'shadow-md shadow-rosa/30'
                  )}
                  initial={{ height: 0 }}
                  animate={{
                    height: alturaEntradas,
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{
                    height: { duration: 0.4, delay: index * 0.05 + 0.08, ease: 'easeOut' },
                    scale: { duration: 0.15 },
                  }}
                />
              </button>

              {/* Label do mês */}
              <span
                className={cn(
                  'text-[13px] font-medium mt-2 transition-colors',
                  isActive ? 'text-neutro-900 font-semibold' : 'text-neutro-500'
                )}
              >
                {item.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Dica de interação */}
      {activeIndex === null && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-[11px] text-neutro-400"
        >
          Toque para ver detalhes
        </motion.p>
      )}
    </div>
  )
}
