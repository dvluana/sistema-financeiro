-- ============================================================================
-- Migration: Fix Agrupador Architecture
-- ============================================================================
-- ARCHITECTURAL FIX: Agrupador is NOT a separate tipo - it's a property!
--
-- WRONG (before):
--   tipo: 'entrada' | 'saida' | 'agrupador'
--
-- CORRECT (after):
--   tipo: 'entrada' | 'saida'  (only two types)
--   is_agrupador: boolean      (property/flag)
--
-- RATIONALE:
-- - An "entrada" can be grouped (e.g., multiple income sources)
-- - A "saida" can be grouped (e.g., credit card bill grouping purchases)
-- - Children must have the same tipo as their parent
-- - Only records with is_agrupador=true can have children
--
-- EXAMPLE USE CASES:
-- 1. "Cartão Nubank" = tipo:'saida', is_agrupador:true → children are tipo:'saida'
-- 2. "Renda Freelance" = tipo:'entrada', is_agrupador:true → children are tipo:'entrada'
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add is_agrupador column
-- ============================================================================
-- Add the new boolean column with a sensible default
ALTER TABLE lancamentos
ADD COLUMN IF NOT EXISTS is_agrupador BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN lancamentos.is_agrupador IS
  'Indica se este lançamento é um agrupador (pode ter filhos). Agrupadores podem ser entrada ou saida.';

-- ============================================================================
-- STEP 2: Migrate existing data (if tipo='agrupador' exists)
-- ============================================================================
-- Convert existing 'agrupador' records to 'saida' + is_agrupador=true
-- Assumption: Most agrupadores are for credit cards = saida
-- If you have entrada agrupadores, they need manual review/fix
UPDATE lancamentos
SET
  tipo = 'saida',
  is_agrupador = true
WHERE tipo = 'agrupador';

-- ============================================================================
-- STEP 3: Drop old triggers and functions that reference tipo='agrupador'
-- ============================================================================
-- These were created in migration 006 and validate tipo='agrupador'
DROP TRIGGER IF EXISTS trg_validate_parent_is_agrupador ON lancamentos;
DROP FUNCTION IF EXISTS validate_parent_is_agrupador();

DROP TRIGGER IF EXISTS trg_prevent_agrupador_mes_change_with_filhos ON lancamentos;
DROP FUNCTION IF EXISTS prevent_agrupador_mes_change_with_filhos();

-- ============================================================================
-- STEP 4: Drop old constraints that reference tipo='agrupador'
-- ============================================================================
-- These were created in migration 005
ALTER TABLE lancamentos DROP CONSTRAINT IF EXISTS chk_agrupador_sem_pai;
ALTER TABLE lancamentos DROP CONSTRAINT IF EXISTS chk_filho_nao_agrupador;

