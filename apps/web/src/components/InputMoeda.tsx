import CurrencyInput from "react-currency-input-field"
import { Label } from "@/components/ui/label"

interface InputMoedaProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

export function InputMoeda({ label, value, onChange, error }: InputMoedaProps) {
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
        value={value}
        onValueChange={(val) => onChange(val || "")}
      />
      {error && <p className="text-pequeno text-vermelho">{error}</p>}
    </div>
  )
}
