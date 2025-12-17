/**
 * WorkspaceSwitcher Component
 *
 * Componente para alternar entre workspaces/perfis.
 * Features:
 * - Mostra workspace atual com cor e ícone
 * - Dropdown com lista de workspaces
 * - Opção de criar novo workspace
 * - Menu de contexto para editar/excluir
 */

import { useState, useEffect, useRef } from 'react'
import {
  ChevronDown,
  Plus,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  Briefcase,
  Building2,
  Home,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePerfilStore } from '@/stores/usePerfilStore'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { PerfilDialog } from './PerfilDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { Toast } from './Toast'
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

// Cores disponíveis para workspaces
export const CORES_WORKSPACE = [
  '#6366F1', // Indigo (padrão)
  '#FF385C', // Rosa
  '#22C55E', // Verde
  '#3B82F6', // Azul
  '#F59E0B', // Amarelo
  '#8B5CF6', // Roxo
  '#EC4899', // Pink
  '#14B8A6', // Teal
]

export const ICONES_WORKSPACE = Object.keys(ICONES)

interface WorkspaceSwitcherProps {
  className?: string
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPerfil, setDeletingPerfil] = useState<Perfil | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    perfis,
    perfilAtual,
    carregarPerfis,
    selecionarPerfil,
    arquivarPerfil,
    isLoading,
  } = usePerfilStore()

  // Stores de dados para recarregar após troca de workspace
  const { carregarMes, carregarConfiguracoes, mesAtual } = useFinanceiroStore()
  const { carregarDashboard, mesSelecionado } = useDashboardStore()

  // Carrega perfis ao montar
  useEffect(() => {
    carregarPerfis()
  }, [carregarPerfis])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setMenuOpenId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPerfil = async (perfilId: string) => {
    // Verifica se é o mesmo perfil
    if (perfilId === perfilAtual?.id) {
      setIsOpen(false)
      return
    }

    // Evita múltiplos cliques
    if (isSwitching) return

    setIsSwitching(true)
    setIsOpen(false)
    setMenuOpenId(null)

    try {
      // Seleciona o novo perfil
      selecionarPerfil(perfilId)

      // Recarrega os dados para o novo workspace
      // Usa setTimeout para garantir que o header x-perfil-id seja atualizado
      await new Promise(resolve => setTimeout(resolve, 0))
      await Promise.all([
        carregarMes(mesAtual),
        carregarConfiguracoes(),
        carregarDashboard(mesSelecionado),
      ])
    } catch (error) {
      console.error('Erro ao trocar workspace:', error)
    } finally {
      setIsSwitching(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingPerfil(null)
    setDialogOpen(true)
    setIsOpen(false)
  }

  const handleOpenEdit = (perfil: Perfil) => {
    setEditingPerfil(perfil)
    setDialogOpen(true)
    setIsOpen(false)
    setMenuOpenId(null)
  }

  const handleOpenDelete = (perfil: Perfil) => {
    setDeletingPerfil(perfil)
    setDeleteError(null)
    setDeleteConfirmOpen(true)
    setIsOpen(false)
    setMenuOpenId(null)
  }

  const handleConfirmDelete = async () => {
    if (!deletingPerfil || isDeleting) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const wasCurrentPerfil = deletingPerfil.id === perfilAtual?.id
      await arquivarPerfil(deletingPerfil.id)
      setDeleteConfirmOpen(false)
      setDeletingPerfil(null)

      // Se arquivou o perfil atual, recarrega dados para o novo perfil
      if (wasCurrentPerfil) {
        await new Promise(resolve => setTimeout(resolve, 0))
        await Promise.all([
          carregarMes(mesAtual),
          carregarConfiguracoes(),
          carregarDashboard(mesSelecionado),
        ])
      }
    } catch (error) {
      console.error('Erro ao excluir workspace:', error)
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Erro ao excluir. O workspace pode já ter sido excluído.'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingPerfil(null)
  }

  const handleDialogSuccess = async (message: string) => {
    setToastMessage(message)
    // Recarrega dados para o novo workspace (perfilAtual já foi atualizado pelo store)
    await new Promise(resolve => setTimeout(resolve, 0))
    await Promise.all([
      carregarMes(mesAtual),
      carregarConfiguracoes(),
      carregarDashboard(mesSelecionado),
    ])
  }

  // Renderiza ícone do perfil
  const renderIcon = (iconName: string, cor: string, size = 'w-5 h-5') => {
    const Icon = ICONES[iconName] || User
    return (
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ backgroundColor: `${cor}15` }}
      >
        <Icon className={size} style={{ color: cor }} />
      </div>
    )
  }

  // Debug: log do perfilAtual
  console.log('[WorkspaceSwitcher] perfilAtual:', perfilAtual)
  console.log('[WorkspaceSwitcher] perfis:', perfis)

  // Verifica se o perfil tem os dados completos (não apenas o id)
  if (!perfilAtual || !perfilAtual.nome || !perfilAtual.icone) {
    console.log('[WorkspaceSwitcher] Retornando null - perfil incompleto')
    return null
  }

  return (
    <>
      <div ref={dropdownRef} className={cn('relative', className)}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => !isSwitching && setIsOpen(!isOpen)}
          disabled={isSwitching}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg',
            'hover:bg-accent transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:opacity-70 disabled:cursor-wait'
          )}
        >
          {isSwitching ? (
            <div className="flex items-center justify-center w-8 h-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderIcon(perfilAtual.icone, perfilAtual.cor)
          )}
          <span className="text-corpo font-medium text-foreground max-w-[120px] truncate">
            {perfilAtual.nome}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-full left-0 mt-2 w-64',
                'bg-popover border border-border rounded-card shadow-lg',
                'overflow-hidden z-50'
              )}
            >
              {/* Lista de workspaces */}
              <div className="py-1 max-h-[280px] overflow-y-auto">
                {perfis.map((perfil) => (
                  <div
                    key={perfil.id}
                    className="relative group"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPerfil(perfil.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5',
                        'hover:bg-accent transition-colors text-left',
                        perfil.id === perfilAtual.id && 'bg-accent/50'
                      )}
                    >
                      {renderIcon(perfil.icone, perfil.cor)}
                      <div className="flex-1 min-w-0">
                        <p className="text-corpo font-medium text-foreground truncate">
                          {perfil.nome}
                        </p>
                        {perfil.is_perfil_padrao && (
                          <p className="text-micro text-muted-foreground">
                            Workspace principal
                          </p>
                        )}
                      </div>
                      {perfil.id === perfilAtual.id && (
                        <Check className="w-4 h-4 text-verde shrink-0" />
                      )}
                    </button>

                    {/* Menu de contexto */}
                    {!perfil.is_perfil_padrao && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId(menuOpenId === perfil.id ? null : perfil.id)
                          }}
                          className={cn(
                            'p-1.5 rounded-md opacity-0 group-hover:opacity-100',
                            'hover:bg-background transition-all',
                            menuOpenId === perfil.id && 'opacity-100 bg-background'
                          )}
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>

                        {/* Submenu */}
                        <AnimatePresence>
                          {menuOpenId === perfil.id && (
                            <motion.div
                              ref={menuRef}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.1 }}
                              className={cn(
                                'absolute right-0 top-full mt-1 w-32',
                                'bg-popover border border-border rounded-lg shadow-lg',
                                'overflow-hidden z-50'
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(perfil)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-pequeno text-foreground hover:bg-accent"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(perfil)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-pequeno text-vermelho hover:bg-vermelho/5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Divisor */}
              <div className="border-t border-border" />

              {/* Botão criar novo */}
              <button
                type="button"
                onClick={handleOpenCreate}
                disabled={isLoading}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3',
                  'text-rosa hover:bg-rosa/5 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rosa/10">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-corpo font-medium">
                  Criar novo workspace
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialog de criar/editar */}
      <PerfilDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        perfil={editingPerfil}
        onSuccess={handleDialogSuccess}
      />

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Remover workspace?"
        description={`Você tem certeza? O workspace "${deletingPerfil?.nome}" e todos os seus dados (lançamentos, categorias e configurações) serão arquivados permanentemente.`}
        confirmLabel="Sim, remover workspace"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        error={deleteError}
      />

      {/* Toast de sucesso */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
        variant="success"
      />
    </>
  )
}
