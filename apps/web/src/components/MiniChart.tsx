/**
 * MiniChart Component
 *
 * Gráfico de barras moderno dos últimos 6 meses.
 * Design impactante com barras grossas, gradientes e animações suaves.
 * Totalmente otimizado para dispositivos móveis.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <div className="space-y-3">
      {/* Legenda compacta otimizada para mobile */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-t from-verde to-verde-light" />
          <span className="text-micro text-neutro-600">Entradas</span>
          <span className="text-micro font-semibold text-verde ml-1">
            {formatarMoeda(totalEntradas)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-t from-vermelho to-rosa" />
          <span className="text-micro text-neutro-600">Saídas</span>
          <span className="text-micro font-semibold text-vermelho ml-1">
            {formatarMoeda(totalSaidas)}
          </span>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="flex items-end justify-between gap-1 sm:gap-2 h-[130px]">
        {dados.map((item, index) => {
          const alturaEntradas = (item.entradas / maxValor) * 100
          const alturaSaidas = (item.saidas / maxValor) * 100
          const isActive = displayIndex === index

          return (
            <motion.div
              key={item.mes}
              className="flex-1 flex flex-col items-center relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Tooltip posicionado sobre a barra ativa */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-[70px] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  >
                    <div className="bg-neutro-900 text-white px-2.5 py-2 rounded-lg shadow-lg whitespace-nowrap">
                      <p className="text-[11px] font-medium text-neutro-300 mb-1 text-center">
                        {item.label}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-verde shrink-0" />
                          <span className="text-[11px] font-medium text-verde-light">
                            {formatarMoeda(item.entradas)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-vermelho shrink-0" />
                          <span className="text-[11px] font-medium text-rosa-light">
                            {formatarMoeda(item.saidas)}
                          </span>
                        </div>
                      </div>
                      {/* Seta do tooltip */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutro-900 rotate-45" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Barras */}
              <button
                type="button"
                onClick={() => handleBarClick(index)}
                onDoubleClick={() => handleBarDoubleClick(item.mes)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  'flex items-end gap-0.5 h-[95px] w-full justify-center rounded-md px-0.5 py-1 transition-all',
                  'active:scale-95',
                  isActive && 'bg-neutro-100'
                )}
              >
                {/* Barra de entradas */}
                <motion.div
                  className={cn(
                    'w-3 sm:w-4 rounded-t transition-all duration-200',
                    'bg-gradient-to-t from-verde to-verde-light',
                    isActive && 'shadow-sm shadow-verde/40'
                  )}
                  initial={{ height: 0 }}
                  animate={{
                    height: `${Math.max(alturaEntradas, 6)}%`,
                    scale: isActive ? 1.08 : 1
                  }}
                  transition={{
                    height: { duration: 0.5, delay: index * 0.06, ease: 'easeOut' },
                    scale: { duration: 0.15 }
                  }}
                />
                {/* Barra de saídas */}
                <motion.div
                  className={cn(
                    'w-3 sm:w-4 rounded-t transition-all duration-200',
                    'bg-gradient-to-t from-vermelho to-rosa',
                    isActive && 'shadow-sm shadow-vermelho/40'
                  )}
                  initial={{ height: 0 }}
                  animate={{
                    height: `${Math.max(alturaSaidas, 6)}%`,
                    scale: isActive ? 1.08 : 1
                  }}
                  transition={{
                    height: { duration: 0.5, delay: index * 0.06 + 0.08, ease: 'easeOut' },
                    scale: { duration: 0.15 }
                  }}
                />
              </button>

              {/* Label do mês */}
              <span className={cn(
                'text-[11px] font-medium mt-1.5 transition-colors',
                isActive ? 'text-neutro-900' : 'text-neutro-500'
              )}>
                {item.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Dica de interação - apenas quando nada selecionado */}
      {displayIndex === null && (
        <p className="text-center text-[11px] text-neutro-400">
          Toque para ver detalhes
        </p>
      )}
    </div>
  )
}
