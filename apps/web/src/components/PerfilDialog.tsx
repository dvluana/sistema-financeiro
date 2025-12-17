/**
 * PerfilDialog Component
 *
 * Modal para criar ou editar um workspace/perfil.
 * Features:
 * - Input de nome
 * - Seletor de cor
 * - Seletor de ícone
 * - Validação de formulário
 */

import { useState, useEffect } from 'react'
import {
  User,
  Briefcase,
  Building2,
  Home,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Check,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { usePerfilStore } from '@/stores/usePerfilStore'
import { CORES_WORKSPACE, ICONES_WORKSPACE } from './WorkspaceSwitcher'
import type { Perfil } from '@/lib/api'

// Mapa de ícones disponíveis
const ICONES: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  User,
  Briefcase,
  Building2,
  Home,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
}

interface PerfilDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  perfil?: Perfil | null
  onSuccess?: (message: string) => void
}

export function PerfilDialog({
  open,
  onOpenChange,
  perfil,
  onSuccess,
}: PerfilDialogProps) {
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(CORES_WORKSPACE[0])
  const [icone, setIcone] = useState('User')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { criarPerfil, atualizarPerfil } = usePerfilStore()

  const isEditing = !!perfil

  // Preenche form ao editar
  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome)
      setCor(perfil.cor)
      setIcone(perfil.icone)
    } else {
      setNome('')
      setCor(CORES_WORKSPACE[0])
      setIcone('User')
    }
    setError('')
  }, [perfil, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const nomeTrimmed = nome.trim()

    if (!nomeTrimmed) {
      setError('Por favor, dê um nome ao workspace')
      return
    }

    if (nomeTrimmed.length < 2) {
      setError('O nome precisa ter pelo menos 2 caracteres')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing && perfil) {
        await atualizarPerfil(perfil.id, {
          nome: nomeTrimmed,
          cor,
          icone,
        })
        onSuccess?.(`✅ Workspace "${nomeTrimmed}" atualizado com sucesso!`)
      } else {
        await criarPerfil({
          nome: nomeTrimmed,
          cor,
          icone,
        })
        onSuccess?.(`✅ Workspace "${nomeTrimmed}" criado com sucesso!`)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o workspace. Tente novamente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar workspace' : 'Novo workspace'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Personalize as configurações do seu workspace'
              : 'Organize suas finanças em espaços separados (pessoal, empresa, etc)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do workspace</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Pessoal, Empresa, Casa..."
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Seletor de Cor */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CORES_WORKSPACE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    'transition-all border-2',
                    cor === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                >
                  {cor === c && (
                    <Check className="w-5 h-5 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Seletor de Ícone */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {ICONES_WORKSPACE.map((iconName) => {
                const Icon = ICONES[iconName]
                const isSelected = icone === iconName
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcone(iconName)}
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'transition-all border-2',
                      isSelected
                        ? 'border-foreground bg-accent'
                        : 'border-border hover:border-foreground/50 bg-card'
                    )}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={{ color: isSelected ? cor : undefined }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2">
            <Label className="text-muted-foreground">Preview</Label>
            <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-accent/50">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ backgroundColor: `${cor}20` }}
              >
                {(() => {
                  const Icon = ICONES[icone] || User
                  return <Icon className="w-6 h-6" style={{ color: cor }} />
                })()}
              </div>
              <span className="text-corpo font-medium text-foreground">
                {nome || 'Nome do workspace'}
              </span>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-pequeno text-vermelho">{error}</p>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                'flex-1 min-h-touch rounded-botao',
                'border border-border text-foreground',
                'hover:bg-accent transition-colors',
                'text-botao'
              )}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nome.trim()}
              className={cn(
                'flex-1 min-h-touch rounded-botao',
                'bg-rosa text-white',
                'hover:bg-rosa-hover active:bg-rosa-pressed',
                'transition-colors text-botao',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Salvando...' : 'Criando...'}
                </>
              ) : isEditing ? (
                'Salvar'
              ) : (
                'Criar'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
