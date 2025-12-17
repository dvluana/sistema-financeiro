/**
 * LancamentoSheet Component
 *
 * Sheet moderno para adicionar e editar lançamentos financeiros.
 * Design atualizado com shadcn/ui para melhor UX.
 */

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  DollarSign, 
  Tag, 
  Repeat, 
  ChevronRight, 
  Hash,
  CalendarDays,
  Trash2,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'

// Componentes internos
import { InputMoeda } from '@/components/InputMoeda'
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

  // Estado para recorrência
  const [isRecorrente, setIsRecorrente] = useState(false)
  const [tipoRecorrencia, setTipoRecorrencia] = useState<'mensal' | 'parcelas'>('mensal')
  const [qtdParcelas, setQtdParcelas] = useState('2')

  // Validação
  const [errors, setErrors] = useState<{
    nome?: string
    valor?: string
    data?: string
    parcelas?: string
  }>({})

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
      setIsRecorrente(false)
      setTipoRecorrencia('mensal')
      setQtdParcelas('2')
    }
    setErrors({})
  }, [lancamento, tipoInicial, autoMarcarConcluido, open])

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'))
    if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero'
    }

    if (tipo === 'saida' && dataVencimento && !dataPrevista) {
      newErrors.data = 'Data prevista é obrigatória quando há vencimento'
    }

    if (isRecorrente && tipoRecorrencia === 'parcelas') {
      const parcelas = parseInt(qtdParcelas)
      if (!qtdParcelas || isNaN(parcelas) || parcelas < 2 || parcelas > 60) {
        newErrors.parcelas = 'Parcelas devem ser entre 2 e 60'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'))
    const formData: LancamentoFormData = {
      nome: nome.trim(),
      valor: valorNumerico,
      data_prevista: dataPrevista || null,
      data_vencimento: tipo === 'saida' ? (dataVencimento || null) : null,
      concluido,
      categoria_id: tipo === 'saida' ? categoriaId : null,
    }

    // Se for recorrente e não estiver editando
    if (isRecorrente && !isEditing) {
      if (tipoRecorrencia === 'mensal') {
        // Próximos 12 meses
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
        // Parcelas
        formData.qtd_parcelas = parseInt(qtdParcelas)
      }
    }

    await onSubmit(tipo, formData)
  }

  const getDateLabel = () => {
    if (!dataPrevista) return 'Selecionar data'
    try {
      return format(new Date(dataPrevista + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })
    } catch {
      return 'Data inválida'
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg p-0 flex flex-col h-full"
      >
        <SheetHeader className="px-6 py-5 space-y-1 border-b">
          <SheetTitle className="text-xl font-semibold">
            {isEditing ? 'Editar lançamento' : 'Novo lançamento'}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {isEditing 
              ? 'Atualize as informações do lançamento' 
              : 'Adicione um novo lançamento financeiro'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          <form id="lancamento-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo: Entrada ou Saída */}
            {!isEditing && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de lançamento</Label>
                <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'entrada' | 'saida')}>
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger 
                      value="entrada" 
                      className="data-[state=active]:bg-verde/10 data-[state=active]:text-verde font-medium"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Entrada
                    </TabsTrigger>
                    <TabsTrigger 
                      value="saida"
                      className="data-[state=active]:bg-rosa/10 data-[state=active]:text-rosa font-medium"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Saída
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            <Separator />

            {/* Nome do lançamento */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium">
                {tipo === 'entrada' ? 'Origem do dinheiro' : 'Para onde foi o dinheiro?'}
              </Label>
              <div className="relative">
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
                    if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined }))
                  }}
                  placeholder={tipo === 'entrada' 
                    ? 'Ex: Salário, Freelance, Vendas...'
                    : 'Ex: Supermercado, Netflix, Conta de luz...'}
                  className={cn(
                    "h-12 pl-10",
                    errors.nome && "border-destructive focus:ring-destructive"
                  )}
                  autoFocus
                />
                <Sparkles className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              </div>
              {errors.nome && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.nome}
                </p>
              )}
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="valor" className="text-sm font-medium">
                Valor
              </Label>
              <div className="relative">
                <InputMoeda
                  value={valor}
                  onChange={(val) => {
                    setValor(val)
                    if (errors.valor) setErrors(prev => ({ ...prev, valor: undefined }))
                  }}
                  error={errors.valor}
                  className="h-12 pl-10"
                />
                <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Categoria (apenas para saídas) */}
            {tipo === 'saida' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Categoria
                </Label>
                <div className="relative">
                  <CategoriaSelect
                    tipo="saida"
                    value={categoriaId}
                    onChange={setCategoriaId}
                  />
                  <Tag className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                </div>
              </div>
            )}

            {/* Datas */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataPrevista" className="text-sm font-medium">
                  {tipo === 'entrada' ? 'Data de recebimento' : 'Data de pagamento'}
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    // Aqui você pode adicionar um date picker mais sofisticado
                    const input = document.getElementById('dataPrevista') as HTMLInputElement
                    input?.showPicker?.()
                  }}
                  className={cn(
                    "w-full h-12 px-3 rounded-lg border bg-background text-left flex items-center justify-between",
                    "hover:bg-accent transition-colors",
                    dataPrevista ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {getDateLabel()}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <input
                  id="dataPrevista"
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="sr-only"
                />
              </div>

              {/* Data de vencimento (apenas para saídas) */}
              {tipo === 'saida' && (
                <div className="space-y-2">
                  <Label htmlFor="dataVencimento" className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Data de vencimento
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </Label>
                  <Input
                    id="dataVencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="h-12"
                  />
                  {errors.data && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.data}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Toggle: Concluído */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
              <div className="space-y-0.5">
                <Label htmlFor="concluido" className="text-sm font-medium cursor-pointer">
                  {tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marcar como {tipo === 'entrada' ? 'recebido' : 'pago'}
                </p>
              </div>
              <Switch
                id="concluido"
                checked={concluido}
                onCheckedChange={setConcluido}
                className="data-[state=checked]:bg-verde"
              />
            </div>

            {/* Recorrência (apenas para novos) */}
            {!isEditing && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="recorrente" className="text-sm font-medium cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Repeat className="w-4 h-4" />
                          Lançamento recorrente
                        </span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Repetir este lançamento
                      </p>
                    </div>
                    <Switch
                      id="recorrente"
                      checked={isRecorrente}
                      onCheckedChange={setIsRecorrente}
                    />
                  </div>

                  {isRecorrente && (
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                      <AlertDescription className="text-sm">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Tipo de recorrência</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setTipoRecorrencia('mensal')}
                                className={cn(
                                  "p-3 rounded-lg border-2 transition-all text-left",
                                  tipoRecorrencia === 'mensal'
                                    ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                                    : "border-border hover:border-muted-foreground"
                                )}
                              >
                                <div className="font-medium text-sm">Mensal</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Próximos 12 meses
                                </div>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setTipoRecorrencia('parcelas')}
                                className={cn(
                                  "p-3 rounded-lg border-2 transition-all text-left",
                                  tipoRecorrencia === 'parcelas'
                                    ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                                    : "border-border hover:border-muted-foreground"
                                )}
                              >
                                <div className="font-medium text-sm">Parcelado</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Definir parcelas
                                </div>
                              </button>
                            </div>
                          </div>

                          {tipoRecorrencia === 'parcelas' && (
                            <div className="space-y-2">
                              <Label htmlFor="parcelas" className="text-sm font-medium">
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
                                    "h-10 pl-10",
                                    errors.parcelas && "border-destructive"
                                  )}
                                />
                                <Hash className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                              </div>
                              {errors.parcelas && (
                                <p className="text-xs text-destructive">{errors.parcelas}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}
          </form>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t space-y-2 sm:space-y-0 sm:space-x-2">
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={isLoading}
              className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="lancamento-form"
              disabled={isLoading}
              className={cn(
                "flex-1 sm:flex-initial",
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
                isEditing ? 'Salvar alterações' : 'Adicionar lançamento'
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}