/**
 * Service de Lançamentos
 *
 * Lógica de negócio para operações com lançamentos financeiros.
 * Todas as operações requerem userId/perfilId para isolamento de dados.
 */

import { randomUUID } from 'crypto'
import { lancamentoRepository, type ContextoUsuario } from '../repositories/lancamento.repository.js'
import type {
  Lancamento,
  CriarLancamentoInput,
  AtualizarLancamentoInput,
  LancamentoResponse,
  CriarFilhoInput,
  EscopoRecorrencia,
  InfoRecorrencia
} from '../schemas/lancamento.js'

// Tipo para contexto: pode ser string (userId legado) ou ContextoUsuario completo
type Contexto = ContextoUsuario | string

/**
 * Calcula o valor efetivo de um lançamento baseado em seu tipo e valor_modo
 *
 * REGRAS:
 * - Se is_agrupador=false: retorna valor direto
 * - Se is_agrupador=true e valor_modo='fixo': retorna valor direto
 * - Se is_agrupador=true e valor_modo='soma': retorna soma dos filhos
 */
function calcularValorEfetivo(lancamento: Lancamento): number {
  // Não é agrupador: valor direto
  if (!lancamento.is_agrupador) {
    return Number(lancamento.valor)
  }

  // Agrupador com modo fixo: usa valor do agrupador
  if (lancamento.valor_modo === 'fixo') {
    return Number(lancamento.valor)
  }

  // Agrupador com modo soma: calcula soma dos filhos
  if (lancamento.filhos && lancamento.filhos.length > 0) {
    return lancamento.filhos.reduce((sum, filho) => sum + Number(filho.valor), 0)
  }

  // Agrupador sem filhos: valor é 0
  return 0
}

/**
 * Adiciona valor_calculado em todos os lançamentos
 * Para agrupadores, respeita o valor_modo
 */
function enrichWithValorCalculado(lancamentos: Lancamento[]): Lancamento[] {
  return lancamentos.map(l => ({
    ...l,
    valor_calculado: calcularValorEfetivo(l)
  }))
}

/**
 * Calcula totalizadores a partir das listas de entradas e saídas
 *
 * IMPORTANTE: Com a nova arquitetura, agrupadores NÃO são um tipo separado.
 * - Entradas podem ser agrupadores (is_agrupador=true)
 * - Saídas podem ser agrupadores (is_agrupador=true)
 * - Todos os lançamentos raiz (parent_id=null) contam no saldo
 *
 * VALOR_MODO:
 * - Agrupadores com valor_modo='soma': usa SUM(filhos.valor)
 * - Agrupadores com valor_modo='fixo': usa agrupador.valor
 * - Não-agrupadores: usa valor direto
 */
