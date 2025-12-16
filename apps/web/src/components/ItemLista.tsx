import React, { useMemo } from 'react'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatusCircle } from "./StatusCircle"
import { formatarMoeda, cn } from "@/lib/utils"
import type { Categoria } from "@/lib/api"

// Map estático de ícones - evita importar todos os ícones do Lucide
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

interface ItemListaProps {
  tipo: 'entrada' | 'saida'
  nome: string
  valor: number
  dataPrevista?: string | null
  concluido: boolean
  categoria?: Categoria | null
  mostrarConcluidosDiscretos?: boolean
  onToggle: () => void
  onEdit: () => void
}

// Memoizado para evitar re-renders quando props não mudam
export const ItemLista = React.memo(function ItemLista({
  tipo,
  nome,
  valor,
  dataPrevista,
  concluido,
  categoria,
  mostrarConcluidosDiscretos = true,
  onToggle,
  onEdit,
}: ItemListaProps) {
  // Memoiza ícone da categoria para evitar recálculo
  const CategoriaIcon = useMemo(
    () => (categoria?.icone ? getIconComponent(categoria.icone) : null),
    [categoria?.icone]
  )

  // Memoiza labels e cores para evitar recálculo
  const { tagLabel, tagColor } = useMemo(() => ({
    tagLabel: tipo === 'entrada' ? 'Recebido' : 'Pago',
    tagColor: tipo === 'entrada'
      ? 'bg-verde/10 text-verde border-verde/20'
      : 'bg-vermelho/10 text-vermelho border-vermelho/20'
  }), [tipo])

  return (
    <div className="flex items-center gap-2 min-h-[64px] border-b border-border last:border-0">
      <StatusCircle checked={concluido} onChange={onToggle} />

      <button
        type="button"
        onClick={onEdit}
        className="flex-1 flex justify-between items-center py-3 text-left min-h-touch"
      >
        <div className={cn(
          'flex items-center gap-2 min-w-0 flex-1',
          concluido && mostrarConcluidosDiscretos && 'opacity-50'
        )}>
          {/* Ícone da categoria */}
          {CategoriaIcon && categoria && (
            <span
              className="flex items-center justify-center w-6 h-6 rounded shrink-0"
              style={{ backgroundColor: categoria.cor || '#6B7280' }}
            >
              <CategoriaIcon className="w-3.5 h-3.5 text-white" />
            </span>
          )}

          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-corpo text-foreground truncate">{nome}</span>
            <div className="flex items-center gap-2 text-micro text-muted-foreground">
              {categoria && (
                <span>{categoria.nome}</span>
              )}
              {categoria && dataPrevista && (
                <span>•</span>
              )}
              {dataPrevista && (
                <span>Dia {parseInt(dataPrevista.split('-')[2], 10)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Tag Recebido/Pago com animação (sempre viva, sem opacity) */}
          <AnimatePresence>
            {concluido && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                  tagColor
                )}
              >
                {tagLabel}
              </motion.span>
            )}
          </AnimatePresence>

          <span className={cn(
            'text-corpo-medium text-foreground',
            concluido && mostrarConcluidosDiscretos && 'opacity-50'
          )}>
            {formatarMoeda(valor)}
          </span>
        </div>
      </button>
    </div>
  )
})
