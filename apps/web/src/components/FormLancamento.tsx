/**
 * FormLancamento Component
 *
 * Formulário para criar ou editar lançamentos.
 * Usado dentro do Drawer/Bottomsheet.
 *
 * Campos:
 * - Nome (obrigatório)
 * - Valor (obrigatório)
 * - Dia previsto (opcional)
 * - Já recebeu/pagou (toggle)
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { InputMoeda } from '@/components/InputMoeda'
import type { Lancamento } from '@/lib/api'

interface FormLancamentoProps {
  tipo: 'entrada' | 'saida'
  lancamento?: Lancamento | null
  autoMarcarConcluido: boolean
  onSubmit: (data: {
    nome: string
    valor: number
    data_prevista: string | null
    concluido: boolean
  }) => void
  onDelete?: () => void
  isLoading?: boolean
}

export function FormLancamento({
  tipo,
  lancamento,
  autoMarcarConcluido,
  onSubmit,
  onDelete,
  isLoading = false,
}: FormLancamentoProps) {
  const isEditing = !!lancamento

  // Estado do formulário
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [diaPrevisto, setDiaPrevisto] = useState('')
  const [concluido, setConcluido] = useState(false)

  // Erros de validação
  const [errors, setErrors] = useState<{
    nome?: string
    valor?: string
  }>({})

  // Preenche os campos quando está editando
  useEffect(() => {
    if (lancamento) {
      setNome(lancamento.nome)
      setValor(String(lancamento.valor))
      setConcluido(lancamento.concluido)
      if (lancamento.data_prevista) {
        const dia = new Date(lancamento.data_prevista).getDate()
        setDiaPrevisto(String(dia))
      }
    } else {
      // Reset para novo lançamento
      setNome('')
      setValor('')
      setDiaPrevisto('')
      setConcluido(autoMarcarConcluido)
    }
  }, [lancamento, autoMarcarConcluido])

  /**
   * Valida e submete o formulário
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validação
    const newErrors: typeof errors = {}

    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'))
    if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Monta a data prevista se informada
    let dataPrevista: string | null = null
    if (diaPrevisto) {
      const dia = parseInt(diaPrevisto)
      if (dia >= 1 && dia <= 31) {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        dataPrevista = new Date(year, month, dia).toISOString().split('T')[0]
      }
    }

    onSubmit({
      nome: nome.trim(),
      valor: valorNumerico,
      data_prevista: dataPrevista,
      concluido,
    })
  }

  // Labels dinâmicos baseados no tipo
  const labels = {
    titulo: isEditing
      ? tipo === 'entrada' ? 'Editar entrada' : 'Editar saída'
      : tipo === 'entrada' ? 'Nova entrada' : 'Nova saída',
    nome: tipo === 'entrada' ? 'O que entrou?' : 'O que foi?',
    diaPrevisto: tipo === 'entrada' ? 'Dia previsto' : 'Dia de vencimento',
    concluido: tipo === 'entrada' ? 'Já recebi' : 'Já paguei',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Título */}
      <h2 className="text-titulo-card text-neutro-900">{labels.titulo}</h2>

      {/* Campo: Nome */}
      <div className="space-y-2">
        <Label htmlFor="nome">{labels.nome}</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            if (errors.nome) setErrors((prev) => ({ ...prev, nome: undefined }))
          }}
          placeholder="Ex: Salário"
          maxLength={100}
        />
        {errors.nome && (
          <p className="text-pequeno text-vermelho">{errors.nome}</p>
        )}
      </div>

      {/* Campo: Valor */}
      <InputMoeda
        label="Quanto?"
        value={valor}
        onChange={(val) => {
          setValor(val)
          if (errors.valor) setErrors((prev) => ({ ...prev, valor: undefined }))
        }}
        error={errors.valor}
      />

      {/* Campo: Dia previsto */}
      <div className="space-y-2">
        <Label htmlFor="diaPrevisto">{labels.diaPrevisto}</Label>
        <Input
          id="diaPrevisto"
          type="number"
          min={1}
          max={31}
          value={diaPrevisto}
          onChange={(e) => setDiaPrevisto(e.target.value)}
          placeholder="Ex: 15"
        />
      </div>

      {/* Toggle: Concluído */}
      <div className="flex items-center justify-between min-h-touch">
        <Label htmlFor="concluido" className="cursor-pointer">
          {labels.concluido}
        </Label>
        <Switch
          id="concluido"
          checked={concluido}
          onCheckedChange={setConcluido}
        />
      </div>

      {/* Botões */}
      <div className="space-y-3 pt-4">
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>

        {/* Botão excluir (apenas ao editar) */}
        {isEditing && onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={onDelete}
            disabled={isLoading}
          >
            Excluir
          </Button>
        )}
      </div>
    </form>
  )
}
