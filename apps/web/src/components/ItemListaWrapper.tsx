import React from 'react'
import { ItemLista } from './ItemLista'
import type { Lancamento } from '@/lib/api'

interface ItemListaWrapperProps {
  lancamento: Lancamento
  mostrarConcluidoDiscreto?: boolean
  onToggle: () => void
  onEdit: () => void
}

export const ItemListaWrapper = React.memo(function ItemListaWrapper({
  lancamento,
  mostrarConcluidoDiscreto = false,
  onToggle,
  onEdit,
}: ItemListaWrapperProps) {
  // ItemLista expects individual props, not a lancamento object
  // The props must match the ItemListaProps interface exactly
  return React.createElement(ItemLista, {
    tipo: lancamento.tipo,
    nome: lancamento.nome,
    valor: lancamento.valor,
    dataPrevista: lancamento.data_prevista,
    concluido: lancamento.concluido,
    categoria: lancamento.categoria,
    mostrarConcluidosDiscretos: mostrarConcluidoDiscreto,
    onToggle,
    onEdit,
  } as any)
})
