# Migration 006: Agrupadores Constraints

## Summary
This migration adds critical data integrity constraints for the agrupadores (hierarchical transactions) feature.

## Fixes Applied
1. **Parent Type Validation**: Ensures that `parent_id` always references a `tipo='agrupador'`
2. **Month Consistency**: Ensures child transactions have the same `mes` as their parent
3. **Protected Month Changes**: Prevents changing an agrupador's month if it has children

## How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
npx supabase db push
```

### Option 2: Manual SQL Execution
If the CLI is having issues, you can apply this migration manually using the Supabase Dashboard:

1. Go to https://supabase.com/dashboard/project/ebgqtikmwwnwubcjvcba/sql/new
2. Copy the contents of `006_agrupadores_constraints.sql`
3. Paste and execute

### Option 3: Direct psql Connection
You need the database password. Then run:
```bash
PGPASSWORD="your-password" psql "postgresql://postgres.ebgqtikmwwnwubcjvcba:your-password@aws-0-us-east-2.pooler.supabase.com:5432/postgres" -f supabase/migrations/006_agrupadores_constraints.sql
```

## Testing the Migration

After applying, test the constraints work:

```sql
-- Test 1: Try to create a filho with parent that's not agrupador (should FAIL)
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, parent_id)
VALUES ('entrada', 'Test', 100, '2025-01', 'some-user-id', 'some-entrada-id');
-- Expected: ERROR - Parent is not an agrupador

-- Test 2: Try to create filho with different mes than parent (should FAIL)
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, parent_id)
VALUES ('entrada', 'Test', 100, '2025-02', 'some-user-id', 'some-agrupador-id-in-2025-01');
-- Expected: ERROR - Child mes must match parent mes

-- Test 3: Valid filho creation (should SUCCEED)
INSERT INTO lancamentos (tipo, nome, valor, mes, user_id, parent_id)
VALUES ('entrada', 'Test', 100, '2025-01', 'some-user-id', 'some-agrupador-id-in-2025-01');
-- Expected: SUCCESS
```

## Rollback (if needed)

To rollback this migration:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trg_prevent_agrupador_mes_change_with_filhos ON lancamentos;
DROP TRIGGER IF EXISTS trg_validate_filho_mes_matches_parent ON lancamentos;
DROP TRIGGER IF EXISTS trg_validate_parent_is_agrupador ON lancamentos;

-- Drop functions
DROP FUNCTION IF EXISTS prevent_agrupador_mes_change_with_filhos();
DROP FUNCTION IF EXISTS validate_filho_mes_matches_parent();
DROP FUNCTION IF EXISTS validate_parent_is_agrupador();
```

## Performance Impact
- Minimal: ~1-2ms per INSERT/UPDATE with parent_id
- Uses existing indexes (idx_lancamentos_parent_id from migration 005)
- Triggers run BEFORE operations, blocking invalid transactions immediately

## Related Files
- Migration: `/supabase/migrations/006_agrupadores_constraints.sql`
- Repository: `/apps/api/src/repositories/lancamento.repository.ts`
  - Updated `findByMes()` to use atomic query (no race condition)
  - Updated `createFilho()` with defensive validations
