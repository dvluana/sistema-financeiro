/**
 * InputMoeda Component
 *
 * Input especializado para valores monetários com formatação automática.
 * Design modernizado com melhor feedback visual e UX.
 */

import { useState, useEffect, useRef } from 'react'
import CurrencyInput from 'react-currency-input-field'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface InputMoedaProps {
  label?: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  className?: string
  showTrend?: boolean
  tipo?: 'entrada' | 'saida'
}

export function InputMoeda({
  label,
  value,
  onChange,
  error,
  placeholder = '0,00',
  required = false,
  autoFocus = false,
  className,
  showTrend = false,
  tipo,
}: InputMoedaProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const numValue = parseFloat(value.replace(',', '.'))
    setHasValue(!isNaN(numValue) && numValue > 0)
  }, [value])

  // Determina a cor baseada no tipo e valor
  const getValueColor = () => {
    if (!hasValue) return 'text-muted-foreground'
    if (!tipo) return 'text-foreground'
    return tipo === 'entrada' ? 'text-verde' : 'text-rosa'
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label 
          htmlFor="currency-input" 
          className="text-sm font-medium flex items-center gap-1"
        >
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <div className="relative">
        {/* Container do input com efeitos visuais */}
        <div 
          className={cn(
            "relative rounded-lg transition-all duration-200",
            isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            error && "ring-2 ring-destructive ring-offset-2 ring-offset-background"
          )}
        >
          {/* Prefixo R$ */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <span className={cn(
              "text-lg font-medium transition-colors duration-200",
              isFocused ? "text-foreground" : "text-muted-foreground",
              hasValue && getValueColor()
            )}>
              R$
            </span>
          </div>

          {/* Input de moeda */}
          <CurrencyInput
            ref={inputRef}
            id="currency-input"
            name="currency"
            value={value}
            onValueChange={(val) => onChange(val || '')}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            decimalsLimit={2}
            decimalSeparator=","
            groupSeparator="."
            allowNegativeValue={false}
            autoFocus={autoFocus}
            className={cn(
              "w-full h-12 pl-14 pr-12 rounded-lg border bg-background",
              "text-lg font-semibold placeholder:font-normal",
              "transition-all duration-200",
              "focus:outline-none focus:border-2",
              error 
                ? "border-destructive focus:border-destructive" 
                : "border-input focus:border-foreground",
              hasValue && getValueColor(),
              className
            )}
          />

          {/* Ícone de tendência (opcional) */}
          {showTrend && hasValue && tipo && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              {tipo === 'entrada' ? (
                <TrendingUp className="w-5 h-5 text-verde" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rosa" />
              )}
            </motion.div>
          )}
        </div>

        {/* Efeito de brilho ao focar */}
        <AnimatePresence>
          {isFocused && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${
                  tipo === 'entrada' ? 'rgba(34, 197, 94, 0.1)' : 
                  tipo === 'saida' ? 'rgba(255, 56, 92, 0.1)' : 
                  'rgba(var(--primary), 0.1)'
                } 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mensagem de erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-1.5 text-destructive"
          >
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs font-medium">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dicas de formatação */}
      {isFocused && !error && !hasValue && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground"
        >
          Digite o valor usando vírgula para centavos
        </motion.p>
      )}
    </div>
  )
}