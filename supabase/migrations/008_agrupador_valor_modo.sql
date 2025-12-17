-- ============================================================================
-- Migration: Agrupador Valor Modo
-- ============================================================================
-- Adiciona campo valor_modo para controlar como o valor de um agrupador
-- é calculado/exibido.
--
-- REGRAS DE NEGÓCIO:
-- 1. valor_modo = 'soma' (default): valor exibido = SUM(filhos.valor)
--    - Usado para agrupadores onde filhos definem o total (ex: cartão de crédito)
--    - Campo valor do agrupador é ignorado/recalculado
--
-- 2. valor_modo = 'fixo': valor exibido = agrupador.valor
--    - Usado quando valor é pré-definido e filhos são apenas detalhamento
--    - Soma dos filhos não afeta o total exibido
--
-- EXEMPLO:
-- - Cartão Nubank (valor_modo='soma'): total = soma das compras filhas
-- - Projeto Freelance (valor_modo='fixo', valor=5000): filhos detalham trabalho,
--   mas o valor total do projeto é fixo
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create ENUM for valor_modo
-- ============================================================================
CREATE TYPE valor_modo_tipo AS ENUM ('soma', 'fixo');

COMMENT ON TYPE valor_modo_tipo IS
  'Define como o valor de um agrupador é calculado: soma dos filhos ou valor fixo';

-- ============================================================================
-- STEP 2: Add valor_modo column to lancamentos
-- ============================================================================
ALTER TABLE lancamentos
ADD COLUMN valor_modo valor_modo_tipo DEFAULT 'soma';

-- Constraint: apenas agrupadores podem ter valor_modo != 'soma'
-- Na prática, non-agrupadores sempre usam 'soma' (valor fixo deles mesmos)
COMMENT ON COLUMN lancamentos.valor_modo IS
  'Define como calcular valor exibido: "soma" = SUM(filhos.valor) | "fixo" = usar agrupador.valor. Apenas relevante quando is_agrupador=true';

-- ============================================================================
-- STEP 3: Set valor_modo to 'soma' for all existing agrupadores
-- ============================================================================
-- Migração de dados: agrupadores existentes passam a usar modo 'soma' (comportamento atual)
UPDATE lancamentos
SET valor_modo = 'soma'
WHERE is_agrupador = true;

-- ============================================================================
-- STEP 4: Create validation trigger - only agrupadores can have valor_modo='fixo'
-- ============================================================================
-- Validação: se is_agrupador=false, valor_modo DEVE ser 'soma' (não faz sentido ter 'fixo')
CREATE OR REPLACE FUNCTION validate_valor_modo_apenas_agrupador()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não é agrupador, valor_modo DEVE ser 'soma'
  IF NEW.is_agrupador = false AND NEW.valor_modo != 'soma' THEN
    RAISE EXCEPTION 'Only agrupadores (is_agrupador=true) can have valor_modo != "soma". Record id=% has is_agrupador=false but valor_modo=%',
      NEW.id, NEW.valor_modo
      USING HINT = 'Set valor_modo to "soma" for non-agrupador lancamentos';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_valor_modo_apenas_agrupador
  BEFORE INSERT OR UPDATE OF is_agrupador, valor_modo
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_valor_modo_apenas_agrupador();

COMMENT ON FUNCTION validate_valor_modo_apenas_agrupador() IS
  'Valida que apenas agrupadores (is_agrupador=true) podem ter valor_modo != "soma"';

-- ============================================================================
-- STEP 5: Add index for filtering by valor_modo (performance optimization)
-- ============================================================================
-- Partial index: apenas agrupadores com valor_modo='fixo' (minoria dos casos)
CREATE INDEX idx_lancamentos_agrupador_valor_fixo
ON lancamentos(id, valor_modo)
WHERE is_agrupador = true AND valor_modo = 'fixo';

COMMENT ON INDEX idx_lancamentos_agrupador_valor_fixo IS
  'Partial index para otimizar queries de agrupadores com valor_modo=fixo';

