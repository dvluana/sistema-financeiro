/**
 * QuickInputFAB Component
 *
 * Botão flutuante de ação rápida para abrir o lançamento por texto.
 * Posicionado no canto inferior direito, acima da BottomTabBar.
 */

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickInputFABProps {
  onClick: () => void
  className?: string
}

export function QuickInputFAB({ onClick, className }: QuickInputFABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Posicionamento fixo
        'fixed z-40',
        // Estilo do botão
        'flex items-center justify-center',
        'w-14 h-14 rounded-full',
        'bg-rosa text-white shadow-lg',
        // Hover e estados
        'hover:bg-rosa/90 active:scale-95',
        'transition-all duration-200',
        // Acessibilidade
        'focus:outline-none focus:ring-2 focus:ring-rosa focus:ring-offset-2',
        className
      )}
      aria-label="Lançamento rápido"
    >
      <Zap className="w-6 h-6" />
    </button>
  )
}
