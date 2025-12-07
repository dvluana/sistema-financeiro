-- Migration: Simplificar categorias padrão do sistema
-- Mantém apenas categorias essenciais, usuário pode criar mais se precisar

-- 1. Remover categorias padrão de ENTRADA que não são essenciais
-- Mantendo: Salário, Investimentos, Outros
DELETE FROM categorias
WHERE is_default = TRUE
  AND tipo = 'entrada'
  AND nome IN ('Freelance', 'Presente');

-- 2. Remover categorias padrão de SAÍDA que não são essenciais
-- Mantendo: Moradia, Alimentação, Transporte, Saúde, Lazer, Outros
DELETE FROM categorias
WHERE is_default = TRUE
  AND tipo = 'saida'
  AND nome IN ('Educação', 'Compras', 'Cartão de Crédito', 'Assinaturas', 'Pets');

-- 3. Reordenar categorias de entrada
UPDATE categorias SET ordem = 1 WHERE is_default = TRUE AND tipo = 'entrada' AND nome = 'Salário';
UPDATE categorias SET ordem = 2 WHERE is_default = TRUE AND tipo = 'entrada' AND nome = 'Investimentos';
UPDATE categorias SET ordem = 3 WHERE is_default = TRUE AND tipo = 'entrada' AND nome = 'Outros';

-- 4. Reordenar categorias de saída
UPDATE categorias SET ordem = 1 WHERE is_default = TRUE AND tipo = 'saida' AND nome = 'Moradia';
UPDATE categorias SET ordem = 2 WHERE is_default = TRUE AND tipo = 'saida' AND nome = 'Alimentação';
UPDATE categorias SET ordem = 3 WHERE is_default = TRUE AND tipo = 'saida' AND nome = 'Transporte';
UPDATE categorias SET ordem = 4 WHERE is_default = TRUE AND tipo = 'saida' AND nome = 'Saúde';
UPDATE categorias SET ordem = 5 WHERE is_default = TRUE AND tipo = 'saida' AND nome = 'Lazer';
UPDATE categorias SET ordem = 6 WHERE is_default = TRUE AND tipo = 'saida' AND nome = 'Outros';