-- ============================================================================
-- STEP 6: Create helper function to calculate valor_calculado
-- ============================================================================
-- Function auxiliar para calcular o valor exibido de um agrupador baseado no modo
-- Retorna: valor calculado (DECIMAL)
CREATE OR REPLACE FUNCTION calcular_valor_agrupador(agrupador_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  agrupador_record RECORD;
  soma_filhos DECIMAL(12,2);
BEGIN
  -- Busca dados do agrupador
  SELECT valor, valor_modo, is_agrupador
  INTO agrupador_record
  FROM lancamentos
  WHERE id = agrupador_id;

  -- Se não encontrou ou não é agrupador, retorna 0
  IF NOT FOUND OR agrupador_record.is_agrupador = false THEN
    RETURN 0;
  END IF;

  -- Se modo = 'fixo', retorna valor do agrupador
  IF agrupador_record.valor_modo = 'fixo' THEN
    RETURN agrupador_record.valor;
  END IF;

  -- Se modo = 'soma', calcula soma dos filhos
  SELECT COALESCE(SUM(valor), 0)
  INTO soma_filhos
  FROM lancamentos
  WHERE parent_id = agrupador_id;

  RETURN soma_filhos;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_valor_agrupador(UUID) IS
  'Calcula o valor exibido de um agrupador baseado em seu valor_modo: "soma" retorna SUM(filhos), "fixo" retorna agrupador.valor';

-- ============================================================================
-- STEP 7: Create view for agrupadores com valor_calculado
-- ============================================================================
-- View útil para queries que precisam do valor calculado sem fazer JOIN manual
CREATE OR REPLACE VIEW v_lancamentos_com_valor_calculado AS
SELECT
  l.*,
  CASE
    WHEN l.is_agrupador = true THEN calcular_valor_agrupador(l.id)
    ELSE l.valor
  END AS valor_calculado
FROM lancamentos l;

COMMENT ON VIEW v_lancamentos_com_valor_calculado IS
  'View que adiciona coluna valor_calculado: para agrupadores usa calcular_valor_agrupador(), para não-agrupadores usa valor direto';

-- ============================================================================
-- VALIDATION QUERIES (run after migration to verify correctness)
-- ============================================================================
-- Uncomment to validate data integrity after migration:

-- -- 1. Verify all non-agrupadores have valor_modo='soma'
-- SELECT COUNT(*) as count_violacoes
-- FROM lancamentos
-- WHERE is_agrupador = false AND valor_modo != 'soma';
-- -- Expected: 0

-- -- 2. Test calcular_valor_agrupador function
-- SELECT
--   id,
--   nome,
--   valor_modo,
--   valor as valor_original,
--   calcular_valor_agrupador(id) as valor_calculado
-- FROM lancamentos
-- WHERE is_agrupador = true;
-- -- Expected: valor_calculado should match business logic

-- -- 3. Test view v_lancamentos_com_valor_calculado
-- SELECT id, nome, tipo, is_agrupador, valor, valor_calculado
-- FROM v_lancamentos_com_valor_calculado
-- WHERE is_agrupador = true
-- LIMIT 5;

COMMIT;

-- ============================================================================
-- PERFORMANCE NOTES:
-- - valor_modo column is small (1 byte per row due to ENUM)
-- - Partial index only covers agrupadores with valor_modo='fixo' (minimal storage)
-- - calcular_valor_agrupador() is STABLE (can be cached within transaction)
-- - View can be used for read operations without performance penalty
-- - For high-volume reads, consider materializing valor_calculado in application layer
-- ============================================================================

-- ============================================================================
-- USAGE EXAMPLES:
-- ============================================================================
-- -- Create agrupador with valor_modo='soma' (default - sum of children)
-- INSERT INTO lancamentos (tipo, nome, valor, mes, is_agrupador, valor_modo)
-- VALUES ('saida', 'Cartão Nubank', 0, '2025-01', true, 'soma');
--
-- -- Create agrupador with valor_modo='fixo' (fixed value, children are details)
-- INSERT INTO lancamentos (tipo, nome, valor, mes, is_agrupador, valor_modo)
-- VALUES ('entrada', 'Projeto Freelance', 5000, '2025-01', true, 'fixo');
--
-- -- Query with calculated value
-- SELECT * FROM v_lancamentos_com_valor_calculado WHERE is_agrupador = true;
-- ============================================================================
