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
}
