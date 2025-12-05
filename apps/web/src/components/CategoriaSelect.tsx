/**
 * CategoriaSelect Component
 *
 * Componente para seleção de categoria de lançamentos.
 * Usa o Select do shadcn/ui com ícones dinâmicos do Lucide.
 */

import { useState, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { categoriasApi, type Categoria } from '@/lib/api'

interface CategoriaSelectProps {
  tipo: 'entrada' | 'saida'
  value: string | null
  onChange: (categoriaId: string | null) => void
  label?: string
}

// Função para obter o componente de ícone do Lucide dinamicamente
function getIconComponent(iconName: string | null): LucideIcon | null {
  if (!iconName) return null
  const icons = LucideIcons as unknown as Record<string, LucideIcon>
  return icons[iconName] || null
}

export function CategoriaSelect({
  tipo,
  value,
  onChange,
  label = 'Categoria',
}: CategoriaSelectProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Carrega categorias do tipo especificado
  useEffect(() => {
    async function loadCategorias() {
      try {
        setIsLoading(true)
        const data = await categoriasApi.listarPorTipo(tipo)
        setCategorias(data)
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCategorias()
  }, [tipo])

  // Encontra a categoria selecionada para exibir no trigger
  const categoriaSelecionada = categorias.find(c => c.id === value)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || 'sem-categoria'}
        onValueChange={(val) => onChange(val === 'sem-categoria' ? null : val)}
        disabled={isLoading}
      >
        <SelectTrigger className="min-h-touch rounded-input border-neutro-300 focus:border-2 focus:border-neutro-900">
          <SelectValue placeholder="Selecione uma categoria">
            {categoriaSelecionada ? (
              <div className="flex items-center gap-2">
                {categoriaSelecionada.icone && (() => {
                  const Icon = getIconComponent(categoriaSelecionada.icone)
                  return Icon ? (
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded"
                      style={{ backgroundColor: categoriaSelecionada.cor || '#6B7280' }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </span>
                  ) : null
                })()}
                <span>{categoriaSelecionada.nome}</span>
              </div>
            ) : (
              <span className="text-neutro-400">Sem categoria</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Opção sem categoria */}
          <SelectItem value="sem-categoria" className="min-h-touch">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-neutro-300">
                <LucideIcons.X className="w-3 h-3 text-neutro-600" />
              </span>
              <span>Sem categoria</span>
            </div>
          </SelectItem>

          {/* Lista de categorias */}
          {categorias.map((categoria) => {
            const Icon = getIconComponent(categoria.icone)
            return (
              <SelectItem
                key={categoria.id}
                value={categoria.id}
                className="min-h-touch"
              >
                <div className="flex items-center gap-2">
                  {Icon && (
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded"
                      style={{ backgroundColor: categoria.cor || '#6B7280' }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <span>{categoria.nome}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
