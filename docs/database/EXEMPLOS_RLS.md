# Exemplos Práticos: Como RLS Funciona

## Visão Geral

Este documento mostra exemplos práticos de como Row Level Security funciona no sistema financeiro, incluindo cenários de sucesso e falha.

## Conceitos Fundamentais

### 1. O Que é RLS?

Row Level Security é um recurso do PostgreSQL que filtra linhas no nível do banco de dados com base em políticas (policies) definidas.

```
SEM RLS:
┌─────────────┐
│ Application │  ──→  SELECT * FROM lancamentos WHERE perfil_id = 'abc'
└─────────────┘       ↓
                ┌──────────┐
                │ Database │  → Retorna APENAS linhas com perfil_id='abc'
                └──────────┘

COM RLS (Policies Permissivas):
┌─────────────┐
│ Application │  ──→  SELECT * FROM lancamentos WHERE perfil_id = 'abc'
└─────────────┘       ↓
                ┌──────────┐
                │ Database │  → 1. Aplica policy (USING true = permite tudo)
                └──────────┘     2. Aplica WHERE da query
                                 3. Retorna linhas com perfil_id='abc'

COM RLS (Policies Restritivas - FUTURO):
┌─────────────┐
│ Application │  ──→  SELECT * FROM lancamentos
└─────────────┘       ↓
                ┌──────────┐
                │ Database │  → 1. Aplica policy (WHERE perfil_id = current_perfil_id)
                └──────────┘     2. Retorna APENAS linhas do perfil atual
```

### 2. Superuser vs Usuário Normal

**IMPORTANTE:** RLS NÃO se aplica a SUPERUSER!

```sql
-- Conectado como postgres (superuser)
SELECT COUNT(*) FROM lancamentos;
-- Retorna: TODOS os lançamentos (RLS não se aplica)

-- Conectado como anon (não-superuser)
SELECT COUNT(*) FROM lancamentos;
-- Retorna: Apenas lançamentos permitidos pelas policies
```

## Cenários de Uso

### Cenário 1: Usuário com Múltiplos Perfis

```sql
-- Setup
INSERT INTO usuarios (id, nome, email, senha_hash)
VALUES ('user-1', 'João', 'joao@test.com', 'hash');

-- Trigger cria perfil padrão automaticamente
SELECT * FROM perfis WHERE usuario_id = 'user-1';
-- Retorna: perfil-1 (criado automaticamente)

-- Criar segundo perfil
INSERT INTO perfis (id, nome, usuario_id)
VALUES ('perfil-2', 'Empresa', 'user-1');

-- Criar lançamentos em perfis diferentes
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, perfil_id)
VALUES
  ('entrada', 'Salário Pessoal', 5000, '2025-12', 'user-1', 'perfil-1'),
  ('entrada', 'Receita Empresa', 10000, '2025-12', 'user-1', 'perfil-2');

-- Via API: Listar com perfil-1
-- Header: x-perfil-id: perfil-1
SELECT * FROM lancamentos WHERE perfil_id = 'perfil-1';
-- Retorna: Apenas "Salário Pessoal"

-- Via API: Listar com perfil-2
-- Header: x-perfil-id: perfil-2
SELECT * FROM lancamentos WHERE perfil_id = 'perfil-2';
-- Retorna: Apenas "Receita Empresa"
```

**Fluxo Completo:**

```
1. Frontend envia:
   GET /api/lancamentos
   Authorization: Bearer <jwt-com-user-1>
   x-perfil-id: perfil-1

2. Middleware (auth.middleware.ts):
   - Valida JWT → extrai user_id = 'user-1'
   - Extrai header x-perfil-id → perfil_id = 'perfil-1'
   - Adiciona ao request.contexto

3. Repository (lancamento.repository.ts):
   - Executa: SELECT * FROM lancamentos WHERE perfil_id = 'perfil-1'

4. Database (RLS):
   - Policy: USING (true) → Permite query
   - Aplica WHERE perfil_id = 'perfil-1'
   - Retorna: ['Salário Pessoal']

5. Frontend recebe:
   [{ nome: 'Salário Pessoal', valor: 5000, ... }]
```

