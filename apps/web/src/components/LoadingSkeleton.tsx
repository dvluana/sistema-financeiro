/**
 * LoadingSkeleton Component
 *
 * Skeleton de carregamento para os cards.
 * Exibe placeholders animados enquanto os dados são carregados.
 */

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
      {/* Circle */}
      <div className="w-7 h-7 rounded-full bg-neutro-200 animate-pulse" />
      {/* Content */}
      <div className="flex-1 space-y-2">
        <SkeletonLine className="w-3/4" />
        <SkeletonLine className="w-1/4" />
      </div>
      {/* Value */}
      <SkeletonLine className="w-20" />
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Card Entradas */}
      <Card>
        <SkeletonLine className="w-24 mb-4" />
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </Card>

      {/* Card Saídas */}
      <Card>
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
    </div>
  )
}
