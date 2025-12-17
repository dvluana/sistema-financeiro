/**
 * CategoriaSelect Component
 *
 * Seletor de categorias com criação inline expandível.
 * Design consistente com o padrão "criar como grupo".
 */

import { useState, useEffect, useRef } from 'react'
import {
  Check,
  ChevronDown,
  Tag,
  Plus,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { motion, AnimatePresence } from 'framer-motion'
import { categoriasApi } from '@/lib/api'
import type { Categoria } from '@/lib/api'

interface CategoriaSelectProps {
  tipo: 'entrada' | 'saida'
  value: string | null
  onChange: (value: string | null) => void
  className?: string
}

// Ícones para categorias
const categoryIcons: Record<string, string> = {
  'alimentacao': '🍽️',
  'transporte': '🚗',
  'moradia': '🏠',
  'saude': '🏥',
  'educacao': '📚',
  'lazer': '🎮',
  'compras': '🛍️',
  'servicos': '🔧',
  'outros': '📦',
  'salario': '💰',
  'freelance': '💻',
  'investimento': '📈',
  'vendas': '🏪',
  'bonus': '🎁',
}

const getCategoryIcon = (nome: string) => {
  const key = nome.toLowerCase().replace(/[^a-z]/g, '')
  return categoryIcons[key] || '📁'
}

// Cores predefinidas para novas categorias
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
]

export function CategoriaSelect({
  tipo,
  value,
  onChange,
  className,
}: CategoriaSelectProps) {
  const [open, setOpen] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estado para criar categoria (inline, expandível)
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const newCategoryInputRef = useRef<HTMLInputElement>(null)

  // Carrega categorias (todas, independente do tipo)
  useEffect(() => {
    async function loadCategorias() {
      try {
        setIsLoading(true)
        const data = await categoriasApi.listar()
        setCategorias(data)
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCategorias()
  }, [])

  // Limpa estados ao fechar
  useEffect(() => {
    if (!open) {
      setIsCreating(false)
      setNewCategoryName('')
      setNewCategoryColor(PRESET_COLORS[0])
      setCreateError(null)
    }
  }, [open])

  // Foca no input de criar quando expande
  useEffect(() => {
    if (isCreating && newCategoryInputRef.current) {
      setTimeout(() => newCategoryInputRef.current?.focus(), 100)
    }
  }, [isCreating])

  // Categoria selecionada
  const selectedCategoria = categorias.find(cat => cat.id === value)

  const handleSelect = (categoriaId: string) => {
    onChange(categoriaId === value ? null : categoriaId)
    setOpen(false)
  }

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim()

    if (!trimmedName) {
      setCreateError('Digite um nome')
      return
    }

    // Verifica se já existe
    const exists = categorias.some(
      cat => cat.nome.toLowerCase() === trimmedName.toLowerCase()
    )
    if (exists) {
      setCreateError('Já existe')
      return
    }

    setIsSubmitting(true)
    setCreateError(null)

    try {
      const newCategoria = await categoriasApi.criar({
        nome: trimmedName,
        tipo,
        cor: newCategoryColor,
      })

      // Adiciona à lista e seleciona
      setCategorias(prev => [...prev, newCategoria])
      onChange(newCategoria.id)
      setOpen(false)
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      setCreateError('Erro ao criar')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full min-h-touch justify-between px-4 font-normal rounded-input border-input",
              !value && "text-muted-foreground"
            )}
          >
            {selectedCategoria ? (
              <div className="flex items-center gap-2">
                <span>{getCategoryIcon(selectedCategoria.nome)}</span>
                <span className="truncate">{selectedCategoria.nome}</span>
                {selectedCategoria.cor && (
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedCategoria.cor }}
                  />
                )}
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoria
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[280px] p-0"
          align="start"
          sideOffset={4}
        >
          {/* Lista de categorias */}
          <div className="max-h-[220px] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : categorias.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma categoria
              </div>
            ) : (
              <div className="p-1.5">
                {categorias.map((categoria) => (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => handleSelect(categoria.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors",
                      "hover:bg-accent active:bg-accent/80",
                      value === categoria.id && "bg-accent"
                    )}
                  >
                    <span className="text-base shrink-0">
                      {getCategoryIcon(categoria.nome)}
                    </span>
                    <span className="flex-1 text-sm truncate">
                      {categoria.nome}
                    </span>
                    {categoria.cor && (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: categoria.cor }}
                      />
                    )}
                    {value === categoria.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seção criar categoria - estilo igual ao "criar como grupo" */}
          <div className="border-t">
            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3",
                "text-sm text-left transition-colors",
                "hover:bg-accent",
                isCreating && "bg-accent/50"
              )}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className={isCreating ? "text-foreground font-medium" : "text-muted-foreground"}>
                  Criar nova categoria
                </span>
              </div>
              <div className={cn(
                "w-9 h-5 rounded-full transition-colors relative",
                isCreating ? "bg-primary" : "bg-muted"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                  isCreating ? "left-[18px]" : "left-0.5"
                )} />
              </div>
            </button>

            {/* Campos de criação - expandível */}
            <AnimatePresence>
              {isCreating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-dashed">
                    {/* Nome */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        Nome
                      </label>
                      <Input
                        ref={newCategoryInputRef}
                        value={newCategoryName}
                        onChange={(e) => {
                          setNewCategoryName(e.target.value)
                          setCreateError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleCreateCategory()
                          }
                        }}
                        placeholder="Ex: Alimentação"
                        className={cn(
                          "h-9",
                          createError && "border-destructive"
                        )}
                      />
                      {createError && (
                        <p className="text-xs text-destructive">{createError}</p>
                      )}
                    </div>

                    {/* Cor */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        Cor
                      </label>
                      <div className="flex gap-1.5">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewCategoryColor(color)}
                            className={cn(
                              "w-7 h-7 rounded-md transition-all",
                              newCategoryColor === color
                                ? "ring-2 ring-offset-1 ring-offset-background ring-primary scale-110"
                                : "hover:scale-105 opacity-70 hover:opacity-100"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Botão criar */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={isSubmitting || !newCategoryName.trim()}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Criar categoria
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
