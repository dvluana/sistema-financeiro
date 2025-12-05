/**
 * MesView Page
 *
 * Tela de visualização do mês com entradas, saídas e resultado.
 * Suporta filtro de pendentes quando acessado via dashboard.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { Header } from '@/components/Header'
import { CardEntradas } from '@/components/CardEntradas'
import { CardSaidas } from '@/components/CardSaidas'
import { CardResultado } from '@/components/CardResultado'
import { MesLoadingSkeleton } from '@/components/MesLoadingSkeleton'
import type { Lancamento } from '@/lib/api'

export type FiltroPendentes = 'pendentes-entrada' | 'pendentes-saida' | null

interface MesViewProps {
  filtro?: FiltroPendentes
  onFiltroChange?: (filtro: FiltroPendentes) => void
  onOpenConfig: () => void
  onEditLancamento: (lancamento: Lancamento) => void
  onAddEntrada: () => void
  onAddSaida: () => void
}

export function MesView({
  filtro,
  onFiltroChange,
  onOpenConfig,
  onEditLancamento,
  onAddEntrada,
  onAddSaida,
}: MesViewProps) {
  const {
    mesAtual,
    entradas,
    saidas,
    totais,
    configuracoes,
    isLoading,
    irParaMesAnterior,
    irParaProximoMes,
    carregarMes,
    carregarConfiguracoes,
    toggleConcluido,
  } = useFinanceiroStore()

  const [slideDirection, setSlideDirection] = useState(0)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const skeletonTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    carregarMes(mesAtual)
    carregarConfiguracoes()
  }, [])

  // Mostra skeleton apenas se loading demorar mais de 150ms
  useEffect(() => {
    if (isLoading) {
      skeletonTimeoutRef.current = setTimeout(() => {
        setShowSkeleton(true)
      }, 150)
    } else {
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current)
      }
      setShowSkeleton(false)
    }

    return () => {
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current)
      }
    }
  }, [isLoading])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    if (info.offset.x > threshold) {
      setSlideDirection(-1)
      irParaMesAnterior()
    } else if (info.offset.x < -threshold) {
      setSlideDirection(1)
      irParaProximoMes()
    }
  }

  const handleMesAnterior = () => {
    setSlideDirection(-1)
    irParaMesAnterior()
  }

  const handleProximoMes = () => {
    setSlideDirection(1)
    irParaProximoMes()
  }

  const limparFiltro = useCallback(() => {
    onFiltroChange?.(null)
  }, [onFiltroChange])

  // Configurações
  const mostrarConcluidosDiscretos = Boolean(configuracoes.mostrar_concluidos_discretos)

  // Aplica filtro de pendentes
  const entradasFiltradas = filtro === 'pendentes-entrada'
    ? entradas.filter(e => !e.concluido)
    : entradas

  const saidasFiltradas = filtro === 'pendentes-saida'
    ? saidas.filter(s => !s.concluido)
    : saidas

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutro-100 to-neutro-200 pb-20">
      <Header
        mes={mesAtual}
        onMesAnterior={handleMesAnterior}
        onProximoMes={handleProximoMes}
        onOpenConfig={onOpenConfig}
      />

      {/* Chip de filtro ativo */}
      {filtro && (
        <div className="max-w-[720px] mx-auto px-4 pt-2">
          <button
            onClick={limparFiltro}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rosa-light text-rosa text-pequeno rounded-full"
          >
            <span>
              {filtro === 'pendentes-entrada' ? 'Mostrando pendentes a receber' : 'Mostrando pendentes a pagar'}
            </span>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="max-w-[720px] mx-auto">
        <AnimatePresence mode="wait" initial={false}>
          {showSkeleton && isLoading ? (
            <MesLoadingSkeleton key="skeleton" />
          ) : (
            <motion.div
              key={mesAtual}
              initial={{ x: slideDirection * 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideDirection * -100, opacity: 0 }}
              transition={{ duration: 0.15 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              className="p-4 space-y-4"
            >
              <CardEntradas
                entradas={entradasFiltradas}
                jaEntrou={totais?.jaEntrou ?? 0}
                faltaEntrar={totais?.faltaEntrar ?? 0}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={toggleConcluido}
                onEdit={onEditLancamento}
                onAdd={onAddEntrada}
              />

              <CardSaidas
                saidas={saidasFiltradas}
                jaPaguei={totais?.jaPaguei ?? 0}
                faltaPagar={totais?.faltaPagar ?? 0}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={toggleConcluido}
                onEdit={onEditLancamento}
                onAdd={onAddSaida}
              />

              <CardResultado
                totalEntradas={totais?.entradas ?? 0}
                totalSaidas={totais?.saidas ?? 0}
                saldo={totais?.saldo ?? 0}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
