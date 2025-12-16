/**
 * LancamentoSheet Component
 *
 * Drawer/Bottomsheet responsivo para criar lançamentos manualmente.
 * Possui abas para alternar entre Entrada e Saída.
 * Design moderno com visual limpo e animações suaves.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
  Repeat,
  Calendar,
  CreditCard,
} from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { InputMoeda } from '@/components/InputMoeda'
import { CategoriaSelect } from '@/components/CategoriaSelect'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import type { Lancamento } from '@/lib/api'

export interface LancamentoFormData {
  nome: string
  valor: number
  data_prevista: string | null
  concluido: boolean
  categoria_id: string | null
  recorrencia?: {
    tipo: 'mensal' | 'parcelas'
    quantidade: number
  }
}

type TipoLancamento = 'entrada' | 'saida' | 'agrupador'

interface LancamentoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mesAtual: string
  lancamento?: Lancamento | null
  tipoInicial?: TipoLancamento
  autoMarcarConcluido?: { entrada: boolean; saida: boolean }
  onSubmit: (tipo: TipoLancamento, data: LancamentoFormData) => Promise<void>
  onDelete?: () => void
  isLoading?: boolean
  /** Mostra opção de criar agrupador (cartão/grupo) */
  showAgrupadorOption?: boolean
}

