/**
 * Categorias Padrão do Sistema
 *
 * Definidas no código para garantir consistência.
 * Usuários veem estas + suas próprias categorias criadas.
 * Estas categorias NÃO são salvas no banco - são constantes.
 */

import type { TipoLancamento } from '../schemas/categoria.js'

export interface CategoriaPadrao {
  id: string // ID fixo para referência
  nome: string
  tipo: TipoLancamento
  icone: string
  cor: string
  ordem: number
}

// IDs fixos para categorias padrão (prefixo 'default-' para identificar)
export const CATEGORIAS_PADRAO: CategoriaPadrao[] = [
  // === ENTRADA (3 categorias essenciais) ===
  {
    id: 'default-salario',
    nome: 'Salário',
    tipo: 'entrada',
    icone: 'Wallet',
    cor: '#22C55E',
    ordem: 1,
  },
  {
    id: 'default-investimentos',
    nome: 'Investimentos',
    tipo: 'entrada',
    icone: 'TrendingUp',
    cor: '#8B5CF6',
    ordem: 2,
  },
  {
    id: 'default-outros-entrada',
    nome: 'Outros',
    tipo: 'entrada',
    icone: 'CircleDollarSign',
    cor: '#6B7280',
    ordem: 3,
  },

  // === SAÍDA (7 categorias essenciais) ===
  {
    id: 'default-moradia',
    nome: 'Moradia',
    tipo: 'saida',
    icone: 'Home',
    cor: '#EF4444',
    ordem: 1,
  },
  {
    id: 'default-alimentacao',
    nome: 'Alimentação',
    tipo: 'saida',
    icone: 'Utensils',
    cor: '#F97316',
    ordem: 2,
  },
  {
    id: 'default-transporte',
    nome: 'Transporte',
    tipo: 'saida',
    icone: 'Car',
    cor: '#EAB308',
    ordem: 3,
  },
  {
    id: 'default-saude',
    nome: 'Saúde',
    tipo: 'saida',
    icone: 'Heart',
    cor: '#EC4899',
    ordem: 4,
  },
  {
    id: 'default-lazer',
    nome: 'Lazer',
    tipo: 'saida',
    icone: 'Gamepad2',
    cor: '#06B6D4',
    ordem: 5,
  },
  {
    id: 'default-cartao',
    nome: 'Cartão de Crédito',
    tipo: 'saida',
    icone: 'CreditCard',
    cor: '#6366F1',
    ordem: 6,
  },
  {
    id: 'default-outros-saida',
    nome: 'Outros',
    tipo: 'saida',
    icone: 'CircleDollarSign',
    cor: '#6B7280',
    ordem: 7,
  },
]

// Helpers
export function getCategoriasPadraoByTipo(tipo: TipoLancamento): CategoriaPadrao[] {
  return CATEGORIAS_PADRAO.filter(c => c.tipo === tipo)
}

export function getCategoriaPadraoById(id: string): CategoriaPadrao | undefined {
  return CATEGORIAS_PADRAO.find(c => c.id === id)
}

export function isCategoriaPadrao(id: string): boolean {
  return id.startsWith('default-')
}
