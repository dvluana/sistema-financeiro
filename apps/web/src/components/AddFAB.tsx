/**
 * AddFAB Component
 *
 * Floating Action Button moderno com menu expansível.
 * Design atualizado com animações fluidas e melhor UX.
 */

import { useState, useRef, useEffect } from 'react'
import { 
  Plus, 
  X, 
  Zap, 
  FileText,
  Sparkles,
  ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AddFABProps {
  onQuickInput: () => void
  onManualInput: () => void
  className?: string
}

export function AddFAB({ onQuickInput, onManualInput, className }: AddFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fecha o menu quando clica fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fecha o menu com ESC
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleQuickInput = () => {
    setIsOpen(false)
    onQuickInput()
  }

  const handleManualInput = () => {
    setIsOpen(false)
    onManualInput()
  }

  const menuItems = [
    {
      id: 'quick',
      label: 'Entrada rápida',
      description: 'Adicione vários lançamentos de uma vez',
      icon: Zap,
      onClick: handleQuickInput,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    },
    {
      id: 'manual',
      label: 'Entrada manual',
      description: 'Adicione um lançamento detalhado',
      icon: FileText,
      onClick: handleManualInput,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    },
  ]

  return (
    <TooltipProvider>
      <div 
        ref={containerRef} 
        className={cn(
          'fixed z-40',
          className
        )}
      >
        {/* Overlay sutil quando aberto */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Menu de opções */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 30
              }}
              className="absolute bottom-20 right-0 w-72 p-2 bg-card border border-border rounded-2xl shadow-2xl"
            >
              <div className="space-y-1">
                {menuItems.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ 
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 400,
                        damping: 30
                      }}
                      onClick={item.onClick}
                      className={cn(
                        "w-full p-3 rounded-xl",
                        "flex items-start gap-3 text-left",
                        "transition-all duration-200",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        item.bgColor
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        "bg-background shadow-sm",
                        item.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <ChevronUp className="w-4 h-4 text-muted-foreground mt-1 rotate-90" />
                    </motion.button>
                  )
                })}
              </div>

              {/* Dica no rodapé */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Dica: Use Esc para fechar
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão principal FAB */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "w-14 h-14 rounded-full shadow-lg",
                "flex items-center justify-center",
                "transition-all duration-300",
                isOpen 
                  ? "bg-destructive hover:bg-destructive/90 rotate-45" 
                  : "bg-rosa hover:bg-rosa-hover active:bg-rosa-pressed",
                "hover:shadow-xl active:scale-95"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 30
              }}
            >
              <motion.div
                animate={{ rotate: isOpen ? 0 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Plus className="w-6 h-6 text-white" />
                )}
              </motion.div>
            </motion.button>
          </TooltipTrigger>
          {!isOpen && (
            <TooltipContent side="left" className="text-xs">
              Adicionar lançamento
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}