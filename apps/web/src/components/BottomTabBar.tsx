/**
 * BottomTabBar Component
 *
 * Barra de navegação inferior moderna para mobile.
 * Design atualizado com animações suaves e indicadores visuais.
 */

import { Home, Receipt, ChartBar, Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type TabType = 'inicio' | 'lembretes' | 'relatorios' | 'lancamentos'

interface Tab {
  id: TabType
  label: string
  icon: typeof Home
  badge?: number
}

interface BottomTabBarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  pendingCount?: number
}

export function BottomTabBar({ activeTab, onTabChange, pendingCount = 0 }: BottomTabBarProps) {
  const tabs: Tab[] = [
    {
      id: 'inicio',
      label: 'Início',
      icon: Home,
    },
    {
      id: 'lembretes',
      label: 'Lembretes',
      icon: Bell,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: ChartBar,
    },
    {
      id: 'lancamentos',
      label: 'Lançamentos',
      icon: Receipt,
    },
  ]

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed bottom-0 inset-x-0 z-40",
        "bg-background/80 backdrop-blur-lg",
        "border-t border-border",
        "pb-safe"
      )}
    >
      <nav className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "w-full py-2 px-3 rounded-xl",
                "transition-all duration-200",
                "hover:bg-accent/50",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "min-h-[56px]"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {/* Indicador de ativo */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              {/* Ícone com badge */}
              <div className="relative">
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-all",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  )}
                />
                
                {/* Badge de notificação */}
                {tab.badge && (
                  <div className="absolute -top-1 -right-1">
                    <Badge 
                      variant="destructive" 
                      className="h-5 min-w-[20px] px-1 text-[10px] font-medium"
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Label */}
              <motion.span 
                className={cn(
                  "text-[11px] font-medium mt-1 transition-all",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
                animate={{
                  scale: isActive ? 1 : 0.95,
                  opacity: isActive ? 1 : 0.8,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              >
                {tab.label}
              </motion.span>

              {/* Dot indicator alternativo */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute bottom-0 w-1 h-1 bg-primary rounded-full"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>
    </motion.div>
  )
}