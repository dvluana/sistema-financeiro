import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Se true, habilita autocomplete do navegador/1Password (use em login/registro) */
  enableAutofill?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, enableAutofill = false, ...props }, ref) => {
    // Atributos para desabilitar 1Password e outros gerenciadores de senha
    const autofillAttrs = enableAutofill
      ? {}
      : {
          'data-1p-ignore': true,
          'data-lpignore': true, // LastPass
          'data-form-type': 'other',
          autoComplete: 'off',
        }

    return (
      <input
        type={type}
        className={cn(
          "flex min-h-touch w-full rounded-input border border-neutro-300 bg-white px-4 text-corpo text-neutro-900 placeholder:text-neutro-400 focus:border-2 focus:border-neutro-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...autofillAttrs}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
