import { useState, useEffect, useCallback } from "react"
import CurrencyInput from "react-currency-input-field"
import { useDebouncedCallback } from "use-debounce"
import { Label } from "@/components/ui/label"

interface InputMoedaProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  debounceMs?: number
}

export function InputMoeda({
  label,
  value,
  onChange,
  error,
  debounceMs = 150
}: InputMoedaProps) {
  // Estado local para feedback imediato
  const [localValue, setLocalValue] = useState(value)

  // Atualiza estado local quando prop value muda (ex: reset do form)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounce da propagação para o pai
  const debouncedOnChange = useDebouncedCallback(
    (val: string) => onChange(val),
    debounceMs
  )

  // Handler que atualiza local imediatamente e debounce para o pai
  const handleValueChange = useCallback((val: string | undefined) => {
    const newValue = val || ""
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }, [debouncedOnChange])

  return (
    <div className="space-y-2">
      <Label className="text-pequeno-medium text-foreground">{label}</Label>
      <CurrencyInput
        className="flex min-h-touch w-full rounded-input border border-border bg-card px-4 text-corpo text-foreground placeholder:text-muted-foreground focus:border-2 focus:border-foreground focus:outline-none"
        placeholder="R$ 0,00"
        prefix="R$ "
        decimalsLimit={2}
        decimalSeparator=","
        groupSeparator="."
        value={localValue}
        onValueChange={handleValueChange}
      />
      {error && <p className="text-pequeno text-vermelho">{error}</p>}
    </div>
  )
}
