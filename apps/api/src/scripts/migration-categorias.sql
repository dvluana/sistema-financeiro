-- Migration: Adicionar sistema de categorias
-- Execute no Supabase SQL Editor

-- 1. Criar tabela de categorias
-- NOTA: user_id referencia a tabela customizada 'usuarios', não 'auth.users'
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) NOT NULL,
  tipo tipo_lancamento NOT NULL, -- 'entrada' ou 'saida'
  icone VARCHAR(50), -- nome do ícone (lucide)
  cor VARCHAR(7), -- cor hex (ex: #FF385C)
  ordem INT DEFAULT 0, -- para ordenação
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE, -- categorias padrão do sistema
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para categorias
CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);

-- 3. Adicionar coluna categoria_id na tabela lancamentos
ALTER TABLE lancamentos
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL;

-- 4. Índice para categoria_id em lancamentos
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria_id ON lancamentos(categoria_id);

-- 5. Trigger para updated_at em categorias
CREATE TRIGGER trigger_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- NOTA: RLS não é usado porque o sistema usa autenticação customizada via tabela 'usuarios'
-- A segurança é feita via validação na API (categoria.repository.ts filtra por user_id)

-- 6. Inserir categorias padrão do sistema

-- Categorias de Entrada
INSERT INTO categorias (nome, tipo, icone, cor, ordem, is_default) VALUES
  ('Salário', 'entrada', 'Wallet', '#22C55E', 1, TRUE),
  ('Freelance', 'entrada', 'Laptop', '#3B82F6', 2, TRUE),
  ('Investimentos', 'entrada', 'TrendingUp', '#8B5CF6', 3, TRUE),
  ('Presente', 'entrada', 'Gift', '#EC4899', 4, TRUE),
  ('Outros', 'entrada', 'CircleDollarSign', '#6B7280', 5, TRUE)
ON CONFLICT DO NOTHING;

-- Categorias de Saída
INSERT INTO categorias (nome, tipo, icone, cor, ordem, is_default) VALUES
  ('Moradia', 'saida', 'Home', '#EF4444', 1, TRUE),
  ('Alimentação', 'saida', 'Utensils', '#F97316', 2, TRUE),
  ('Transporte', 'saida', 'Car', '#EAB308', 3, TRUE),
  ('Saúde', 'saida', 'Heart', '#EC4899', 4, TRUE),
  ('Educação', 'saida', 'GraduationCap', '#8B5CF6', 5, TRUE),
  ('Lazer', 'saida', 'Gamepad2', '#06B6D4', 6, TRUE),
  ('Compras', 'saida', 'ShoppingBag', '#F43F5E', 7, TRUE),
  ('Cartão de Crédito', 'saida', 'CreditCard', '#6366F1', 8, TRUE),
  ('Assinaturas', 'saida', 'Repeat', '#14B8A6', 9, TRUE),
  ('Pets', 'saida', 'PawPrint', '#A855F7', 10, TRUE),
  ('Outros', 'saida', 'CircleDollarSign', '#6B7280', 11, TRUE)
ON CONFLICT DO NOTHING;
