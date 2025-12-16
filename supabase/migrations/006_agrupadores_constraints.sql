-- ============================================================================
-- Migration: Agrupadores Constraints - Data Integrity Fixes
-- ============================================================================
-- Adiciona validações críticas para garantir integridade referencial e
-- consistência de dados em lançamentos hierárquicos (agrupadores).
--
-- CRÍTICO: Esta migration corrige 3 problemas de integridade:
-- 1. Filho só pode ter parent_id apontando para tipo='agrupador'
-- 2. Filho deve ter mesmo mês (mes) que o pai agrupador
-- 3. Previne inconsistências e violações de regras de negócio
--
-- IMPACTO: Bloqueia inserções/updates inválidos via triggers BEFORE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIGGER: Validar que parent_id referencia um agrupador
-- ----------------------------------------------------------------------------
-- Problema: Atualmente um filho pode referenciar entrada/saida como parent
-- Solução: Trigger valida que parent.tipo = 'agrupador' ANTES de insert/update

CREATE OR REPLACE FUNCTION validate_parent_is_agrupador()
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

  -- Se parent não existe, FK constraint já vai falhar
  -- Mas se existe e não é agrupador, bloqueia
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent % does not exist', NEW.parent_id
      USING HINT = 'Ensure the parent_id references an existing record';
  END IF;

  IF parent_tipo != 'agrupador' THEN
    RAISE EXCEPTION 'Parent % is not an agrupador (tipo=%)', NEW.parent_id, parent_tipo
      USING HINT = 'Only lancamentos with tipo=agrupador can have children';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica o trigger em INSERT e UPDATE
CREATE TRIGGER trg_validate_parent_is_agrupador
  BEFORE INSERT OR UPDATE OF parent_id
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_parent_is_agrupador();

COMMENT ON FUNCTION validate_parent_is_agrupador() IS
  'Valida que parent_id sempre aponta para um lançamento com tipo=agrupador';

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: Validar que filho.mes = parent.mes
-- ----------------------------------------------------------------------------
-- Problema: Filho pode ter mês diferente do pai, quebrando lógica de negócio
-- Solução: Trigger valida consistência de mês ANTES de insert/update

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

  -- Se parent não existe, FK constraint já vai falhar
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

-- Aplica o trigger em INSERT e UPDATE
CREATE TRIGGER trg_validate_filho_mes_matches_parent
  BEFORE INSERT OR UPDATE OF parent_id, mes
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION validate_filho_mes_matches_parent();

COMMENT ON FUNCTION validate_filho_mes_matches_parent() IS
  'Valida que filho sempre tem mesmo mês (mes) que o parent agrupador';

-- ----------------------------------------------------------------------------
-- 3. Índice para otimizar validação de trigger (parent_id lookup)
-- ----------------------------------------------------------------------------
-- Nota: idx_lancamentos_parent_id já existe em 005_lancamentos_agrupados.sql
-- Mas é essencial para performance dos triggers acima

-- ----------------------------------------------------------------------------
-- 4. CONSTRAINT: Agrupador não pode mudar de mês se tiver filhos
-- ----------------------------------------------------------------------------
-- Adiciona proteção extra: se agrupador tem filhos, não pode mudar o mês
-- Isso evita deixar filhos órfãos com mês diferente

CREATE OR REPLACE FUNCTION prevent_agrupador_mes_change_with_filhos()
RETURNS TRIGGER AS $$
DECLARE
  filho_count INTEGER;
BEGIN
  -- Apenas valida se está mudando o campo 'mes'
  IF OLD.mes = NEW.mes THEN
    RETURN NEW;
  END IF;

  -- Apenas valida se é um agrupador
  IF NEW.tipo != 'agrupador' THEN
    RETURN NEW;
  END IF;

  -- Conta quantos filhos este agrupador tem
  SELECT COUNT(*) INTO filho_count
  FROM lancamentos
  WHERE parent_id = NEW.id;

  -- Se tem filhos, bloqueia mudança de mês
  IF filho_count > 0 THEN
    RAISE EXCEPTION 'Cannot change mes of agrupador % because it has % child(ren)',
      NEW.id, filho_count
      USING HINT = 'Delete or reassign children before changing the agrupador mes';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_agrupador_mes_change_with_filhos
  BEFORE UPDATE OF mes
  ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION prevent_agrupador_mes_change_with_filhos();

COMMENT ON FUNCTION prevent_agrupador_mes_change_with_filhos() IS
  'Previne mudança de mês em agrupador que já possui filhos';

-- ============================================================================
-- Validação de dados existentes (opcional - execute se necessário)
-- ============================================================================
-- Descomentar as queries abaixo para verificar se há dados inconsistentes:

-- -- 1. Verificar se há filhos com parent_id que não é agrupador
-- SELECT
--   f.id as filho_id,
--   f.nome as filho_nome,
--   f.parent_id,
--   p.tipo as parent_tipo
-- FROM lancamentos f
-- JOIN lancamentos p ON f.parent_id = p.id
-- WHERE f.parent_id IS NOT NULL
--   AND p.tipo != 'agrupador';
--
-- -- 2. Verificar se há filhos com mês diferente do pai
-- SELECT
--   f.id as filho_id,
--   f.nome as filho_nome,
--   f.mes as filho_mes,
--   f.parent_id,
--   p.mes as parent_mes
-- FROM lancamentos f
-- JOIN lancamentos p ON f.parent_id = p.id
-- WHERE f.parent_id IS NOT NULL
--   AND f.mes != p.mes;

-- ============================================================================
-- Notas de Performance:
-- - Os triggers usam índice idx_lancamentos_parent_id (criado em migration 005)
-- - Validações ocorrem apenas em INSERT/UPDATE, não afetam SELECT
-- - Queries de validação são simples lookups por PK (id) = O(1) com índice
-- - Impacto: ~1-2ms por inserção/update com parent_id
--
-- Notas de Segurança:
-- - Triggers são BEFORE, então bloqueiam transação inteira se inválido
-- - Mensagens de erro são descritivas para facilitar debugging
-- - RLS ainda se aplica (triggers rodam no contexto do usuário)
-- ============================================================================
