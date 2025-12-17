/**
 * CategoriaSelect Component
 *
 * Seletor de categorias modernizado com shadcn/ui.
 * Design atualizado com ícones e melhor visual.
 */

import { useState, useEffect } from 'react'
import { 
  Check, 
  ChevronsUpDown, 
  Search,
  Tag,
  Plus,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
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
  label?: string
  required?: boolean
  className?: string
}

// Ícones para categorias (mapeamento básico)
const categoryIcons: Record<string, string> = {
  // Saídas
  'alimentacao': '🍽️',
  'transporte': '🚗',
  'moradia': '🏠',
  'saude': '🏥',
  'educacao': '📚',
  'lazer': '🎮',
  'compras': '🛍️',
  'servicos': '🔧',
  'outros': '📦',
  // Entradas
  'salario': '💰',
  'freelance': '💻',
  'investimento': '📈',
  'vendas': '🏪',
  'bonus': '🎁',
}

export function CategoriaSelect({
  tipo,
  value,
  onChange,
  label,
  required = false,
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
        // Filtra pelo tipo localmente
        const categoriasDoTipo = data.filter((cat: Categoria) => cat.tipo === tipo)
        setCategorias(categoriasDoTipo)
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    loadCategorias()
  }, [tipo])

  // Filtra categorias baseado na busca
  const filteredCategorias = categorias.filter(cat =>
    cat.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Categoria selecionada
  const selectedCategoria = categorias.find(cat => cat.id === value)

  // Agrupa categorias por tipo (opcional, se houver subcategorias no futuro)
  const categoriasComuns = filteredCategorias.slice(0, 5)
  const outrasCategoria  = filteredCategorias.slice(5)

  const getCategoryIcon = (nome: string) => {
    const key = nome.toLowerCase().replace(/[^a-z]/g, '')
    return categoryIcons[key] || '📁'
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full h-12 justify-between pl-10",
              "hover:bg-accent hover:border-foreground",
              !value && "text-muted-foreground"
            )}
          >
            {selectedCategoria ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCategoryIcon(selectedCategoria.nome)}</span>
                <span className="font-medium">{selectedCategoria.nome}</span>
                {selectedCategoria.cor && (
                  <div 
                    className="w-3 h-3 rounded-full" 
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
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3 pb-2 pt-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Buscar categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <ScrollArea className="h-[300px]">
              <CommandList>
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Carregando categorias...
                  </div>
                ) : filteredCategorias.length === 0 ? (
                  <CommandEmpty className="p-4 text-center">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma categoria encontrada
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mx-auto"
                        onClick={() => {
                          // Aqui você pode adicionar lógica para criar nova categoria
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Criar categoria
                      </Button>
                    </div>
                  </CommandEmpty>
                ) : (
                  <>
                    {/* Categorias mais usadas */}
                    {categoriasComuns.length > 0 && (
                      <CommandGroup heading="Mais usadas">
                        {categoriasComuns.map((categoria) => (
                          <CommandItem
                            key={categoria.id}
                            value={categoria.id}
                            onSelect={() => {
                              onChange(categoria.id === value ? null : categoria.id)
                              setOpen(false)
                            }}
                            className="flex items-center gap-2 p-2 cursor-pointer"
                          >
                            <span className="text-lg">
                              {getCategoryIcon(categoria.nome)}
                            </span>
                            <span className="flex-1 font-medium">
                              {categoria.nome}
                            </span>
                            {categoria.cor && (
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: categoria.cor }}
                              />
                            )}
                            <Check
                              className={cn(
                                "h-4 w-4",
                                value === categoria.id 
                                  ? "opacity-100" 
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {/* Outras categorias */}
                    {outrasCategoria.length > 0 && (
                      <>
                        {categoriasComuns.length > 0 && <CommandSeparator />}
                        <CommandGroup heading="Outras categorias">
                          {outrasCategoria.map((categoria) => (
                            <CommandItem
                              key={categoria.id}
                              value={categoria.id}
                              onSelect={() => {
                                onChange(categoria.id === value ? null : categoria.id)
                                setOpen(false)
                              }}
                              className="flex items-center gap-2 p-2 cursor-pointer"
                            >
                              <span className="text-lg">
                                {getCategoryIcon(categoria.nome)}
                              </span>
                              <span className="flex-1 font-medium">
                                {categoria.nome}
                              </span>
                              {categoria.cor && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: categoria.cor }}
                                />
                              )}
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  value === categoria.id 
                                    ? "opacity-100" 
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </>
                )}
              </CommandList>
            </ScrollArea>

            {/* Rodapé com dica */}
            <div className="border-t p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Selecione ou crie uma nova categoria
              </p>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}