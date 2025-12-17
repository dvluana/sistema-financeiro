/**
 * FilhoSheet Component
 *
 * Sheet moderno para adicionar ou editar itens filhos de um agrupador.
 * Design atualizado com shadcn/ui para melhor UX.
 */

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Tag, 
  Calendar, 
  ChevronRight,
  Trash2,
  AlertCircle,
  Package,
  CheckCircle2
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// Componentes internos
import { InputMoeda } from '@/components/InputMoeda'
import { CategoriaSelect } from '@/components/CategoriaSelect'
import type { Lancamento } from '@/lib/api'

export interface FilhoFormData {
  nome: string
  valor: number
  data_prevista: string | null
  concluido: boolean
  categoria_id: string | null
}

interface FilhoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agrupador: Lancamento
  filho?: Lancamento | null
  onSubmit: (data: FilhoFormData) => Promise<void>
  onDelete?: () => void
  isLoading?: boolean
}

export function FilhoSheet({
  open,
  onOpenChange,
  agrupador,
  filho,
  onSubmit,
  onDelete,
  isLoading = false,
}: FilhoSheetProps) {
  const isEditing = !!filho

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [categoriaId, setCategoriaId] = useState<string | null>(null)

  // Erros
  const [errors, setErrors] = useState<{
    nome?: string
    valor?: string
  }>({})

  // Inicializa campos quando abre
  useEffect(() => {
    if (filho) {
      setNome(filho.nome)
      setValor(String(filho.valor))
      setConcluido(filho.concluido)
      setCategoriaId(filho.categoria_id || null)
      setDataPrevista(filho.data_prevista || '')
    } else {
      setNome('')
      setValor('')
      setConcluido(false)
      setCategoriaId(null)
      setDataPrevista('')
    }
    setErrors({})
  }, [filho, open])

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'))
    if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero'
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
    
    await onSubmit({
      nome: nome.trim(),
      valor: valorNumerico,
      data_prevista: dataPrevista || null,
      concluido,
      categoria_id: categoriaId,
    })
  }

  const getDateLabel = () => {
    if (!dataPrevista) return 'Selecionar data'
    try {
      return format(new Date(dataPrevista + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR })
    } catch {
      return 'Data inválida'
    }
  }

  // Informações do agrupador
  const agrupadorInfo = {
    tipo: agrupador.tipo,
    valorTotal: agrupador.valor,
    nome: agrupador.nome,
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col h-full"
      >
        <SheetHeader className="px-6 py-5 space-y-3 border-b">
          <div>
            <SheetTitle className="text-xl font-semibold">
              {isEditing ? 'Editar item' : 'Adicionar item'}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground mt-1">
              {isEditing 
                ? 'Atualize as informações do item' 
                : 'Adicione um novo item ao grupo'}
            </SheetDescription>
          </div>
          
          {/* Info do agrupador */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
            <Package className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{agrupadorInfo.nome}</p>
              <p className="text-xs text-muted-foreground">
                Valor total: R$ {agrupadorInfo.valorTotal.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                agrupadorInfo.tipo === 'entrada' 
                  ? "text-verde border-verde/30 bg-verde/5"
                  : "text-rosa border-rosa/30 bg-rosa/5"
              )}
            >
              {agrupadorInfo.tipo === 'entrada' ? 'Entrada' : 'Saída'}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          <form id="filho-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Nome do item */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium">
                Nome do item
              </Label>
              <div className="relative">
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
                    if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined }))
                  }}
                  placeholder="Ex: iFood, Netflix, Uber..."
                  className={cn(
                    "h-12",
                    errors.nome && "border-destructive focus:ring-destructive"
                  )}
                  autoFocus
                />
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
                Valor do item
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

            {/* Categoria */}
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

            <Separator />

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="dataPrevista" className="text-sm font-medium">
                Data do item
              </Label>
              <button
                type="button"
                onClick={() => {
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
              <p className="text-xs text-muted-foreground">
                Data em que este item foi ou será pago/recebido
              </p>
            </div>

            {/* Toggle: Concluído */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
              <div className="space-y-0.5">
                <Label htmlFor="concluido" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verde" />
                  Já paguei
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marcar este item como concluído
                </p>
              </div>
              <Switch
                id="concluido"
                checked={concluido}
                onCheckedChange={setConcluido}
                className="data-[state=checked]:bg-verde"
              />
            </div>
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
              Excluir item
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
              form="filho-form"
              disabled={isLoading}
              className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                isEditing ? 'Salvar alterações' : 'Adicionar item'
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}