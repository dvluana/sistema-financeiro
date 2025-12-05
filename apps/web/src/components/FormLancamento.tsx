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
 * - Recorrente (toggle) - apenas ao criar
 *   - Opção: Todos os meses (12 meses) ou parcelas personalizadas
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Repeat, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { InputMoeda } from '@/components/InputMoeda'
import { CategoriaSelect } from '@/components/CategoriaSelect'
import type { Lancamento } from '@/lib/api'

export interface FormLancamentoData {
  nome: string
  valor: number
  data_prevista: string | null
  concluido: boolean
  categoria_id: string | null
  recorrencia?: {
    tipo: 'mensal' | 'parcelas'
    quantidade: number // 12 para mensal, ou número de parcelas
  }
}

interface FormLancamentoProps {
  tipo: 'entrada' | 'saida'
  mesAtual: string // formato YYYY-MM
  lancamento?: Lancamento | null
  autoMarcarConcluido: boolean
  onSubmit: (data: FormLancamentoData) => void
  onDelete?: () => void
  isLoading?: boolean
}

export function FormLancamento({
  tipo,
  mesAtual,
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
  const [categoriaId, setCategoriaId] = useState<string | null>(null)

  // Estado de recorrência (apenas para novos lançamentos)
  const [recorrente, setRecorrente] = useState(false)
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'mensal' | 'parcelas'>('mensal')
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('12')

  // Erros de validação
  const [errors, setErrors] = useState<{
    nome?: string
    valor?: string
    parcelas?: string
  }>({})

  // Preenche os campos quando está editando
  useEffect(() => {
    if (lancamento) {
      setNome(lancamento.nome)
      setValor(String(lancamento.valor))
      setConcluido(lancamento.concluido)
      setCategoriaId(lancamento.categoria_id || null)
      if (lancamento.data_prevista) {
        // Extrai o dia diretamente da string YYYY-MM-DD para evitar problemas de timezone
        const dia = lancamento.data_prevista.split('-')[2]
        setDiaPrevisto(String(parseInt(dia, 10))) // Remove zeros à esquerda
      } else {
        setDiaPrevisto('')
      }
      // Reset recorrência ao editar
      setRecorrente(false)
    } else {
      // Reset para novo lançamento
      setNome('')
      setValor('')
      setDiaPrevisto('')
      setConcluido(autoMarcarConcluido)
      setCategoriaId(null)
      setRecorrente(false)
      setTipoRecorrencia('mensal')
      setQuantidadeParcelas('12')
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

    if (recorrente && tipoRecorrencia === 'parcelas') {
      const parcelas = parseInt(quantidadeParcelas)
      if (isNaN(parcelas) || parcelas < 2 || parcelas > 60) {
        newErrors.parcelas = 'Informe entre 2 e 60 parcelas'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Monta a data prevista se informada
    // Usa o mês atual do contexto, não a data do sistema
    let dataPrevista: string | null = null
    if (diaPrevisto) {
      const dia = parseInt(diaPrevisto)
      if (dia >= 1 && dia <= 31) {
        const [year, month] = mesAtual.split('-')
        const diaStr = String(dia).padStart(2, '0')
        dataPrevista = `${year}-${month}-${diaStr}`
      }
    }

    const data: FormLancamentoData = {
      nome: nome.trim(),
      valor: valorNumerico,
      data_prevista: dataPrevista,
      concluido,
      categoria_id: categoriaId,
    }

    // Adiciona recorrência se habilitada (apenas ao criar)
    if (!isEditing && recorrente) {
      data.recorrencia = {
        tipo: tipoRecorrencia,
        quantidade: tipoRecorrencia === 'mensal' ? 12 : parseInt(quantidadeParcelas),
      }
    }

    onSubmit(data)
  }

  // Labels dinâmicos baseados no tipo
  const labels = {
    titulo: isEditing
      ? tipo === 'entrada' ? 'Editar entrada' : 'Editar saída'
      : tipo === 'entrada' ? 'Nova entrada' : 'Nova saída',
    nome: tipo === 'entrada' ? 'O que entrou?' : 'O que foi?',
    diaPrevisto: tipo === 'entrada' ? 'Dia previsto' : 'Dia de vencimento',
    concluido: tipo === 'entrada' ? 'Já recebi' : 'Já paguei',
    recorrente: tipo === 'entrada' ? 'Entrada recorrente' : 'Saída recorrente',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      {/* Campo: Categoria */}
      <CategoriaSelect
        tipo={tipo}
        value={categoriaId}
        onChange={setCategoriaId}
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

      {/* Seção de Recorrência (apenas ao criar) */}
      {!isEditing && (
        <>
          <div className="border-t border-neutro-200 pt-4">
            <div className="flex items-center justify-between min-h-touch">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-neutro-600" />
                <Label htmlFor="recorrente" className="cursor-pointer">
                  {labels.recorrente}
                </Label>
              </div>
              <Switch
                id="recorrente"
                checked={recorrente}
                onCheckedChange={setRecorrente}
              />
            </div>
          </div>

          {/* Opções de recorrência */}
          <AnimatePresence>
            {recorrente && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 p-4 bg-neutro-100 rounded-card">
                  {/* Opção: Mensal */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoRecorrencia"
                      value="mensal"
                      checked={tipoRecorrencia === 'mensal'}
                      onChange={() => setTipoRecorrencia('mensal')}
                      className="w-4 h-4 text-rosa accent-rosa"
                    />
                    <div className="flex-1">
                      <span className="text-corpo-medium text-neutro-900">
                        Todos os meses
                      </span>
                      <p className="text-micro text-neutro-600">
                        Lança para os próximos 12 meses
                      </p>
                    </div>
                  </label>

                  {/* Opção: Parcelas */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoRecorrencia"
                      value="parcelas"
                      checked={tipoRecorrencia === 'parcelas'}
                      onChange={() => setTipoRecorrencia('parcelas')}
                      className="w-4 h-4 text-rosa accent-rosa mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div>
                        <span className="text-corpo-medium text-neutro-900">
                          Parcelado
                        </span>
                        <p className="text-micro text-neutro-600">
                          Define número de parcelas
                        </p>
                      </div>

                      {tipoRecorrencia === 'parcelas' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2"
                        >
                          <Calendar className="w-4 h-4 text-neutro-400" />
                          <Input
                            type="number"
                            min={2}
                            max={60}
                            value={quantidadeParcelas}
                            onChange={(e) => {
                              setQuantidadeParcelas(e.target.value)
                              if (errors.parcelas) {
                                setErrors((prev) => ({ ...prev, parcelas: undefined }))
                              }
                            }}
                            placeholder="12"
                            className="w-20"
                          />
                          <span className="text-pequeno text-neutro-600">parcelas</span>
                        </motion.div>
                      )}
                    </div>
                  </label>

                  {errors.parcelas && (
                    <p className="text-pequeno text-vermelho">{errors.parcelas}</p>
                  )}

                  {/* Preview */}
                  <div className="pt-2 border-t border-neutro-200">
                    <p className="text-micro text-neutro-600">
                      {tipoRecorrencia === 'mensal' ? (
                        <>Será criado para os próximos <strong>12 meses</strong></>
                      ) : (
                        <>
                          Será criado em <strong>{quantidadeParcelas || '0'} parcelas</strong>
                          {parseInt(quantidadeParcelas) > 1 && (
                            <> com nome "{nome || '...'} (1/{quantidadeParcelas})"</>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Botões */}
      <div className="space-y-3 pt-4">
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : recorrente ? 'Criar lançamentos' : 'Salvar'}
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
