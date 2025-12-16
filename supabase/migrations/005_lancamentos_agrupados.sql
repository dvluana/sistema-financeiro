-- ============================================================================
-- Migration: Lançamentos Agrupados (Cartões e Grupos)
-- ============================================================================
-- Adiciona suporte a lançamentos hierárquicos onde um "agrupador" pode conter
-- lançamentos filhos. Útil para:
-- - Cartões de crédito (fatura é o pai, compras são filhos)
-- - Grupos de gastos (ex: "Gastos Não Previstos" com sub-itens)
--
-- Regra de negócio: Apenas lançamentos raiz (parent_id IS NULL) contam no saldo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Adicionar novo tipo ao ENUM
-- ----------------------------------------------------------------------------
ALTER TYPE tipo_lancamento ADD VALUE 'agrupador';

-- ----------------------------------------------------------------------------
-- 2. Adicionar coluna parent_id (auto-referência)
-- ----------------------------------------------------------------------------
ALTER TABLE lancamentos
ADD COLUMN parent_id UUID REFERENCES lancamentos(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 3. Índice para queries de filhos (performance)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_lancamentos_parent_id ON lancamentos(parent_id);

-- Índice composto para buscar filhos de um usuário
CREATE INDEX idx_lancamentos_parent_user ON lancamentos(parent_id, user_id);

-- ----------------------------------------------------------------------------
-- 4. Constraints de integridade
-- ----------------------------------------------------------------------------

-- Agrupador não pode ter parent_id (agrupadores são sempre raiz)
ALTER TABLE lancamentos
ADD CONSTRAINT chk_agrupador_sem_pai
CHECK (tipo != 'agrupador' OR parent_id IS NULL);

-- Filhos não podem ser agrupadores (apenas 1 nível de aninhamento)
ALTER TABLE lancamentos
ADD CONSTRAINT chk_filho_nao_agrupador
CHECK (parent_id IS NULL OR tipo != 'agrupador');

-- ----------------------------------------------------------------------------
-- 5. Comentários (documentação)
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN lancamentos.parent_id IS 'ID do lançamento pai (para agrupadores). NULL = lançamento raiz';

-- ============================================================================
-- Notas de uso:
-- - Para listar apenas raiz: WHERE parent_id IS NULL
-- - Para listar filhos: WHERE parent_id = :id
-- - Agrupadores contam como saída no cálculo de saldo
-- - Filhos NÃO contam no saldo (são detalhamento do pai)
-- ============================================================================
