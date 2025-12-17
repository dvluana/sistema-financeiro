/**
 * Repository de Categorias
 *
 * Acesso a dados de categorias de lançamentos.
 * Categorias padrão vêm de constantes no código (não do banco).
 * Categorias criadas pelo usuário são salvas no banco por perfil_id.
 */

import { supabase } from '../lib/supabase.js'
import type { Categoria, CriarCategoriaInput, AtualizarCategoriaInput, TipoLancamento } from '../schemas/categoria.js'
import {
  CATEGORIAS_PADRAO,
  getCategoriasPadraoByTipo,
  getCategoriaPadraoById,
  isCategoriaPadrao,
  type CategoriaPadrao,
} from '../constants/categorias-padrao.js'
import type { ContextoUsuario } from './lancamento.repository.js'

// Converte categoria padrão para o formato Categoria
function categoriaPadraoToCategoria(cp: CategoriaPadrao): Categoria {
  return {
    id: cp.id,
    nome: cp.nome,
    tipo: cp.tipo,
    icone: cp.icone,
    cor: cp.cor,
    ordem: cp.ordem,
    user_id: null,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export const categoriaRepository = {
  /**
   * Lista todas as categorias disponíveis para um usuário/perfil
   * Combina: categorias padrão (do código) + categorias do perfil (do banco)
   */
  async findAll(ctx: ContextoUsuario | string): Promise<Categoria[]> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    // Busca categorias do perfil no banco
    const { data: userCategorias, error } = await supabase
      .from('categorias')
      .select('*')
      .eq(filterColumn, filterValue)
      .order('ordem', { ascending: true })

    if (error) throw error

    // Combina padrão + perfil
    const padrao = CATEGORIAS_PADRAO.map(categoriaPadraoToCategoria)
    return [...padrao, ...(userCategorias || [])]
  },

  /**
   * Lista categorias por tipo (entrada ou saida)
   */
  async findByTipo(tipo: TipoLancamento, ctx: ContextoUsuario | string): Promise<Categoria[]> {
    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    // Busca categorias do perfil no banco
    const { data: userCategorias, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('tipo', tipo)
      .eq(filterColumn, filterValue)
      .order('ordem', { ascending: true })

    if (error) throw error

    // Combina padrão + perfil
    const padrao = getCategoriasPadraoByTipo(tipo).map(categoriaPadraoToCategoria)
    return [...padrao, ...(userCategorias || [])]
  },

  /**
   * Busca categoria por ID
   * Pode ser uma categoria padrão (do código) ou do perfil (do banco)
   */
  async findById(id: string, ctx: ContextoUsuario | string): Promise<Categoria | null> {
    // Primeiro verifica se é categoria padrão
    if (isCategoriaPadrao(id)) {
      const padrao = getCategoriaPadraoById(id)
      return padrao ? categoriaPadraoToCategoria(padrao) : null
    }

    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    // Senão, busca no banco
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
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
   * Cria nova categoria para um perfil
   */
  async create(input: CriarCategoriaInput, ctx: ContextoUsuario | string): Promise<Categoria> {
    const insertData = typeof ctx === 'string'
      ? { ...input, user_id: ctx, is_default: false }
      : { ...input, user_id: ctx.userId, perfil_id: ctx.perfilId, is_default: false }

    const { data, error } = await supabase
      .from('categorias')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Atualiza categoria (apenas do próprio perfil, não as padrão)
   */
  async update(id: string, input: AtualizarCategoriaInput, ctx: ContextoUsuario | string): Promise<Categoria> {
    // Não permite editar categorias padrão
    if (isCategoriaPadrao(id)) {
      throw new Error('Não é possível editar categorias padrão do sistema')
    }

    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { data, error } = await supabase
      .from('categorias')
      .update(input)
      .eq('id', id)
      .eq(filterColumn, filterValue)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Remove categoria (apenas do próprio perfil, não as padrão)
   */
  async delete(id: string, ctx: ContextoUsuario | string): Promise<void> {
    // Não permite deletar categorias padrão
    if (isCategoriaPadrao(id)) {
      throw new Error('Não é possível excluir categorias padrão do sistema')
    }

    const filterColumn = typeof ctx === 'string' ? 'user_id' : 'perfil_id'
    const filterValue = typeof ctx === 'string' ? ctx : ctx.perfilId

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)
      .eq(filterColumn, filterValue)

    if (error) throw error
  },
}
