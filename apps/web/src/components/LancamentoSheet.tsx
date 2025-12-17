/**
 * LancamentoSheet Component
 *
 * Sheet para adicionar e editar lançamentos financeiros.
 * Design corrigido e melhorado com melhor UX.
 */

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  DollarSign, 
  Tag, 
  Repeat, 
  Hash,
  Trash2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  // Atualiza concluído quando muda o tipo
  useEffect(() => {
    if (!isEditing && !lancamento) {
      setConcluido(autoMarcarConcluido[tipo])
    }
  }, [tipo, autoMarcarConcluido, isEditing, lancamento])

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
      categoria_id: categoriaId,
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
        className="w-full sm:max-w-md p-0 flex flex-col h-full"
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-lg font-semibold">
            {isEditing ? 'Editar lançamento' : 'Novo lançamento'}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {isEditing 
              ? 'Atualize as informações' 
              : 'Preencha os dados do lançamento'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <form id="lancamento-form" onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Grid responsivo para tipo e nome */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Tipo de lançamento - Select estilizado */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <Select 
                  value={tipo} 
                  onValueChange={(v) => setTipo(v as 'entrada' | 'saida')}
                  disabled={isEditing}
                >
                  <SelectTrigger className={cn(
                    "h-11",
                    tipo === 'entrada' 
                      ? "text-verde [&>svg]:text-verde" 
                      : "text-rosa [&>svg]:text-rosa"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-verde" />
                        <span className="font-medium">Entrada</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="saida">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rosa" />
                        <span className="font-medium">Saída</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nome do lançamento */}
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
                  placeholder={tipo === 'entrada' 
                    ? 'Ex: Salário, Freelance...'
                    : 'Ex: Mercado, Netflix...'}
                  className={cn(
                    "h-11",
                    errors.nome && "border-destructive focus:ring-destructive"
                  )}
                  autoFocus={!isEditing}
                />
                {errors.nome && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.nome}
                  </p>
                )}
              </div>
            </div>

            {/* Grid para valor e categoria */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Valor */}
              <div className="space-y-2">
                <Label htmlFor="valor" className="text-sm font-medium">
                  Valor
                </Label>
                <InputMoeda
                  value={valor}
                  onChange={(val) => {
                    setValor(val)
                    if (errors.valor) setErrors(prev => ({ ...prev, valor: undefined }))
                  }}
                  error={errors.valor}
                  className="h-11"
                  tipo={tipo}
                  showTrend={false}
                />
              </div>

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

            {/* Grid para datas */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Data prevista */}
              <div className="space-y-2">
                <Label htmlFor="dataPrevista" className="text-sm font-medium">
                  {tipo === 'entrada' ? 'Data recebimento' : 'Data pagamento'}
                </Label>
                <div className="relative">
                  <Input
                    id="dataPrevista"
                    type="date"
                    value={dataPrevista}
                    onChange={(e) => setDataPrevista(e.target.value)}
                    className="h-11 pl-10"
                  />
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Data de vencimento (apenas para saídas) */}
              {tipo === 'saida' && (
                <div className="space-y-2">
                  <Label htmlFor="dataVencimento" className="text-sm font-medium">
                    Vencimento
                    <Badge variant="outline" className="ml-2 text-xs">Opcional</Badge>
                  </Label>
                  <Input
                    id="dataVencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="h-11"
                  />
                  {errors.data && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.data}
                    </p>
                  )}
                </div>
              )}

              {/* Placeholder para manter grid alinhado */}
              {tipo === 'entrada' && <div />}
            </div>

            <Separator />

            {/* Toggle: Concluído */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
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
                          Repetir lançamento
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

                  {isRecorrente && (
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                      <AlertDescription className="text-sm">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setTipoRecorrencia('mensal')}
                              className={cn(
                                "p-2.5 rounded-lg border-2 transition-all text-left",
                                tipoRecorrencia === 'mensal'
                                  ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                                  : "border-border hover:border-muted-foreground"
                              )}
                            >
                              <div className="font-medium text-xs">Mensal</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                12 meses
                              </div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setTipoRecorrencia('parcelas')}
                              className={cn(
                                "p-2.5 rounded-lg border-2 transition-all text-left",
                                tipoRecorrencia === 'parcelas'
                                  ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                                  : "border-border hover:border-muted-foreground"
                              )}
                            >
                              <div className="font-medium text-xs">Parcelado</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                2-60x
                              </div>
                            </button>
                          </div>

                          {tipoRecorrencia === 'parcelas' && (
                            <div className="space-y-2">
                              <Label htmlFor="parcelas" className="text-xs font-medium">
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
                                    "h-9 pl-8",
                                    errors.parcelas && "border-destructive"
                                  )}
                                />
                                <Hash className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
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

        <SheetFooter className="px-6 py-4 border-t">
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
                  isEditing ? 'Salvar' : 'Adicionar'
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}