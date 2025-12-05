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
            className="fixed inset-0 bg-black/20 -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu de opções */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-20 right-0 flex flex-col gap-3 items-end"
          >
            {/* Opção: Lançamento Rápido */}
            <motion.button
              type="button"
              onClick={handleQuickInput}
              className={cn(
                'flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl',
                'bg-white shadow-lg border border-neutro-200',
                'active:scale-95 transition-transform',
                'min-w-[200px]'
              )}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rosa to-rosa/80 text-white">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-corpo-medium font-semibold text-neutro-900">
                  Lançamento Rápido
                </span>
                <span className="block text-micro text-neutro-500">
                  Digite de forma natural
                </span>
              </div>
            </motion.button>

            {/* Opção: Lançamento Manual */}
            <motion.button
              type="button"
              onClick={handleManualInput}
              className={cn(
                'flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl',
                'bg-white shadow-lg border border-neutro-200',
                'active:scale-95 transition-transform',
                'min-w-[200px]'
              )}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-verde to-verde-light text-white">
                <PenLine className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-corpo-medium font-semibold text-neutro-900">
                  Lançamento Manual
                </span>
                <span className="block text-micro text-neutro-500">
                  Formulário detalhado
                </span>
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
