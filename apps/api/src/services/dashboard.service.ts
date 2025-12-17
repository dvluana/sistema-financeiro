/**
 * Service da Dashboard
 *
 * Lógica de negócio para a dashboard.
 * Consolida dados de múltiplas fontes em uma resposta única.
 * Todas as queries são filtradas por perfil_id para isolamento de dados.
 */

import { dashboardRepository } from '../repositories/dashboard.repository.js'
import { lancamentoRepository, type ContextoUsuario } from '../repositories/lancamento.repository.js'

// Tipo para contexto: pode ser string (userId legado) ou ContextoUsuario completo
type Contexto = ContextoUsuario | string

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
 * @param quantidade - Número de meses (1-24, default 6)
 */
function getUltimosMeses(quantidade: number = 6): string[] {
  // Validação de segurança: limita range para evitar loops infinitos
  const qtdSafe = Math.max(1, Math.min(quantidade, 24))

  const meses: string[] = []
  const hoje = new Date()

  for (let i = qtdSafe - 1; i >= 0; i--) {
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
   * @param ctx - Contexto do usuário/perfil
   * @param mes - Mês no formato YYYY-MM (opcional, default: mês atual)
   */
  async getDashboard(ctx: Contexto, mes?: string) {
    const mesAtual = getMesAtual()
    const mesSelecionado = mes || mesAtual
    const ultimosMeses = getUltimosMeses(6)

    // Define se é mês atual ou passado
    const isCurrentMonth = mesSelecionado === mesAtual

    // Busca dados em paralelo para melhor performance
    const [lancamentosMesSelecionado, recentLancamentos, totaisPorMes, proximosVencimentos, gastosPorCategoria] = await Promise.all([
      lancamentoRepository.findByMes(mesSelecionado, ctx),
      dashboardRepository.findRecentByMes(ctx, mesSelecionado, 5),
      dashboardRepository.getTotaisPorMes(ultimosMeses, ctx),
      // Se mês atual: próximos 7 dias; senão: vencimentos pendentes do mês selecionado
      isCurrentMonth
        ? dashboardRepository.findProximosVencimentos(ctx, 5)
        : dashboardRepository.findVencimentosByMes(ctx, mesSelecionado, 5),
      dashboardRepository.getGastosPorCategoria(ultimosMeses, ctx),
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

    // Calcula total de gastos para percentuais
    const totalGastos = gastosPorCategoria.reduce((sum, c) => sum + c.total, 0)

    // Adiciona percentual a cada categoria
    const gastosPorCategoriaComPercentual = gastosPorCategoria.map(cat => ({
      ...cat,
      percentual: totalGastos > 0 ? (cat.total / totalGastos) * 100 : 0,
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
      gastosPorCategoria: gastosPorCategoriaComPercentual,
    }
  },
}
