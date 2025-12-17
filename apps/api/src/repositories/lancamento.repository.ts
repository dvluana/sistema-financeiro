/**
 * Repository de Lançamentos
 *
 * Acesso a dados de lançamentos financeiros.
 * Todas as queries são filtradas por perfil_id para isolamento de dados.
 * O user_id é mantido para referência, mas o isolamento é por perfil.
 */

import { supabase } from '../lib/supabase.js'
import type { Lancamento, CriarLancamentoInput, AtualizarLancamentoInput, CriarFilhoInput } from '../schemas/lancamento.js'

// Tipo para parâmetros de contexto do usuário/perfil
interface ContextoUsuario {
  userId: string
  perfilId: string
}

export const lancamentoRepository = {
  /**
   * Lista lançamentos de um mês para um perfil
   * Inclui dados da categoria relacionada
   * Retorna apenas lançamentos raiz (parent_id IS NULL)
   * Para agrupadores, inclui os filhos aninhados
   *
   * IMPORTANTE: Usa query única para evitar race condition.
   * Busca pais e filhos atomicamente em vez de 2 queries separadas.
   *
   * @param mes - Mês no formato YYYY-MM
   * @param ctx - Contexto com userId e perfilId
   */
  async findByMes(mes: string, ctx: ContextoUsuario | string): Promise<Lancamento[]> {
    // Compatibilidade: aceita string (userId antigo) ou ContextoUsuario
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    // Query atômica: busca pais (parent_id IS NULL) e filhos (parent_id IS NOT NULL)
    // em uma única query, garantindo snapshot consistente
    const { data: allRecords, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('mes', mes)
      .eq(filterColumn, filterValue)
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!allRecords) return []

    // Separa pais (raiz) e filhos
    const pais = allRecords.filter(l => l.parent_id === null)
    const filhos = allRecords.filter(l => l.parent_id !== null)

    // Agrupa filhos por parent_id
    const filhosPorPai = filhos.reduce((acc, filho) => {
      if (!acc[filho.parent_id!]) acc[filho.parent_id!] = []
      acc[filho.parent_id!].push(filho)
      return acc
    }, {} as Record<string, Lancamento[]>)

    // Anexa filhos aos agrupadores (is_agrupador=true)
    pais.forEach(l => {
      if (l.is_agrupador) {
        l.filhos = filhosPorPai[l.id] || []
      }
    })

    return pais
  },

  /**
   * Cria novo lançamento para um perfil
   */
  async create(input: CriarLancamentoInput, ctx: ContextoUsuario | string): Promise<Lancamento> {
    // Compatibilidade: aceita string (userId antigo) ou ContextoUsuario
    const insertData = typeof ctx === 'string'
      ? { ...input, user_id: ctx }
      : { ...input, user_id: ctx.userId, perfil_id: ctx.perfilId }

    const { data, error } = await supabase
      .from('lancamentos')
      .insert(insertData)
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Atualiza lançamento (verifica se pertence ao perfil)
   */
  async update(id: string, input: AtualizarLancamentoInput, ctx: ContextoUsuario | string): Promise<Lancamento> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .update(input)
      .eq('id', id)
      .eq(filterColumn, filterValue)
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Alterna status de conclusão (verifica se pertence ao perfil)
   */
  async toggleConcluido(id: string, ctx: ContextoUsuario | string): Promise<Lancamento> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    // Busca estado atual
    const { data: current, error: fetchError } = await supabase
      .from('lancamentos')
      .select('concluido')
      .eq('id', id)
      .eq(filterColumn, filterValue)
      .single()

    if (fetchError) throw fetchError

    // Alterna o valor
    const { data, error } = await supabase
      .from('lancamentos')
      .update({ concluido: !current.concluido })
      .eq('id', id)
      .eq(filterColumn, filterValue)
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Remove lançamento (verifica se pertence ao perfil)
   */
  async delete(id: string, ctx: ContextoUsuario | string): Promise<void> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { error } = await supabase
      .from('lancamentos')
      .delete()
      .eq('id', id)
      .eq(filterColumn, filterValue)

    if (error) throw error
  },

  /**
   * Busca lançamento por ID (verifica se pertence ao perfil)
   */
  async findById(id: string, ctx: ContextoUsuario | string): Promise<Lancamento | null> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('id', id)
      .eq(filterColumn, filterValue)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Cria múltiplos lançamentos de uma vez (batch insert)
   */
  async createMany(inputs: CriarLancamentoInput[], ctx: ContextoUsuario | string): Promise<{ criados: number }> {
    const records = inputs.map(input => {
      if (typeof ctx === 'string') {
        return { ...input, user_id: ctx }
      }
      return { ...input, user_id: ctx.userId, perfil_id: ctx.perfilId }
    })

    const { error } = await supabase
      .from('lancamentos')
      .insert(records)

    if (error) throw error
    return { criados: records.length }
  },

  /**
   * Busca filhos de um agrupador
   */
  async findFilhos(parentId: string, ctx: ContextoUsuario | string): Promise<Lancamento[]> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .eq('parent_id', parentId)
      .eq(filterColumn, filterValue)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Cria um filho para um agrupador
   *
   * DEFENSIVE VALIDATIONS (além dos triggers do banco):
   * 1. Valida que parent existe e pertence ao perfil
   * 2. Valida que parent tem is_agrupador=true
   * 3. Valida que mes do filho = mes do parent
   * 4. Valida que tipo do filho = tipo do parent
   *
   * Triggers do banco fornecem última linha de defesa,
   * mas validação aqui dá feedback melhor ao usuário.
   */
  async createFilho(parentId: string, input: CriarFilhoInput, mes: string, ctx: ContextoUsuario | string): Promise<Lancamento> {
    // VALIDAÇÃO 1: Busca parent para validar ownership, is_agrupador, tipo e mes
    const parent = await this.findById(parentId, ctx)

    if (!parent) {
      throw new Error(`Parent lancamento ${parentId} not found or does not belong to user/perfil`)
    }

    // VALIDAÇÃO 2: Parent deve ser agrupador
    if (!parent.is_agrupador) {
      throw new Error(`Parent lancamento ${parentId} is not an agrupador (is_agrupador=false)`)
    }

    // VALIDAÇÃO 3: Mes do filho deve ser igual ao mes do parent
    if (parent.mes !== mes) {
      throw new Error(`Child mes (${mes}) must match parent mes (${parent.mes})`)
    }

    // VALIDAÇÃO 4: Tipo do filho deve ser igual ao tipo do parent
    if (input.tipo !== parent.tipo) {
      throw new Error(`Child tipo (${input.tipo}) must match parent tipo (${parent.tipo})`)
    }

    // Todas validações OK, cria o filho
    const insertData = typeof ctx === 'string'
      ? { ...input, mes, parent_id: parentId, user_id: ctx }
      : { ...input, mes, parent_id: parentId, user_id: ctx.userId, perfil_id: ctx.perfilId }

    const { data, error } = await supabase
      .from('lancamentos')
      .insert(insertData)
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Busca agrupador por ID com seus filhos
   */
  async findAgrupadorComFilhos(id: string, ctx: ContextoUsuario | string): Promise<Lancamento | null> {
    const agrupador = await this.findById(id, ctx)
    if (!agrupador || !agrupador.is_agrupador) return null

    const filhos = await this.findFilhos(id, ctx)
    agrupador.filhos = filhos

    return agrupador
  },
}

// Exportar o tipo para uso em outros módulos
export type { ContextoUsuario }
