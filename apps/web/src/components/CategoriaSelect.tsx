/**
 * CategoriaSelect Component
 *
 * Seletor de categorias com criação inline.
 * Design moderno com boa UX/UI e scroll funcional.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Check,
  ChevronDown,
  Search,
  Tag,
  Plus,
  Loader2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
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
  const [searchQuery, setSearchQuery] = useState('')

  // Estado para criar categoria
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const newCategoryInputRef = useRef<HTMLInputElement>(null)

  // Carrega categorias (todas, independente do tipo)
  useEffect(() => {
    async function loadCategorias() {
      try {
        setIsLoading(true)
        const data = await categoriasApi.listar()
        // Não filtra por tipo - todas categorias disponíveis para entrada e saída
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
      setSearchQuery('')
      setIsCreating(false)
      setNewCategoryName('')
      setNewCategoryColor(PRESET_COLORS[0])
      setCreateError(null)
    }
  }, [open])

  // Foca no input de criar quando abre
  useEffect(() => {
    if (isCreating && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus()
    }
  }, [isCreating])

  // Filtra categorias
  const filteredCategorias = categorias.filter(cat =>
    cat.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Categoria selecionada
  const selectedCategoria = categorias.find(cat => cat.id === value)

  const handleSelect = (categoriaId: string) => {
    onChange(categoriaId === value ? null : categoriaId)
    setOpen(false)
  }

  const handleStartCreate = () => {
    setIsCreating(true)
    setNewCategoryName(searchQuery)
    setCreateError(null)
  }

  const handleCancelCreate = () => {
    setIsCreating(false)
    setNewCategoryName('')
    setCreateError(null)
  }

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim()

    if (!trimmedName) {
      setCreateError('Digite um nome para a categoria')
      return
    }

    // Verifica se já existe
    const exists = categorias.some(
      cat => cat.nome.toLowerCase() === trimmedName.toLowerCase()
    )
    if (exists) {
      setCreateError('Já existe uma categoria com esse nome')
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
      setCreateError('Erro ao criar categoria')
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
          className="w-[300px] p-0"
          align="start"
          sideOffset={4}
        >
          {isCreating ? (
            /* Modo criar categoria */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Nova categoria</h4>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Nome da categoria
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
                    if (e.key === 'Escape') {
                      handleCancelCreate()
                    }
                  }}
                  placeholder="Ex: Alimentação"
                  className={cn(
                    "h-10",
                    createError && "border-destructive focus:border-destructive"
                  )}
                />
                {createError && (
                  <p className="text-xs text-destructive">{createError}</p>
                )}
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Cor
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={cn(
                        "w-7 h-7 rounded-md transition-all",
                        newCategoryColor === color
                          ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelCreate}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={isSubmitting || !newCategoryName.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Criar'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Modo seleção */
            <>
              {/* Campo de busca */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar categoria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-3"
                  />
                </div>
              </div>

              {/* Lista de categorias com scroll nativo */}
              <div className="max-h-[200px] overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCategorias.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {searchQuery
                        ? `Nenhuma categoria "${searchQuery}"`
                        : 'Nenhuma categoria'}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStartCreate}
                      className="gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Criar "{searchQuery || 'nova'}"
                    </Button>
                  </div>
                ) : (
                  <div className="p-1.5">
                    {filteredCategorias.map((categoria) => (
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

              {/* Footer com botão criar */}
              {filteredCategorias.length > 0 && (
                <div className="p-2 border-t">
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left",
                      "text-sm text-muted-foreground",
                      "hover:bg-accent hover:text-foreground transition-colors"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar nova categoria</span>
                  </button>
                </div>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
