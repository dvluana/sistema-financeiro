import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StatusCircle } from "./StatusCircle"
import { formatarMoeda } from "@/lib/utils"
import type { Categoria } from "@/lib/api"

// Função para obter o componente de ícone do Lucide dinamicamente
function getIconComponent(iconName: string | null): LucideIcon | null {
  if (!iconName) return null
  const icons = LucideIcons as unknown as Record<string, LucideIcon>
  return icons[iconName] || null
}

interface ItemListaProps {
  nome: string
  valor: number
  dataPrevista?: string | null
  concluido: boolean
  categoria?: Categoria | null
  mostrarConcluidosDiscretos?: boolean
  onToggle: () => void
  onEdit: () => void
}

export function ItemLista({
  nome,
  valor,
  dataPrevista,
  concluido,
  categoria,
  mostrarConcluidosDiscretos = true,
  onToggle,
  onEdit,
}: ItemListaProps) {
  // Obter ícone da categoria
  const CategoriaIcon = categoria?.icone ? getIconComponent(categoria.icone) : null

  return (
    <div className="flex items-center gap-2 min-h-[64px] border-b border-neutro-200 last:border-0">
      <StatusCircle checked={concluido} onChange={onToggle} />

      <button
        type="button"
        onClick={onEdit}
        className={`flex-1 flex justify-between items-start py-3 text-left min-h-touch ${
          concluido && mostrarConcluidosDiscretos ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Ícone da categoria */}
          {CategoriaIcon && categoria && (
            <span
              className="flex items-center justify-center w-6 h-6 rounded shrink-0"
              style={{ backgroundColor: categoria.cor || '#6B7280' }}
            >
              <CategoriaIcon className="w-3.5 h-3.5 text-white" />
            </span>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-corpo text-neutro-900 truncate">{nome}</span>
            <div className="flex items-center gap-2 text-micro text-neutro-400">
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
        <span className="text-corpo-medium text-neutro-900 shrink-0 ml-2">
          {formatarMoeda(valor)}
        </span>
      </button>
    </div>
  )
}
