/**
 * Mapeamento centralizado de ícones
 *
 * Importa apenas os ícones usados pelo sistema ao invés de todo o pacote Lucide (~100KB).
 * Todos os componentes que precisam renderizar ícones dinamicamente devem usar este módulo.
 */

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
  ShoppingBag,
  Plane,
  Gift,
  Smartphone,
  Wifi,
  Zap,
  Droplets,
  GraduationCap,
  Briefcase,
  PiggyBank,
  HandCoins,
  Receipt,
  Banknote,
  Coins,
  DollarSign,
  Euro,
  BadgeDollarSign,
} from 'lucide-react'

/**
 * Map estático de ícones disponíveis no sistema
 * Adicione novos ícones aqui conforme necessário
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  // Categorias de entrada
  Wallet,
  TrendingUp,
  Briefcase,
  PiggyBank,
  HandCoins,
  Banknote,
  Coins,
  DollarSign,
  Euro,
  BadgeDollarSign,

  // Categorias de saída
  Home,
  Utensils,
  Car,
  Heart,
  Gamepad2,
  CreditCard,
  ShoppingBag,
  Plane,
  Gift,
  Smartphone,
  Wifi,
  Zap,
  Droplets,
  GraduationCap,
  Receipt,

  // Genéricos
  CircleDollarSign,
  MoreHorizontal,
}

/**
 * Lista de nomes de ícones disponíveis para seleção
 */
export const ICON_NAMES = Object.keys(ICON_MAP)

/**
 * Obtém um componente de ícone pelo nome
 * @param iconName Nome do ícone (ex: "Wallet", "Home")
 * @returns Componente LucideIcon ou null se não encontrado
 */
export function getIconComponent(iconName: string | null): LucideIcon | null {
  if (!iconName) return null
  return ICON_MAP[iconName] || null
}

/**
 * Ícone padrão para quando não há ícone definido
 */
export const DefaultIcon = CircleDollarSign