### Cenário 2: Tentativa de Acesso a Perfil de Outro Usuário

```sql
-- Setup
INSERT INTO usuarios (id, nome, email, senha_hash)
VALUES
  ('user-1', 'João', 'joao@test.com', 'hash1'),
  ('user-2', 'Maria', 'maria@test.com', 'hash2');

-- Perfis criados automaticamente
-- perfil-1 → user-1
-- perfil-2 → user-2

-- Lançamentos
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, perfil_id)
VALUES
  ('entrada', 'Salário João', 5000, '2025-12', 'user-1', 'perfil-1'),
  ('entrada', 'Salário Maria', 6000, '2025-12', 'user-2', 'perfil-2');
```

**Tentativa de Ataque (BLOQUEADO pela API):**

```
1. Frontend envia (Maria tentando acessar dados de João):
   GET /api/lancamentos
   Authorization: Bearer <jwt-com-user-2>  ← Token válido de Maria
   x-perfil-id: perfil-1                   ← Perfil de João!

2. API (DEVE validar ownership antes de query):
   ✓ CORRETO (com validação):
     - Verifica: perfil-1 pertence a user-2?
     - SELECT * FROM perfis WHERE id = 'perfil-1' AND usuario_id = 'user-2'
     - Retorna vazio → 403 Forbidden

   ✗ INCORRETO (sem validação):
     - Executa: SELECT * FROM lancamentos WHERE perfil_id = 'perfil-1'
     - Maria vê dados de João! (VULNERABILIDADE)

3. RLS (com policies permissivas):
   - Policy: USING (true) → Permite query (confia na API)
   - Se API não validou, Maria acessa dados de João

4. RLS (com policies restritivas - FUTURO):
   - Policy: USING (perfil_id IN (SELECT id FROM perfis WHERE usuario_id = current_user_id))
   - Bloqueia automaticamente, mesmo se API tiver bug
   - Retorna vazio para Maria
```

**Solução Atual (Validação na API):**

```typescript
// apps/api/src/middleware/auth.middleware.ts
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractToken(request);
  const usuario = await validateToken(token);
  const perfilId = extractPerfilId(request);

  // VALIDAR que perfil pertence ao usuário
  const perfil = await supabase
    .from('perfis')
    .select('id')
    .eq('id', perfilId)
    .eq('usuario_id', usuario.id)
    .single();

  if (!perfil.data) {
    return reply.status(403).send({ error: 'Perfil não pertence ao usuário' });
  }

  request.contexto = { userId: usuario.id, perfilId };
}
```

### Cenário 3: Categorias Padrão vs Customizadas

```sql
-- Categorias padrão vêm do CÓDIGO (não do banco)
-- Ver: apps/api/src/constants/categorias-padrao.ts
--
-- CATEGORIAS_PADRAO = [
--   { id: 'default-salario', nome: 'Salário', tipo: 'entrada', ... },
--   { id: 'default-freelance', nome: 'Freelance', tipo: 'entrada', ... },
--   { id: 'default-alimentacao', nome: 'Alimentação', tipo: 'saida', ... },
--   ...
-- ]

-- Categoria customizada por perfil
INSERT INTO categorias (nome, tipo, user_id, perfil_id)
VALUES ('Aluguel Apto 101', 'saida', 'user-1', 'perfil-1');

-- Via API: Listar categorias
-- GET /api/categorias?tipo=saida
-- Header: x-perfil-id: perfil-1

-- Repository executa:
SELECT * FROM categorias
WHERE tipo = 'saida'
  AND perfil_id = 'perfil-1';
-- Retorna: ['Aluguel Apto 101']

-- Depois combina com categorias padrão (código):
const categoriasPadrao = getCategoriasPadraoByTipo('saida');
return [...categoriasPadrao, ...categoriasDB];

// Resultado final:
[
  { id: 'default-alimentacao', nome: 'Alimentação', is_default: true },
  { id: 'default-transporte', nome: 'Transporte', is_default: true },
  { id: 'uuid-123', nome: 'Aluguel Apto 101', is_default: false }
]
```

