-- ============================================================================
-- Sistema Financeiro - Schema Inicial
-- ============================================================================
-- Este script cria a estrutura inicial do banco de dados para o sistema
-- financeiro. Inclui tabelas para lançamentos e configurações.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

-- Tipo de lançamento: entrada (receitas) ou saída (despesas)
CREATE TYPE tipo_lancamento AS ENUM ('entrada', 'saida');

-- ----------------------------------------------------------------------------
-- TABELA: lancamentos
-- ----------------------------------------------------------------------------
-- Armazena todos os lançamentos financeiros do sistema.
-- Cada lançamento pertence a um mês específico (formato YYYY-MM).
-- O campo 'concluido' indica se a entrada foi recebida ou a saída foi paga.
-- ----------------------------------------------------------------------------

CREATE TABLE lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_lancamento NOT NULL,
  nome VARCHAR(100) NOT NULL,
  valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  concluido BOOLEAN DEFAULT FALSE,
  data_prevista DATE,
  mes VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por mês (query mais frequente)
CREATE INDEX idx_lancamentos_mes ON lancamentos(mes);

-- Índice para ordenação por data de criação
CREATE INDEX idx_lancamentos_created_at ON lancamentos(created_at);

-- ----------------------------------------------------------------------------
-- TABELA: configuracoes
-- ----------------------------------------------------------------------------
-- Armazena preferências do usuário como pares chave-valor.
-- Os valores são armazenados em JSONB para flexibilidade.
-- ----------------------------------------------------------------------------

CREATE TABLE configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave VARCHAR(50) UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TRIGGER: Atualização automática de updated_at
-- ----------------------------------------------------------------------------
-- Mantém o campo updated_at sempre atualizado automaticamente
-- quando um registro é modificado.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lancamentos_updated_at
  BEFORE UPDATE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_configuracoes_updated_at
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- DADOS INICIAIS: Configurações padrão
-- ----------------------------------------------------------------------------

INSERT INTO configuracoes (chave, valor) VALUES
  ('entradas_auto_recebido', 'false'),
  ('saidas_auto_pago', 'false'),
  ('mostrar_concluidos_discretos', 'true');

-- ----------------------------------------------------------------------------
-- COMENTÁRIOS NAS TABELAS (Documentação)
-- ----------------------------------------------------------------------------

COMMENT ON TABLE lancamentos IS 'Lançamentos financeiros (entradas e saídas) do sistema';
COMMENT ON COLUMN lancamentos.tipo IS 'Tipo do lançamento: entrada (receita) ou saida (despesa)';
COMMENT ON COLUMN lancamentos.nome IS 'Descrição do lançamento (ex: Salário, Aluguel)';
COMMENT ON COLUMN lancamentos.valor IS 'Valor em reais, sempre positivo';
COMMENT ON COLUMN lancamentos.concluido IS 'Se true, indica que a entrada foi recebida ou saída foi paga';
COMMENT ON COLUMN lancamentos.data_prevista IS 'Data prevista para recebimento/pagamento';
COMMENT ON COLUMN lancamentos.mes IS 'Mês de referência no formato YYYY-MM';

COMMENT ON TABLE configuracoes IS 'Preferências e configurações do usuário';
COMMENT ON COLUMN configuracoes.chave IS 'Identificador único da configuração';
COMMENT ON COLUMN configuracoes.valor IS 'Valor da configuração em formato JSON';
