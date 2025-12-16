-- ============================================================================
-- Migration: Sistema de Perfis/Workspaces
-- ============================================================================
-- Permite que cada usuário tenha múltiplos perfis (ex: Pessoal, Empresa).
-- Cada perfil isola seus próprios lançamentos, categorias e configurações.
--
-- IMPORTANTE: Esta migration migra dados existentes para o perfil padrão.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1: CRIAR TABELA PERFIS
-- ----------------------------------------------------------------------------

CREATE TABLE perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#6366F1',
  icone VARCHAR(50) DEFAULT 'User',
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  is_perfil_padrao BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_perfis_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0),
  CONSTRAINT chk_perfis_cor_hex_format CHECK (cor ~* '^#[0-9A-F]{6}$')
);

-- Indices
CREATE INDEX idx_perfis_usuario_id ON perfis(usuario_id);
CREATE INDEX idx_perfis_usuario_ativo ON perfis(usuario_id, ativo) WHERE ativo = TRUE;
CREATE UNIQUE INDEX idx_perfis_usuario_unico_padrao ON perfis(usuario_id) WHERE is_perfil_padrao = TRUE;

-- Trigger updated_at
CREATE TRIGGER trigger_perfis_updated_at
  BEFORE UPDATE ON perfis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comentarios
COMMENT ON TABLE perfis IS 'Perfis/Workspaces que isolam dados financeiros de um usuario';
COMMENT ON COLUMN perfis.nome IS 'Nome do perfil (ex: Pessoal, Empresa, Familia)';
COMMENT ON COLUMN perfis.is_perfil_padrao IS 'Se TRUE, e o perfil criado automaticamente no cadastro';

-- ----------------------------------------------------------------------------
-- PARTE 2: CRIAR PERFIL PADRAO PARA USUARIOS EXISTENTES
-- ----------------------------------------------------------------------------

INSERT INTO perfis (nome, descricao, cor, icone, usuario_id, is_perfil_padrao, ativo)
SELECT
  u.nome AS nome,
  'Perfil padrao criado automaticamente' AS descricao,
  '#6366F1' AS cor,
  'User' AS icone,
  u.id AS usuario_id,
  TRUE AS is_perfil_padrao,
  TRUE AS ativo
FROM usuarios u;

-- Verificar que todos os usuarios tem perfil padrao
DO $$
DECLARE
  usuarios_count INTEGER;
  perfis_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO usuarios_count FROM usuarios;
  SELECT COUNT(*) INTO perfis_count FROM perfis WHERE is_perfil_padrao = TRUE;

  IF usuarios_count != perfis_count THEN
    RAISE EXCEPTION 'ERRO: Nem todos os usuarios tem perfil padrao! Usuarios: %, Perfis: %',
      usuarios_count, perfis_count;
  END IF;

  RAISE NOTICE 'Sucesso: % perfis padrao criados para % usuarios', perfis_count, usuarios_count;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 3: ADICIONAR perfil_id NAS TABELAS
-- ----------------------------------------------------------------------------

-- Adicionar colunas (ainda permitindo NULL temporariamente)
ALTER TABLE lancamentos ADD COLUMN perfil_id UUID REFERENCES perfis(id) ON DELETE CASCADE;
ALTER TABLE configuracoes ADD COLUMN perfil_id UUID REFERENCES perfis(id) ON DELETE CASCADE;

