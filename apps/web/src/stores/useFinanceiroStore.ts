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
  type CriarLancamentoRecorrenteInput,
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
  agrupadores: Lancamento[]
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
  criarLancamentoRecorrente: (data: CriarLancamentoRecorrenteInput) => Promise<{ criados: number }>
  atualizarLancamento: (id: string, data: AtualizarLancamentoInput) => Promise<void>
  toggleConcluido: (id: string) => Promise<void>
  excluirLancamento: (id: string) => Promise<void>

  // Ações de agrupadores
  criarFilho: (agrupadorId: string, data: { tipo: 'entrada' | 'saida'; nome: string; valor: number; concluido?: boolean; data_prevista?: string | null; categoria_id?: string | null }) => Promise<void>

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
  agrupadores: [],
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
        agrupadores: response.agrupadores || [],
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
    } catch {
      // Silently fail - use default configs
      // Error will be visible through network tab if needed
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
        agrupadores: response.agrupadores || [],
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
   * Cria lançamentos recorrentes (mensal ou parcelas)
   */
  criarLancamentoRecorrente: async (data: CriarLancamentoRecorrenteInput) => {
    set({ isLoading: true, error: null })

    try {
      const result = await lancamentosApi.criarRecorrente(data)
      // Recarrega o mês atual para mostrar os novos lançamentos
      await get().carregarMes(get().mesAtual)
      set({ isLoading: false })
      return result
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao criar lançamentos recorrentes',
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
        agrupadores: response.agrupadores || [],
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
   * Usa optimistic update para feedback imediato
   */
  toggleConcluido: async (id: string) => {
    const { entradas, saidas, agrupadores, totais } = get()

    // Encontra o lançamento e determina o novo estado
    const lancamentoEntrada = entradas.find(l => l.id === id)
    const lancamentoSaida = saidas.find(l => l.id === id)
    const lancamentoAgrupador = agrupadores.find(l => l.id === id)
    const lancamento = lancamentoEntrada || lancamentoSaida || lancamentoAgrupador

    if (!lancamento || !totais) return

    const novoStatus = !lancamento.concluido

    // Optimistic update - atualiza UI imediatamente
    if (lancamentoEntrada) {
      const novasEntradas = entradas.map(l =>
        l.id === id ? { ...l, concluido: novoStatus } : l
      )
      const diffValor = novoStatus ? lancamento.valor : -lancamento.valor
      set({
        entradas: novasEntradas,
        totais: {
          ...totais,
          jaEntrou: totais.jaEntrou + diffValor,
          faltaEntrar: totais.faltaEntrar - diffValor,
        },
      })
    } else if (lancamentoAgrupador) {
      // Agrupadores contam como saídas
      const novosAgrupadores = agrupadores.map(l =>
        l.id === id ? { ...l, concluido: novoStatus } : l
      )
      const diffValor = novoStatus ? lancamento.valor : -lancamento.valor
      set({
        agrupadores: novosAgrupadores,
        totais: {
          ...totais,
          jaPaguei: totais.jaPaguei + diffValor,
          faltaPagar: totais.faltaPagar - diffValor,
        },
      })
    } else {
      const novasSaidas = saidas.map(l =>
        l.id === id ? { ...l, concluido: novoStatus } : l
      )
      const diffValor = novoStatus ? lancamento.valor : -lancamento.valor
      set({
        saidas: novasSaidas,
        totais: {
          ...totais,
          jaPaguei: totais.jaPaguei + diffValor,
          faltaPagar: totais.faltaPagar - diffValor,
        },
      })
    }

    // Sincroniza com backend
    try {
      await lancamentosApi.toggleConcluido(id)
    } catch (error) {
      // Reverte em caso de erro
      set({
        entradas,
        saidas,
        agrupadores,
        totais,
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
        agrupadores: response.agrupadores || [],
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
   * Cria um filho para um agrupador
   */
  criarFilho: async (agrupadorId: string, data: { tipo: 'entrada' | 'saida'; nome: string; valor: number; concluido?: boolean; data_prevista?: string | null; categoria_id?: string | null }) => {
    set({ isLoading: true, error: null })

    try {
      const response = await lancamentosApi.criarFilho(agrupadorId, data)
      set({
        entradas: response.entradas,
        saidas: response.saidas,
        agrupadores: response.agrupadores || [],
        totais: response.totais,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao criar item',
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
