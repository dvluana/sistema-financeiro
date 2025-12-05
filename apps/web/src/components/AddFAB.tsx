/**
 * AddFAB Component
 *
 * Botão flutuante de ação com menu de opções.
 * Permite criar lançamento rápido (por texto) ou manual (formulário).
 * Totalmente otimizado para mobile com animações suaves.
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Zap, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  return (
    <div ref={containerRef} className={cn('fixed z-40', className)}>
      {/* Backdrop escuro quando aberto */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu de opções */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[72px] right-1 flex flex-col gap-4 items-end"
          >
            {/* Opção: Lançamento Manual */}
            <motion.button
              type="button"
              onClick={handleManualInput}
              className={cn(
                'group flex items-center gap-3',
                'active:scale-[0.97] transition-transform duration-150'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="text-[13px] font-medium text-white/90 mr-1">
                Manual
              </span>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg shadow-black/10 group-active:scale-95 transition-transform">
                <PenLine className="w-5 h-5 text-neutro-900" />
              </div>
            </motion.button>

            {/* Opção: Lançamento Rápido */}
            <motion.button
              type="button"
              onClick={handleQuickInput}
              className={cn(
                'group flex items-center gap-3',
                'active:scale-[0.97] transition-transform duration-150'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="text-[13px] font-medium text-white/90 mr-1">
                Rápido
              </span>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg shadow-black/10 group-active:scale-95 transition-transform">
                <Zap className="w-5 h-5 text-rosa" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão FAB principal */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center',
          'w-14 h-14 rounded-full',
          'shadow-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          isOpen
            ? 'bg-neutro-800 text-white focus:ring-neutro-600'
            : 'bg-rosa text-white hover:bg-rosa/90 focus:ring-rosa'
        )}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
        aria-label={isOpen ? 'Fechar menu' : 'Adicionar lançamento'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        )}
      </motion.button>
    </div>
  )
}
