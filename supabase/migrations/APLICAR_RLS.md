# Guia Rápido: Aplicar Migration RLS

## Pré-requisitos

- Supabase CLI instalado (`npm install -g supabase`)
- Acesso ao banco de dados (local ou produção)
- Backup recente do banco (recomendado)

## Passo 1: Backup (IMPORTANTE!)

### Ambiente Local

```bash
# Via Supabase CLI
cd /Users/luana/sistema-financeiro
npx supabase db dump -f backup_pre_rls_$(date +%Y%m%d_%H%M%S).sql

# OU via pg_dump direto
pg_dump postgresql://postgres:postgres@127.0.0.1:54322/postgres > backup_pre_rls.sql
```

### Ambiente Produção

```bash
# Via Supabase CLI (recomendado)
npx supabase db dump --project-ref <project-ref> -f backup_prod_pre_rls_$(date +%Y%m%d_%H%M%S).sql

# OU via Dashboard
# Settings → Database → Database Settings → Backups → Create Backup
```

## Passo 2: Aplicar Migration

### Opção A: Via Supabase CLI (Recomendado)

```bash
cd /Users/luana/sistema-financeiro

# Ambiente Local
npx supabase db reset  # Recria banco com TODAS as migrations

# OU aplicar apenas novas migrations
npx supabase migration up

# Ambiente Produção
npx supabase db push
```

### Opção B: Via SQL Editor (Dashboard)

1. Acesse Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie todo o conteúdo de `010_enable_rls.sql`
5. Cole no editor
6. Clique em **Run**
7. Aguarde confirmação (pode levar 5-10 segundos)

### Opção C: Via psql (Linha de Comando)

```bash
# Ambiente Local
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f /Users/luana/sistema-financeiro/supabase/migrations/010_enable_rls.sql

# Ambiente Produção (substitua com sua connection string)
psql $DATABASE_URL \
  -f /Users/luana/sistema-financeiro/supabase/migrations/010_enable_rls.sql
```

## Passo 3: Validar Migration

```bash
# Executar script de validação
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f /Users/luana/sistema-financeiro/supabase/migrations/010_validate_rls.sql

# OU via Dashboard SQL Editor (copiar conteúdo de 010_validate_rls.sql)
```

### Checklist de Validação

Marque cada item após validar:

- [ ] RLS habilitado em 7 tabelas (usuarios, perfis, lancamentos, categorias, configuracoes, sessoes, google_calendar_tokens)
- [ ] ~28 policies criadas (4 por tabela em média)
- [ ] Tabela `categorias` existe e tem colunas corretas
- [ ] Todos os lançamentos têm `perfil_id` (não NULL)
- [ ] Triggers `updated_at` funcionando
- [ ] Índices em `perfil_id` e `user_id` existem

## Passo 4: Testar Funcionamento

### 4.1 Testar Via API (Ambiente Local)

```bash
# 1. Iniciar API
cd /Users/luana/sistema-financeiro/apps/api
npm run dev

# 2. Criar usuário (se ainda não existe)
curl -X POST http://localhost:3001/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Usuário Teste",
    "email": "teste@example.com",
    "senha": "senha123"
  }'

# 3. Fazer login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "senha": "senha123"
  }' | jq -r '.token')

echo "Token: $TOKEN"

# 4. Listar perfis
PERFIL_ID=$(curl -s http://localhost:3001/api/perfis \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[0].id')

echo "Perfil ID: $PERFIL_ID"

# 5. Criar lançamento
curl -X POST http://localhost:3001/api/lancamentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-perfil-id: $PERFIL_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "entrada",
    "nome": "Teste RLS",
    "valor": 100.00,
    "mes": "2025-12"
  }'

# 6. Listar lançamentos
curl http://localhost:3001/api/lancamentos?mes=2025-12 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-perfil-id: $PERFIL_ID"

# 7. Verificar que outro perfil não vê (criar segundo perfil antes)
curl -X POST http://localhost:3001/api/perfis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Perfil Empresa",
    "descricao": "Teste isolamento"
  }'

PERFIL_ID_2=$(curl -s http://localhost:3001/api/perfis \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[1].id')

# Listar com perfil 2 (não deve ver lançamentos do perfil 1)
curl http://localhost:3001/api/lancamentos?mes=2025-12 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-perfil-id: $PERFIL_ID_2"
```

