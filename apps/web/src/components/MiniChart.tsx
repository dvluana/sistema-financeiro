/**
 * MiniChart Component
 *
 * Gráfico de barras moderno dos últimos 6 meses.
 * Design impactante com barras grossas, gradientes e animações suaves.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
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
  onMesClick?: (mes: string) => void
}

export function MiniChart({ dados, onMesClick }: MiniChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Encontra o maior valor para escala
  const maxValor = Math.max(...dados.flatMap(d => [d.entradas, d.saidas]), 1)

  // Calcula totais para exibir
  const totalEntradas = dados.reduce((acc, d) => acc + d.entradas, 0)
  const totalSaidas = dados.reduce((acc, d) => acc + d.saidas, 0)

  const handleBarClick = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  const handleBarDoubleClick = (mes: string) => {
    onMesClick?.(mes)
  }

  // Índice ativo para mostrar no tooltip (hover tem prioridade sobre click)
  const displayIndex = hoveredIndex ?? activeIndex

  return (
    <div className="space-y-4">
      {/* Legenda moderna no topo */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-verde/10">
            <TrendingUp className="w-4 h-4 text-verde" />
          </div>
          <div className="flex flex-col">
            <span className="text-micro font-medium text-neutro-600">Entradas</span>
            <span className="text-pequeno-medium text-verde">{formatarMoeda(totalEntradas)}</span>
          </div>
        </div>
        <div className="w-px h-8 bg-neutro-200" />
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-vermelho/10">
            <TrendingDown className="w-4 h-4 text-vermelho" />
          </div>
          <div className="flex flex-col">
            <span className="text-micro font-medium text-neutro-600">Saídas</span>
            <span className="text-pequeno-medium text-vermelho">{formatarMoeda(totalSaidas)}</span>
          </div>
        </div>
      </div>

      {/* Área do gráfico */}
      <div className="relative">
        {/* Tooltip flutuante */}
        <AnimatePresence>
          {displayIndex !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="bg-neutro-900 text-white px-4 py-2.5 rounded-xl shadow-lg">
                <p className="text-micro font-medium text-neutro-300 mb-1.5 text-center">
                  {dados[displayIndex].label}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-verde" />
                    <span className="text-pequeno font-medium text-verde-light">
                      {formatarMoeda(dados[displayIndex].entradas)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-vermelho" />
                    <span className="text-pequeno font-medium text-rosa-light">
                      {formatarMoeda(dados[displayIndex].saidas)}
                    </span>
                  </div>
                </div>
                {/* Seta do tooltip */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-neutro-900 rotate-45" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gráfico de barras */}
        <div className={cn(
          'h-[140px] flex items-end justify-between gap-3 px-1',
          displayIndex !== null && 'pt-16' // Espaço para o tooltip
        )}>
          {dados.map((item, index) => {
            const alturaEntradas = (item.entradas / maxValor) * 100
            const alturaSaidas = (item.saidas / maxValor) * 100
            const isActive = displayIndex === index

            return (
              <motion.div
                key={item.mes}
                className="flex-1 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Barras */}
                <button
                  type="button"
                  onClick={() => handleBarClick(index)}
                  onDoubleClick={() => handleBarDoubleClick(item.mes)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={cn(
                    'flex items-end gap-1 h-[100px] w-full justify-center rounded-lg py-1 transition-all',
                    'hover:bg-neutro-100/50',
                    isActive && 'bg-neutro-100'
                  )}
                >
                  {/* Barra de entradas */}
                  <motion.div
                    className={cn(
                      'w-4 sm:w-5 rounded-t-md transition-all duration-200',
                      'bg-gradient-to-t from-verde to-verde-light',
                      isActive && 'shadow-md shadow-verde/30'
                    )}
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.max(alturaEntradas, 4)}%`,
                      scale: isActive ? 1.05 : 1
                    }}
                    transition={{
                      height: { duration: 0.5, delay: index * 0.08, ease: 'easeOut' },
                      scale: { duration: 0.15 }
                    }}
                  />
                  {/* Barra de saídas */}
                  <motion.div
                    className={cn(
                      'w-4 sm:w-5 rounded-t-md transition-all duration-200',
                      'bg-gradient-to-t from-vermelho to-rosa',
                      isActive && 'shadow-md shadow-vermelho/30'
                    )}
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.max(alturaSaidas, 4)}%`,
                      scale: isActive ? 1.05 : 1
                    }}
                    transition={{
                      height: { duration: 0.5, delay: index * 0.08 + 0.1, ease: 'easeOut' },
                      scale: { duration: 0.15 }
                    }}
                  />
                </button>

                {/* Label do mês */}
                <span className={cn(
                  'text-micro font-medium mt-2 transition-colors',
                  isActive ? 'text-neutro-900' : 'text-neutro-500'
                )}>
                  {item.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Dica de interação */}
      <p className="text-center text-micro text-neutro-400">
        Toque em uma barra para ver detalhes
      </p>
    </div>
  )
}
