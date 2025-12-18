-- ============================================================================
-- Migration: Adicionar recorrencia_id para vincular lançamentos recorrentes
-- ============================================================================
-- Permite edição e exclusão em lote de lançamentos de uma mesma série recorrente.
-- Lançamentos antigos terão recorrencia_id = NULL (comportamento legado mantido).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADICIONAR COLUNA recorrencia_id
-- ----------------------------------------------------------------------------

ALTER TABLE lancamentos
ADD COLUMN recorrencia_id UUID DEFAULT NULL;

COMMENT ON COLUMN lancamentos.recorrencia_id IS
  'UUID compartilhado entre lançamentos da mesma série recorrente. NULL = lançamento avulso ou legado';

-- ----------------------------------------------------------------------------
-- 2. ÍNDICES PARA PERFORMANCE
-- ----------------------------------------------------------------------------

-- Índice para busca por recorrência (usado nas operações em lote)
CREATE INDEX idx_lancamentos_recorrencia_id
ON lancamentos(recorrencia_id)
WHERE recorrencia_id IS NOT NULL;

-- Índice composto para buscar série de um perfil (query mais comum)
CREATE INDEX idx_lancamentos_recorrencia_perfil_mes
ON lancamentos(recorrencia_id, perfil_id, mes)
WHERE recorrencia_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. VERIFICAÇÃO
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Verifica se a coluna foi criada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lancamentos' AND column_name = 'recorrencia_id'
  ) THEN
    RAISE EXCEPTION 'Coluna recorrencia_id não foi criada corretamente';
  END IF;

  RAISE NOTICE 'Migration 013_recorrencia_id executada com sucesso';
END $$;
