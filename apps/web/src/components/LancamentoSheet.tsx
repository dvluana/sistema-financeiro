/**
 * LancamentoSheet Component
 *
 * Drawer completamente refatorado com design moderno e minimalista.
 * Inclui suporte a agrupadores e melhor organização visual.
 */

import { useState, useEffect } from 'react'
import {
  Calendar,
  DollarSign,
  Repeat,
  Hash,
  Trash2,
  TrendingUp,
  TrendingDown,
  Layers,
  Calculator,
  Settings2,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Componentes shadcn/ui
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Componentes internos
import { CategoriaSelect } from '@/components/CategoriaSelect'
import type { Lancamento } from '@/lib/api'

export interface LancamentoFormData {
  nome: string
  valor: number
  data_prevista: string | null
  data_vencimento?: string | null
  concluido: boolean
  categoria_id: string | null
  meses?: string[]
  qtd_parcelas?: number
  is_agrupador?: boolean
  valor_modo?: 'soma' | 'fixo'
}

interface LancamentoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mesAtual: string
  lancamento?: Lancamento | null
  tipoInicial?: 'entrada' | 'saida'
  autoMarcarConcluido?: { entrada: boolean; saida: boolean }
  onSubmit: (tipo: 'entrada' | 'saida', data: LancamentoFormData) => Promise<void>
  onDelete?: () => void
  isLoading?: boolean
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
}: LancamentoSheetProps) {
  const isEditing = !!lancamento

  // Estado do tipo (entrada/saída)
  const [tipo, setTipo] = useState<'entrada' | 'saida'>(tipoInicial)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  
  // Campos de agrupador
  const [isAgrupador, setIsAgrupador] = useState(false)
  const [valorModo, setValorModo] = useState<'soma' | 'fixo'>('soma')

  // Estado para recorrência
  const [isRecorrente, setIsRecorrente] = useState(false)
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'mensal' | 'parcelas'>('mensal')
  const [qtdParcelas, setQtdParcelas] = useState('2')

  // Validação
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Inicializa campos quando abre ou muda o lançamento
  useEffect(() => {
    if (lancamento) {
      setTipo(lancamento.tipo as 'entrada' | 'saida')
      setNome(lancamento.nome)
      setValor(String(lancamento.valor))
      setConcluido(lancamento.concluido)
      setCategoriaId(lancamento.categoria_id || null)
      setDataPrevista(lancamento.data_prevista || '')
      setDataVencimento(lancamento.data_vencimento || '')
      setIsAgrupador(lancamento.is_agrupador || false)
      setValorModo(lancamento.valor_modo || 'soma')
      setIsRecorrente(false)
      setTipoRecorrencia('mensal')
      setQtdParcelas('2')
    } else {
      setTipo(tipoInicial)
      setNome('')
      setValor('')
      setConcluido(autoMarcarConcluido[tipoInicial])
      setCategoriaId(null)
      setDataPrevista('')
      setDataVencimento('')
      setIsAgrupador(false)
      setValorModo('soma')
      setIsRecorrente(false)
      setTipoRecorrencia('mensal')
      setQtdParcelas('2')
    }
    setErrors({})
  }, [lancamento, tipoInicial, autoMarcarConcluido, open])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!nome.trim()) {
      newErrors.nome = 'Descrição obrigatória'
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'))
    if (!isAgrupador || valorModo === 'fixo') {
      if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
        newErrors.valor = 'Valor obrigatório'
      }
    }

    if (isRecorrente && tipoRecorrencia === 'parcelas') {
      const parcelas = parseInt(qtdParcelas)
      if (!qtdParcelas || isNaN(parcelas) || parcelas < 2 || parcelas > 60) {
        newErrors.parcelas = 'Entre 2 e 60 parcelas'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const valorNumerico = parseFloat(valor.replace(',', '.')) || 0
    const formData: LancamentoFormData = {
      nome: nome.trim(),
      valor: isAgrupador && valorModo === 'soma' ? 0 : valorNumerico,
      data_prevista: dataPrevista || null,
      data_vencimento: tipo === 'saida' ? (dataVencimento || null) : null,
      concluido,
      categoria_id: categoriaId,
      is_agrupador: isAgrupador,
      valor_modo: isAgrupador ? valorModo : undefined,
    }

    // Se for recorrente e não estiver editando
    if (isRecorrente && !isEditing) {
      if (tipoRecorrencia === 'mensal') {
        const meses: string[] = []
        const [ano, mes] = mesAtual.split('-').map(Number)
        for (let i = 0; i < 12; i++) {
          const novoMes = mes + i
          const novoAno = ano + Math.floor((novoMes - 1) / 12)
          const mesFormatado = ((novoMes - 1) % 12) + 1
          meses.push(`${novoAno}-${String(mesFormatado).padStart(2, '0')}`)
        }
        formData.meses = meses
      } else {
        formData.qtd_parcelas = parseInt(qtdParcelas)
      }
    }

    await onSubmit(tipo, formData)
  }

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md p-0 flex flex-col h-full"
        >
          {/* Header limpo e moderno */}
          <SheetHeader className="px-6 py-5 bg-gradient-to-r from-background to-muted/20 border-b">
            <SheetTitle className="text-xl font-bold">
              {isEditing ? 'Editar' : 'Novo'} Lançamento
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Preencha os dados abaixo
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <form id="lancamento-form" onSubmit={handleSubmit} className="p-6">
              {/* Seção 1: Tipo e Informações Básicas */}
              <div className="space-y-6">
                {/* Tipo - Toggle bonito */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de Lançamento
                  </Label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => !isEditing && setTipo('entrada')}
                      disabled={isEditing}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all",
                        tipo === 'entrada'
                          ? "bg-background text-verde shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => !isEditing && setTipo('saida')}
                      disabled={isEditing}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all",
                        tipo === 'saida'
                          ? "bg-background text-rosa shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <TrendingDown className="w-4 h-4" />
                      Saída
                    </button>
                  </div>
                </div>

                {/* Agrupador - Switch elegante */}
                <AnimatePresence>
                  {tipo === 'saida' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Layers className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="agrupador" className="text-sm font-medium cursor-pointer">
                                Criar como Grupo
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Agrupe múltiplos lançamentos relacionados
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="agrupador"
                            checked={isAgrupador}
                            onCheckedChange={setIsAgrupador}
                            disabled={isEditing && lancamento?.filhos && lancamento.filhos.length > 0}
                          />
                        </div>

                        {/* Modo do valor para agrupadores */}
                        <AnimatePresence>
                          {isAgrupador && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-primary/10"
                            >
                              <div className="space-y-3">
                                <Label className="text-xs font-medium text-muted-foreground">
                                  Como calcular o valor total?
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setValorModo('soma')}
                                    className={cn(
                                      "p-3 rounded-lg border transition-all text-left",
                                      valorModo === 'soma'
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    <Calculator className="w-4 h-4 mb-1 text-primary" />
                                    <p className="text-xs font-medium">Soma automática</p>
                                    <p className="text-xs text-muted-foreground">Soma os itens</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setValorModo('fixo')}
                                    className={cn(
                                      "p-3 rounded-lg border transition-all text-left",
                                      valorModo === 'fixo'
                                        ? "border-primary bg-primary/10"
                                        : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    <DollarSign className="w-4 h-4 mb-1 text-primary" />
                                    <p className="text-xs font-medium">Valor fixo</p>
                                    <p className="text-xs text-muted-foreground">Defina o total</p>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Separator />

                {/* Descrição e Valor */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-sm font-medium">
                      Descrição
                    </Label>
                    <div className="relative">
                      <Input
                        id="nome"
                        value={nome}
                        onChange={(e) => {
                          setNome(e.target.value)
                          if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined }))
                        }}
                        placeholder={
                          isAgrupador 
                            ? "Ex: Despesas do mês, Compras..."
                            : tipo === 'entrada'
                            ? "Ex: Salário, Freelance..."
                            : "Ex: Mercado, Netflix..."
                        }
                        className={cn(
                          "pr-10",
                          errors.nome && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {isAgrupador && (
                        <Package2 className="absolute right-3 top-3 w-4 h-4 text-primary" />
                      )}
                    </div>
                    {errors.nome && (
                      <p className="text-xs text-destructive">{errors.nome}</p>
                    )}
                  </div>

                  {/* Valor - apenas se não for agrupador com soma automática */}
                  {(!isAgrupador || valorModo === 'fixo') && (
                    <div className="space-y-2">
                      <Label htmlFor="valor" className="text-sm font-medium">
                        Valor {isAgrupador && '(Total fixo)'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-sm font-medium text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id="valor"
                          value={valor}
                          onChange={(e) => {
                            setValor(e.target.value.replace(/[^0-9,]/g, ''))
                            if (errors.valor) setErrors(prev => ({ ...prev, valor: undefined }))
                          }}
                          placeholder="0,00"
                          className={cn(
                            "pl-10 font-mono",
                            errors.valor && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                      </div>
                      {errors.valor && (
                        <p className="text-xs text-destructive">{errors.valor}</p>
                      )}
                    </div>
                  )}

                  {/* Categoria */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Categoria
                    </Label>
                    <CategoriaSelect
                      tipo={tipo}
                      value={categoriaId}
                      onChange={setCategoriaId}
                    />
                  </div>
                </div>

                <Separator />

                {/* Datas */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="dataPrevista" className="text-sm font-medium">
                        {tipo === 'entrada' ? 'Recebimento' : 'Pagamento'}
                      </Label>
                      <div className="relative">
                        <Input
                          id="dataPrevista"
                          type="date"
                          value={dataPrevista}
                          onChange={(e) => setDataPrevista(e.target.value)}
                          className="pl-10"
                        />
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>

                    {tipo === 'saida' && (
                      <div className="space-y-2">
                        <Label htmlFor="dataVencimento" className="text-sm font-medium">
                          Vencimento
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <Input
                                id="dataVencimento"
                                type="date"
                                value={dataVencimento}
                                onChange={(e) => setDataVencimento(e.target.value)}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Opcional - para controle de vencimentos</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Status */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="concluido" className="text-sm font-medium cursor-pointer">
                        {tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Marcar como concluído
                      </p>
                    </div>
                    <Switch
                      id="concluido"
                      checked={concluido}
                      onCheckedChange={setConcluido}
                      className="data-[state=checked]:bg-verde"
                    />
                  </div>
                </div>

                {/* Recorrência */}
                {!isEditing && !isAgrupador && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="recorrente" className="text-sm font-medium cursor-pointer">
                            <span className="flex items-center gap-2">
                              <Repeat className="w-4 h-4" />
                              Repetir
                            </span>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Criar múltiplas ocorrências
                          </p>
                        </div>
                        <Switch
                          id="recorrente"
                          checked={isRecorrente}
                          onCheckedChange={setIsRecorrente}
                        />
                      </div>

                      <AnimatePresence>
                        {isRecorrente && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setTipoRecorrencia('mensal')}
                                className={cn(
                                  "p-2 rounded border text-xs font-medium transition-all",
                                  tipoRecorrencia === 'mensal'
                                    ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                                    : "border-border"
                                )}
                              >
                                Mensal (12x)
                              </button>
                              <button
                                type="button"
                                onClick={() => setTipoRecorrencia('parcelas')}
                                className={cn(
                                  "p-2 rounded border text-xs font-medium transition-all",
                                  tipoRecorrencia === 'parcelas'
                                    ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                                    : "border-border"
                                )}
                              >
                                Parcelado
                              </button>
                            </div>

                            {tipoRecorrencia === 'parcelas' && (
                              <div className="space-y-2">
                                <Label htmlFor="parcelas" className="text-xs">
                                  Número de parcelas
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="parcelas"
                                    type="number"
                                    min="2"
                                    max="60"
                                    value={qtdParcelas}
                                    onChange={(e) => {
                                      setQtdParcelas(e.target.value)
                                      if (errors.parcelas) {
                                        setErrors(prev => ({ ...prev, parcelas: undefined }))
                                      }
                                    }}
                                    className={cn(
                                      "pl-8 h-9",
                                      errors.parcelas && "border-destructive"
                                    )}
                                  />
                                  <Hash className="absolute left-2.5 top-2.5 w-3 h-3 text-muted-foreground" />
                                </div>
                                {errors.parcelas && (
                                  <p className="text-xs text-destructive">{errors.parcelas}</p>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
            </form>
          </ScrollArea>

          {/* Footer moderno */}
          <SheetFooter className="px-6 py-4 bg-muted/20 border-t">
            <div className="flex gap-2 w-full">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onDelete}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
              
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="lancamento-form"
                  disabled={isLoading}
                  className={cn(
                    "min-w-[100px]",
                    tipo === 'entrada' 
                      ? "bg-verde hover:bg-verde/90" 
                      : "bg-rosa hover:bg-rosa/90"
                  )}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      {isAgrupador && <Layers className="w-4 h-4 mr-2" />}
                      {isEditing ? 'Salvar' : 'Criar'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}