**Resultado Esperado:**
- Todas as requisições retornam 200 OK
- Lançamentos aparecem apenas no perfil correto
- Perfil 2 NÃO vê lançamentos do Perfil 1

### 4.2 Testar Isolamento de Dados (SQL)

```sql
-- 1. Criar usuário teste
INSERT INTO usuarios (nome, email, senha_hash)
VALUES ('User1', 'user1@test.com', 'hash1')
RETURNING id;
-- Anotar ID retornado

-- 2. Perfil é criado automaticamente via trigger
SELECT * FROM perfis WHERE usuario_id = '<user1-id>';

-- 3. Criar lançamento
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, perfil_id)
VALUES (
  'entrada',
  'Teste',
  100.00,
  '2025-12',
  '<user1-id>',
  '<perfil-id>'
);

-- 4. Criar segundo usuário
INSERT INTO usuarios (nome, email, senha_hash)
VALUES ('User2', 'user2@test.com', 'hash2')
RETURNING id;

-- 5. Verificar isolamento (User2 não deve ver lançamento de User1)
-- Como RLS está habilitado mas policies são permissivas,
-- esta query via psql (superuser) retorna TUDO
SELECT * FROM lancamentos;

-- Para simular RLS, precisaria conectar como usuário não-superuser
```

### 4.3 Testar Performance

```bash
# Instalar Apache Bench (se não tiver)
brew install httpd  # macOS

# Testar performance de listagem
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-perfil-id: $PERFIL_ID" \
  http://localhost:3001/api/lancamentos?mes=2025-12

# Analisar resultados
# Esperado:
#   - Time per request: < 50ms (média)
#   - Failed requests: 0
#   - Requests per second: > 100
```

## Passo 5: Monitorar em Produção

### Queries de Monitoramento (primeiras 24h)

```sql
-- 1. Verificar queries lentas (> 100ms)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Verificar uso de índices
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan < 10  -- Índices pouco usados
ORDER BY idx_scan ASC;

-- 3. Verificar locks e deadlocks
SELECT
  relation::regclass AS table_name,
  mode,
  granted,
  pid,
  query
FROM pg_locks
JOIN pg_stat_activity USING (pid)
WHERE NOT granted;

-- 4. Verificar cache hit rate (deve ser > 95%)
SELECT
  SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;
```

### Métricas para Acompanhar

- **Latência P50:** < 20ms
- **Latência P95:** < 50ms
- **Latência P99:** < 100ms
- **Error Rate:** < 0.1%
- **Cache Hit Ratio:** > 95%
- **Connection Pool Usage:** < 80%

## Rollback (Se Necessário)

### Quando Fazer Rollback

- Erro rate > 5%
- Latência > 500ms consistentemente
- Dados inacessíveis
- Policies bloqueando acesso legítimo

### Como Fazer Rollback

```sql
-- 1. Desabilitar RLS em todas as tabelas
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE perfis DISABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens DISABLE ROW LEVEL SECURITY;

-- 2. Dropar todas as policies
DROP POLICY IF EXISTS usuarios_select_own ON usuarios;
DROP POLICY IF EXISTS usuarios_update_own ON usuarios;
DROP POLICY IF EXISTS usuarios_insert_any ON usuarios;
DROP POLICY IF EXISTS usuarios_delete_prevent ON usuarios;

DROP POLICY IF EXISTS perfis_select_own ON perfis;
DROP POLICY IF EXISTS perfis_insert_own ON perfis;
DROP POLICY IF EXISTS perfis_update_own ON perfis;
DROP POLICY IF EXISTS perfis_delete_own ON perfis;

DROP POLICY IF EXISTS lancamentos_select_perfil ON lancamentos;
DROP POLICY IF EXISTS lancamentos_insert_perfil ON lancamentos;
DROP POLICY IF EXISTS lancamentos_update_perfil ON lancamentos;
DROP POLICY IF EXISTS lancamentos_delete_perfil ON lancamentos;

DROP POLICY IF EXISTS categorias_select_perfil ON categorias;
DROP POLICY IF EXISTS categorias_insert_perfil ON categorias;
DROP POLICY IF EXISTS categorias_update_perfil ON categorias;
DROP POLICY IF EXISTS categorias_delete_perfil ON categorias;

DROP POLICY IF EXISTS configuracoes_select_perfil ON configuracoes;
DROP POLICY IF EXISTS configuracoes_insert_perfil ON configuracoes;
DROP POLICY IF EXISTS configuracoes_update_perfil ON configuracoes;
DROP POLICY IF EXISTS configuracoes_delete_perfil ON configuracoes;

DROP POLICY IF EXISTS sessoes_select_own ON sessoes;
DROP POLICY IF EXISTS sessoes_insert_any ON sessoes;
DROP POLICY IF EXISTS sessoes_delete_own ON sessoes;

DROP POLICY IF EXISTS google_calendar_tokens_select_perfil ON google_calendar_tokens;
DROP POLICY IF EXISTS google_calendar_tokens_insert_perfil ON google_calendar_tokens;
DROP POLICY IF EXISTS google_calendar_tokens_update_perfil ON google_calendar_tokens;
DROP POLICY IF EXISTS google_calendar_tokens_delete_perfil ON google_calendar_tokens;

-- 3. Verificar que RLS foi desabilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Esperado: rowsecurity = false para todas
```

