-- ================================================
-- Migration: Perfis Limit Constraint
-- Data: 2025-01-17
-- Descrição: Adiciona constraint de banco para limitar max 10 perfis por usuário
-- Previne race conditions que poderiam burlar a validação em código
-- ================================================

-- ================================================
-- 1. FUNÇÃO: check_perfis_limit
-- Verifica se usuário já tem 10 perfis ativos antes de permitir insert
-- ================================================
CREATE OR REPLACE FUNCTION check_perfis_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  perfis_count INTEGER;
BEGIN
  -- Conta perfis ativos do usuário (excluindo o que está sendo inserido)
  SELECT COUNT(*)
  INTO perfis_count
  FROM perfis
  WHERE usuario_id = NEW.usuario_id
    AND ativo = true;

  -- Se já tem 10 ou mais, bloqueia
  IF perfis_count >= 10 THEN
    RAISE EXCEPTION 'Limite máximo de 10 perfis por usuário atingido'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- ================================================
-- 2. TRIGGER: enforce_perfis_limit
-- Executa a verificação antes de cada INSERT
-- ================================================
DROP TRIGGER IF EXISTS enforce_perfis_limit ON perfis;
CREATE TRIGGER enforce_perfis_limit
  BEFORE INSERT ON perfis
  FOR EACH ROW
  EXECUTE FUNCTION check_perfis_limit();

-- ================================================
-- 3. COMENTÁRIOS
-- ================================================
COMMENT ON FUNCTION check_perfis_limit() IS 'Verifica limite de 10 perfis ativos por usuário';
COMMENT ON TRIGGER enforce_perfis_limit ON perfis IS 'Impede criação de mais de 10 perfis por usuário';
