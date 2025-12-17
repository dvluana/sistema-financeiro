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
   * LIMITE: Máximo de 1000 registros por segurança.
   * Se exceder, retorna os 1000 mais recentes e loga aviso.
   *
   * @param mes - Mês no formato YYYY-MM
   * @param ctx - Contexto com userId e perfilId
   * @param limit - Limite máximo de registros (default: 1000)
   */
  async findByMes(mes: string, ctx: ContextoUsuario | string, limit: number = 1000): Promise<Lancamento[]> {
    // Compatibilidade: aceita string (userId antigo) ou ContextoUsuario
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    // Primeiro, conta total para verificar se excede limite
    const { count, error: countError } = await supabase
      .from('lancamentos')
      .select('*', { count: 'exact', head: true })
      .eq('mes', mes)
      .eq(filterColumn, filterValue)

    if (countError) throw countError

    if (count && count > limit) {
      console.warn(`[lancamentoRepository] Mês ${mes} tem ${count} lançamentos, excede limite de ${limit}. Retornando apenas ${limit} mais recentes.`)
    }

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
      .order('created_at', { ascending: false }) // Mais recentes primeiro
      .limit(limit)

    if (error) throw error
    if (!allRecords) return []

    // Reordena para created_at ascendente após limitar
    const sortedRecords = allRecords.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Separa pais (raiz) e filhos
    const pais = sortedRecords.filter(l => l.parent_id === null)
    const filhos = sortedRecords.filter(l => l.parent_id !== null)

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
   * 5. FORÇA concluido = false (filhos não têm status concluído)
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

    // VALIDAÇÃO 5: Filhos SEMPRE têm concluido = false
    // (trigger do banco também força isso, mas definimos explicitamente)
    const inputWithForcedDefaults = {
      ...input,
      concluido: false,  // FORÇA false - filhos não têm controle de concluído
    }

    // Todas validações OK, cria o filho
    const insertData = typeof ctx === 'string'
      ? { ...inputWithForcedDefaults, mes, parent_id: parentId, user_id: ctx }
      : { ...inputWithForcedDefaults, mes, parent_id: parentId, user_id: ctx.userId, perfil_id: ctx.perfilId }

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

  /**
   * Move um filho para outro agrupador
   *
   * VALIDAÇÕES:
   * 1. Filho existe e pertence ao perfil
   * 2. Filho tem parent_id (é realmente um filho)
   * 3. Novo parent existe e pertence ao perfil
   * 4. Novo parent tem is_agrupador=true
   * 5. Novo parent tem mesmo mês que o filho
   * 6. Novo parent tem mesmo tipo que o filho
   */
  async moverFilho(filhoId: string, novoParentId: string, ctx: ContextoUsuario | string): Promise<Lancamento> {
    // VALIDAÇÃO 1: Busca filho
    const filho = await this.findById(filhoId, ctx)
    if (!filho) {
      throw new Error('Filho não encontrado')
    }

    // VALIDAÇÃO 2: Verifica que é realmente um filho
    if (!filho.parent_id) {
      throw new Error('Lançamento não é um filho (não tem parent_id)')
    }

    // VALIDAÇÃO 3: Busca novo parent
    const novoParent = await this.findById(novoParentId, ctx)
    if (!novoParent) {
      throw new Error('Novo agrupador não encontrado')
    }

    // VALIDAÇÃO 4: Novo parent deve ser agrupador
    if (!novoParent.is_agrupador) {
      throw new Error('Destino não é um agrupador')
    }

    // VALIDAÇÃO 5: Mesmo mês
    if (novoParent.mes !== filho.mes) {
      throw new Error(`Não é possível mover para agrupador de outro mês. Filho: ${filho.mes}, Destino: ${novoParent.mes}`)
    }

    // VALIDAÇÃO 6: Mesmo tipo
    if (novoParent.tipo !== filho.tipo) {
      throw new Error(`Não é possível mover para agrupador de tipo diferente. Filho: ${filho.tipo}, Destino: ${novoParent.tipo}`)
    }

    // Todas validações OK, move o filho
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('lancamentos')
      .update({ parent_id: novoParentId })
      .eq('id', filhoId)
      .eq(filterColumn, filterValue)
      .select(`
        *,
        categoria:categorias(id, nome, tipo, icone, cor, ordem, is_default)
      `)
      .single()

    if (error) throw error
    return data
  },
}

// Exportar o tipo para uso em outros módulos
export type { ContextoUsuario }
