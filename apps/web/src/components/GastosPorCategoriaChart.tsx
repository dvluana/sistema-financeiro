/**
 * GastosPorCategoriaChart Component
 *
 * Exibe gráfico de pizza com lista de gastos por categoria.
 * Similar ao design do Mobills com percentuais e cores.
 *
 * Performance: Importa apenas os ícones usados ao invés de todo o pacote Lucide
 */

import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Home,
  Utensils,
  Car,
  Heart,
  Gamepad2,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GastoCategoria } from '@/lib/api'

interface GastosPorCategoriaChartProps {
  dados: GastoCategoria[]
  className?: string
}

// Map estático de ícones - evita importar ~100KB do pacote Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Home,
  Utensils,
  Car,
  Heart,
  Gamepad2,
  CreditCard,
}

// Função para obter o componente de ícone - O(1) lookup
function getIconComponent(iconName: string | null): LucideIcon | null {
  if (!iconName) return null
  return ICON_MAP[iconName] || null
}

// Formata valor em BRL
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Cores padrão para categorias sem cor definida
const CORES_PADRAO = [
  '#3B82F6', // azul
  '#8B5CF6', // roxo
  '#EC4899', // rosa
  '#F59E0B', // amarelo
  '#10B981', // verde
  '#EF4444', // vermelho
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // laranja
  '#84CC16', // lime
]

export function GastosPorCategoriaChart({ dados, className }: GastosPorCategoriaChartProps) {
  // Processa dados e garante cores
  const dadosProcessados = useMemo(() => {
    return dados.map((item, index) => ({
      ...item,
      cor: item.categoria_cor || CORES_PADRAO[index % CORES_PADRAO.length],
    }))
  }, [dados])

  // Calcula total para exibição
  const total = useMemo(() => {
    return dados.reduce((sum, item) => sum + item.total, 0)
  }, [dados])

  // Gera o conic-gradient para o gráfico de pizza
  const pieGradient = useMemo(() => {
    if (dadosProcessados.length === 0) return 'conic-gradient(#E5E7EB 0deg 360deg)'

    let currentAngle = 0
    const segments: string[] = []

    dadosProcessados.forEach((item) => {
      const angle = (item.percentual / 100) * 360
      segments.push(`${item.cor} ${currentAngle}deg ${currentAngle + angle}deg`)
      currentAngle += angle
    })

    return `conic-gradient(${segments.join(', ')})`
  }, [dadosProcessados])

  if (dados.length === 0) {
    return (
      <div className={cn('bg-card border border-border rounded-xl p-6', className)}>
        <p className="text-center text-muted-foreground">
          Nenhum gasto registrado nos últimos 6 meses
        </p>
      </div>
    )
  }

  return (
    <div className={cn('bg-card border border-border rounded-xl p-4', className)}>
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Lista de categorias */}
        <div className="flex-1 space-y-2 order-2 sm:order-1">
          {dadosProcessados.slice(0, 5).map((item) => {
            const Icon = getIconComponent(item.categoria_icone)
            return (
              <div
                key={item.categoria_id || 'sem-categoria'}
                className="flex items-center gap-3 py-1"
              >
                {/* Ícone com cor de fundo */}
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                  style={{ backgroundColor: item.cor }}
                >
                  {Icon ? (
                    <Icon className="w-4.5 h-4.5 text-white" />
                  ) : (
                    <CircleDollarSign className="w-4.5 h-4.5 text-white" />
                  )}
                </div>

                {/* Nome e percentual */}
                <div className="flex-1 min-w-0">
                  <span className="text-corpo text-foreground truncate block">
                    {item.categoria_nome}
                  </span>
                </div>

                {/* Percentual */}
                <span className="text-corpo text-muted-foreground shrink-0">
                  {item.percentual.toFixed(2)}%
                </span>
              </div>
            )
          })}

          {/* Mostra "outros" se tiver mais de 5 categorias */}
          {dadosProcessados.length > 5 && (
            <div className="flex items-center gap-3 py-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-muted">
                <MoreHorizontal className="w-4.5 h-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-corpo text-foreground">
                  +{dadosProcessados.length - 5} outras
                </span>
              </div>
              <span className="text-corpo text-muted-foreground shrink-0">
                {dadosProcessados.slice(5).reduce((sum, i) => sum + i.percentual, 0).toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Gráfico de pizza */}
        <div className="flex flex-col items-center justify-center order-1 sm:order-2">
          <div
            className="w-32 h-32 rounded-full shadow-sm"
            style={{ background: pieGradient }}
          />
          <p className="text-pequeno text-muted-foreground mt-3 text-center">
            Total: {formatCurrency(total)}
          </p>
        </div>
      </div>
    </div>
  )
}
