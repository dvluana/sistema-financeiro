/**
 * FilhoSheet Component
 *
 * Drawer/Bottomsheet para adicionar ou editar itens filhos de um agrupador.
 * Similar ao LancamentoSheet, mas simplificado (sem recorrência).
 */

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
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
  const isDesktop = useIsDesktop()
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    await onSubmit({
      nome: nome.trim(),
      valor: valorNumerico,
      data_prevista: dataPrevista || null,
      concluido,
      categoria_id: categoriaId,
    })
  }

  const sharedContent = (
    <div className={cn(
      'flex flex-col overflow-hidden',
      isDesktop ? 'h-full p-6' : 'max-h-[calc(85vh-12px)] p-4'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <DrawerPrimitive.Title className="text-titulo-card text-foreground">
            {isEditing ? 'Editar item' : 'Adicionar item'}
          </DrawerPrimitive.Title>
          <p className="text-micro text-muted-foreground mt-0.5">
            em {agrupador.nome}
          </p>
        </div>
        <DrawerPrimitive.Close className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <X className="w-5 h-5" />
        </DrawerPrimitive.Close>
      </div>

      {/* Formulário */}
      <div
        className="flex-1 overflow-y-auto min-h-0 overscroll-contain -mx-4 px-4"
        data-vaul-no-drag
      >
        <form id="filho-form" onSubmit={handleSubmit} className="space-y-5 pb-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">O que foi?</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value)
                if (errors.nome) setErrors((prev) => ({ ...prev, nome: undefined }))
              }}
              placeholder="Ex: iFood, Netflix, Uber..."
              maxLength={100}
              autoFocus
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
            tipo="saida"
            value={categoriaId}
            onChange={setCategoriaId}
          />

          {/* Data prevista */}
          <div className="space-y-2">
            <Label htmlFor="dataPrevista">Data</Label>
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
              Já paguei
            </Label>
            <Switch
              id="concluido"
              checked={concluido}
              onCheckedChange={setConcluido}
            />
          </div>
        </form>
      </div>

      {/* Botões */}
      <div className={cn(
        'space-y-3 pt-4 border-t border-border shrink-0',
        !isDesktop && 'pb-safe'
      )}>
        <Button
          type="submit"
          form="filho-form"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
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
          style={!isDesktop ? { maxHeight: '85vh' } : undefined}
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
