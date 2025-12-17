-- ============================================================================
-- Migration: Filhos Sem Status Concluído
-- ============================================================================
-- REGRA DE NEGÓCIO:
-- - Filhos de agrupadores NÃO têm toggle de pago/não pago
-- - Apenas o agrupador (pai) tem status concluído
-- - Quando agrupador.concluido = true, significa que todo o grupo foi pago
--
-- IMPLEMENTAÇÃO:
-- 1. Filhos sempre têm concluido = false (forçado no INSERT/UPDATE)
-- 2. Não permitir alterar concluido de filhos via UPDATE
-- 3. Apenas agrupadores (parent_id IS NULL) podem ter concluido = true
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Update existing children to have concluido = false
-- ============================================================================
-- Garante que todos os filhos existentes têm concluido = false
UPDATE lancamentos
SET concluido = false
WHERE parent_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Create trigger to enforce concluido = false for children
-- ============================================================================
-- Trigger que força concluido = false em INSERT e UPDATE de filhos
CREATE OR REPLACE FUNCTION force_filho_concluido_false()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem parent_id (é filho), forçar concluido = false
  IF NEW.parent_id IS NOT NULL THEN
    NEW.concluido = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_force_filho_concluido_false
  BEFORE INSERT OR UPDATE OF concluido, parent_id
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION force_filho_concluido_false();

COMMENT ON FUNCTION force_filho_concluido_false() IS
  'Força concluido = false para todos os filhos (parent_id IS NOT NULL). Apenas agrupadores têm controle de concluído.';

-- ============================================================================
-- STEP 3: Add check constraint for additional validation
-- ============================================================================
-- Constraint adicional: filhos DEVEM ter concluido = false
-- (redundante com trigger, mas fornece camada extra de segurança)
ALTER TABLE lancamentos
ADD CONSTRAINT chk_filho_concluido_false
CHECK (parent_id IS NULL OR concluido = false);

COMMENT ON CONSTRAINT chk_filho_concluido_false ON lancamentos IS
  'Garante que filhos (parent_id IS NOT NULL) sempre têm concluido = false';

-- ============================================================================
-- VALIDATION QUERIES (run after migration to verify correctness)
-- ============================================================================
-- Uncomment to validate data integrity after migration:

-- -- 1. Verify all children have concluido = false
-- SELECT COUNT(*) as count_violacoes
-- FROM lancamentos
-- WHERE parent_id IS NOT NULL AND concluido = true;
-- -- Expected: 0

-- -- 2. List all agrupadores with their concluido status
-- SELECT
--   id,
--   nome,
--   tipo,
--   is_agrupador,
--   concluido,
--   (SELECT COUNT(*) FROM lancamentos f WHERE f.parent_id = l.id) as num_filhos
-- FROM lancamentos l
-- WHERE is_agrupador = true;

COMMIT;

-- ============================================================================
-- BUSINESS LOGIC NOTES:
-- ============================================================================
-- RATIONALE: Por que filhos não têm status concluído?
--
-- 1. SIMPLICIDADE: Apenas 1 checkbox por agrupador (no pai) é mais simples
--    do que ter que marcar N checkboxes (1 para cada filho)
--
-- 2. SEMÂNTICA: Quando agrupador.concluido = true, significa "todo o grupo
--    foi pago/recebido". Não faz sentido pagar parcialmente um cartão.
--
-- 3. FUTURA EXTENSÃO: Se precisar controle granular (pagar filho por filho),
--    podemos remover este constraint e adicionar lógica de:
--    - agrupador.concluido = all(filhos.concluido)
--    Mas por ora, mantemos simples.
-- ============================================================================

-- ============================================================================
-- PERFORMANCE NOTES:
-- - Trigger adiciona overhead mínimo (~0.5ms por INSERT/UPDATE)
-- - Check constraint é validado em tempo de execução (sem overhead em queries)
-- - Ambos usam apenas operações em memória (nenhum lookup adicional)
-- ============================================================================
