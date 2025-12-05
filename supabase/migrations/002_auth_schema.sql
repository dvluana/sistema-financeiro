-- ============================================================================
-- Sistema Financeiro - Schema de Autenticação
-- ============================================================================
-- Adiciona suporte a múltiplos usuários com autenticação por email/senha.
-- Cada usuário tem seus próprios lançamentos e configurações.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELA: usuarios
-- ----------------------------------------------------------------------------

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

-- ----------------------------------------------------------------------------
-- ADICIONAR COLUNA user_id NAS TABELAS EXISTENTES
-- ----------------------------------------------------------------------------

-- Adiciona coluna user_id na tabela lancamentos
ALTER TABLE lancamentos
ADD COLUMN user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE;

-- Adiciona coluna user_id na tabela configuracoes
ALTER TABLE configuracoes
ADD COLUMN user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE;

-- Remove a constraint UNIQUE de chave para permitir configs por usuário
ALTER TABLE configuracoes DROP CONSTRAINT IF EXISTS configuracoes_chave_key;

-- Cria nova constraint única combinando user_id + chave
ALTER TABLE configuracoes
ADD CONSTRAINT configuracoes_user_chave_unique UNIQUE (user_id, chave);

-- Índices para busca por user_id
CREATE INDEX idx_lancamentos_user_id ON lancamentos(user_id);
CREATE INDEX idx_configuracoes_user_id ON configuracoes(user_id);

-- ----------------------------------------------------------------------------
-- TRIGGER: Atualização automática de updated_at para usuarios
-- ----------------------------------------------------------------------------

CREATE TRIGGER trigger_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- TABELA: sessoes (para gerenciar tokens de sessão)
-- ----------------------------------------------------------------------------

CREATE TABLE sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessoes_token ON sessoes(token);
CREATE INDEX idx_sessoes_user_id ON sessoes(user_id);
CREATE INDEX idx_sessoes_expires_at ON sessoes(expires_at);

-- ----------------------------------------------------------------------------
-- COMENTÁRIOS NAS TABELAS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE usuarios IS 'Usuários do sistema com autenticação por email/senha';
COMMENT ON COLUMN usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN usuarios.email IS 'Email único para login';
COMMENT ON COLUMN usuarios.senha_hash IS 'Hash bcrypt da senha';

COMMENT ON TABLE sessoes IS 'Sessões de login ativas';
COMMENT ON COLUMN sessoes.token IS 'Token único da sessão (enviado no header Authorization)';
COMMENT ON COLUMN sessoes.expires_at IS 'Data/hora de expiração da sessão';
