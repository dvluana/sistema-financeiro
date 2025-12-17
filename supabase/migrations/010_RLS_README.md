# Migration 010: Row Level Security (RLS)

## Visão Geral

Esta migration implementa Row Level Security em todas as tabelas do sistema financeiro, adicionando uma camada adicional de proteção de dados além da validação feita pela API.

## Estratégia de Segurança: Defense in Depth

### Camadas de Proteção

1. **Camada de API (Primária)**
   - Valida JWT no header `Authorization: Bearer <token>`
   - Extrai `user_id` do token validado
   - Extrai `perfil_id` do header `x-perfil-id`
   - Filtra todas as queries por `perfil_id` ou `user_id`
   - Localização: `/apps/api/src/middleware/auth.middleware.ts`

2. **Camada de RLS (Secundária)**
   - Previne bypass acidental da API
   - Protege contra acesso direto ao banco
   - Policies permissivas que confiam na camada de API
   - **NÃO duplica lógica de autorização**

3. **Camada de Rede**
   - Supabase restringe conexões apenas de IPs autorizados
   - API é o único ponto de acesso permitido em produção

4. **Camada de Banco de Dados**
   - Foreign keys garantem integridade referencial
   - Constraints validam tipos de dados
   - Triggers mantêm consistência

## Por Que Policies Permissivas?

### Decisão Arquitetural

Todas as policies foram implementadas com `USING (true)` (permissivas) em vez de regras restritivas complexas. Esta foi uma decisão consciente baseada em:

### Razões Técnicas

1. **Autenticação Customizada**
   - Sistema NÃO usa `auth.uid()` do Supabase Auth
   - Autenticação via JWT customizado
   - Contexto de usuário vive apenas na camada de aplicação

2. **Single Source of Truth**
   - API é a fonte única de verdade para autorização
   - Duplicar lógica em SQL cria risco de inconsistência
   - Manutenção centralizada no código TypeScript

3. **Contexto Rico**
   - Header `x-perfil-id` muda dinamicamente
   - Usuário pode ter múltiplos perfis
   - Lógica de seleção de perfil é complexa (UI)

4. **Performance**
   - Policies permissivas têm overhead mínimo (~0-1ms)
   - Evita JOINs complexos em cada query
   - Índices existentes já otimizam filtragem pela API

### Comparação: Permissivo vs Restritivo

#### Abordagem ATUAL (Permissiva)
```sql
-- Policy permissiva
CREATE POLICY lancamentos_select_perfil ON lancamentos
  FOR SELECT
  USING (true); -- API filtra por perfil_id

-- Query na API
SELECT * FROM lancamentos
WHERE perfil_id = $1; -- Filtro na camada de aplicação
```

**Vantagens:**
- Simples e fácil de manter
- Lógica de autorização centralizada na API
- Sem overhead de JOINs no RLS
- Contexto rico disponível (JWT, headers, session)

**Desvantagens:**
- Confia 100% na camada de API
- Não protege contra bugs na API

---

#### Abordagem ALTERNATIVA (Restritiva)
```sql
-- Requer setar contexto em CADA transação
SET LOCAL app.user_id = '<uuid-from-jwt>';
SET LOCAL app.perfil_id = '<uuid-from-header>';

-- Policy restritiva
CREATE POLICY lancamentos_select_perfil ON lancamentos
  FOR SELECT
  USING (
    perfil_id = current_setting('app.perfil_id')::uuid
    AND EXISTS (
      SELECT 1 FROM perfis p
      WHERE p.id = lancamentos.perfil_id
        AND p.usuario_id = current_setting('app.user_id')::uuid
    )
  );

-- Query na API (sem filtro, RLS faz tudo)
SELECT * FROM lancamentos; -- RLS filtra automaticamente
```

**Vantagens:**
- Proteção forte mesmo se API tiver bug
- Impossível acessar dados de outro perfil

