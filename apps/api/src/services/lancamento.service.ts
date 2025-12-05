/**
 * Service de Lançamentos
 *
 * Lógica de negócio para operações com lançamentos financeiros.
 * Todas as operações requerem userId para isolamento de dados.
 */

import { lancamentoRepository } from '../repositories/lancamento.repository.js'
import type { Lancamento, CriarLancamentoInput, AtualizarLancamentoInput, LancamentoResponse } from '../schemas/lancamento.js'

/**
 * Calcula totalizadores a partir das listas de entradas e saídas
 */
function calcularTotais(entradas: Lancamento[], saidas: Lancamento[]) {
  const totalEntradas = entradas.reduce((sum, e) => sum + Number(e.valor), 0)
  const jaEntrou = entradas
    .filter((e) => e.concluido)
    .reduce((sum, e) => sum + Number(e.valor), 0)
  const faltaEntrar = totalEntradas - jaEntrou

  const totalSaidas = saidas.reduce((sum, s) => sum + Number(s.valor), 0)
  const jaPaguei = saidas
    .filter((s) => s.concluido)
    .reduce((sum, s) => sum + Number(s.valor), 0)
  const faltaPagar = totalSaidas - jaPaguei

  return {
    entradas: totalEntradas,
    jaEntrou,
    faltaEntrar,
    saidas: totalSaidas,
    jaPaguei,
    faltaPagar,
    saldo: totalEntradas - totalSaidas,
  }
}

export const lancamentoService = {
  /**
   * Lista lançamentos de um mês com totalizadores
   */
  async listarPorMes(mes: string, userId: string): Promise<LancamentoResponse> {
    const lancamentos = await lancamentoRepository.findByMes(mes, userId)

    const entradas = lancamentos.filter((l) => l.tipo === 'entrada')
    const saidas = lancamentos.filter((l) => l.tipo === 'saida')
    const totais = calcularTotais(entradas, saidas)

    return {
      mes,
      entradas,
      saidas,
      totais,
    }
  },

  /**
   * Cria novo lançamento
   */
  async criar(input: CriarLancamentoInput, userId: string): Promise<LancamentoResponse> {
    await lancamentoRepository.create(input, userId)
    return this.listarPorMes(input.mes, userId)
  },

  /**
   * Atualiza lançamento existente
   */
  async atualizar(id: string, input: AtualizarLancamentoInput, userId: string): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, userId)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    await lancamentoRepository.update(id, input, userId)
    return this.listarPorMes(lancamento.mes, userId)
  },

  /**
   * Alterna status de conclusão
   */
  async toggleConcluido(id: string, userId: string): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, userId)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    await lancamentoRepository.toggleConcluido(id, userId)
    return this.listarPorMes(lancamento.mes, userId)
  },

  /**
   * Remove lançamento
   */
  async excluir(id: string, userId: string): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, userId)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    const mes = lancamento.mes
    await lancamentoRepository.delete(id, userId)
    return this.listarPorMes(mes, userId)
  },

  /**
   * Cria lançamentos recorrentes (mensal ou parcelas)
   */
  async criarRecorrente(
    input: {
      tipo: 'entrada' | 'saida'
      nome: string
      valor: number
      mes_inicial: string
      dia_previsto?: number | null
      concluido?: boolean
      recorrencia: {
        tipo: 'mensal' | 'parcelas'
        quantidade: number
      }
    },
    userId: string
  ): Promise<{ criados: number }> {
    const { tipo, nome, valor, mes_inicial, dia_previsto, concluido, recorrencia } = input
    const quantidade = recorrencia.quantidade

    // Gera lista de meses
    const meses: string[] = []
    const [anoInicial, mesInicial] = mes_inicial.split('-').map(Number)

    for (let i = 0; i < quantidade; i++) {
      const totalMeses = mesInicial - 1 + i // -1 porque mês é 1-indexed
      const ano = anoInicial + Math.floor(totalMeses / 12)
      const mes = (totalMeses % 12) + 1
      meses.push(`${ano}-${String(mes).padStart(2, '0')}`)
    }

    // Cria os lançamentos
    const isParcelas = recorrencia.tipo === 'parcelas'

    for (let i = 0; i < meses.length; i++) {
      const mes = meses[i]
      const nomeFinal = isParcelas
        ? `${nome} (${i + 1}/${quantidade})`
        : nome

      // Monta data_prevista se dia foi informado
      let data_prevista: string | null = null
      if (dia_previsto) {
        const [ano, mesNum] = mes.split('-')
        data_prevista = `${ano}-${mesNum}-${String(dia_previsto).padStart(2, '0')}`
      }

      await lancamentoRepository.create({
        tipo,
        nome: nomeFinal,
        valor,
        mes,
        concluido: concluido ?? false,
        data_prevista,
      }, userId)
    }

    return { criados: quantidade }
  },
}
