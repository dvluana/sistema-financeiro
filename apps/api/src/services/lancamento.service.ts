/**
 * Service de Lançamentos
 *
 * Lógica de negócio para operações com lançamentos financeiros.
 * Todas as operações requerem userId/perfilId para isolamento de dados.
 */

import { lancamentoRepository, type ContextoUsuario } from '../repositories/lancamento.repository.js'
import type { Lancamento, CriarLancamentoInput, AtualizarLancamentoInput, LancamentoResponse, CriarFilhoInput } from '../schemas/lancamento.js'

// Tipo para contexto: pode ser string (userId legado) ou ContextoUsuario completo
type Contexto = ContextoUsuario | string

/**
 * Calcula totalizadores a partir das listas de entradas e saídas
 *
 * IMPORTANTE: Com a nova arquitetura, agrupadores NÃO são um tipo separado.
 * - Entradas podem ser agrupadores (is_agrupador=true)
 * - Saídas podem ser agrupadores (is_agrupador=true)
 * - Todos os lançamentos raiz (parent_id=null) contam no saldo
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
   * Separa entradas e saídas
   *
   * NOVA ARQUITETURA:
   * - Entradas podem ter is_agrupador=true (ex: grupo de freelances)
   * - Saídas podem ter is_agrupador=true (ex: cartão de crédito)
   * - Array 'agrupadores' é mantido para compatibilidade com frontend,
   *   mas contém apenas lançamentos com is_agrupador=true
   */
  async listarPorMes(mes: string, ctx: Contexto): Promise<LancamentoResponse> {
    const lancamentos = await lancamentoRepository.findByMes(mes, ctx)

    const entradas = lancamentos.filter((l) => l.tipo === 'entrada')
    const saidas = lancamentos.filter((l) => l.tipo === 'saida')

    // Agrupadores = todos com is_agrupador=true
    const agrupadores = lancamentos.filter((l) => l.is_agrupador)

    const totais = calcularTotais(entradas, saidas)

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
  async criar(input: CriarLancamentoInput, ctx: Contexto): Promise<LancamentoResponse> {
    await lancamentoRepository.create(input, ctx)
    return this.listarPorMes(input.mes, ctx)
  },

  /**
   * Atualiza lançamento existente
   */
  async atualizar(id: string, input: AtualizarLancamentoInput, ctx: Contexto): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    await lancamentoRepository.update(id, input, ctx)
    return this.listarPorMes(lancamento.mes, ctx)
  },

  /**
   * Alterna status de conclusão
   */
  async toggleConcluido(id: string, ctx: Contexto): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    await lancamentoRepository.toggleConcluido(id, ctx)
    return this.listarPorMes(lancamento.mes, ctx)
  },

  /**
   * Remove lançamento
   */
  async excluir(id: string, ctx: Contexto): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    const mes = lancamento.mes
    await lancamentoRepository.delete(id, ctx)
    return this.listarPorMes(mes, ctx)
  },

  /**
   * Cria múltiplos lançamentos em lote (batch)
   */
  async criarLote(inputs: CriarLancamentoInput[], ctx: Contexto): Promise<{ criados: number }> {
    return lancamentoRepository.createMany(inputs, ctx)
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
    ctx: Contexto
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
        is_agrupador: false,
        data_prevista,
        categoria_id: categoria_id ?? null,
      }
    })

    // Batch insert - 1 query ao invés de N
    return lancamentoRepository.createMany(lancamentos, ctx)
  },

  /**
   * Lista filhos de um agrupador
   */
  async listarFilhos(agrupadorId: string, ctx: Contexto): Promise<Lancamento[]> {
    const agrupador = await lancamentoRepository.findById(agrupadorId, ctx)
    if (!agrupador) {
      throw new Error('Agrupador não encontrado')
    }
    if (!agrupador.is_agrupador) {
      throw new Error('Lançamento não é um agrupador')
    }

    return lancamentoRepository.findFilhos(agrupadorId, ctx)
  },

  /**
   * Cria um filho para um agrupador
   */
  async criarFilho(agrupadorId: string, input: CriarFilhoInput, ctx: Contexto): Promise<LancamentoResponse> {
    const agrupador = await lancamentoRepository.findById(agrupadorId, ctx)
    if (!agrupador) {
      throw new Error('Agrupador não encontrado')
    }
    if (!agrupador.is_agrupador) {
      throw new Error('Lançamento não é um agrupador')
    }

    await lancamentoRepository.createFilho(agrupadorId, input, agrupador.mes, ctx)
    return this.listarPorMes(agrupador.mes, ctx)
  },

  /**
   * Busca agrupador com seus filhos
   */
  async buscarAgrupador(agrupadorId: string, ctx: Contexto): Promise<Lancamento> {
    const agrupador = await lancamentoRepository.findAgrupadorComFilhos(agrupadorId, ctx)
    if (!agrupador) {
      throw new Error('Agrupador não encontrado')
    }
    return agrupador
  },
}
