-- ================================================
-- Migration: Dashboard Optimizations
-- Data: 2025-01-17
-- Descrição: Funções SQL para agregação otimizada no dashboard
-- ================================================

-- ================================================
-- 1. FUNÇÃO: get_totais_por_mes
-- Retorna totais agregados por mês e tipo (entrada/saida)
-- Substitui agregação manual em JavaScript
-- ================================================
CREATE OR REPLACE FUNCTION get_totais_por_mes(
  p_perfil_id UUID,
  p_meses TEXT[]
)
RETURNS TABLE (
  mes TEXT,
  tipo tipo_lancamento,
  total NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    l.mes,
    l.tipo,
    COALESCE(SUM(l.valor), 0) as total
  FROM lancamentos l
  WHERE l.perfil_id = p_perfil_id
    AND l.mes = ANY(p_meses)
    AND l.parent_id IS NULL  -- Exclui filhos de agrupadores (valor já está no pai)
  GROUP BY l.mes, l.tipo
  ORDER BY l.mes;
$$;

-- ================================================
-- 2. FUNÇÃO: get_gastos_por_categoria
-- Retorna gastos agregados por categoria
-- Substitui agregação manual em JavaScript
-- ================================================
CREATE OR REPLACE FUNCTION get_gastos_por_categoria(
  p_perfil_id UUID,
  p_meses TEXT[]
)
RETURNS TABLE (
  categoria_id UUID,
  categoria_nome TEXT,
  categoria_icone TEXT,
  categoria_cor TEXT,
  total NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    l.categoria_id,
    COALESCE(c.nome, 'Sem categoria') as categoria_nome,
    c.icone as categoria_icone,
    COALESCE(c.cor, '#6B7280') as categoria_cor,
    COALESCE(SUM(l.valor), 0) as total
  FROM lancamentos l
  LEFT JOIN categorias c ON c.id = l.categoria_id
  WHERE l.perfil_id = p_perfil_id
    AND l.mes = ANY(p_meses)
    AND l.tipo = 'saida'
    AND l.parent_id IS NULL  -- Exclui filhos de agrupadores
  GROUP BY l.categoria_id, c.nome, c.icone, c.cor
  ORDER BY total DESC;
$$;

-- ================================================
-- 3. FUNÇÃO: get_dashboard_totais
-- Retorna totais consolidados para um mês específico
-- Inclui: total entradas, total saídas, pendentes entrada, pendentes saída
-- ================================================
CREATE OR REPLACE FUNCTION get_dashboard_totais(
  p_perfil_id UUID,
  p_mes TEXT
)
RETURNS TABLE (
  total_entradas NUMERIC,
  total_saidas NUMERIC,
  entradas_concluidas NUMERIC,
  saidas_concluidas NUMERIC,
  pendentes_entrada INTEGER,
  pendentes_saida INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as total_entradas,
    COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as total_saidas,
    COALESCE(SUM(CASE WHEN tipo = 'entrada' AND concluido = true THEN valor ELSE 0 END), 0) as entradas_concluidas,
    COALESCE(SUM(CASE WHEN tipo = 'saida' AND concluido = true THEN valor ELSE 0 END), 0) as saidas_concluidas,
    COALESCE(COUNT(CASE WHEN tipo = 'entrada' AND concluido = false THEN 1 END)::INTEGER, 0) as pendentes_entrada,
    COALESCE(COUNT(CASE WHEN tipo = 'saida' AND concluido = false THEN 1 END)::INTEGER, 0) as pendentes_saida
  FROM lancamentos
  WHERE perfil_id = p_perfil_id
    AND mes = p_mes
    AND parent_id IS NULL;  -- Exclui filhos de agrupadores
$$;

-- ================================================
-- 4. ÍNDICE ADICIONAL para performance de agregação
-- ================================================
CREATE INDEX IF NOT EXISTS idx_lancamentos_perfil_mes_tipo
ON lancamentos(perfil_id, mes, tipo)
WHERE parent_id IS NULL;

-- ================================================
-- 5. GRANT: Permitir execução das funções
-- ================================================
GRANT EXECUTE ON FUNCTION get_totais_por_mes(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_totais_por_mes(UUID, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION get_gastos_por_categoria(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gastos_por_categoria(UUID, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_totais(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_totais(UUID, TEXT) TO anon;