### Cenário 4: Lançamentos Agrupados (Parent-Child)

```sql
-- Criar agrupador (cartão de crédito)
INSERT INTO lancamentos (id, tipo, nome, valor, mes, user_id, perfil_id, is_agrupador)
VALUES ('cartao-1', 'saida', 'Cartão Nubank', 0, '2025-12', 'user-1', 'perfil-1', true);

-- Criar filhos
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, perfil_id, parent_id)
VALUES
  ('saida', 'Netflix', 39.90, '2025-12', 'user-1', 'perfil-1', 'cartao-1'),
  ('saida', 'Spotify', 21.90, '2025-12', 'user-1', 'perfil-1', 'cartao-1');

-- Validações via Triggers (migration 007):
-- ✓ parent_id deve apontar para is_agrupador=true
-- ✓ filho deve ter mesmo tipo que pai
-- ✓ filho deve ter mesmo mes que pai
-- ✓ filho NÃO pode ser agrupador (is_agrupador=false)

-- Query com JOIN (API busca com filhos)
SELECT
  parent.*,
  json_agg(child.*) AS filhos
FROM lancamentos parent
LEFT JOIN lancamentos child ON child.parent_id = parent.id
WHERE parent.perfil_id = 'perfil-1'
  AND parent.mes = '2025-12'
  AND parent.parent_id IS NULL  -- Apenas raízes
GROUP BY parent.id;

-- RLS:
-- - Policy permite query (USING true)
-- - JOIN funciona normalmente
-- - API filtra por perfil_id
```

## Comparação: Policies Permissivas vs Restritivas

### Exemplo: SELECT em Lançamentos

#### Abordagem ATUAL (Permissiva)

```sql
-- Policy
CREATE POLICY lancamentos_select_perfil ON lancamentos
  FOR SELECT
  USING (true);

-- Query da API
SELECT * FROM lancamentos
WHERE perfil_id = $1;  -- $1 = perfil-id do header

-- Análise de Performance
EXPLAIN ANALYZE
SELECT * FROM lancamentos
WHERE perfil_id = 'perfil-1';

-- Resultado:
-- Index Scan using idx_lancamentos_perfil_id
-- Filter: perfil_id = 'perfil-1'
-- Rows: 10, Time: 0.5ms

-- Vantagens:
-- ✓ Simples e rápido
-- ✓ Usa índice eficientemente
-- ✓ Lógica centralizada na API

-- Desvantagens:
-- ✗ Confia 100% na API
-- ✗ Se API tiver bug, RLS não protege
```

#### Abordagem ALTERNATIVA (Restritiva)

```sql
-- Policy
CREATE POLICY lancamentos_select_perfil ON lancamentos
  FOR SELECT
  USING (
    perfil_id = current_setting('app.perfil_id', true)::uuid
    AND EXISTS (
      SELECT 1 FROM perfis
      WHERE perfis.id = lancamentos.perfil_id
        AND perfis.usuario_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Middleware da API (ANTES de TODA query)
SET LOCAL app.user_id = 'user-1';
SET LOCAL app.perfil_id = 'perfil-1';

-- Query da API (sem filtro explícito!)
SELECT * FROM lancamentos;

-- Análise de Performance
EXPLAIN ANALYZE
SELECT * FROM lancamentos;

-- Resultado:
-- Index Scan using idx_lancamentos_perfil_id
-- Filter: (perfil_id = current_setting(...) AND EXISTS(...))
-- Rows: 10, Time: 2.5ms  ← 5x mais lento!

-- Vantagens:
-- ✓ Proteção forte mesmo se API tiver bug
-- ✓ Impossível acessar dados de outro perfil
-- ✓ Segurança em camadas

-- Desvantagens:
-- ✗ Overhead de 2-5ms por query (EXISTS + JOIN)
-- ✗ Requer SET LOCAL em TODA transação
-- ✗ Lógica duplicada (SQL + TypeScript)
-- ✗ Difícil debug (queries parecem vazias)
```

