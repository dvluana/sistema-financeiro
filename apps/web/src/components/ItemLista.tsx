import { StatusCircle } from "./StatusCircle"
import { formatarMoeda } from "@/lib/utils"

interface ItemListaProps {
  nome: string
  valor: number
  dataPrevista?: string | null
  concluido: boolean
  mostrarConcluidosDiscretos?: boolean
  onToggle: () => void
  onEdit: () => void
}

export function ItemLista({
  nome,
  valor,
  dataPrevista,
  concluido,
  mostrarConcluidosDiscretos = true,
  onToggle,
  onEdit,
}: ItemListaProps) {
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
        <div className="flex flex-col">
          <span className="text-corpo text-neutro-900 truncate">{nome}</span>
          {dataPrevista && (
            <span className="text-micro text-neutro-400">
              Dia {new Date(dataPrevista).getDate()}
            </span>
          )}
        </div>
        <span className="text-corpo-medium text-neutro-900">
          {formatarMoeda(valor)}
        </span>
      </button>
    </div>
  )
}
