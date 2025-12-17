/**
 * Store de Perfis/Workspaces - Zustand
 *
 * Gerencia o estado de perfis do usuário:
 * - Lista de perfis disponíveis
 * - Perfil atual selecionado
 * - CRUD de perfis
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  perfisApi,
  type Perfil,
  type PerfilBasico,
  type CriarPerfilInput,
  type AtualizarPerfilInput,
} from '@/lib/api'

// Chave para persistir perfil selecionado
const PERFIL_KEY = 'perfil_atual_id'

interface PerfilState {
  // Estado
  perfis: Perfil[]
  perfilAtual: Perfil | null
  isLoading: boolean
  error: string | null

  // Ações
  carregarPerfis: () => Promise<void>
  selecionarPerfil: (perfilId: string) => void
  setPerfilInicial: (perfil: PerfilBasico) => void
  criarPerfil: (data: CriarPerfilInput) => Promise<Perfil>
  atualizarPerfil: (id: string, data: AtualizarPerfilInput) => Promise<Perfil>
  arquivarPerfil: (id: string) => Promise<void>
  excluirPerfil: (id: string) => Promise<void>
  limpar: () => void
  clearError: () => void
}

export const usePerfilStore = create<PerfilState>()(
  persist(
    (set, get) => ({
      perfis: [],
      perfilAtual: null,
      isLoading: false,
      error: null,

      /**
       * Carrega lista de perfis do backend
       */
      carregarPerfis: async () => {
        set({ isLoading: true, error: null })

        try {
          const response = await perfisApi.listar()
          console.log('[PerfilStore] Response from API:', response)
          const { perfis } = response

          // Se não tem perfil selecionado, seleciona o padrão
          const perfilAtualState = get().perfilAtual
          let perfilAtual = perfilAtualState

          if (!perfilAtual && perfis.length > 0) {
            // Tenta encontrar o perfil padrão
            perfilAtual = perfis.find(p => p.is_perfil_padrao) || perfis[0]
          } else if (perfilAtual) {
            // Atualiza dados do perfil atual com versão mais recente
            const atualizado = perfis.find(p => p.id === perfilAtual!.id)
            if (atualizado) {
              perfilAtual = atualizado
            } else {
              // Perfil foi arquivado/deletado, seleciona outro
              perfilAtual = perfis.find(p => p.is_perfil_padrao) || perfis[0] || null
            }
          }

          set({
            perfis,
            perfilAtual,
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erro ao carregar perfis',
          })
        }
      },

      /**
       * Seleciona um perfil para uso
       */
      selecionarPerfil: (perfilId: string) => {
        const { perfis } = get()
        const perfil = perfis.find(p => p.id === perfilId)

        if (perfil) {
          set({ perfilAtual: perfil })
        }
      },

      /**
       * Define perfil inicial (usado após login/register)
       */
      setPerfilInicial: (perfil: PerfilBasico) => {
        console.log('[PerfilStore] setPerfilInicial chamado com:', perfil)
        // Converte PerfilBasico para Perfil completo (com campos default)
        const perfilCompleto: Perfil = {
          id: perfil.id,
          nome: perfil.nome,
          cor: perfil.cor,
          icone: perfil.icone,
          is_perfil_padrao: perfil.is_perfil_padrao,
          descricao: null,
          usuario_id: '',
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        set({
          perfilAtual: perfilCompleto,
          perfis: [perfilCompleto],
        })
      },

      /**
       * Cria novo perfil
       */
      criarPerfil: async (data: CriarPerfilInput) => {
        set({ isLoading: true, error: null })

        try {
          const novoPerfil = await perfisApi.criar(data)
          const { perfis } = get()

          set({
            perfis: [...perfis, novoPerfil],
            isLoading: false,
          })

          return novoPerfil
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erro ao criar perfil',
          })
          throw error
        }
      },

      /**
       * Atualiza perfil existente
       */
      atualizarPerfil: async (id: string, data: AtualizarPerfilInput) => {
        set({ isLoading: true, error: null })

        try {
          const perfilAtualizado = await perfisApi.atualizar(id, data)
          const { perfis, perfilAtual } = get()

          // Atualiza na lista
          const novosPerfis = perfis.map(p =>
            p.id === id ? perfilAtualizado : p
          )

          // Se é o perfil atual, atualiza também
          const novoPerfilAtual = perfilAtual?.id === id ? perfilAtualizado : perfilAtual

          set({
            perfis: novosPerfis,
            perfilAtual: novoPerfilAtual,
            isLoading: false,
          })

          return perfilAtualizado
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erro ao atualizar perfil',
          })
          throw error
        }
      },

      /**
       * Arquiva perfil (soft delete)
       */
      arquivarPerfil: async (id: string) => {
        set({ isLoading: true, error: null })

        try {
          await perfisApi.arquivar(id)
          const { perfis, perfilAtual } = get()

          // Remove da lista (arquivados não aparecem)
          const novosPerfis = perfis.filter(p => p.id !== id)

          // Se era o perfil atual, seleciona outro
          let novoPerfilAtual = perfilAtual
          if (perfilAtual?.id === id) {
            novoPerfilAtual = novosPerfis.find(p => p.is_perfil_padrao) || novosPerfis[0] || null
          }

          set({
            perfis: novosPerfis,
            perfilAtual: novoPerfilAtual,
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erro ao arquivar perfil',
          })
          throw error
        }
      },

      /**
       * Exclui perfil permanentemente
       */
      excluirPerfil: async (id: string) => {
        set({ isLoading: true, error: null })

        try {
          await perfisApi.excluir(id)
          const { perfis, perfilAtual } = get()

          // Remove da lista
          const novosPerfis = perfis.filter(p => p.id !== id)

          // Se era o perfil atual, seleciona outro
          let novoPerfilAtual = perfilAtual
          if (perfilAtual?.id === id) {
            novoPerfilAtual = novosPerfis.find(p => p.is_perfil_padrao) || novosPerfis[0] || null
          }

          set({
            perfis: novosPerfis,
            perfilAtual: novoPerfilAtual,
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erro ao excluir perfil',
          })
          throw error
        }
      },

      /**
       * Limpa estado (usado no logout)
       */
      limpar: () => {
        set({
          perfis: [],
          perfilAtual: null,
          isLoading: false,
          error: null,
        })
      },

      /**
       * Limpa erro
       */
      clearError: () => set({ error: null }),
    }),
    {
      name: PERFIL_KEY,
      partialize: (state) => ({
        // Persiste o perfil atual completo para exibição imediata
        perfilAtual: state.perfilAtual,
      }),
    }
  )
)
