/**
 * Toast Component
 *
 * Notificação que aparece no topo da tela.
 * Suporta variantes de erro e sucesso.
 * Auto-dismiss após 5 segundos ou pode ser fechado manualmente.
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ToastProps {
  message: string | null
  onClose: () => void
  onRetry?: () => void
  variant?: 'error' | 'success'
}

export function Toast({ message, onClose, onRetry, variant = 'error' }: ToastProps) {
  // Auto-dismiss após 3 segundos para sucesso, 5 para erro
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose()
      }, variant === 'success' ? 3000 : 5000)

      return () => clearTimeout(timer)
    }
  }, [message, onClose, variant])

  const isSuccess = variant === 'success'

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-card shadow-lg",
            isSuccess
              ? "bg-verde text-white"
              : "bg-foreground text-background"
          )}>
            {isSuccess && (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            )}
            <p className="flex-1 text-corpo">{message}</p>

            {onRetry && !isSuccess && (
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
