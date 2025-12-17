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
  iconColor: string
  bgColor: string
}> = {
  default: {
    icon: Inbox,
    title: 'Tudo limpo por aqui!',
    description: 'Comece adicionando suas receitas e despesas.',
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
  },
  entradas: {
    icon: TrendingUp,
    title: 'Nenhuma entrada ainda',
    description: 'Que tal registrar seu salário ou outras receitas?',
    iconColor: 'text-verde',
    bgColor: 'bg-verde/10',
  },
  saidas: {
    icon: TrendingDown,
    title: 'Nenhuma despesa ainda',
    description: 'Adicione suas contas, compras e gastos do mês.',
    iconColor: 'text-vermelho',
    bgColor: 'bg-vermelho/10',
  },
  vencimentos: {
    icon: Calendar,
    title: 'Sem vencimentos próximos',
    description: 'Fique tranquilo! Não há contas vencendo em breve.',
    iconColor: 'text-azul',
    bgColor: 'bg-azul/10',
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
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        className
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center mb-4',
          config.bgColor
        )}
      >
        <Icon className={cn('w-6 h-6', config.iconColor)} />
      </div>

      <h3 className="text-corpo-medium text-foreground mb-1">
        {title || config.title}
      </h3>

      <p className="text-pequeno text-muted-foreground max-w-[240px]">
        {description || config.description}
      </p>
    </div>
  )
}
