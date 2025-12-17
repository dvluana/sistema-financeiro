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
  is_agrupador?: boolean
  valor_modo?: 'soma' | 'fixo'
  recorrencia?: {
    tipo: 'mensal' | 'parcelas'
    quantidade: number
  }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle className="text-xl font-semibold">
            {isEditing ? 'Editar' : 'Novo'} lançamento
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Preencha os dados do lançamento
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <form id="lancamento-form" onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Tipo - Segmented Control compacto */}
            <div className="flex p-1 bg-muted rounded-input">
              <button
                type="button"
                onClick={() => !isEditing && setTipo('entrada')}
                disabled={isEditing}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium transition-all",
                  tipo === 'entrada'
                    ? "bg-background text-verde shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  isEditing && "opacity-60 cursor-not-allowed"
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
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium transition-all",
                  tipo === 'saida'
                    ? "bg-background text-rosa shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  isEditing && "opacity-60 cursor-not-allowed"
                )}
              >
                <TrendingDown className="w-4 h-4" />
                Saída
              </button>
            </div>

            {/* Descrição - Campo principal, 100% */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium">
                Descrição
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined }))
                }}
                placeholder={
                  tipo === 'entrada'
                    ? "Ex: Salário, Freelance..."
                    : "Ex: Mercado, Netflix..."
                }
                className={cn(
                  errors.nome && "border-destructive focus:border-destructive"
                )}
              />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome}</p>
              )}
            </div>

            {/* Valor + Categoria - Mesma linha */}
            <div className="grid grid-cols-2 gap-3">
              {/* Valor */}
              {(!isAgrupador || valorModo === 'fixo') && (
                <div className="space-y-2">
                  <Label htmlFor="valor" className="text-sm font-medium">
                    Valor
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
                        "pl-11 font-mono",
                        errors.valor && "border-destructive focus:border-destructive"
                      )}
                    />
                  </div>
                  {errors.valor && (
                    <p className="text-xs text-destructive">{errors.valor}</p>
                  )}
                </div>
              )}

              {/* Categoria */}
              <div className={cn(
                "space-y-2",
                (isAgrupador && valorModo === 'soma') && "col-span-2"
              )}>
                <Label className="text-sm font-medium">Categoria</Label>
                <CategoriaSelect
                  tipo={tipo}
                  value={categoriaId}
                  onChange={setCategoriaId}
                />
              </div>
            </div>

            {/* Datas - Mesma linha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dataPrevista" className="text-sm font-medium">
                  {tipo === 'entrada' ? 'Recebimento' : 'Pagamento'}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dataPrevista"
                    type="date"
                    value={dataPrevista}
                    onChange={(e) => setDataPrevista(e.target.value)}
                    className="pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataVencimento" className="text-sm font-medium">
                  Vencimento
                </Label>
                <Input
                  id="dataVencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                />
              </div>
            </div>

            {/* Seção de Configurações */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Settings2 className="w-4 h-4" />
                <span>Configurações</span>
              </div>

              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                {/* Status - Já paguei/recebi */}
                <div className="flex items-center justify-between py-1">
                  <Label htmlFor="concluido" className="text-sm cursor-pointer">
                    {tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}
                  </Label>
                  <Switch
                    id="concluido"
                    checked={concluido}
                    onCheckedChange={setConcluido}
                    className="data-[state=checked]:bg-verde"
                  />
                </div>

                {/* Criar como Grupo - disponível para entrada e saída */}
                {!isEditing && (
                  <>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-muted-foreground" />
                          <Label htmlFor="agrupador" className="text-sm cursor-pointer">
                            Criar como grupo
                          </Label>
                        </div>
                        <Switch
                          id="agrupador"
                          checked={isAgrupador}
                          onCheckedChange={setIsAgrupador}
                        />
                      </div>

                      {/* Opções do agrupador */}
                      <AnimatePresence>
                        {isAgrupador && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-dashed space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Como calcular o valor total?
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setValorModo('soma')}
                                  className={cn(
                                    "flex items-center gap-2 p-3 rounded-md border text-left text-sm transition-colors",
                                    valorModo === 'soma'
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-muted-foreground/50"
                                  )}
                                >
                                  <Calculator className="w-4 h-4 shrink-0" />
                                  <div>
                                    <p className="font-medium">Soma</p>
                                    <p className="text-xs text-muted-foreground">
                                      Soma os itens
                                    </p>
                                  </div>
                                  {valorModo === 'soma' && (
                                    <Check className="w-4 h-4 ml-auto text-primary" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setValorModo('fixo')}
                                  className={cn(
                                    "flex items-center gap-2 p-3 rounded-md border text-left text-sm transition-colors",
                                    valorModo === 'fixo'
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-muted-foreground/50"
                                  )}
                                >
                                  <DollarSign className="w-4 h-4 shrink-0" />
                                  <div>
                                    <p className="font-medium">Fixo</p>
                                    <p className="text-xs text-muted-foreground">
                                      Valor definido
                                    </p>
                                  </div>
                                  {valorModo === 'fixo' && (
                                    <Check className="w-4 h-4 ml-auto text-primary" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Repetir */}
                    <div className="border-t pt-3">
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <Repeat className="w-4 h-4 text-muted-foreground" />
                            <Label htmlFor="recorrente" className="text-sm cursor-pointer">
                              Repetir lançamento
                            </Label>
                          </div>
                          <Switch
                            id="recorrente"
                            checked={isRecorrente}
                            onCheckedChange={setIsRecorrente}
                          />
                        </div>

                        {/* Opções de recorrência */}
                        <AnimatePresence>
                          {isRecorrente && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-dashed space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setTipoRecorrencia('mensal')}
                                    className={cn(
                                      "p-2.5 rounded-md border text-sm font-medium transition-colors",
                                      tipoRecorrencia === 'mensal'
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-border hover:border-muted-foreground/50"
                                    )}
                                  >
                                    Mensal (12x)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTipoRecorrencia('parcelas')}
                                    className={cn(
                                      "p-2.5 rounded-md border text-sm font-medium transition-colors",
                                      tipoRecorrencia === 'parcelas'
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-border hover:border-muted-foreground/50"
                                    )}
                                  >
                                    Parcelado
                                  </button>
                                </div>

                                {tipoRecorrencia === 'parcelas' && (
                                  <div className="space-y-2">
                                    <Label htmlFor="parcelas" className="text-xs text-muted-foreground">
                                      Número de parcelas
                                    </Label>
                                    <div className="flex items-center gap-2">
                                      <Hash className="w-4 h-4 text-muted-foreground" />
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
                                          "h-9 w-24",
                                          errors.parcelas && "border-destructive"
                                        )}
                                      />
                                      <span className="text-sm text-muted-foreground">parcelas</span>
                                    </div>
                                    {errors.parcelas && (
                                      <p className="text-xs text-destructive">{errors.parcelas}</p>
                                    )}
                                  </div>
                                )}

                                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                  {isAgrupador ? (
                                    tipoRecorrencia === 'mensal' ? (
                                      <>Será criado <strong>1 grupo por mês</strong> nos próximos <strong>12 meses</strong></>
                                    ) : (
                                      <>Será criado <strong>1 grupo por mês</strong> em <strong>{qtdParcelas || '0'} meses</strong></>
                                    )
                                  ) : (
                                    tipoRecorrencia === 'mensal' ? (
                                      <>Será criado para os próximos <strong>12 meses</strong></>
                                    ) : (
                                      <>Será criado em <strong>{qtdParcelas || '0'} parcelas</strong></>
                                    )
                                  )}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
            </div>

          </form>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t bg-background">
          <div className="flex gap-3 w-full">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={isLoading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
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
  )
}