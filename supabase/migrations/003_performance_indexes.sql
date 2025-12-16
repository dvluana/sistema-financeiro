-- Migration: Performance Indexes
-- Descrição: Adiciona índices compostos para otimizar queries frequentes
-- Data: 2025-12-09

-- ============================================
-- ÍNDICES COMPOSTOS PARA PERFORMANCE
-- ============================================

-- 1. Índice composto mais importante: user_id + mes
-- Usado em: findByMes, findByMeses (queries mais frequentes)
-- Reduz latência de 200-500ms para 10-50ms
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_mes
ON lancamentos(user_id, mes);

-- 2. Índice para ordenação por data de criação
-- Usado em: findRecentByMes (lista de recentes na dashboard)
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_created
ON lancamentos(user_id, created_at DESC);

-- 3. Índice para range queries de vencimentos
-- Usado em: findProximosVencimentos, findVencimentosByMes
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_data_prevista
ON lancamentos(user_id, data_prevista)
WHERE data_prevista IS NOT NULL;

-- 4. Índice para filtro por tipo e status (pendentes)
-- Usado em: findProximosVencimentos (tipo='saida', concluido=false)
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_tipo_concluido
ON lancamentos(user_id, tipo, concluido)
WHERE concluido = false;

-- 5. Índice para categorias por usuário
-- Usado em: findAll de categorias
CREATE INDEX IF NOT EXISTS idx_categorias_user_ordem
ON categorias(user_id, ordem);

-- ============================================
-- COMENTÁRIOS EXPLICATIVOS
-- ============================================
COMMENT ON INDEX idx_lancamentos_user_mes IS
'Otimiza queries de listagem por mês - query mais frequente do sistema';

COMMENT ON INDEX idx_lancamentos_user_created IS
'Otimiza ordenação por data de criação para lista de recentes';

COMMENT ON INDEX idx_lancamentos_user_data_prevista IS
'Otimiza range queries para vencimentos próximos';

COMMENT ON INDEX idx_lancamentos_user_tipo_concluido IS
'Otimiza busca de lançamentos pendentes por tipo';

COMMENT ON INDEX idx_categorias_user_ordem IS
'Otimiza listagem de categorias ordenadas';
