/**
 * BottomTabBar Component
 *
 * Barra de navegação fixa inferior com três tabs: Início, Lembrit e Insights.
 * Mobile-first com área de toque generosa.
 */

import { Home, Bell, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabType = 'inicio' | 'lembretes' | 'insights'

interface BottomTabBarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
      <div className="flex h-16 max-w-[720px] mx-auto">
        {/* Tab Início */}
        <button
          type="button"
          onClick={() => onTabChange('inicio')}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
            activeTab === 'inicio' ? 'text-rosa' : 'text-muted-foreground'
          )}
        >
          <Home className="w-6 h-6" />
          <span className="text-[12px] font-medium">Início</span>
        </button>

        {/* Tab Lembretes */}
        <button
          type="button"
          onClick={() => onTabChange('lembretes')}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
            activeTab === 'lembretes' ? 'text-rosa' : 'text-muted-foreground'
          )}
        >
          <Bell className="w-6 h-6" />
          <span className="text-[12px] font-medium">Lembretes</span>
        </button>

        {/* Tab Insights */}
        <button
          type="button"
          onClick={() => onTabChange('insights')}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
            activeTab === 'insights' ? 'text-rosa' : 'text-muted-foreground'
          )}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[12px] font-medium">Insights</span>
        </button>
      </div>
    </nav>
  )
}
