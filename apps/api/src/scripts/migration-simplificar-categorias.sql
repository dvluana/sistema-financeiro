-- Migration: Remover categorias padrão do banco
-- As categorias padrão agora são definidas no código (constants/categorias-padrao.ts)
-- Isso garante que:
-- 1. Categorias padrão são consistentes e não podem ser corrompidas
-- 2. Cada usuário só tem suas próprias categorias no banco
-- 3. Atualizações de categorias padrão são via deploy, não via banco

-- 1. Primeiro, verificar se há lançamentos usando categorias padrão (is_default = true)
-- Se houver, eles terão categoria_id apontando para UUIDs antigos que serão deletados
-- Precisamos setar para NULL esses lançamentos antes

-- Atualiza lançamentos que usam categorias padrão para não ter categoria
-- (a UI mostrará as novas categorias padrão do código)
UPDATE lancamentos
SET categoria_id = NULL
WHERE categoria_id IN (
  SELECT id FROM categorias WHERE is_default = TRUE
);

-- 2. Remover TODAS as categorias padrão do banco
-- Elas agora vêm do código
DELETE FROM categorias WHERE is_default = TRUE;