### Exemplo: INSERT em Lançamentos

#### Abordagem ATUAL (Permissiva)

```sql
-- Policy
CREATE POLICY lancamentos_insert_perfil ON lancamentos
  FOR INSERT
  WITH CHECK (true);

-- API (TypeScript)
const lancamento = {
  tipo: 'entrada',
  nome: 'Salário',
  valor: 5000,
  mes: '2025-12',
  user_id: usuario.id,      // Do JWT
  perfil_id: request.perfilId  // Do header (VALIDADO)
};

await supabase.from('lancamentos').insert(lancamento);

-- Vantagens:
-- ✓ Simples e direto
-- ✓ API garante user_id e perfil_id corretos

-- Desvantagens:
-- ✗ Se API não validar perfil_id, aceita qualquer valor
```

#### Abordagem ALTERNATIVA (Restritiva)

```sql
-- Policy
CREATE POLICY lancamentos_insert_perfil ON lancamentos
  FOR INSERT
  WITH CHECK (
    user_id = current_setting('app.user_id', true)::uuid
    AND perfil_id = current_setting('app.perfil_id', true)::uuid
    AND EXISTS (
      SELECT 1 FROM perfis
      WHERE id = perfil_id AND usuario_id = user_id
    )
  );

-- API (TypeScript)
await supabase.rpc('set_context', {
  user_id: usuario.id,
  perfil_id: request.perfilId
});

const lancamento = {
  tipo: 'entrada',
  nome: 'Salário',
  valor: 5000,
  mes: '2025-12',
  user_id: usuario.id,
  perfil_id: request.perfilId
};

await supabase.from('lancamentos').insert(lancamento);

-- Vantagens:
-- ✓ Valida automaticamente que perfil_id pertence a user_id
-- ✓ Bloqueia INSERTs maliciosos mesmo se API tiver bug

-- Desvantagens:
-- ✗ Requer set_context antes de CADA INSERT
-- ✗ Overhead de EXISTS subquery
```

## Testes Práticos

### Teste 1: Verificar Isolamento de Perfis

```bash
#!/bin/bash

# Criar dois usuários e perfis
USER1_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"User1","email":"user1@test.com","senha":"senha123"}' \
  | jq -r '.token')

USER2_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nome":"User2","email":"user2@test.com","senha":"senha123"}' \
  | jq -r '.token')

# Buscar perfis
PERFIL1=$(curl -s http://localhost:3001/api/perfis \
  -H "Authorization: Bearer $USER1_TOKEN" \
  | jq -r '.[0].id')

PERFIL2=$(curl -s http://localhost:3001/api/perfis \
  -H "Authorization: Bearer $USER2_TOKEN" \
  | jq -r '.[0].id')

# User1 cria lançamento
curl -X POST http://localhost:3001/api/lancamentos \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "x-perfil-id: $PERFIL1" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"entrada","nome":"Secreto User1","valor":9999,"mes":"2025-12"}'

# User2 tenta listar (NÃO deve ver lançamento de User1)
curl http://localhost:3001/api/lancamentos?mes=2025-12 \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "x-perfil-id: $PERFIL2"

# Esperado: []

# User2 tenta acessar com perfil de User1 (deve falhar 403)
curl http://localhost:3001/api/lancamentos?mes=2025-12 \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "x-perfil-id: $PERFIL1"

# Esperado: { "error": "Perfil não pertence ao usuário" }
```

### Teste 2: Performance Comparison

