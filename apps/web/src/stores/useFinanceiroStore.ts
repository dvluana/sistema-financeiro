/**
 * Store Global - Zustand
 *
 * Gerencia o estado global da aplicação incluindo:
 * - Dados de lançamentos do mês atual
 * - Configurações do usuário
 * - Estado de loading e erros
 * - Navegação entre meses
 */

import { create } from 'zustand'
import {
  lancamentosApi,
  configuracoesApi,
  type LancamentoResponse,
  type Lancamento,
  type CriarLancamentoInput,
  type AtualizarLancamentoInput,
  type Configuracao,
} from '@/lib/api'
import { getMesAtual, navegarMes } from '@/lib/utils'

/**
 * Interface do estado da store
 */
interface FinanceiroState {
  // Estado dos dados
  mesAtual: string
  entradas: Lancamento[]
  saidas: Lancamento[]
  totais: LancamentoResponse['totais'] | null
  configuracoes: Record<string, boolean | string | number>

  // Estado de UI
  isLoading: boolean
  error: string | null

  // Ações de navegação
  irParaMesAnterior: () => void
  irParaProximoMes: () => void
  irParaMes: (mes: string) => void

  // Ações de dados
  carregarMes: (mes: string) => Promise<void>
  carregarConfiguracoes: () => Promise<void>

  // Ações de lançamentos
  criarLancamento: (data: CriarLancamentoInput) => Promise<void>
  atualizarLancamento: (id: string, data: AtualizarLancamentoInput) => Promise<void>
  toggleConcluido: (id: string) => Promise<void>
  excluirLancamento: (id: string) => Promise<void>

  // Ações de configurações
  atualizarConfiguracao: (chave: string, valor: boolean) => Promise<void>

  // Helpers
  limparErro: () => void
}

/**
 * Store Zustand para gerenciamento de estado
 */
export const useFinanceiroStore = create<FinanceiroState>((set, get) => ({
  // Estado inicial
  mesAtual: getMesAtual(),
  entradas: [],
  saidas: [],
  totais: null,
  configuracoes: {
    entradas_auto_recebido: false,
    saidas_auto_pago: false,
    mostrar_concluidos_discretos: true,
  },
  isLoading: false,
  error: null,

  /**
   * Navega para o mês anterior
   */
  irParaMesAnterior: () => {
    const novoMes = navegarMes(get().mesAtual, 'anterior')
    get().irParaMes(novoMes)
  },

  /**
   * Navega para o próximo mês
   */
  irParaProximoMes: () => {
    const novoMes = navegarMes(get().mesAtual, 'proximo')
    get().irParaMes(novoMes)
  },

  /**
   * Navega para um mês específico
   */
  irParaMes: (mes: string) => {
    set({ mesAtual: mes })
    get().carregarMes(mes)
  },

  /**
   * Carrega os dados de um mês específico
   */
  carregarMes: async (mes: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await lancamentosApi.listar(mes)
      set({
        entradas: response.entradas,
        saidas: response.saidas,
        totais: response.totais,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar dados',
      })
    }
  },

  /**
   * Carrega as configurações do usuário
   */
  carregarConfiguracoes: async () => {
    try {
      const configs = await configuracoesApi.listar()
      const configMap: Record<string, boolean | string | number> = {}

      configs.forEach((config: Configuracao) => {
        configMap[config.chave] = config.valor
      })

      set({ configuracoes: configMap })
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  },

  /**
   * Cria um novo lançamento
   */
  criarLancamento: async (data: CriarLancamentoInput) => {
    set({ isLoading: true, error: null })

    try {
      const response = await lancamentosApi.criar(data)
      set({
        entradas: response.entradas,
        saidas: response.saidas,
        totais: response.totais,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao criar lançamento',
      })
      throw error
    }
  },

  /**
   * Atualiza um lançamento existente
   */
  atualizarLancamento: async (id: string, data: AtualizarLancamentoInput) => {
    set({ isLoading: true, error: null })

    try {
      const response = await lancamentosApi.atualizar(id, data)
      set({
        entradas: response.entradas,
        saidas: response.saidas,
        totais: response.totais,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar lançamento',
      })
      throw error
    }
  },

  /**
   * Alterna o status de conclusão de um lançamento
   */
  toggleConcluido: async (id: string) => {
    try {
      const response = await lancamentosApi.toggleConcluido(id)
      set({
        entradas: response.entradas,
        saidas: response.saidas,
        totais: response.totais,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao atualizar status',
      })
    }
  },

  /**
   * Exclui um lançamento
   */
  excluirLancamento: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await lancamentosApi.excluir(id)
      set({
        entradas: response.entradas,
        saidas: response.saidas,
        totais: response.totais,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao excluir lançamento',
      })
      throw error
    }
  },

  /**
   * Atualiza uma configuração
   */
  atualizarConfiguracao: async (chave: string, valor: boolean) => {
    try {
      await configuracoesApi.atualizar(chave, valor)
      set((state) => ({
        configuracoes: {
          ...state.configuracoes,
          [chave]: valor,
        },
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Erro ao atualizar configuração',
      })
    }
  },

  /**
   * Limpa mensagem de erro
   */
  limparErro: () => set({ error: null }),
}))
