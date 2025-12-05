/**
 * Toast Component
 *
 * Notificação de erro que aparece no topo da tela.
 * Auto-dismiss após 5 segundos ou pode ser fechado manualmente.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToastProps {
  message: string | null
  onClose: () => void
  onRetry?: () => void
}

export function Toast({ message, onClose, onRetry }: ToastProps) {
  // Auto-dismiss após 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [message, onClose])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="flex items-center gap-3 bg-foreground text-background p-4 rounded-card shadow-lg">
            <p className="flex-1 text-corpo">{message}</p>

            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="text-white hover:bg-white/20"
              >
                Tentar de novo
              </Button>
            )}

            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
