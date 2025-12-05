/**
 * MesLoadingSkeleton Component
 *
 * Skeleton de carregamento rápido para troca de mês.
 * Aparece com fade suave apenas se o carregamento demorar.
 */

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-4 bg-neutro-200 rounded animate-pulse ${className}`}
    />
  )
}

function SkeletonItem() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-neutro-200 last:border-0">
      <div className="w-7 h-7 rounded-full bg-neutro-200 animate-pulse" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="w-3/4" />
        <SkeletonLine className="w-1/4" />
      </div>
      <SkeletonLine className="w-20" />
    </div>
  )
}

export function MesLoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-4 p-4"
    >
      {/* Card Entradas */}
      <Card className="border-l-4 border-l-verde">
        <SkeletonLine className="w-24 mb-4" />
        <SkeletonItem />
        <SkeletonItem />
      </Card>

      {/* Card Saídas */}
      <Card className="border-l-4 border-l-rosa">
        <SkeletonLine className="w-20 mb-4" />
        <SkeletonItem />
        <SkeletonItem />
      </Card>

      {/* Card Resultado */}
      <Card>
        <div className="space-y-3">
          <div className="flex justify-between">
            <SkeletonLine className="w-20" />
            <SkeletonLine className="w-24" />
          </div>
          <div className="flex justify-between">
            <SkeletonLine className="w-16" />
            <SkeletonLine className="w-24" />
          </div>
          <div className="border-t border-neutro-200 pt-3" />
          <div className="flex justify-between">
            <SkeletonLine className="w-12" />
            <SkeletonLine className="w-28 h-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