```sql
-- Preparar dados de teste
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, perfil_id)
SELECT
  'entrada',
  'Teste ' || i,
  100.00,
  '2025-12',
  'user-1',
  'perfil-1'
FROM generate_series(1, 10000) i;

-- Teste 1: Policy Permissiva (ATUAL)
EXPLAIN ANALYZE
SELECT * FROM lancamentos
WHERE perfil_id = 'perfil-1';

-- Resultado esperado:
-- Planning Time: 0.1ms
-- Execution Time: 5-10ms
-- Rows: 10000

-- Teste 2: Policy Restritiva (simulação)
SET LOCAL app.perfil_id = 'perfil-1';
SET LOCAL app.user_id = 'user-1';

EXPLAIN ANALYZE
SELECT * FROM lancamentos
WHERE perfil_id = current_setting('app.perfil_id')::uuid
  AND EXISTS (
    SELECT 1 FROM perfis
    WHERE id = lancamentos.perfil_id
      AND usuario_id = current_setting('app.user_id')::uuid
  );

-- Resultado esperado:
-- Planning Time: 0.2ms
-- Execution Time: 15-25ms (3x mais lento)
-- Rows: 10000
```

## Debugging

### Como Verificar Se Policy Está Sendo Aplicada

```sql
-- 1. Ver policy atual
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  pg_get_expr(qual, (schemaname || '.' || tablename)::regclass) AS using_clause
FROM pg_policies
WHERE tablename = 'lancamentos'
  AND cmd = 'SELECT';

-- 2. Testar com SUPERUSER (bypassa RLS)
SELECT current_user, usesuper FROM pg_user WHERE usename = current_user;
-- Se usesuper = true, RLS NÃO se aplica

-- 3. Desabilitar RLS temporariamente para comparar
ALTER TABLE lancamentos DISABLE ROW LEVEL SECURITY;
SELECT COUNT(*) FROM lancamentos;  -- Conta TUDO
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
SELECT COUNT(*) FROM lancamentos;  -- Aplica policies

-- 4. Ver query plan com RLS
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM lancamentos
WHERE perfil_id = 'perfil-1';
```

### Debug de Queries Vazias

```sql
-- Query retorna vazio, mas deveria ter dados?

-- 1. Verificar se RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'lancamentos';
-- Se rowsecurity = true, RLS está ativo

-- 2. Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'lancamentos';

-- 3. Testar sem RLS
ALTER TABLE lancamentos DISABLE ROW LEVEL SECURITY;
SELECT * FROM lancamentos WHERE perfil_id = 'perfil-1';
-- Se retornar dados, problema é na policy
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

-- 4. Verificar se conectado como superuser
SELECT usesuper FROM pg_user WHERE usename = current_user;
-- Se true, conectar como usuário normal para testar RLS
```

## Conclusão

### Resumo das Abordagens

| Aspecto | Permissiva (Atual) | Restritiva (Futuro) |
|---------|-------------------|---------------------|
| **Segurança** | Boa (API + RLS) | Excelente (RLS forte) |
| **Performance** | Ótima (~5ms) | Boa (~15ms) |
| **Manutenção** | Fácil (código único) | Difícil (código duplicado) |
| **Debugging** | Simples | Complexo |
| **Overhead** | Mínimo | Moderado |
| **Proteção contra bugs** | Média | Alta |

### Quando Migrar para Restritiva?

Considere migrar se:
- [ ] Sistema lidará com dados sensíveis (financeiro, saúde, PII)
- [ ] Compliance exige proteção em camadas (LGPD, GDPR, SOX)
- [ ] Equipe grande (risco de bugs na API)
- [ ] Auditoria externa requer RLS restritivo
- [ ] Performance pode degradar 3-5ms sem impacto

NÃO migre se:
- [ ] Sistema é pequeno/médio sem dados críticos
- [ ] Performance é prioridade máxima
- [ ] Equipe pequena com code reviews rigorosos
- [ ] API já tem validação sólida e testes extensivos

### Próximos Passos

1. **Monitorar por 2 semanas:**
   - Verificar performance
   - Identificar queries lentas
   - Analisar erro rate

2. **Se estável, adicionar:**
   - Audit logging
   - Rate limiting
   - Alertas de segurança

3. **Avaliar migração restritiva em Q1 2026:**
   - Após sistema maduro
   - Com testes de carga completos
   - Se requisitos de compliance exigirem
