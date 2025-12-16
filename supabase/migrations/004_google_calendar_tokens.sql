-- Migration: Google Calendar Tokens
-- Armazena tokens OAuth do Google Calendar de forma segura

CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id)
);

-- Index para busca por usuario
CREATE INDEX idx_google_tokens_usuario ON google_calendar_tokens(usuario_id);

-- RLS (Row Level Security)
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem seus próprios tokens
CREATE POLICY "Usuarios veem apenas seus tokens" ON google_calendar_tokens
  FOR ALL USING (usuario_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_google_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_google_tokens_updated_at();
