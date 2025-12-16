import React, { useState, useMemo } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatusCircle } from "./StatusCircle"
import { formatarMoeda, cn } from "@/lib/utils"
import type { Lancamento } from "@/lib/api"
import { getIconComponent } from "@/lib/icons"

interface ItemListaAgrupadoProps {
  agrupador: Lancamento
  mostrarConcluidosDiscretos?: boolean
  onToggle: () => void
  onEdit: () => void
  onEditFilho: (filho: Lancamento) => void
  onToggleFilho: (filho: Lancamento) => void
  onAddFilho: () => void
}

export const ItemListaAgrupado = React.memo(function ItemListaAgrupado({
  agrupador,
  mostrarConcluidosDiscretos = true,
  onToggle,
  onEdit,
  onEditFilho,
  onToggleFilho,
  onAddFilho,
}: ItemListaAgrupadoProps) {
  const [expanded, setExpanded] = useState(false)

  const filhos = agrupador.filhos || []
  const temFilhos = filhos.length > 0

  // Memoiza ícone da categoria
  const CategoriaIcon = useMemo(
    () => (agrupador.categoria?.icone ? getIconComponent(agrupador.categoria.icone) : null),
    [agrupador.categoria?.icone]
  )

  // Calcula total dos filhos
  const totalFilhos = useMemo(
    () => filhos.reduce((sum, f) => sum + f.valor, 0),
    [filhos]
  )

  // Diferença entre valor do agrupador e soma dos filhos
  const diferenca = agrupador.valor - totalFilhos

  return (
    <div className="border-b border-border last:border-0">
      {/* Linha do agrupador */}
      <div className="flex items-center gap-2 min-h-[64px] px-1">
        <StatusCircle checked={agrupador.concluido} onChange={onToggle} />

        {/* Botão expandir/colapsar */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center w-8 h-8 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          aria-label={expanded ? 'Colapsar itens do grupo' : 'Expandir itens do grupo'}
          aria-expanded={expanded}
        >
          <motion.div
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="flex-1 flex justify-between items-center py-3 text-left min-h-touch"
          aria-label={`Editar ${agrupador.nome}`}
        >
          <div className={cn(
            'flex items-center gap-2 min-w-0 flex-1',
            agrupador.concluido && mostrarConcluidosDiscretos && 'opacity-50'
          )}>
            {/* Ícone da categoria */}
            {CategoriaIcon && agrupador.categoria && (
              <span
                className="flex items-center justify-center w-6 h-6 rounded shrink-0"
                style={{ backgroundColor: agrupador.categoria.cor || '#6B7280' }}
                aria-hidden="true"
              >
                <CategoriaIcon className="w-3.5 h-3.5 text-white" />
              </span>
            )}

            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
              <span className="text-corpo text-foreground truncate">{agrupador.nome}</span>
              <div className="flex items-center gap-2 text-micro text-muted-foreground">
                {agrupador.categoria && (
                  <span>{agrupador.categoria.nome}</span>
                )}
                {temFilhos && (
                  <>
                    {agrupador.categoria && <span aria-hidden="true">•</span>}
                    <span>{filhos.length} {filhos.length === 1 ? 'item' : 'itens'}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Tag Pago com animação */}
            <AnimatePresence>
              {agrupador.concluido && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-vermelho/10 text-vermelho border-vermelho/20"
                  aria-label="Pago"
                >
                  Pago
                </motion.span>
              )}
            </AnimatePresence>

            <span className={cn(
              'text-corpo-medium text-foreground',
              agrupador.concluido && mostrarConcluidosDiscretos && 'opacity-50'
            )}>
              {formatarMoeda(agrupador.valor)}
            </span>
          </div>
        </button>
      </div>

      {/* Lista de filhos expandível */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-8 md:pl-10 pr-2 pb-2 space-y-1">
              {/* Resumo */}
              {temFilhos && (
                <div className="flex justify-between items-center text-micro text-muted-foreground py-2 px-3 bg-muted/30 rounded-lg">
                  <span>Total dos itens</span>
                  <span className="font-medium">{formatarMoeda(totalFilhos)}</span>
                </div>
              )}

              {diferenca !== 0 && temFilhos && (
                <div className={cn(
                  "flex justify-between items-center text-micro py-2 px-3 rounded-lg font-medium",
                  diferenca > 0 ? "bg-amber-500/10 text-amber-600" : "bg-verde/10 text-verde"
                )}>
                  <span>{diferenca > 0 ? 'Falta lançar' : 'Excedente'}</span>
                  <span>{formatarMoeda(Math.abs(diferenca))}</span>
                </div>
              )}

              {/* Lista de filhos */}
              {filhos.map((filho) => (
                <FilhoItem
                  key={filho.id}
                  filho={filho}
                  mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                  onToggle={() => onToggleFilho(filho)}
                  onEdit={() => onEditFilho(filho)}
                />
              ))}

              {/* Botão adicionar */}
              <button
                type="button"
                onClick={onAddFilho}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-micro text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Adicionar novo item ao grupo"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar item</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// Componente para item filho (simplificado)
interface FilhoItemProps {
  filho: Lancamento
  mostrarConcluidosDiscretos: boolean
  onToggle: () => void
  onEdit: () => void
}

const FilhoItem = React.memo(function FilhoItem({
  filho,
  mostrarConcluidosDiscretos,
  onToggle,
  onEdit,
}: FilhoItemProps) {
  const CategoriaIcon = useMemo(
    () => (filho.categoria?.icone ? getIconComponent(filho.categoria.icone) : null),
    [filho.categoria?.icone]
  )

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors min-h-[44px]">
      <StatusCircle checked={filho.concluido} onChange={onToggle} />

      <button
        type="button"
        onClick={onEdit}
        className="flex-1 flex justify-between items-center text-left min-h-touch focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
        aria-label={`Editar ${filho.nome}`}
      >
        <div className={cn(
          'flex items-center gap-2 min-w-0 flex-1',
          filho.concluido && mostrarConcluidosDiscretos && 'opacity-50'
        )}>
          {CategoriaIcon && filho.categoria && (
            <span
              className="flex items-center justify-center w-5 h-5 rounded shrink-0"
              style={{ backgroundColor: filho.categoria.cor || '#6B7280' }}
              aria-hidden="true"
            >
              <CategoriaIcon className="w-3 h-3 text-white" />
            </span>
          )}
          <span className="text-micro text-foreground truncate">{filho.nome}</span>
        </div>

        <span className={cn(
          'text-pequeno-medium text-foreground shrink-0 ml-2',
          filho.concluido && mostrarConcluidosDiscretos && 'opacity-50'
        )}>
          {formatarMoeda(filho.valor)}
        </span>
      </button>
    </div>
  )
})