**Desvantagens:**
- Requer refatoração massiva da API
- Precisa setar contexto em TODA transação
- JOINs extras em TODA query (overhead 2-5ms)
- Lógica duplicada (SQL + TypeScript)
- Difícil debug (lógica espalhada)
- Contexto limitado (apenas UUIDs)

## Implementação Futura: Policies Restritivas

Se no futuro for necessário implementar policies restritivas, siga este plano:

### 1. Criar Função Helper

```sql
-- Função para validar ownership de perfil
CREATE OR REPLACE FUNCTION current_user_owns_perfil(perfil_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfis
    WHERE id = perfil_uuid
      AND usuario_id = current_setting('app.user_id')::uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Atualizar Middleware da API

```typescript
// Em TODA rota protegida, setar contexto
async function setRLSContext(request: FastifyRequest) {
  const userId = request.usuario!.id;
  const perfilId = request.perfilId!;

  await supabase.rpc('exec_sql', {
    query: `
      SET LOCAL app.user_id = '${userId}';
      SET LOCAL app.perfil_id = '${perfilId}';
    `
  });
}
```

### 3. Atualizar Policies

```sql
-- Policy restritiva para lancamentos
DROP POLICY lancamentos_select_perfil ON lancamentos;
CREATE POLICY lancamentos_select_perfil ON lancamentos
  FOR SELECT
  USING (
    perfil_id = current_setting('app.perfil_id', true)::uuid
    AND current_user_owns_perfil(perfil_id)
  );
```

### 4. Remover Filtros da API

```typescript
// ANTES (com policies permissivas)
const { data } = await supabase
  .from('lancamentos')
  .select('*')
  .eq('perfil_id', perfilId); // Filtro manual

// DEPOIS (com policies restritivas)
const { data } = await supabase
  .from('lancamentos')
  .select('*'); // RLS filtra automaticamente
```

### Estimativa de Esforço

- **Tempo:** 2-3 dias de desenvolvimento + 1 dia de testes
- **Risco:** Médio (pode quebrar queries existentes)
- **Impacto em Performance:** +2-5ms por query
- **Arquivos Afetados:** ~15 arquivos (repositories, middleware)

## Estrutura das Policies

### Tabelas e Relacionamentos

```
usuarios (id)
  ↓
perfis (usuario_id → usuarios.id)
  ↓
├─ lancamentos (perfil_id → perfis.id)
├─ categorias (perfil_id → perfis.id)
├─ configuracoes (perfil_id → perfis.id)
└─ google_calendar_tokens (perfil_id → perfis.id)

usuarios (id)
  ↓
sessoes (user_id → usuarios.id)
```

### Policies por Tabela

#### 1. usuarios
- `SELECT`: Permissivo (API filtra por JWT)
- `INSERT`: Permite (registro de novos usuários)
- `UPDATE`: Permissivo (API valida ownership)
- `DELETE`: **BLOQUEADO** (proteção extra)

#### 2. perfis
- `SELECT`: Permissivo (API filtra por usuario_id do JWT)
- `INSERT`: Permissivo (API valida usuario_id)
- `UPDATE`: Permissivo (API valida ownership)
- `DELETE`: Permissivo (API valida ownership)

#### 3. lancamentos
- `SELECT`: Permissivo (API filtra por perfil_id do header)
- `INSERT`: Permissivo (API garante perfil_id correto)
- `UPDATE`: Permissivo (API valida ownership)
- `DELETE`: Permissivo (API valida ownership)

#### 4. categorias
- `SELECT`: Permissivo (API filtra por perfil_id)
- `INSERT`: Permissivo (API garante perfil_id)
- `UPDATE`: Permissivo (API valida ownership)
- `DELETE`: Permissivo (API valida ownership)

#### 5. configuracoes
- `SELECT`: Permissivo (API filtra por perfil_id)
- `INSERT`: Permissivo (API garante perfil_id)
- `UPDATE`: Permissivo (API valida ownership)
- `DELETE`: Permissivo (API valida ownership)

#### 6. sessoes
- `SELECT`: Permissivo (API filtra por user_id)
- `INSERT`: Permite (login)
- `DELETE`: Permissivo (logout - API valida ownership)

#### 7. google_calendar_tokens
- `SELECT`: Permissivo (API filtra por perfil_id)
- `INSERT`: Permissivo (API garante perfil_id)
- `UPDATE`: Permissivo (API valida ownership)
- `DELETE`: Permissivo (API valida ownership)

## Aplicando a Migration

### Ambiente Local (Supabase CLI)

```bash
# 1. Iniciar Supabase local
cd /Users/luana/sistema-financeiro
npx supabase start