export function LancamentoSheet({
  open,
  onOpenChange,
  mesAtual,
  lancamento,
  tipoInicial = 'saida',
  autoMarcarConcluido = { entrada: false, saida: false },
  onSubmit,
  onDelete,
  isLoading = false,
  showAgrupadorOption = false,
}: LancamentoSheetProps) {
  const isDesktop = useIsDesktop()
  const isEditing = !!lancamento

  // Tipo selecionado (entrada, saída ou agrupador)
  const [tipo, setTipo] = useState<TipoLancamento>(tipoInicial)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [categoriaId, setCategoriaId] = useState<string | null>(null)

  // Recorrência
  const [recorrente, setRecorrente] = useState(false)
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'mensal' | 'parcelas'>('mensal')
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('12')

  // Erros
  const [errors, setErrors] = useState<{
    nome?: string
    valor?: string
    parcelas?: string
  }>({})

  // Inicializa campos quando abre ou quando lançamento muda
  useEffect(() => {
    if (lancamento) {
      // Preserva o tipo original (incluindo agrupador)
      setTipo(lancamento.tipo)
      setNome(lancamento.nome)
      setValor(String(lancamento.valor))
      setConcluido(lancamento.concluido)
      setCategoriaId(lancamento.categoria_id || null)
      // Usa a data_prevista completa se existir
      setDataPrevista(lancamento.data_prevista || '')
      setRecorrente(false)
    } else {
      setTipo(tipoInicial)
      setNome('')
      setValor('')
      // Pré-preenche com a data do mês selecionado (primeiro dia)
      setDataPrevista('')
      // Agrupadores não têm auto-concluído
      const autoValue = tipoInicial === 'agrupador' ? false : autoMarcarConcluido[tipoInicial as 'entrada' | 'saida']
      setConcluido(autoValue)
      setCategoriaId(null)
      setRecorrente(false)
      setTipoRecorrencia('mensal')
      setQuantidadeParcelas('12')
    }
    setErrors({})
  }, [lancamento, tipoInicial, open, autoMarcarConcluido, mesAtual])

  // Atualiza concluido quando troca de tipo (apenas ao criar)
  useEffect(() => {
    if (!isEditing && tipo !== 'agrupador') {
      setConcluido(autoMarcarConcluido[tipo])
    }
  }, [tipo, isEditing, autoMarcarConcluido])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

    const data: LancamentoFormData = {
      nome: nome.trim(),
      valor: valorNumerico,
      data_prevista: dataPrevista || null,
      concluido,
      categoria_id: categoriaId,
    }

    if (!isEditing && recorrente) {
      data.recorrencia = {
        tipo: tipoRecorrencia,
        quantidade: tipoRecorrencia === 'mensal' ? 12 : parseInt(quantidadeParcelas),
      }
    }

    await onSubmit(tipo, data)
  }

  const labels = {
    nome: tipo === 'entrada' ? 'O que entrou?' : tipo === 'agrupador' ? 'Nome do cartão/grupo' : 'O que foi?',
    dataPrevista: tipo === 'entrada' ? 'Data prevista' : 'Data de vencimento',
    concluido: tipo === 'entrada' ? 'Já recebi' : 'Já paguei',
    recorrente: tipo === 'entrada' ? 'Entrada recorrente' : 'Saída recorrente',
  }

  const sharedContent = (
    <div className={cn(
      'flex flex-col overflow-hidden',
      isDesktop ? 'h-full p-6' : 'max-h-[calc(92vh-12px)] p-4'
    )}>
      {/* Header com abas */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <DrawerPrimitive.Title className="text-titulo-card text-foreground">
          {isEditing ? 'Editar lançamento' : 'Novo lançamento'}
        </DrawerPrimitive.Title>
        <DrawerPrimitive.Close className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <X className="w-5 h-5" />
        </DrawerPrimitive.Close>
      </div>

      {/* Seletor de tipo (Entrada/Saída/Agrupador) */}
      {!isEditing && (
        <div className={cn(
          "flex gap-2 p-1 bg-secondary rounded-xl mb-6 shrink-0",
          showAgrupadorOption && "flex-wrap"
        )}>
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-corpo-medium font-medium transition-all',
              tipo === 'entrada'
                ? 'bg-verde text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Entrada</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('saida')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-corpo-medium font-medium transition-all',
              tipo === 'saida'
                ? 'bg-vermelho text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Saída</span>
          </button>
          {showAgrupadorOption && (
            <button
              type="button"
              onClick={() => setTipo('agrupador')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-corpo-medium font-medium transition-all',
                tipo === 'agrupador'
                  ? 'bg-azul text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CreditCard className="w-4 h-4" />
              <span>Cartão/Grupo</span>
            </button>
          )}
        </div>
      )}

      {/* Badge do tipo ao editar */}
      {isEditing && (
        <div className="flex items-center gap-2 mb-6">
          <div className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-micro font-medium',
            tipo === 'entrada'
              ? 'bg-verde/10 text-verde'
              : tipo === 'agrupador'
              ? 'bg-azul/10 text-azul'
              : 'bg-vermelho/10 text-vermelho'
          )}>
            {tipo === 'entrada' ? (
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Entrada</span>
              </>
            ) : tipo === 'agrupador' ? (
              <>
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cartão/Grupo</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Saída</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Área scrollável com campos (data-vaul-no-drag permite scroll dentro do drawer) */}
      <div
        className="flex-1 overflow-y-auto min-h-0 overscroll-contain -mx-4 px-4"
        data-vaul-no-drag
      >
        <form id="lancamento-form" onSubmit={handleSubmit} className="space-y-5 pb-4">
        {/* Nome */}
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

        {/* Valor */}
        <InputMoeda
          label="Quanto?"
          value={valor}
          onChange={(val) => {
            setValor(val)
            if (errors.valor) setErrors((prev) => ({ ...prev, valor: undefined }))
          }}
          error={errors.valor}
        />

        {/* Categoria */}
        <CategoriaSelect
          tipo={tipo === 'agrupador' ? 'saida' : tipo}
          value={categoriaId}
          onChange={setCategoriaId}
        />

        {/* Data prevista */}
        <div className="space-y-2">
          <Label htmlFor="dataPrevista">{labels.dataPrevista}</Label>
          <Input
            id="dataPrevista"
            type="date"
            value={dataPrevista}
            onChange={(e) => setDataPrevista(e.target.value)}
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

        {/* Seção de Recorrência (apenas ao criar, não para agrupadores) */}
        {!isEditing && tipo !== 'agrupador' && (
          <>
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between min-h-touch">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-muted-foreground" />
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
                  <div className="space-y-4 p-4 bg-secondary rounded-card">
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
                        <span className="text-corpo-medium text-foreground">
                          Todos os meses
                        </span>
                        <p className="text-micro text-muted-foreground">
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
                          <span className="text-corpo-medium text-foreground">
                            Parcelado
                          </span>
                          <p className="text-micro text-muted-foreground">
                            Define número de parcelas
                          </p>
                        </div>

                        {tipoRecorrencia === 'parcelas' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4 text-muted-foreground" />
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
                            <span className="text-pequeno text-muted-foreground">parcelas</span>
                          </motion.div>
                        )}
                      </div>
                    </label>

                    {errors.parcelas && (
                      <p className="text-pequeno text-vermelho">{errors.parcelas}</p>
                    )}

                    {/* Preview */}
                    <div className="pt-2 border-t border-border">
                      <p className="text-micro text-muted-foreground">
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
        </form>
      </div>

      {/* Botões fixos no final (fora do scroll) */}
      <div className={cn(
        'space-y-3 pt-4 border-t border-border shrink-0',
        !isDesktop && 'pb-safe'
      )}>
        <Button
          type="submit"
          form="lancamento-form"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : recorrente ? (
            'Criar lançamentos'
          ) : (
            'Salvar'
          )}
        </Button>

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
    </div>
  )

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={isDesktop ? 'right' : 'bottom'}
      shouldScaleBackground={!isDesktop}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content
          className={cn(
            'fixed z-50 flex flex-col bg-card',
            isDesktop
              ? 'inset-y-0 right-0 h-full w-full max-w-md border-l border-border rounded-l-2xl shadow-xl'
              : 'inset-x-0 bottom-0 rounded-t-2xl border-t border-border shadow-xl'
          )}
          style={!isDesktop ? { maxHeight: '92vh' } : undefined}
        >
          {!isDesktop && (
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border" />
          )}
          {sharedContent}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}
