/**
 * ItemLista Component
 * 
 * Componente para exibir um item de lançamento em listas.
 * Otimizado com React.memo para evitar re-renders desnecessários.
 */

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
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Activity,
  Plane,
  Coffee,
  Gift,
  Zap,
  Wifi,
  Smartphone,
  Music,
  Film,
  Book,
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
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Activity,
  Plane,
  Coffee,
  Gift,
  Zap,
  Wifi,
  Smartphone,
  Music,
  Film,
  Book,
}

// Função para obter o componente de ícone - O(1) lookup
function getIconComponent(iconName: string | null | undefined): LucideIcon | null {
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
  mostrarConcluidosDiscretos = false,
  onToggle,
  onEdit,
}: ItemListaProps) {
  // Memoiza ícone da categoria para evitar recálculo
  const CategoriaIcon = useMemo(
    () => (categoria?.icone ? getIconComponent(categoria.icone) : null),
    [categoria?.icone]
  )

  // Memoiza labels e cores para evitar recálculo
  const { tagLabel, tagColor, valueColor } = useMemo(() => ({
    tagLabel: tipo === 'entrada' ? 'Recebido' : 'Pago',
    tagColor: tipo === 'entrada'
      ? 'bg-verde/10 text-verde border-verde/20'
      : 'bg-vermelho/10 text-vermelho border-vermelho/20',
    valueColor: tipo === 'entrada' ? 'text-verde' : 'text-foreground'
  }), [tipo])

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group">
      {/* Status Circle */}
      <StatusCircle 
        checked={concluido} 
        onChange={onToggle}
      />

      {/* Conteúdo Principal */}
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 flex items-center gap-3 text-left"
      >
        {/* Ícone da categoria (desktop) */}
        {categoria && CategoriaIcon && (
          <div className={cn(
            "hidden sm:flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
            categoria.cor ? '' : 'bg-muted',
            "group-hover:bg-accent"
          )} style={categoria.cor ? { backgroundColor: `${categoria.cor}20` } : undefined}>
            <CategoriaIcon 
              className="w-5 h-5 transition-colors" 
              style={categoria.cor ? { color: categoria.cor } : undefined}
            />
          </div>
        )}

        {/* Nome e Categoria */}
        <div className={cn(
          "flex-1 min-w-0",
          mostrarConcluidosDiscretos && concluido && 'opacity-50'
        )}>
          <p className={cn(
            "text-sm font-medium truncate",
            concluido && mostrarConcluidosDiscretos && "line-through text-muted-foreground"
          )}>
            {nome}
          </p>
          
          {/* Categoria Badge */}
          {categoria && (
            <div className="flex items-center gap-2 mt-1">
              <span 
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                  "bg-muted/50 text-muted-foreground",
                  "transition-all group-hover:bg-muted"
                )}
              >
                {/* Ícone mobile */}
                {CategoriaIcon && (
                  <CategoriaIcon 
                    className="w-3 h-3 sm:hidden" 
                    style={categoria.cor ? { color: categoria.cor } : undefined}
                  />
                )}
                {/* Cor indicator */}
                {categoria.cor && (
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: categoria.cor }}
                  />
                )}
                {categoria.nome}
              </span>
              
              {/* Data prevista */}
              {dataPrevista && (
                <span className="text-xs text-muted-foreground">
                  {new Date(dataPrevista + 'T12:00:00').toLocaleDateString('pt-BR', { 
                    day: 'numeric',
                    month: 'short' 
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Valor e Status */}
        <div className="flex items-center gap-3">
          {/* Valor */}
          <motion.div
            animate={{
              scale: concluido ? 1 : 1.02,
              opacity: concluido && mostrarConcluidosDiscretos ? 0.5 : 1
            }}
            transition={{ duration: 0.2 }}
          >
            <p className={cn(
              "text-sm font-semibold tabular-nums",
              valueColor
            )}>
              {formatarMoeda(valor)}
            </p>
          </motion.div>

          {/* Badge de status (apenas quando concluído) */}
          {concluido && (
            <AnimatePresence mode="popLayout">
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded-full border",
                  tagColor
                )}
              >
                {tagLabel}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </button>
    </div>
  )
})