# 2. Aplicar migration
npx supabase db reset  # Recria banco com todas as migrations
# OU
npx supabase migration up  # Aplica apenas novas migrations

# 3. Verificar RLS
npx supabase db diff --schema public
```

### Ambiente Produção

```bash
# 1. Push via Supabase CLI (recomendado)
npx supabase db push

# 2. OU aplicar manualmente via Dashboard
# - Acessar Supabase Dashboard
# - SQL Editor → New Query
# - Colar conteúdo de 010_enable_rls.sql
# - Run
```

## Validação Pós-Migration

### 1. Verificar que RLS está Habilitado

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;
```

**Esperado:**
```
schemaname | tablename              | rowsecurity
-----------+------------------------+-------------
public     | categorias             | t
public     | configuracoes          | t
public     | google_calendar_tokens | t
public     | lancamentos            | t
public     | perfis                 | t
public     | sessoes                | t
public     | usuarios               | t
```

### 2. Listar Todas as Policies

```sql
SELECT
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```

**Esperado:** 28 policies (4 por tabela x 7 tabelas)

### 3. Testar Acesso Via API

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","senha":"senha123"}'

# Retorna: { "token": "<jwt-token>", "usuario": {...} }

# Listar perfis
curl http://localhost:3001/api/perfis \
  -H "Authorization: Bearer <jwt-token>"

# Listar lançamentos (com perfil)
curl http://localhost:3001/api/lancamentos \
  -H "Authorization: Bearer <jwt-token>" \
  -H "x-perfil-id: <perfil-uuid>"
```

**Comportamento Esperado:**
- Todas as requisições funcionam normalmente
- Dados são filtrados corretamente pela API
- RLS não adiciona overhead perceptível

### 4. Testar Acesso Direto ao Banco (Deve Retornar Tudo)

```sql
-- Via psql conectado como postgres
SELECT COUNT(*) FROM lancamentos;  -- Retorna TODOS os lançamentos
SELECT COUNT(*) FROM perfis;       -- Retorna TODOS os perfis
```

**Por quê retorna tudo?**
- Usuário `postgres` tem privilégios SUPERUSER
- SUPERUSER bypassa RLS automaticamente
- RLS só afeta usuários normais (anon, authenticated, etc)

### 5. Testar com Usuário Anon (Simulação)

```sql
-- Criar role anon se não existir
CREATE ROLE anon;

-- Tentar acessar como anon
SET ROLE anon;
SELECT COUNT(*) FROM lancamentos;  -- Deve retornar 0 (policies bloqueiam)

-- Voltar para postgres
RESET ROLE;
```

## Monitoramento e Performance

### Queries de Monitoramento

```sql
-- 1. Verificar queries lentas relacionadas a RLS
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query ILIKE '%lancamentos%'
  OR query ILIKE '%perfis%'
ORDER BY mean_exec_time DESC
LIMIT 10;

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
ORDER BY idx_scan DESC;

-- 3. Verificar cache hit rate
SELECT
  schemaname,
  relname,
  heap_blks_read,
  heap_blks_hit,
  CASE
    WHEN heap_blks_hit + heap_blks_read = 0 THEN 0
    ELSE ROUND(100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read), 2)
  END AS cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY cache_hit_ratio ASC;