-- ============================================================================
-- STEP 5: Remove 'agrupador' from ENUM (PostgreSQL doesn't support direct removal)
-- ============================================================================
-- PostgreSQL doesn't allow removing enum values, so we need to:
-- 1. Create new enum without 'agrupador'
-- 2. Alter column to use new enum
-- 3. Drop old enum

-- Create new enum
CREATE TYPE tipo_lancamento_new AS ENUM ('entrada', 'saida');

-- Update column to use new enum (this is safe because we migrated data in STEP 2)
ALTER TABLE lancamentos
ALTER COLUMN tipo TYPE tipo_lancamento_new
USING tipo::text::tipo_lancamento_new;

-- Drop old enum and rename new one
DROP TYPE tipo_lancamento;
ALTER TYPE tipo_lancamento_new RENAME TO tipo_lancamento;

-- ============================================================================
-- STEP 6: Add new constraints with correct logic
-- ============================================================================

-- Constraint 1: Only is_agrupador=true can have children
-- (Children records must have parent_id pointing to an agrupador)
ALTER TABLE lancamentos
ADD CONSTRAINT chk_only_agrupador_has_children
CHECK (
  parent_id IS NULL
  OR
  (
    SELECT is_agrupador
    FROM lancamentos parent
    WHERE parent.id = parent_id
  ) = true
);

-- Constraint 2: Agrupador with children cannot be turned into non-agrupador
-- This is handled by trigger below (constraint would be too complex)

-- Constraint 3: Children cannot be agrupadores (only 1 level nesting)
ALTER TABLE lancamentos
ADD CONSTRAINT chk_filho_nao_agrupador
CHECK (parent_id IS NULL OR is_agrupador = false);

COMMENT ON CONSTRAINT chk_filho_nao_agrupador ON lancamentos IS
  'Previne que filhos sejam agrupadores (apenas 1 nível de hierarquia)';

-- ============================================================================
-- STEP 7: Create new triggers with correct validation logic
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRIGGER 1: Validate that parent is an agrupador (is_agrupador=true)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_parent_is_agrupador()
RETURNS TRIGGER AS $$
DECLARE
  parent_is_agrupador BOOLEAN;
BEGIN
  -- Se não tem parent_id, não há o que validar (lançamento raiz)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca is_agrupador do parent
  SELECT is_agrupador INTO parent_is_agrupador
  FROM lancamentos
  WHERE id = NEW.parent_id;

  -- Se parent não existe, FK constraint vai falhar
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent % does not exist', NEW.parent_id
      USING HINT = 'Ensure the parent_id references an existing record';
  END IF;

  -- Valida que parent é agrupador
  IF parent_is_agrupador = false THEN
    RAISE EXCEPTION 'Parent % is not an agrupador (is_agrupador=false)', NEW.parent_id
      USING HINT = 'Only lancamentos with is_agrupador=true can have children';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_parent_is_agrupador
  BEFORE INSERT OR UPDATE OF parent_id
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_parent_is_agrupador();

COMMENT ON FUNCTION validate_parent_is_agrupador() IS
  'Valida que parent_id sempre aponta para um lançamento com is_agrupador=true';

-- ----------------------------------------------------------------------------
-- TRIGGER 2: Validate that child has same tipo as parent
-- ----------------------------------------------------------------------------
-- NEW VALIDATION: Children must inherit parent's tipo
CREATE OR REPLACE FUNCTION validate_filho_tipo_matches_parent()
RETURNS TRIGGER AS $$
DECLARE
  parent_tipo tipo_lancamento;
BEGIN
  -- Se não tem parent_id, não há o que validar (lançamento raiz)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca tipo do parent
  SELECT tipo INTO parent_tipo
  FROM lancamentos
  WHERE id = NEW.parent_id;

  -- Se parent não existe, FK constraint vai falhar
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent % does not exist', NEW.parent_id
      USING HINT = 'Ensure the parent_id references an existing record';
  END IF;

  -- Valida se tipo do filho é igual ao tipo do pai
  IF NEW.tipo != parent_tipo THEN
    RAISE EXCEPTION 'Child tipo (%) must match parent tipo (%)', NEW.tipo, parent_tipo
      USING HINT = 'A child lancamento must have the same tipo as its parent agrupador';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_filho_tipo_matches_parent
  BEFORE INSERT OR UPDATE OF parent_id, tipo
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_filho_tipo_matches_parent();

COMMENT ON FUNCTION validate_filho_tipo_matches_parent() IS
  'Valida que filho sempre tem mesmo tipo (entrada/saida) que o parent agrupador';

-- ----------------------------------------------------------------------------
-- TRIGGER 3: Validate that child has same mes as parent
-- ----------------------------------------------------------------------------
-- Keep existing mes validation from migration 006
CREATE OR REPLACE FUNCTION validate_filho_mes_matches_parent()
RETURNS TRIGGER AS $$
DECLARE
  parent_mes VARCHAR(7);
BEGIN
  -- Se não tem parent_id, não há o que validar (lançamento raiz)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca mês do parent
  SELECT mes INTO parent_mes
  FROM lancamentos
  WHERE id = NEW.parent_id;

  -- Se parent não existe, FK constraint vai falhar
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent % does not exist', NEW.parent_id
      USING HINT = 'Ensure the parent_id references an existing record';
  END IF;

  -- Valida se mês do filho é igual ao mês do pai
  IF NEW.mes != parent_mes THEN
    RAISE EXCEPTION 'Child mes (%) must match parent mes (%)', NEW.mes, parent_mes
      USING HINT = 'A child lancamento must belong to the same month as its parent agrupador';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_filho_mes_matches_parent
  BEFORE INSERT OR UPDATE OF parent_id, mes
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_filho_mes_matches_parent();

COMMENT ON FUNCTION validate_filho_mes_matches_parent() IS
  'Valida que filho sempre tem mesmo mês (mes) que o parent agrupador';

-- ----------------------------------------------------------------------------
-- TRIGGER 4: Prevent changing is_agrupador or mes on agrupador with children
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_agrupador_changes_with_filhos()
RETURNS TRIGGER AS $$
DECLARE
  filho_count INTEGER;
BEGIN
  -- Only check if is_agrupador or mes is being changed
  IF (OLD.is_agrupador = NEW.is_agrupador) AND (OLD.mes = NEW.mes) THEN
    RETURN NEW;
  END IF;

  -- Count children
  SELECT COUNT(*) INTO filho_count
  FROM lancamentos
  WHERE parent_id = NEW.id;

  -- If has children, prevent changes
  IF filho_count > 0 THEN
    -- Changing is_agrupador
    IF OLD.is_agrupador != NEW.is_agrupador THEN
      RAISE EXCEPTION 'Cannot change is_agrupador of lancamento % because it has % child(ren)',
        NEW.id, filho_count
        USING HINT = 'Delete or reassign children before changing is_agrupador';
    END IF;

    -- Changing mes
    IF OLD.mes != NEW.mes THEN
      RAISE EXCEPTION 'Cannot change mes of agrupador % because it has % child(ren)',
        NEW.id, filho_count
        USING HINT = 'Delete or reassign children before changing the agrupador mes';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_agrupador_changes_with_filhos
  BEFORE UPDATE OF is_agrupador, mes
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION prevent_agrupador_changes_with_filhos();

COMMENT ON FUNCTION prevent_agrupador_changes_with_filhos() IS
  'Previne mudança de is_agrupador ou mes em lancamento que já possui filhos';

-- ============================================================================
-- STEP 8: Create index on is_agrupador for query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lancamentos_is_agrupador
ON lancamentos(is_agrupador)
WHERE is_agrupador = true;

COMMENT ON INDEX idx_lancamentos_is_agrupador IS
  'Partial index para otimizar queries que buscam agrupadores (is_agrupador=true)';

-- ============================================================================
-- STEP 9: Update RLS policies if they reference tipo='agrupador'
-- ============================================================================
-- Note: RLS policies typically don't need changes as they filter by user_id
-- But if you have policies that specifically check tipo='agrupador', update them here

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES (run after migration to verify correctness)
-- ============================================================================
-- Uncomment to validate data integrity after migration:

-- -- 1. Check if all children have is_agrupador=false
-- SELECT COUNT(*) as count_violacoes
-- FROM lancamentos
-- WHERE parent_id IS NOT NULL AND is_agrupador = true;
-- -- Expected: 0

-- -- 2. Check if all children have same tipo as parent
-- SELECT
--   f.id as filho_id,
--   f.tipo as filho_tipo,
--   p.tipo as parent_tipo
-- FROM lancamentos f
-- JOIN lancamentos p ON f.parent_id = p.id
-- WHERE f.parent_id IS NOT NULL
--   AND f.tipo != p.tipo;
-- -- Expected: empty result

-- -- 3. Check if all children have same mes as parent
-- SELECT
--   f.id as filho_id,
--   f.mes as filho_mes,
--   p.mes as parent_mes
-- FROM lancamentos f
-- JOIN lancamentos p ON f.parent_id = p.id
-- WHERE f.parent_id IS NOT NULL
--   AND f.mes != p.mes;
-- -- Expected: empty result

-- -- 4. Check if all parents have is_agrupador=true
-- SELECT
--   p.id as parent_id,
--   p.nome,
--   p.is_agrupador,
--   COUNT(f.id) as children_count
-- FROM lancamentos p
-- JOIN lancamentos f ON f.parent_id = p.id
-- WHERE p.is_agrupador = false
-- GROUP BY p.id, p.nome, p.is_agrupador;
-- -- Expected: empty result

-- ============================================================================
-- ROLLBACK PLAN (if needed - run these commands manually)
-- ============================================================================
-- If you need to rollback this migration:
--
-- 1. Re-add 'agrupador' to enum:
--    ALTER TYPE tipo_lancamento ADD VALUE 'agrupador';
--
-- 2. Convert is_agrupador back to tipo:
--    UPDATE lancamentos SET tipo = 'agrupador' WHERE is_agrupador = true;
--
-- 3. Drop new triggers and restore old ones from migrations 005 and 006
--
-- 4. Drop is_agrupador column:
--    ALTER TABLE lancamentos DROP COLUMN is_agrupador;
--
-- ============================================================================
-- PERFORMANCE NOTES:
-- - is_agrupador column is small (1 byte per row)
-- - Partial index only indexes rows where is_agrupador=true (minimal storage)
-- - Triggers add ~1-2ms overhead per INSERT/UPDATE with parent_id
-- - All validations use indexed lookups (id, parent_id)
-- ============================================================================
