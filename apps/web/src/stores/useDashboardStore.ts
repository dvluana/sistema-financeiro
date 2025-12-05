/**
 * Store da Dashboard - Zustand
 *
 * Gerencia o estado da dashboard incluindo:
 * - Dados do mês atual
 * - Últimos lançamentos
 * - Histórico de 6 meses para o gráfico
 */

import { create } from 'zustand'
import { dashboardApi, lancamentosApi, type Lancamento, type Totais } from '@/lib/api'
import { getMesAtual } from '@/lib/utils'

interface MesHistorico {
  mes: string
  label: string
  entradas: number
  saidas: number
}

interface DashboardState {
  mesAtual: string
  totais: Totais | null
  recentLancamentos: Lancamento[]
  historico: MesHistorico[]
  pendentesEntrada: number
  pendentesSaida: number
  isLoading: boolean
  error: string | null

  carregarDashboard: () => Promise<void>
  toggleConcluido: (id: string) => Promise<void>
  limparErro: () => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  mesAtual: getMesAtual(),
  totais: null,
  recentLancamentos: [],
  historico: [],
  pendentesEntrada: 0,
  pendentesSaida: 0,
  isLoading: false,
  error: null,

  carregarDashboard: async () => {
    set({ isLoading: true, error: null })

    try {
      const data = await dashboardApi.get()
      set({
        mesAtual: data.mesAtual,
        totais: data.totais,
        recentLancamentos: data.recentLancamentos,
        historico: data.historico,
        pendentesEntrada: data.pendentesEntrada,
        pendentesSaida: data.pendentesSaida,
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar dashboard',
      })
    }
  },

  toggleConcluido: async (id: string) => {
    const { recentLancamentos, totais } = get()

    // Encontra o lançamento
    const lancamento = recentLancamentos.find(l => l.id === id)
    if (!lancamento || !totais) return

    const novoStatus = !lancamento.concluido

    // Optimistic update
    const novosLancamentos = recentLancamentos.map(l =>
      l.id === id ? { ...l, concluido: novoStatus } : l
    )

    // Atualiza totais
    const diffValor = novoStatus ? lancamento.valor : -lancamento.valor
    const novosTotais = { ...totais }

    if (lancamento.tipo === 'entrada') {
      novosTotais.jaEntrou += diffValor
      novosTotais.faltaEntrar -= diffValor
    } else {
      novosTotais.jaPaguei += diffValor
      novosTotais.faltaPagar -= diffValor
    }

    // Atualiza contagem de pendentes
    const pendentesEntradaDiff = lancamento.tipo === 'entrada' ? (novoStatus ? -1 : 1) : 0
    const pendentesSaidaDiff = lancamento.tipo === 'saida' ? (novoStatus ? -1 : 1) : 0

    set({
      recentLancamentos: novosLancamentos,
      totais: novosTotais,
      pendentesEntrada: get().pendentesEntrada + pendentesEntradaDiff,
      pendentesSaida: get().pendentesSaida + pendentesSaidaDiff,
    })

    try {
      await lancamentosApi.toggleConcluido(id)
    } catch (error) {
      // Reverte em caso de erro
      set({
        recentLancamentos,
        totais,
        pendentesEntrada: get().pendentesEntrada - pendentesEntradaDiff,
        pendentesSaida: get().pendentesSaida - pendentesSaidaDiff,
        error: error instanceof Error ? error.message : 'Erro ao atualizar status',
      })
    }
  },

  limparErro: () => set({ error: null }),
}))
