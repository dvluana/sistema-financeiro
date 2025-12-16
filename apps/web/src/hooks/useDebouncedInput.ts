/**
 * Hook para input com debounce
 *
 * Mantém estado local para feedback imediato e debounce a propagação.
 * Útil para inputs que disparam re-renders pesados ou chamadas de API.
 */

import { useState, useEffect, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface UseDebouncedInputOptions {
  /** Delay em ms antes de propagar mudanças (default: 300) */
  delay?: number
  /** Callback quando valor muda (após debounce) */
  onChange?: (value: string) => void
}

interface UseDebouncedInputReturn {
  /** Valor local (atualizado imediatamente) */
  value: string
  /** Handler para onChange do input */
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Setter direto do valor (com debounce) */
  setValue: (value: string) => void
  /** Limpa o input */
  clear: () => void
}

export function useDebouncedInput(
  initialValue: string = '',
  options: UseDebouncedInputOptions = {}
): UseDebouncedInputReturn {
  const { delay = 300, onChange } = options

  const [value, setLocalValue] = useState(initialValue)

  // Sincroniza com valor inicial quando muda externamente
  useEffect(() => {
    setLocalValue(initialValue)
  }, [initialValue])

  // Debounce do callback
  const debouncedOnChange = useDebouncedCallback(
    (val: string) => onChange?.(val),
    delay
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      debouncedOnChange(newValue)
    },
    [debouncedOnChange]
  )

  const setValue = useCallback(
    (newValue: string) => {
      setLocalValue(newValue)
      debouncedOnChange(newValue)
    },
    [debouncedOnChange]
  )

  const clear = useCallback(() => {
    setLocalValue('')
    onChange?.('')
  }, [onChange])

  return {
    value,
    handleChange,
    setValue,
    clear,
  }
}
