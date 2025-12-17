/**
 * NavigationBar Component
 *
 * Barra de navegação responsiva:
 * - Desktop: Sidebar lateral com opção de colapsar
 * - Mobile: Bottom tab bar
 */

import { Home, Bell, BarChart3, Settings, PanelLeftClose, PanelLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type TabType = 'inicio' | 'lembretes' | 'relatorios'

// Larguras do sidebar
export const SIDEBAR_WIDTH_EXPANDED = 256 // w-64
export const SIDEBAR_WIDTH_COLLAPSED = 72 // w-18

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
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function NavigationBar({
  activeTab,
  onTabChange,
  pendingCount = 0,
  onOpenSettings,
  isCollapsed = false,
  onToggleCollapse,
}: NavigationBarProps) {
  const isDesktop = useIsDesktop()

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

  // Desktop: Sidebar lateral com opção de colapsar
  if (isDesktop) {
    return (
      <TooltipProvider delayDuration={0}>
        <motion.aside
          initial={{ x: -300 }}
          animate={{
            x: 0,
            width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
          }}
          transition={{
            width: { type: "spring", stiffness: 300, damping: 30 },
            x: { type: "spring", stiffness: 300, damping: 30 },
          }}
          className={cn(
            "fixed left-0 top-0 h-full z-40",
            "bg-card border-r border-border",
            "flex flex-col overflow-hidden"
          )}
        >
          {/* Header da Sidebar */}
          <div className={cn(
            "border-b border-border transition-all duration-200",
            isCollapsed ? "p-4" : "p-6"
          )}>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" className="shrink-0">
                <defs>
                  <linearGradient id="favGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#FF385C', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#E31C5F', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <circle cx="16" cy="16" r="16" fill="url(#favGradient)"/>
                <text x="16" y="22" fontFamily="system-ui, -apple-system, sans-serif" fontSize="18" fontWeight="700" fill="white" textAnchor="middle">F</text>
              </svg>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.h2
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent whitespace-nowrap"
                  >
                    Financify
                  </motion.h2>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Navegação */}
          <nav className={cn(
            "flex-1 space-y-2 transition-all duration-200",
            isCollapsed ? "p-2" : "p-4"
          )}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "relative w-full flex items-center rounded-xl",
                        "transition-all duration-200",
                        "hover:bg-accent/50",
                        "group",
                        isActive && "bg-primary/10 text-primary",
                        isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
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
                      <div className="relative shrink-0">
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

                      {/* Label e descrição - só mostra quando expandido */}
                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 text-left overflow-hidden"
                          >
                            <p className={cn(
                              "font-medium text-sm whitespace-nowrap",
                              isActive
                                ? "text-primary"
                                : "text-foreground"
                            )}>
                              {tab.label}
                            </p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {tab.description}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Indicador visual de ativo - só mostra quando expandido */}
                      {isActive && !isCollapsed && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 bg-primary rounded-full shrink-0"
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" sideOffset={8}>
                      <p className="font-medium">{tab.label}</p>
                      <p className="text-xs text-muted-foreground">{tab.description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </nav>

          {/* Footer com configurações e toggle */}
          <div className={cn(
            "border-t border-border space-y-2 transition-all duration-200",
            isCollapsed ? "p-2" : "p-4"
          )}>
            {/* Botão de configurações */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onOpenSettings}
                  className={cn(
                    "w-full",
                    isCollapsed ? "justify-center px-3" : "justify-start gap-3"
                  )}
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        Configurações
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  Configurações
                </TooltipContent>
              )}
            </Tooltip>

            {/* Botão de toggle do menu */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground",
                    isCollapsed ? "justify-center px-3" : "justify-start gap-3"
                  )}
                >
                  {isCollapsed ? (
                    <PanelLeft className="w-5 h-5 shrink-0" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5 shrink-0" />
                  )}
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-sm whitespace-nowrap overflow-hidden"
                      >
                        Recolher menu
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  Expandir menu
                </TooltipContent>
              )}
            </Tooltip>
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
