/**
 * NavigationBar Component
 *
 * Barra de navegação responsiva:
 * - Desktop: Navbar horizontal no topo ou sidebar lateral
 * - Mobile: Bottom tab bar
 */

import { Home, Bell, BarChart3, Settings, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type TabType = 'inicio' | 'lembretes' | 'relatorios'

interface Tab {
  id: TabType
  label: string
  icon: typeof Home
  badge?: number
  description?: string
}

interface NavigationBarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  pendingCount?: number
  onOpenSettings?: () => void
}

export function NavigationBar({ 
  activeTab, 
  onTabChange, 
  pendingCount = 0,
  onOpenSettings 
}: NavigationBarProps) {
  const isDesktop = useIsDesktop()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const tabs: Tab[] = [
    {
      id: 'inicio',
      label: 'Início',
      icon: Home,
      description: 'Dashboard principal'
    },
    {
      id: 'lembretes',
      label: 'Lembretes',
      icon: Bell,
      badge: pendingCount > 0 ? pendingCount : undefined,
      description: 'Vencimentos e alertas'
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: BarChart3,
      description: 'Análises e gráficos'
    },
  ]

  // Desktop: Sidebar lateral
  if (isDesktop) {
    return (
      <TooltipProvider>
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className={cn(
            "fixed left-0 top-0 h-full z-40",
            "w-64 bg-card border-r border-border",
            "flex flex-col"
          )}
        >
          {/* Header da Sidebar */}
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Sistema Financeiro
            </h2>
          </div>

          {/* Navegação */}
          <nav className="flex-1 p-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                        "transition-all duration-200",
                        "hover:bg-accent/50",
                        "group",
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      {/* Indicador de ativo */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                            initial={{ width: 0 }}
                            animate={{ width: 4 }}
                            exit={{ width: 0 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Ícone */}
                      <div className="relative">
                        <Icon 
                          className={cn(
                            "w-5 h-5 transition-all",
                            isActive 
                              ? "text-primary" 
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        
                        {/* Badge */}
                        {tab.badge && (
                          <div className="absolute -top-1 -right-1">
                            <Badge 
                              variant="destructive" 
                              className="h-4 min-w-[16px] px-1 text-[9px] font-medium"
                            >
                              {tab.badge > 9 ? '9+' : tab.badge}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Label e descrição */}
                      <div className="flex-1 text-left">
                        <p className={cn(
                          "font-medium text-sm",
                          isActive 
                            ? "text-primary" 
                            : "text-foreground"
                        )}>
                          {tab.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tab.description}
                        </p>
                      </div>

                      {/* Indicador visual de ativo */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {tab.description}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

          {/* Footer com configurações */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={onOpenSettings}
              className="w-full justify-start gap-3"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Configurações</span>
            </Button>
          </div>
        </motion.aside>
      </TooltipProvider>
    )
  }

  // Mobile: Bottom Tab Bar
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed bottom-0 inset-x-0 z-40",
        "bg-background/95 backdrop-blur-xl",
        "border-t border-border",
        "pb-safe"
      )}
    >
      <nav className="flex items-center justify-around px-4 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "flex-1 py-2 px-2 rounded-xl",
                "transition-all duration-200",
                "hover:bg-accent/50",
                "min-h-[52px]"
              )}
              whileTap={{ scale: 0.9 }}
            >
              {/* Indicador de ativo */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}

              {/* Ícone com badge */}
              <div className="relative">
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive 
                      ? "text-primary scale-110" 
                      : "text-muted-foreground"
                  )}
                />
                
                {/* Badge de notificação */}
                {tab.badge && (
                  <motion.div 
                    className="absolute -top-1 -right-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <Badge 
                      variant="destructive" 
                      className="h-4 min-w-[16px] px-0.5 text-[9px] font-bold"
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </Badge>
                  </motion.div>
                )}
              </div>

              {/* Label */}
              <motion.span 
                className={cn(
                  "text-[10px] font-semibold mt-1 transition-all",
                  isActive 
                    ? "text-primary opacity-100" 
                    : "text-muted-foreground opacity-70"
                )}
                animate={{
                  y: isActive ? -1 : 0,
                }}
              >
                {tab.label}
              </motion.span>

              {/* Dot indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}

        {/* Botão de configurações no mobile */}
        <motion.button
          onClick={onOpenSettings}
          className={cn(
            "relative flex flex-col items-center justify-center",
            "py-2 px-3 rounded-xl",
            "transition-all duration-200",
            "hover:bg-accent/50",
            "min-h-[52px]"
          )}
          whileTap={{ scale: 0.9 }}
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] font-semibold mt-1 text-muted-foreground opacity-70">
            Config
          </span>
        </motion.button>
      </nav>
    </motion.div>
  )
}
