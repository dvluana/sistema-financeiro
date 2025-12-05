/**
 * CardSaidas Component
 *
 * Card que exibe a lista de saídas (despesas) do mês.
 * Inclui lista de itens, totalizadores e botão para adicionar.
 */

import { Plus } from 'lucide-react'
import { Card, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ItemLista } from '@/components/ItemLista'
import { Totalizadores } from '@/components/Totalizadores'
import type { Lancamento } from '@/lib/api'

interface CardSaidasProps {
  saidas: Lancamento[]
  jaPaguei: number
  faltaPagar: number
  mostrarConcluidosDiscretos: boolean
  onToggle: (id: string) => void
  onEdit: (lancamento: Lancamento) => void
  onAdd: () => void
}

export function CardSaidas({
  saidas,
  jaPaguei,
  faltaPagar,
  mostrarConcluidosDiscretos,
  onToggle,
  onEdit,
  onAdd,
}: CardSaidasProps) {
  const isEmpty = saidas.length === 0

  return (
    <Card>
      <CardTitle className="mb-4">Saídas</CardTitle>

      <CardContent className="p-0">
        {isEmpty ? (
          // Empty state
          <p className="text-corpo text-neutro-600 text-center py-8">
            Nenhuma saída ainda
          </p>
        ) : (
          // Lista de saídas
          <div className="space-y-0">
            {saidas.map((saida) => (
              <ItemLista
                key={saida.id}
                nome={saida.nome}
                valor={saida.valor}
                dataPrevista={saida.data_prevista}
                concluido={saida.concluido}
                mostrarConcluidosDiscretos={mostrarConcluidosDiscretos}
                onToggle={() => onToggle(saida.id)}
                onEdit={() => onEdit(saida)}
              />
            ))}
          </div>
        )}

        {/* Totalizadores */}
        {!isEmpty && (
          <Totalizadores
            labelEsquerda="Já paguei"
            valorEsquerda={jaPaguei}
            labelDireita="Falta pagar"
            valorDireita={faltaPagar}
          />
        )}

        {/* Botão adicionar */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-neutro-600"
          onClick={onAdd}
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar saída
        </Button>
      </CardContent>
    </Card>
  )
}
