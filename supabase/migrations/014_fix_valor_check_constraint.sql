-- Migration: Fix valor check constraint for agrupadores
-- Permite valor=0 para agrupadores com valor_modo='soma'
-- Data: 2025-12-17

-- Remove a constraint antiga
ALTER TABLE lancamentos DROP CONSTRAINT IF EXISTS lancamentos_valor_check;

-- Adiciona nova constraint que permite valor=0 para agrupadores modo soma
ALTER TABLE lancamentos ADD CONSTRAINT lancamentos_valor_check
  CHECK (
    valor > 0
    OR (is_agrupador = true AND valor_modo = 'soma')
  );

-- Comentário explicativo
COMMENT ON CONSTRAINT lancamentos_valor_check ON lancamentos IS
  'Valor deve ser > 0, exceto para agrupadores modo soma que têm valor calculado';