function calcularTotais(entradas: Lancamento[], saidas: Lancamento[]) {
  // Calcula totais usando valor_calculado (respeita valor_modo)
  const totalEntradas = entradas.reduce((sum, e) => sum + calcularValorEfetivo(e), 0)
  const jaEntrou = entradas
    .filter((e) => e.concluido)
    .reduce((sum, e) => sum + calcularValorEfetivo(e), 0)
  const faltaEntrar = totalEntradas - jaEntrou

  const totalSaidas = saidas.reduce((sum, s) => sum + calcularValorEfetivo(s), 0)
  const jaPaguei = saidas
    .filter((s) => s.concluido)
    .reduce((sum, s) => sum + calcularValorEfetivo(s), 0)
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

    // Adiciona valor_calculado em todos os lançamentos (respeita valor_modo)
    const lancamentosEnriquecidos = enrichWithValorCalculado(lancamentos)

    const entradas = lancamentosEnriquecidos.filter((l) => l.tipo === 'entrada')
    const saidas = lancamentosEnriquecidos.filter((l) => l.tipo === 'saida')

    // Agrupadores = todos com is_agrupador=true
    const agrupadores = lancamentosEnriquecidos.filter((l) => l.is_agrupador)

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
   *
   * VALIDAÇÕES:
   * - Não pode desgrupar (is_agrupador: false) se tiver filhos
   */
  async atualizar(id: string, input: AtualizarLancamentoInput, ctx: Contexto): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    // Validação: não pode desgrupar se tiver filhos
    if (input.is_agrupador === false && lancamento.is_agrupador === true) {
      const filhos = await lancamentoRepository.findFilhos(id, ctx)
      if (filhos.length > 0) {
        throw new Error(
          `Não é possível remover o status de grupo pois existem ${filhos.length} ${filhos.length === 1 ? 'item' : 'itens'} vinculados. ` +
          `Exclua os itens primeiro ou exclua o grupo inteiro.`
        )
      }
    }

    await lancamentoRepository.update(id, input, ctx)
    return this.listarPorMes(lancamento.mes, ctx)
  },

  /**
   * Alterna status de conclusão
   *
   * REGRA: Apenas lançamentos raiz (parent_id = null) podem ter toggle de concluído.
   * Filhos sempre têm concluido = false.
   */
  async toggleConcluido(id: string, ctx: Contexto): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    // VALIDAÇÃO: Filhos não podem ter toggle de concluído
    if (lancamento.parent_id !== null) {
      throw new Error('Não é possível alterar status de conclusão de filhos. Apenas o agrupador (pai) pode ser marcado como concluído.')
    }

    await lancamentoRepository.toggleConcluido(id, ctx)
    return this.listarPorMes(lancamento.mes, ctx)
  },

  /**
   * Remove lançamento
   *
   * REGRA: Se for agrupador com filhos, requer confirmação (force=true)
   * - Sem force: retorna erro com quantidade de filhos que serão excluídos
   * - Com force=true: exclui agrupador e todos os filhos (CASCADE)
   */
  async excluir(id: string, ctx: Contexto, force: boolean = false): Promise<LancamentoResponse> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    // Se é agrupador, verificar se tem filhos
    if (lancamento.is_agrupador) {
      const filhos = await lancamentoRepository.findFilhos(id, ctx)
      const numFilhos = filhos.length

      // Se tem filhos e force != true, retornar erro com quantidade
      if (numFilhos > 0 && !force) {
        throw new Error(
          `Este agrupador possui ${numFilhos} ${numFilhos === 1 ? 'filho' : 'filhos'}. ` +
          `Todos os filhos serão excluídos junto com o agrupador. ` +
          `Para confirmar a exclusão, use o parâmetro force=true.`
        )
      }
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
   *
   * SUPORTA AGRUPADORES:
   * - Se is_agrupador=true, cria agrupadores vazios para cada mês
   * - Se valor_modo='soma', valor inicial é 0 (calculado pelos filhos)
   * - Se valor_modo='fixo', usa o valor informado
   *
   * RECORRENCIA_ID:
   * - Gera UUID único para vincular todos os lançamentos da série
   * - Permite edição/exclusão em lote posteriormente
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
      is_agrupador?: boolean
      valor_modo?: 'soma' | 'fixo'
      recorrencia: {
        tipo: 'mensal' | 'parcelas'
        quantidade: number
      }
    },
    ctx: Contexto
  ): Promise<{ criados: number }> {
    const { tipo, nome, valor, mes_inicial, dia_previsto, concluido, categoria_id, is_agrupador, valor_modo, recorrencia } = input
    const quantidade = recorrencia.quantidade

    // Gera UUID único para vincular todos os lançamentos desta série
    const recorrenciaId = randomUUID()

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
    const isAgrupador = is_agrupador ?? false
    const modoValor = valor_modo ?? 'soma'

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

      // Valor: se agrupador com modo soma, valor é 0 (calculado pelos filhos)
      // Se agrupador com modo fixo ou parcelado, divide o valor total
      let valorFinal = valor
      if (isAgrupador && modoValor === 'soma') {
        valorFinal = 0
      } else if (isParcelas && !isAgrupador) {
        // Mantém valor original para cada parcela (não divide)
        valorFinal = valor
      }

      return {
        tipo,
        nome: nomeFinal,
        valor: valorFinal,
        mes,
        concluido: concluido ?? false,
        is_agrupador: isAgrupador,
        valor_modo: modoValor,
        data_prevista,
        categoria_id: categoria_id ?? null,
        recorrencia_id: recorrenciaId, // Vincula todos à mesma série
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

    // Adiciona valor_calculado respeitando valor_modo
    agrupador.valor_calculado = calcularValorEfetivo(agrupador)

    return agrupador
  },

  /**
   * Move um filho para outro agrupador
   *
   * Permite reorganizar itens entre cartões/grupos do mesmo mês e tipo.
   * Ex: Mover uma compra do Nubank para o Itaú.
   */
  async moverFilho(filhoId: string, novoParentId: string, ctx: Contexto): Promise<LancamentoResponse> {
    // Repository faz todas as validações e retorna o filho atualizado
    const filhoAtualizado = await lancamentoRepository.moverFilho(filhoId, novoParentId, ctx)

    // Retorna dados do mês para atualizar UI
    return this.listarPorMes(filhoAtualizado.mes, ctx)
  },

  // ========================================================================
  // OPERAÇÕES EM LOTE DE RECORRÊNCIA
  // ========================================================================

  /**
   * Busca informações sobre a série de recorrência de um lançamento
   * Usado para mostrar preview no dialog de edição/exclusão
   */
  async infoRecorrencia(id: string, ctx: Contexto): Promise<InfoRecorrencia> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    // Se não tem recorrencia_id, retorna info básica (lançamento avulso/legado)
    if (!lancamento.recorrencia_id) {
      return {
        recorrenciaId: null,
        total: 1,
        concluidos: lancamento.concluido ? 1 : 0,
        pendentes: lancamento.concluido ? 0 : 1,
        primeiroMes: lancamento.mes,
        ultimoMes: lancamento.mes,
        mesAtual: lancamento.mes,
        contagemPorEscopo: {
          apenas_este: 1,
          este_e_proximos: 1,
          todos: 1,
        },
      }
    }

    // Busca todos da série
    const serie = await lancamentoRepository.findByRecorrenciaId(lancamento.recorrencia_id, ctx)

    // Ordena por mês
    const serieOrdenada = serie.sort((a, b) => a.mes.localeCompare(b.mes))

    // Contagens
    const concluidos = serieOrdenada.filter(l => l.concluido).length
    const pendentes = serieOrdenada.length - concluidos

    // Meses
    const primeiroMes = serieOrdenada[0]?.mes || lancamento.mes
    const ultimoMes = serieOrdenada[serieOrdenada.length - 1]?.mes || lancamento.mes

    // Contagem por escopo
    const esteEProximos = serieOrdenada.filter(l => l.mes >= lancamento.mes).length

    return {
      recorrenciaId: lancamento.recorrencia_id,
      total: serieOrdenada.length,
      concluidos,
      pendentes,
      primeiroMes,
      ultimoMes,
      mesAtual: lancamento.mes,
      contagemPorEscopo: {
        apenas_este: 1,
        este_e_proximos: esteEProximos,
        todos: serieOrdenada.length,
      },
    }
  },

  /**
   * Atualiza lançamentos de uma recorrência em lote
   *
   * ESCOPOS:
   * - apenas_este: atualiza somente o lançamento informado
   * - este_e_proximos: atualiza este e todos com mes >= mes atual
   * - todos: atualiza todos da série
   *
   * CENÁRIOS ESPECIAIS:
   * - Lançamento sem recorrencia_id: opera apenas nele (legado)
   * - Para edição de data_prevista: atualiza apenas o dia, mês preservado
   */
  async atualizarRecorrencia(
    id: string,
    escopo: EscopoRecorrencia,
    dados: AtualizarLancamentoInput,
    ctx: Contexto
  ): Promise<{ atualizados: number; mesesAfetados: string[] }> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    // Se não tem recorrencia_id ou escopo é apenas_este, atualiza só este
    if (!lancamento.recorrencia_id || escopo === 'apenas_este') {
      await lancamentoRepository.update(id, dados, ctx)
      return { atualizados: 1, mesesAfetados: [lancamento.mes] }
    }

    // Determina filtro de mês baseado no escopo
    const filtroMes = escopo === 'este_e_proximos'
      ? { operador: '>=' as const, mes: lancamento.mes }
      : undefined

    // Atualiza em lote
    const resultado = await lancamentoRepository.updateByRecorrenciaId(
      lancamento.recorrencia_id,
      dados,
      ctx,
      filtroMes
    )

    return resultado
  },

  /**
   * Exclui lançamentos de uma recorrência em lote
   *
   * ESCOPOS:
   * - apenas_este: exclui somente o lançamento informado
   * - este_e_proximos: exclui este e todos com mes >= mes atual
   * - todos: exclui todos da série
   *
   * CENÁRIOS ESPECIAIS:
   * - Lançamento sem recorrencia_id: exclui apenas ele (legado)
   * - Agrupadores: exclui filhos junto (CASCADE no banco)
   */
  async excluirRecorrencia(
    id: string,
    escopo: EscopoRecorrencia,
    ctx: Contexto
  ): Promise<{ excluidos: number; mesesAfetados: string[] }> {
    const lancamento = await lancamentoRepository.findById(id, ctx)
    if (!lancamento) {
      throw new Error('Lançamento não encontrado')
    }

    // Se não tem recorrencia_id ou escopo é apenas_este, exclui só este
    if (!lancamento.recorrencia_id || escopo === 'apenas_este') {
      await lancamentoRepository.delete(id, ctx)
      return { excluidos: 1, mesesAfetados: [lancamento.mes] }
    }

    // Determina filtro de mês baseado no escopo
    const filtroMes = escopo === 'este_e_proximos'
      ? { operador: '>=' as const, mes: lancamento.mes }
      : undefined

    // Exclui em lote
    const resultado = await lancamentoRepository.deleteByRecorrenciaId(
      lancamento.recorrencia_id,
      ctx,
      filtroMes
    )

    return resultado
  },
}