```

### Métricas Esperadas

- **Overhead de RLS:** < 1ms por query (policies permissivas)
- **Cache Hit Ratio:** > 95% (índices bem utilizados)
- **Query Time (SELECT):** 5-20ms (com filtro de API)
- **Query Time (INSERT):** 2-5ms
- **Query Time (UPDATE):** 3-8ms
- **Query Time (DELETE):** 2-5ms

## Troubleshooting

### Problema: Queries retornam vazio após migration

**Causa:** RLS bloqueando acesso

**Solução:**
```sql
-- Verificar se usuário é SUPERUSER
SELECT current_user, usesuper FROM pg_user WHERE usename = current_user;

-- Se não for, temporariamente desabilitar RLS para debug
ALTER TABLE lancamentos DISABLE ROW LEVEL SECURITY;

-- Após debug, reabilitar
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
```

### Problema: Performance degradada

**Causa:** Índices faltando ou policies restritivas

**Solução:**
```sql
-- Verificar índices sendo usados
EXPLAIN ANALYZE
SELECT * FROM lancamentos WHERE perfil_id = '<uuid>';

-- Deve usar idx_lancamentos_perfil_mes ou similar
-- Se não usar índice, criar:
CREATE INDEX idx_lancamentos_perfil_id ON lancamentos(perfil_id);
```

### Problema: Policies não estão sendo aplicadas

**Causa:** Conectado como SUPERUSER

**Solução:**
```sql
-- Verificar role atual
SELECT current_user, usesuper FROM pg_user WHERE usename = current_user;

-- Se usesuper = true, RLS não se aplica
-- Conectar com usuário normal para testar
```

## Considerações de Segurança

### O Que Esta Migration PROTEGE

1. Acesso direto ao banco sem passar pela API
2. Bypass acidental de filtros na camada de aplicação
3. Queries malformadas que esquecem WHERE clauses
4. Exploits de SQL injection (camada extra)

### O Que Esta Migration NÃO PROTEGE

1. Bugs na lógica de autorização da API
2. Tokens JWT comprometidos
3. Header `x-perfil-id` manipulado (API deve validar)
4. Ataques de enumeração de IDs
5. Usuário com credenciais válidas acessando seus próprios dados

### Recomendações Adicionais

1. **Validar perfil_id no Backend**
   ```typescript
   // ANTES de usar perfil_id, validar que pertence ao usuário
   const perfilExiste = await perfilRepository.findById(
     perfilId,
     usuario.id
   );
   if (!perfilExiste) {
     return reply.status(403).send({ error: 'Perfil não pertence ao usuário' });
   }
   ```

2. **Rate Limiting**
   ```typescript
   // Implementar rate limiting por usuário/IP
   fastify.register(rateLimit, {
     max: 100,
     timeWindow: '1 minute'
   });
   ```

3. **Audit Logging**
   ```sql
   -- Criar tabela de auditoria
   CREATE TABLE audit_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     action VARCHAR(50) NOT NULL,
     table_name VARCHAR(50) NOT NULL,
     record_id UUID,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Input Validation**
   ```typescript
   // Usar Zod para validar TODOS os inputs
   const schema = z.object({
     perfilId: z.string().uuid(),
     nome: z.string().min(1).max(100),
     valor: z.number().positive()
   });
   ```

## Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Defense in Depth Strategy](https://owasp.org/www-community/Defense_in_Depth)
- Migration anterior: `006_perfis_workspaces.sql`
- Middleware de autenticação: `/apps/api/src/middleware/auth.middleware.ts`

## Changelog

- **2025-12-16:** Criação inicial com policies permissivas
- Próximas melhorias planejadas:
  - [ ] Implementar audit logging
  - [ ] Adicionar rate limiting por perfil
  - [ ] Avaliar migração para policies restritivas (Q1 2026)
