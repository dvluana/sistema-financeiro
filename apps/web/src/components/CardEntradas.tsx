/**
 * CardEntradas Component
 *
 * Card que exibe a lista de entradas (receitas) do mês.
 * Inclui lista de itens, totalizadores e botão para adicionar.
 */

import { Plus } from 'lucide-react'
import { Card, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ItemLista } from '@/components/ItemLista'
import { Totalizadores } from '@/components/Totalizadores'
import type { Lancamento } from '@/lib/api'

interface CardEntradasProps {
  entradas: Lancamento[]
  jaEntrou: number
  faltaEntrar: number
  mostrarConcluidosDiscretos: boolean
  onToggle: (id: string) => void
  onEdit: (lancamento: Lancamento) => void
  onAdd: () => void
}

export function CardEntradas({
  entradas,
  jaEntrou,
  faltaEntrar,
  mostrarConcluidosDiscretos,
  onToggle,
  onEdit,
  onAdd,
}: CardEntradasProps) {
  const isEmpty = entradas.length === 0

  return (
    <Card className="border-l-4 border-l-verde">
      <CardTitle className="mb-4 text-verde">Entradas</CardTitle>

      <CardContent className="p-0">
        {isEmpty ? (
          // Empty state
          <p className="text-corpo text-neutro-600 text-center py-8">
            Nenhuma entrada ainda
          </p>
        ) : (
          // Lista de entradas
          <div className="space-y-0">
            {entradas.map((entrada) => (
              <ItemLista
                key={entrada.id}
                nome={entrada.nome}
                valor={entrada.valor}
                dataPrevista={entrada.data_prevista}
                concluido={entrada.concluido}
                categoria={entrada.categoria}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={() => onToggle(entrada.id)}
                onEdit={() => onEdit(entrada)}
              />
            ))}
          </div>
        )}

        {/* Totalizadores */}
        {!isEmpty && (
          <Totalizadores
            labelEsquerda="Já entrou"
            valorEsquerda={jaEntrou}
            labelDireita="Falta entrar"
            valorDireita={faltaEntrar}
          />
        )}

        {/* Botão adicionar */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-verde hover:text-verde-hover hover:bg-verde-bg"
          onClick={onAdd}
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar entrada
        </Button>
      </CardContent>
    </Card>
  )
}
