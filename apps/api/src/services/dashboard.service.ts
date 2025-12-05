/**
 * Service da Dashboard
 *
 * Lógica de negócio para a dashboard.
 * Consolida dados de múltiplas fontes em uma resposta única.
 */

import { dashboardRepository } from '../repositories/dashboard.repository.js'
import { lancamentoRepository } from '../repositories/lancamento.repository.js'

/**
 * Retorna mês atual no formato YYYY-MM
 */
function getMesAtual(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Gera lista dos últimos N meses incluindo o atual
 */
function getUltimosMeses(quantidade: number): string[] {
  const meses: string[] = []
  const hoje = new Date()

  for (let i = quantidade - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const year = data.getFullYear()
    const month = String(data.getMonth() + 1).padStart(2, '0')
    meses.push(`${year}-${month}`)
  }

  return meses
}

/**
 * Converte mês YYYY-MM em label de 3 letras
 */
function getMesLabel(mes: string): string {
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const [, month] = mes.split('-')
  return labels[parseInt(month) - 1]
}

export const dashboardService = {
  /**
   * Retorna dados consolidados para a dashboard
   * @param userId - ID do usuário
   * @param mes - Mês no formato YYYY-MM (opcional, default: mês atual)
   */
  async getDashboard(userId: string, mes?: string) {
    const mesAtual = getMesAtual()
    const mesSelecionado = mes || mesAtual
    const ultimosMeses = getUltimosMeses(6)

    // Busca dados em paralelo para melhor performance
    const [lancamentosMesSelecionado, recentLancamentos, totaisPorMes, proximosVencimentos] = await Promise.all([
      lancamentoRepository.findByMes(mesSelecionado, userId),
      dashboardRepository.findRecent(userId, 5),
      dashboardRepository.getTotaisPorMes(ultimosMeses, userId),
      dashboardRepository.findProximosVencimentos(userId, 5),
    ])

    // Calcula totais do mês selecionado
    const entradas = lancamentosMesSelecionado.filter(l => l.tipo === 'entrada')
    const saidas = lancamentosMesSelecionado.filter(l => l.tipo === 'saida')

    const totalEntradas = entradas.reduce((sum, e) => sum + Number(e.valor), 0)
    const jaEntrou = entradas
      .filter(e => e.concluido)
      .reduce((sum, e) => sum + Number(e.valor), 0)
    const faltaEntrar = totalEntradas - jaEntrou

    const totalSaidas = saidas.reduce((sum, s) => sum + Number(s.valor), 0)
    const jaPaguei = saidas
      .filter(s => s.concluido)
      .reduce((sum, s) => sum + Number(s.valor), 0)
    const faltaPagar = totalSaidas - jaPaguei

    // Conta pendentes
    const pendentesEntrada = entradas.filter(e => !e.concluido).length
    const pendentesSaida = saidas.filter(s => !s.concluido).length

    // Monta histórico para o gráfico
    const historicoMap: Record<string, { entradas: number; saidas: number }> = {}
    for (const mes of ultimosMeses) {
      historicoMap[mes] = { entradas: 0, saidas: 0 }
    }
    for (const item of totaisPorMes) {
      if (historicoMap[item.mes]) {
        if (item.tipo === 'entrada') {
          historicoMap[item.mes].entradas = item.total
        } else {
          historicoMap[item.mes].saidas = item.total
        }
      }
    }

    const historico = ultimosMeses.map(mes => ({
      mes,
      label: getMesLabel(mes),
      entradas: historicoMap[mes].entradas,
      saidas: historicoMap[mes].saidas,
    }))

    return {
      mesAtual: mesSelecionado,
      totais: {
        entradas: totalEntradas,
        jaEntrou,
        faltaEntrar,
        saidas: totalSaidas,
        jaPaguei,
        faltaPagar,
        saldo: totalEntradas - totalSaidas,
      },
      recentLancamentos,
      historico,
      pendentesEntrada,
      pendentesSaida,
      proximosVencimentos,
    }
  },
}
