/**
 * Service de Lançamentos
 *
 * Lógica de negócio para operações com lançamentos financeiros.
 * Todas as operações requerem userId para isolamento de dados.
 */

import { lancamentoRepository } from '../repositories/lancamento.repository.js'
import type { Lancamento, CriarLancamentoInput, AtualizarLancamentoInput, LancamentoResponse, CriarFilhoInput } from '../schemas/lancamento.js'

/**
 * Calcula totalizadores a partir das listas de entradas, saídas e agrupadores
 * Agrupadores contam como saídas no cálculo do saldo
 */
function calcularTotais(entradas: Lancamento[], saidas: Lancamento[], agrupadores: Lancamento[]) {
  const totalEntradas = entradas.reduce((sum, e) => sum + Number(e.valor), 0)
  const jaEntrou = entradas
    .filter((e) => e.concluido)
    .reduce((sum, e) => sum + Number(e.valor), 0)
  const faltaEntrar = totalEntradas - jaEntrou

  // Saídas incluem tanto saídas normais quanto agrupadores
  const todasSaidas = [...saidas, ...agrupadores]
  const totalSaidas = todasSaidas.reduce((sum, s) => sum + Number(s.valor), 0)
  const jaPaguei = todasSaidas
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
   * Separa entradas, saídas e agrupadores
   */
  async listarPorMes(mes: string, userId: string): Promise<LancamentoResponse> {
    const lancamentos = await lancamentoRepository.findByMes(mes, userId)

    const entradas = lancamentos.filter((l) => l.tipo === 'entrada')
    const saidas = lancamentos.filter((l) => l.tipo === 'saida')
    const agrupadores = lancamentos.filter((l) => l.tipo === 'agrupador')
    const totais = calcularTotais(entradas, saidas, agrupadores)

    return {
      mes,
      entradas,
      saidas,
      agrupadores,
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
   * Cria múltiplos lançamentos em lote (batch)
   */
  async criarLote(inputs: CriarLancamentoInput[], userId: string): Promise<{ criados: number }> {
    return lancamentoRepository.createMany(inputs, userId)
  },

  /**
   * Cria lançamentos recorrentes (mensal ou parcelas)
   * Otimizado: usa batch insert ao invés de N queries sequenciais
   */
  async criarRecorrente(
    input: {
      tipo: 'entrada' | 'saida'
      nome: string
      valor: number
      mes_inicial: string
      dia_previsto?: number | null
      concluido?: boolean
      categoria_id?: string | null
      recorrencia: {
        tipo: 'mensal' | 'parcelas'
        quantidade: number
      }
    },
    userId: string
  ): Promise<{ criados: number }> {
    const { tipo, nome, valor, mes_inicial, dia_previsto, concluido, categoria_id, recorrencia } = input
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

    // Prepara todos os lançamentos para batch insert
    const isParcelas = recorrencia.tipo === 'parcelas'
    const lancamentos: CriarLancamentoInput[] = meses.map((mes, i) => {
      const nomeFinal = isParcelas
        ? `${nome} (${i + 1}/${quantidade})`
        : nome

      // Monta data_prevista se dia foi informado
      let data_prevista: string | null = null
      if (dia_previsto) {
        const [ano, mesNum] = mes.split('-')
        data_prevista = `${ano}-${mesNum}-${String(dia_previsto).padStart(2, '0')}`
      }

      return {
        tipo,
        nome: nomeFinal,
        valor,
        mes,
        concluido: concluido ?? false,
        data_prevista,
        categoria_id: categoria_id ?? null,
      }
    })

    // Batch insert - 1 query ao invés de N
    return lancamentoRepository.createMany(lancamentos, userId)
  },

  /**
   * Lista filhos de um agrupador
   */
  async listarFilhos(agrupadorId: string, userId: string): Promise<Lancamento[]> {
    const agrupador = await lancamentoRepository.findById(agrupadorId, userId)
    if (!agrupador) {
      throw new Error('Agrupador não encontrado')
    }
    if (agrupador.tipo !== 'agrupador') {
      throw new Error('Lançamento não é um agrupador')
    }

    return lancamentoRepository.findFilhos(agrupadorId, userId)
  },

  /**
   * Cria um filho para um agrupador
   */
  async criarFilho(agrupadorId: string, input: CriarFilhoInput, userId: string): Promise<LancamentoResponse> {
    const agrupador = await lancamentoRepository.findById(agrupadorId, userId)
    if (!agrupador) {
      throw new Error('Agrupador não encontrado')
    }
    if (agrupador.tipo !== 'agrupador') {
      throw new Error('Lançamento não é um agrupador')
    }

    await lancamentoRepository.createFilho(agrupadorId, input, agrupador.mes, userId)
    return this.listarPorMes(agrupador.mes, userId)
  },

  /**
   * Busca agrupador com seus filhos
   */
  async buscarAgrupador(agrupadorId: string, userId: string): Promise<Lancamento> {
    const agrupador = await lancamentoRepository.findAgrupadorComFilhos(agrupadorId, userId)
    if (!agrupador) {
      throw new Error('Agrupador não encontrado')
    }
    return agrupador
  },
}
