/**
 * Repository de Categorias
 *
 * Acesso a dados de categorias de lançamentos.
 * Categorias padrão vêm de constantes no código (não do banco).
 * Apenas categorias criadas pelo usuário são salvas no banco.
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
   * Lista todas as categorias disponíveis para um usuário
   * Combina: categorias padrão (do código) + categorias do usuário (do banco)
   */
  async findAll(userId: string): Promise<Categoria[]> {
    // Busca categorias do usuário no banco
    const { data: userCategorias, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', userId)
      .order('ordem', { ascending: true })

    if (error) throw error

    // Combina padrão + usuário
    const padrao = CATEGORIAS_PADRAO.map(categoriaPadraoToCategoria)
    return [...padrao, ...(userCategorias || [])]
  },

  /**
   * Lista categorias por tipo (entrada ou saida)
   */
  async findByTipo(tipo: TipoLancamento, userId: string): Promise<Categoria[]> {
    // Busca categorias do usuário no banco
    const { data: userCategorias, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('tipo', tipo)
      .eq('user_id', userId)
      .order('ordem', { ascending: true })

    if (error) throw error

    // Combina padrão + usuário
    const padrao = getCategoriasPadraoByTipo(tipo).map(categoriaPadraoToCategoria)
    return [...padrao, ...(userCategorias || [])]
  },

  /**
   * Busca categoria por ID
   * Pode ser uma categoria padrão (do código) ou do usuário (do banco)
   */
  async findById(id: string, userId: string): Promise<Categoria | null> {
    // Primeiro verifica se é categoria padrão
    if (isCategoriaPadrao(id)) {
      const padrao = getCategoriaPadraoById(id)
      return padrao ? categoriaPadraoToCategoria(padrao) : null
    }

    // Senão, busca no banco
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  /**
   * Cria nova categoria para um usuário
   */
  async create(input: CriarCategoriaInput, userId: string): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        ...input,
        user_id: userId,
        is_default: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Atualiza categoria (apenas do próprio usuário, não as padrão)
   */
  async update(id: string, input: AtualizarCategoriaInput, userId: string): Promise<Categoria> {
    // Não permite editar categorias padrão
    if (isCategoriaPadrao(id)) {
      throw new Error('Não é possível editar categorias padrão do sistema')
    }

    const { data, error } = await supabase
      .from('categorias')
      .update(input)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Remove categoria (apenas do próprio usuário, não as padrão)
   */
  async delete(id: string, userId: string): Promise<void> {
    // Não permite deletar categorias padrão
    if (isCategoriaPadrao(id)) {
      throw new Error('Não é possível excluir categorias padrão do sistema')
    }

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  },
}
