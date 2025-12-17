/**
 * CategoriaSelect Component
 *
 * Seletor simples de categorias.
 * A criação de categoria é feita no componente pai (LancamentoSheet).
 */

import { useState, useEffect } from 'react'
import {
  Check,
  ChevronDown,
  Tag,
  Plus,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { categoriasApi } from '@/lib/api'
import type { Categoria } from '@/lib/api'

interface CategoriaSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  onCreateNew?: () => void
  categorias?: Categoria[]
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

export const getCategoryIcon = (nome: string) => {
  const key = nome.toLowerCase().replace(/[^a-z]/g, '')
  return categoryIcons[key] || '📁'
}

export function CategoriaSelect({
  value,
  onChange,
  onCreateNew,
  categorias: categoriasExternas,
  className,
}: CategoriaSelectProps) {
  const [open, setOpen] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Usa categorias externas se fornecidas, senão carrega
  useEffect(() => {
    if (categoriasExternas) {
      setCategorias(categoriasExternas)
      setIsLoading(false)
      return
    }

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
  }, [categoriasExternas])

  // Categoria selecionada
  const selectedCategoria = categorias.find(cat => cat.id === value)

  const handleSelect = (categoriaId: string) => {
    onChange(categoriaId === value ? null : categoriaId)
    setOpen(false)
  }

  const handleCreateNew = () => {
    setOpen(false)
    onCreateNew?.()
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
          className="w-[260px] p-0"
          align="start"
          sideOffset={4}
        >
          {/* Lista de categorias */}
          <div className="max-h-[200px] overflow-y-auto overscroll-contain">
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

          {/* Botão criar nova */}
          {onCreateNew && (
            <div className="border-t p-1.5">
              <button
                type="button"
                onClick={handleCreateNew}
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
        </PopoverContent>
      </Popover>
    </div>
  )
}
