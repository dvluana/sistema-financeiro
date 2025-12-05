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

interface Vencimento {
  id: string
  nome: string
  valor: number
  data_prevista: string
}

interface DashboardState {
  mesSelecionado: string
  totais: Totais | null
  recentLancamentos: Lancamento[]
  historico: MesHistorico[]
  pendentesEntrada: number
  pendentesSaida: number
  proximosVencimentos: Vencimento[]
  isLoading: boolean
  error: string | null

  carregarDashboard: (mes?: string) => Promise<void>
  navegarMesAnterior: () => void
  navegarMesProximo: () => void
  toggleConcluido: (id: string) => Promise<void>
  limparErro: () => void
}

/**
 * Navega para o mês anterior dado um mês no formato YYYY-MM
 */
function getMesAnterior(mes: string): string {
  const [ano, mesNum] = mes.split('-').map(Number)
  const data = new Date(ano, mesNum - 2, 1) // -2 porque mês é 0-indexed e queremos anterior
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Navega para o próximo mês dado um mês no formato YYYY-MM
 */
function getMesProximo(mes: string): string {
  const [ano, mesNum] = mes.split('-').map(Number)
  const data = new Date(ano, mesNum, 1) // mesNum é o próximo mês (0-indexed)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  mesSelecionado: getMesAtual(),
  totais: null,
  recentLancamentos: [],
  historico: [],
  pendentesEntrada: 0,
  pendentesSaida: 0,
  proximosVencimentos: [],
  isLoading: false,
  error: null,

  carregarDashboard: async (mes?: string) => {
    set({ isLoading: true, error: null })

    try {
      const data = await dashboardApi.get(mes)
      set({
        mesSelecionado: data.mesAtual,
        totais: data.totais,
        recentLancamentos: data.recentLancamentos,
        historico: data.historico,
        pendentesEntrada: data.pendentesEntrada,
        pendentesSaida: data.pendentesSaida,
        proximosVencimentos: data.proximosVencimentos || [],
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar dashboard',
      })
    }
  },

  navegarMesAnterior: () => {
    const { mesSelecionado, carregarDashboard } = get()
    const mesAnterior = getMesAnterior(mesSelecionado)
    carregarDashboard(mesAnterior)
  },

  navegarMesProximo: () => {
    const { mesSelecionado, carregarDashboard } = get()
    const mesAtual = getMesAtual()
    // Não permite navegar além do mês atual
    if (mesSelecionado >= mesAtual) return
    const mesProximo = getMesProximo(mesSelecionado)
    carregarDashboard(mesProximo)
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