### Rollback via Backup

```bash
# Restaurar do backup (DESTRUCTIVO - perde dados após backup!)
psql $DATABASE_URL < backup_pre_rls.sql

# OU via Supabase Dashboard
# Settings → Database → Backups → Restore
```

## Troubleshooting Comum

### Problema 1: "permission denied for table X"

**Causa:** RLS bloqueando acesso

**Solução:**
```sql
-- Verificar se conectado como superuser
SELECT current_user, usesuper FROM pg_user WHERE usename = current_user;

-- Se não for superuser, temporariamente desabilitar RLS
ALTER TABLE <table-name> DISABLE ROW LEVEL SECURITY;
```

### Problema 2: Queries retornam vazio

**Causa:** Policies restritivas ou filtro incorreto na API

**Solução:**
```sql
-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = '<table-name>';

-- Testar sem RLS
ALTER TABLE <table-name> DISABLE ROW LEVEL SECURITY;
SELECT COUNT(*) FROM <table-name>;
ALTER TABLE <table-name> ENABLE ROW LEVEL SECURITY;
```

### Problema 3: Performance degradada

**Causa:** Falta de índices ou policies restritivas com JOINs

**Solução:**
```sql
-- Analisar query
EXPLAIN ANALYZE
SELECT * FROM lancamentos WHERE perfil_id = '<uuid>';

-- Verificar uso de índices (deve aparecer Index Scan)
-- Se aparecer Seq Scan, criar índice:
CREATE INDEX idx_lancamentos_perfil_id ON lancamentos(perfil_id);
```

### Problema 4: Erro ao criar categorias

**Causa:** Tabela categorias não existe

**Solução:**
- Migration 010 cria a tabela automaticamente
- Se ainda assim não existir, executar apenas a PARTE 1 da migration

## Suporte e Documentação

- **Documentação Completa:** `010_RLS_README.md`
- **Script de Validação:** `010_validate_rls.sql`
- **Migration SQL:** `010_enable_rls.sql`
- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS Docs:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## Checklist Final

Antes de considerar a migration concluída:

- [ ] Backup criado e validado
- [ ] Migration aplicada sem erros
- [ ] Script de validação executado (todos os checks OK)
- [ ] Testes via API passando
- [ ] Performance dentro do esperado (< 50ms)
- [ ] Monitoramento configurado
- [ ] Equipe notificada sobre mudanças
- [ ] Documentação atualizada
- [ ] Rollback plan testado (em ambiente dev)

## Próximos Passos (Opcional)

Após RLS estável por 1-2 semanas:

1. **Implementar Audit Logging**
   - Tabela `audit_log` para rastrear modificações
   - Triggers em INSERT/UPDATE/DELETE

2. **Adicionar Rate Limiting**
   - Por usuário e perfil
   - Proteção contra abuse

3. **Avaliar Policies Restritivas**
   - Se segurança for crítica
   - Requer refatoração da API (2-3 dias)
   - Ver `010_RLS_README.md` seção "Implementação Futura"

4. **Implementar Soft Deletes**
   - Adicionar coluna `deleted_at`
   - Policies ignoram registros deletados
   - Permite recuperação de dados

5. **Adicionar Auditoria de Acesso**
   - Log de quem acessou quais dados
   - Compliance (LGPD, GDPR)