-- Verificar se tabela categorias existe antes de adicionar coluna
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias') THEN
    ALTER TABLE categorias ADD COLUMN IF NOT EXISTS perfil_id UUID REFERENCES perfis(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 4: MIGRAR DADOS EXISTENTES PARA O PERFIL PADRAO
-- ----------------------------------------------------------------------------

-- Migrar lancamentos
UPDATE lancamentos l
SET perfil_id = p.id
FROM perfis p
WHERE l.user_id = p.usuario_id
  AND p.is_perfil_padrao = TRUE
  AND l.perfil_id IS NULL;

-- Migrar configuracoes
UPDATE configuracoes cfg
SET perfil_id = p.id
FROM perfis p
WHERE cfg.user_id = p.usuario_id
  AND p.is_perfil_padrao = TRUE
  AND cfg.perfil_id IS NULL;

-- Migrar categorias customizadas (se existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias') THEN
    UPDATE categorias c
    SET perfil_id = p.id
    FROM perfis p
    WHERE c.user_id = p.usuario_id
      AND p.is_perfil_padrao = TRUE
      AND c.perfil_id IS NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 5: VALIDAR MIGRACAO DE DADOS
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  lancamentos_nulos INTEGER;
  configs_nulas INTEGER;
BEGIN
  SELECT COUNT(*) INTO lancamentos_nulos FROM lancamentos WHERE perfil_id IS NULL;
  SELECT COUNT(*) INTO configs_nulas FROM configuracoes WHERE perfil_id IS NULL;

  IF lancamentos_nulos > 0 OR configs_nulas > 0 THEN
    RAISE EXCEPTION 'ERRO na migracao! Lancamentos sem perfil: %, Configs sem perfil: %',
      lancamentos_nulos, configs_nulas;
  END IF;

  RAISE NOTICE 'Migracao de dados concluida com sucesso!';
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 6: TORNAR perfil_id OBRIGATORIO
-- ----------------------------------------------------------------------------

ALTER TABLE lancamentos ALTER COLUMN perfil_id SET NOT NULL;
ALTER TABLE configuracoes ALTER COLUMN perfil_id SET NOT NULL;

-- Para categorias, so se a tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias') THEN
    -- Verificar se todas as categorias customizadas tem perfil_id
    DECLARE
      cats_sem_perfil INTEGER;
    BEGIN
      SELECT COUNT(*) INTO cats_sem_perfil FROM categorias WHERE perfil_id IS NULL AND user_id IS NOT NULL;
      IF cats_sem_perfil = 0 THEN
        ALTER TABLE categorias ALTER COLUMN perfil_id SET NOT NULL;
      END IF;
    END;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 7: AJUSTAR CONSTRAINTS UNICAS
-- ----------------------------------------------------------------------------

-- Configuracoes: unique por (perfil_id, chave)
ALTER TABLE configuracoes DROP CONSTRAINT IF EXISTS configuracoes_user_chave_unique;
ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_perfil_chave_unique UNIQUE (perfil_id, chave);

-- Categorias: unique por (perfil_id, nome, tipo) se tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias') THEN
    BEGIN
      ALTER TABLE categorias ADD CONSTRAINT categorias_perfil_nome_tipo_unique UNIQUE (perfil_id, nome, tipo);
    EXCEPTION
      WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 8: RECRIAR INDICES OTIMIZADOS
-- ----------------------------------------------------------------------------

-- LANCAMENTOS: indices por perfil
DROP INDEX IF EXISTS idx_lancamentos_user_mes;
DROP INDEX IF EXISTS idx_lancamentos_user_created;
DROP INDEX IF EXISTS idx_lancamentos_user_data_prevista;
DROP INDEX IF EXISTS idx_lancamentos_user_tipo_concluido;
DROP INDEX IF EXISTS idx_lancamentos_parent_user;

CREATE INDEX idx_lancamentos_perfil_mes ON lancamentos(perfil_id, mes);
CREATE INDEX idx_lancamentos_perfil_created ON lancamentos(perfil_id, created_at DESC);
CREATE INDEX idx_lancamentos_perfil_data_prevista ON lancamentos(perfil_id, data_prevista) WHERE data_prevista IS NOT NULL;
CREATE INDEX idx_lancamentos_perfil_tipo_concluido ON lancamentos(perfil_id, tipo, concluido) WHERE concluido = false;
CREATE INDEX idx_lancamentos_perfil_parent ON lancamentos(perfil_id, parent_id);

-- Indice adicional para queries por user_id (admin, relatorios globais)
CREATE INDEX idx_lancamentos_user_perfil ON lancamentos(user_id, perfil_id);

-- CATEGORIAS: indices por perfil (se tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias') THEN
    DROP INDEX IF EXISTS idx_categorias_user_ordem;
    CREATE INDEX idx_categorias_perfil_ordem ON categorias(perfil_id, ordem);
    CREATE INDEX idx_categorias_user_perfil ON categorias(user_id, perfil_id);
  END IF;
END $$;

-- CONFIGURACOES: indice por perfil
CREATE INDEX idx_configuracoes_perfil_id ON configuracoes(perfil_id);

-- ----------------------------------------------------------------------------
-- PARTE 9: FUNCAO E TRIGGER PARA CRIAR PERFIL PADRAO EM NOVOS USUARIOS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION criar_perfil_padrao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis (nome, descricao, cor, icone, usuario_id, is_perfil_padrao, ativo)
  VALUES (
    NEW.nome,
    'Perfil padrao criado automaticamente',
    '#6366F1',
    'User',
    NEW.id,
    TRUE,
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_perfil_padrao
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION criar_perfil_padrao();

COMMENT ON FUNCTION criar_perfil_padrao() IS 'Cria automaticamente um perfil padrao quando um novo usuario e cadastrado';

-- ----------------------------------------------------------------------------
-- PARTE 10: FUNCAO PARA CRIAR CONFIGS PADRAO PARA NOVO PERFIL
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION criar_configs_padrao_perfil()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO configuracoes (perfil_id, chave, valor)
  VALUES
    (NEW.id, 'entradas_auto_recebido', 'false'),
    (NEW.id, 'saidas_auto_pago', 'false'),
    (NEW.id, 'mostrar_concluidos_discretos', 'true');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_configs_padrao_perfil
  AFTER INSERT ON perfis
  FOR EACH ROW
  EXECUTE FUNCTION criar_configs_padrao_perfil();

COMMENT ON FUNCTION criar_configs_padrao_perfil() IS 'Cria configuracoes padrao quando um novo perfil e criado';

-- ============================================================================
-- ROLLBACK (caso necessario)
-- ============================================================================
-- Para reverter esta migration:
--
-- 1. Remover triggers e funcoes
-- DROP TRIGGER IF EXISTS trigger_criar_perfil_padrao ON usuarios;
-- DROP TRIGGER IF EXISTS trigger_criar_configs_padrao_perfil ON perfis;
-- DROP FUNCTION IF EXISTS criar_perfil_padrao();
-- DROP FUNCTION IF EXISTS criar_configs_padrao_perfil();
--
-- 2. Remover constraints
-- ALTER TABLE configuracoes DROP CONSTRAINT IF EXISTS configuracoes_perfil_chave_unique;
-- ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_perfil_nome_tipo_unique;
--
-- 3. Remover colunas perfil_id
-- ALTER TABLE lancamentos DROP COLUMN IF EXISTS perfil_id;
-- ALTER TABLE categorias DROP COLUMN IF EXISTS perfil_id;
-- ALTER TABLE configuracoes DROP COLUMN IF EXISTS perfil_id;
--
-- 4. Recriar indices antigos
-- CREATE INDEX idx_lancamentos_user_mes ON lancamentos(user_id, mes);
-- CREATE INDEX idx_lancamentos_user_created ON lancamentos(user_id, created_at DESC);
-- (etc...)
--
-- 5. Deletar tabela perfis
-- DROP TABLE IF EXISTS perfis CASCADE;
--
-- 6. Recriar constraint antiga de configuracoes
-- ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_user_chave_unique UNIQUE (user_id, chave);
-- ============================================================================
