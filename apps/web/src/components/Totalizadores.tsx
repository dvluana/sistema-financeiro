import { formatarMoeda } from "@/lib/utils"

interface TotalizadoresProps {
  labelEsquerda: string
  valorEsquerda: number
  labelDireita: string
  valorDireita: number
}

export function Totalizadores({
  labelEsquerda,
  valorEsquerda,
  labelDireita,
  valorDireita,
}: TotalizadoresProps) {
  return (
    <div className="flex border-t border-neutro-200 pt-4 mt-4">
      <div className="flex-1">
        <p className="text-micro text-neutro-600">{labelEsquerda}</p>
        <p className="text-titulo-card text-neutro-900">
          {formatarMoeda(valorEsquerda)}
        </p>
      </div>
      <div className="flex-1 text-right">
        <p className="text-micro text-neutro-600">{labelDireita}</p>
        <p className="text-titulo-card text-neutro-900">
          {formatarMoeda(valorDireita)}
        </p>
      </div>
    </div>
  )
}
