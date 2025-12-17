/**
 * CategoriaSelect Component
 *
 * Seletor de categorias simplificado e funcional.
 */

import { useState, useEffect } from 'react'
import {
  Check,
  ChevronDown,
  Search,
  Tag,
  Plus,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
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

  // Carrega categorias
  useEffect(() => {
    async function loadCategorias() {
      try {
        setIsLoading(true)
        const data = await categoriasApi.listar()
        const categoriasDoTipo = data.filter((cat: Categoria) => cat.tipo === tipo)
        setCategorias(categoriasDoTipo)
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCategorias()
  }, [tipo])

  // Limpa busca ao fechar
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
    }
  }, [open])

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
                <span>{selectedCategoria.nome}</span>
                {selectedCategoria.cor && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedCategoria.cor }}
                  />
                )}
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Selecionar categoria
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[280px] p-0" align="start">
          {/* Campo de busca */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>

          {/* Lista de categorias */}
          <ScrollArea className="h-[220px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCategorias.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma categoria encontrada
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredCategorias.map((categoria) => (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => handleSelect(categoria.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-left transition-colors",
                      "hover:bg-accent",
                      value === categoria.id && "bg-accent"
                    )}
                  >
                    <span className="text-base">
                      {getCategoryIcon(categoria.nome)}
                    </span>
                    <span className="flex-1 text-sm">
                      {categoria.nome}
                    </span>
                    {categoria.cor && (
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: categoria.cor }}
                      />
                    )}
                    {value === categoria.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer com botão criar */}
          <div className="p-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                // TODO: Abrir modal de criar categoria
                setOpen(false)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar nova categoria
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
