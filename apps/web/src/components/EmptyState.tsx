/**
 * Empty State Component
 *
 * Displays a friendly message when there's no data to show.
 * Used in lists and dashboard sections.
 */

import { type LucideIcon, Inbox, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateVariant = 'default' | 'entradas' | 'saidas' | 'vencimentos'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  icon?: LucideIcon
  className?: string
}

const variantConfig: Record<EmptyStateVariant, {
  icon: LucideIcon
  title: string
  description: string
}> = {
  default: {
    icon: Inbox,
    title: 'Nenhum lançamento neste mês',
    description: 'Comece adicionando suas receitas e despesas.',
  },
  entradas: {
    icon: TrendingUp,
    title: 'Nenhuma entrada neste mês',
    description: 'Que tal registrar seu salário ou outras receitas?',
  },
  saidas: {
    icon: TrendingDown,
    title: 'Nenhuma saída neste mês',
    description: 'Adicione suas contas, compras e gastos do mês.',
  },
  vencimentos: {
    icon: Calendar,
    title: 'Sem vencimentos próximos',
    description: 'Fique tranquilo! Não há contas vencendo em breve.',
  },
}

export function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = icon || config.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-10 px-4 text-center',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>

      <p className="text-sm text-muted-foreground">
        {title || config.title}
      </p>
    </div>
  )
}
