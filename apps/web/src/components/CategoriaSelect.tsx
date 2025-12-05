/**
 * CategoriaSelect Component
 *
 * Componente para seleção de categoria de lançamentos.
 * Permite criar novas categorias diretamente do select.
 * Usa Select e Dialog do shadcn/ui com ícones dinâmicos do Lucide.
 */

import { useState, useEffect, useCallback } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Plus, Loader2, Check } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { categoriasApi, type Categoria } from '@/lib/api'

interface CategoriaSelectProps {
  tipo: 'entrada' | 'saida'
  value: string | null
  onChange: (categoriaId: string | null) => void
  label?: string
}

// Ícones disponíveis para categorias
const ICONES_DISPONIVEIS = [
  'Wallet', 'CreditCard', 'Banknote', 'PiggyBank', 'Receipt',
  'ShoppingCart', 'ShoppingBag', 'Car', 'Home', 'Utensils',
  'Coffee', 'Heart', 'Pill', 'GraduationCap', 'Briefcase',
  'Plane', 'Gift', 'Music', 'Gamepad2', 'Dumbbell',
  'Smartphone', 'Wifi', 'Zap', 'Droplet', 'Flame',
]

// Cores disponíveis para categorias
const CORES_DISPONIVEIS = [
  '#10B981', // verde
  '#3B82F6', // azul
  '#8B5CF6', // roxo
  '#EC4899', // rosa
  '#F59E0B', // amarelo
  '#EF4444', // vermelho
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // laranja
  '#84CC16', // lime
]

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

  // Estado do dialog de criação
  const [dialogOpen, setDialogOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoIcone, setNovoIcone] = useState('Wallet')
  const [novaCor, setNovaCor] = useState(CORES_DISPONIVEIS[0])
  const [isSaving, setIsSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Carrega categorias do tipo especificado
  const loadCategorias = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await categoriasApi.listarPorTipo(tipo)
      setCategorias(data)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setIsLoading(false)
    }
  }, [tipo])

  useEffect(() => {
    loadCategorias()
  }, [loadCategorias])

  // Reset form quando abre o dialog
  useEffect(() => {
    if (dialogOpen) {
      setNovoNome('')
      setNovoIcone('Wallet')
      setNovaCor(tipo === 'entrada' ? '#10B981' : '#EF4444')
      setErro(null)
    }
  }, [dialogOpen, tipo])

  // Cria nova categoria
  const handleCriarCategoria = async () => {
    if (!novoNome.trim()) {
      setErro('Nome é obrigatório')
      return
    }

    setIsSaving(true)
    setErro(null)

    try {
      const novaCategoria = await categoriasApi.criar({
        nome: novoNome.trim(),
        tipo,
        icone: novoIcone,
        cor: novaCor,
      })

      // Adiciona à lista e seleciona
      setCategorias(prev => [...prev, novaCategoria])
      onChange(novaCategoria.id)
      setDialogOpen(false)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao criar categoria')
    } finally {
      setIsSaving(false)
    }
  }

  // Encontra a categoria selecionada para exibir no trigger
  const categoriaSelecionada = categorias.find(c => c.id === value)

  return (
    <>
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select
          value={value || 'sem-categoria'}
          onValueChange={(val) => {
            if (val === 'criar-nova') {
              setDialogOpen(true)
            } else {
              onChange(val === 'sem-categoria' ? null : val)
            }
          }}
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
            {/* Botão criar nova categoria */}
            <SelectItem value="criar-nova" className="min-h-touch">
              <div className="flex items-center gap-2 text-rosa font-medium">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-rosa/10">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <span>Criar nova categoria</span>
              </div>
            </SelectItem>

            <div className="h-px bg-neutro-200 my-1" />

            {/* Opção sem categoria */}
            <SelectItem value="sem-categoria" className="min-h-touch">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-neutro-200">
                  <LucideIcons.X className="w-3 h-3 text-neutro-500" />
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

      {/* Dialog de criação de categoria */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>
              Crie uma categoria para organizar seus lançamentos de {tipo === 'entrada' ? 'entrada' : 'saída'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome-categoria">Nome</Label>
              <Input
                id="nome-categoria"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Alimentação"
                maxLength={50}
              />
            </div>

            {/* Ícone */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-5 gap-2">
                {ICONES_DISPONIVEIS.map((iconeName) => {
                  const Icon = getIconComponent(iconeName)
                  const isSelected = novoIcone === iconeName
                  return (
                    <button
                      key={iconeName}
                      type="button"
                      onClick={() => setNovoIcone(iconeName)}
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-rosa bg-rosa/10'
                          : 'border-neutro-200 hover:border-neutro-300'
                      )}
                    >
                      {Icon && <Icon className="w-5 h-5 text-neutro-700" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_DISPONIVEIS.map((cor) => {
                  const isSelected = novaCor === cor
                  return (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setNovaCor(cor)}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full transition-all',
                        isSelected && 'ring-2 ring-offset-2 ring-neutro-400'
                      )}
                      style={{ backgroundColor: cor }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-neutro-500">Preview</Label>
              <div className="flex items-center gap-3 p-3 bg-neutro-50 rounded-lg">
                {(() => {
                  const Icon = getIconComponent(novoIcone)
                  return Icon ? (
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-lg"
                      style={{ backgroundColor: novaCor }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </span>
                  ) : null
                })()}
                <span className="text-corpo-medium font-medium text-neutro-900">
                  {novoNome || 'Nome da categoria'}
                </span>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <p className="text-pequeno text-vermelho">{erro}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="secondary"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarCategoria}
              disabled={isSaving || !novoNome.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar categoria'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
