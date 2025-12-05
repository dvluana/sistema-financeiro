/**
 * MiniChart Component
 *
 * Gráfico de barras minimalista dos últimos 6 meses.
 * Usa apenas CSS, sem bibliotecas externas.
 */

import { useState } from 'react'
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
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null)

  // Encontra o maior valor para escala
  const maxValor = Math.max(...dados.flatMap(d => [d.entradas, d.saidas]), 1)

  const handleBarClick = (index: number) => {
    if (tooltipIndex === index) {
      setTooltipIndex(null)
    } else {
      setTooltipIndex(index)
    }
  }

  const handleLongPress = (mes: string) => {
    onMesClick?.(mes)
  }

  return (
    <div className="h-[120px] flex items-end justify-between gap-2 px-2">
      {dados.map((item, index) => {
        const alturaEntradas = (item.entradas / maxValor) * 100
        const alturaSaidas = (item.saidas / maxValor) * 100

        return (
          <div
            key={item.mes}
            className="flex-1 flex flex-col items-center relative"
          >
            {/* Tooltip */}
            {tooltipIndex === index && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-neutro-900 text-white text-micro px-2 py-1.5 rounded shadow-lg whitespace-nowrap z-10">
                <p className="text-verde">{formatarMoeda(item.entradas)}</p>
                <p className="text-vermelho">{formatarMoeda(item.saidas)}</p>
              </div>
            )}

            {/* Barras */}
            <button
              type="button"
              onClick={() => handleBarClick(index)}
              onDoubleClick={() => handleLongPress(item.mes)}
              className="flex items-end gap-0.5 h-[90px] w-full justify-center"
            >
              {/* Barra de entradas */}
              <div
                className={cn(
                  'w-3 bg-verde rounded-t transition-all',
                  tooltipIndex === index && 'opacity-80'
                )}
                style={{ height: `${Math.max(alturaEntradas, 2)}%` }}
              />
              {/* Barra de saídas */}
              <div
                className={cn(
                  'w-3 bg-vermelho rounded-t transition-all',
                  tooltipIndex === index && 'opacity-80'
                )}
                style={{ height: `${Math.max(alturaSaidas, 2)}%` }}
              />
            </button>

            {/* Label do mês */}
            <span className="text-micro text-neutro-500 mt-1">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
