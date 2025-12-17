-- ============================================================================
-- Script de Validação: RLS Configuration
-- ============================================================================
-- Execute este script APÓS aplicar a migration 010_enable_rls.sql
-- para validar que RLS foi configurado corretamente.
--
-- USO:
--   psql $DATABASE_URL -f 010_validate_rls.sql
-- OU via Supabase Dashboard SQL Editor
-- ============================================================================

\echo '========================================='
\echo 'VALIDAÇÃO 1: RLS Habilitado'
\echo '========================================='

SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'usuarios',
    'perfis',
    'lancamentos',
    'categorias',
    'configuracoes',
    'sessoes',
    'google_calendar_tokens'
  )
ORDER BY tablename;

\echo ''
\echo '========================================='
\echo 'VALIDAÇÃO 2: Contagem de Policies'
\echo '========================================='

SELECT
  tablename,
  COUNT(*) AS policy_count,
  STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) AS operations_covered
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo 'Esperado: 4 policies por tabela (SELECT, INSERT, UPDATE, DELETE)'
\echo 'Exceções:'
\echo '  - usuarios: 4 policies (DELETE bloqueado por policy específica)'
\echo '  - sessoes: 3 policies (sem UPDATE)'
\echo ''

\echo '========================================='
\echo 'VALIDAÇÃO 3: Policies Detalhadas'
\echo '========================================='

SELECT
  tablename,
  policyname,
  cmd AS operation,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN '✓ Permissive'
    ELSE '✗ Restrictive'
  END AS policy_type,
  pg_get_expr(qual, (schemaname || '.' || tablename)::regclass) AS using_clause,
  pg_get_expr(with_check, (schemaname || '.' || tablename)::regclass) AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

\echo ''
\echo '========================================='
\echo 'VALIDAÇÃO 4: Índices Relacionados a RLS'
\echo '========================================='

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%user_id%'
    OR indexname LIKE '%perfil_id%'
  )
ORDER BY tablename, indexname;

\echo ''
\echo 'Nota: Índices em user_id e perfil_id otimizam performance mesmo com policies permissivas'
\echo ''

\echo '========================================='
\echo 'VALIDAÇÃO 5: Foreign Keys (Integridade)'
\echo '========================================='

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (
    kcu.column_name IN ('user_id', 'perfil_id', 'usuario_id', 'parent_id')
  )
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo 'Esperado: CASCADE em perfil_id e user_id para propagar deleções'
\echo ''

\echo '========================================='
\echo 'VALIDAÇÃO 6: Tabela Categorias'
\echo '========================================='

SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'categorias'
ORDER BY ordinal_position;

\echo ''
\echo '========================================='
\echo 'VALIDAÇÃO 7: Triggers Updated_At'
\echo '========================================='

SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

\echo ''
\echo '========================================='
\echo 'VALIDAÇÃO 8: Contagem de Dados'
\echo '========================================='

DO $$
DECLARE
  usuarios_count INTEGER;
  perfis_count INTEGER;
  lancamentos_count INTEGER;
  categorias_count INTEGER;
  configuracoes_count INTEGER;
  sessoes_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO usuarios_count FROM usuarios;
  SELECT COUNT(*) INTO perfis_count FROM perfis;
  SELECT COUNT(*) INTO lancamentos_count FROM lancamentos;
  SELECT COUNT(*) INTO categorias_count FROM categorias;
  SELECT COUNT(*) INTO configuracoes_count FROM configuracoes;
  SELECT COUNT(*) INTO sessoes_count FROM sessoes;

  RAISE NOTICE '';
  RAISE NOTICE 'Contagem de Registros:';
  RAISE NOTICE '  usuarios: %', usuarios_count;
  RAISE NOTICE '  perfis: %', perfis_count;
  RAISE NOTICE '  lancamentos: %', lancamentos_count;
  RAISE NOTICE '  categorias: %', categorias_count;
  RAISE NOTICE '  configuracoes: %', configuracoes_count;
  RAISE NOTICE '  sessoes: %', sessoes_count;
  RAISE NOTICE '';

  -- Validações
  IF usuarios_count > 0 AND perfis_count = 0 THEN
    RAISE WARNING 'ATENÇÃO: Existem usuários mas nenhum perfil!';
  END IF;

  IF perfis_count > 0 AND configuracoes_count = 0 THEN
    RAISE WARNING 'ATENÇÃO: Existem perfis mas nenhuma configuração!';
  END IF;

  IF lancamentos_count > 0 THEN
    DECLARE
      lancamentos_sem_perfil INTEGER;
    BEGIN
      SELECT COUNT(*) INTO lancamentos_sem_perfil
      FROM lancamentos
      WHERE perfil_id IS NULL;

      IF lancamentos_sem_perfil > 0 THEN
        RAISE WARNING 'ERRO: % lançamentos sem perfil_id!', lancamentos_sem_perfil;
      ELSE
        RAISE NOTICE '✓ Todos os lançamentos têm perfil_id';
      END IF;
    END;
  END IF;

  RAISE NOTICE '';
END $$;

\echo '========================================='
\echo 'VALIDAÇÃO 9: Teste de Acesso (Superuser)'
\echo '========================================='

SELECT
  current_user AS connected_as,
  usesuper AS is_superuser
FROM pg_user
WHERE usename = current_user;

\echo ''
\echo 'IMPORTANTE: Se is_superuser = true, RLS NÃO se aplica.'
\echo 'Para testar RLS, conecte com usuário não-superuser (anon, authenticated, etc).'
\echo ''

\echo '========================================='
\echo 'VALIDAÇÃO 10: Resumo de Segurança'
\echo '========================================='

DO $$
DECLARE
  tables_with_rls INTEGER;
  total_policies INTEGER;
  tables_without_pk INTEGER;
  tables_without_fk INTEGER;
BEGIN
  -- Contar tabelas com RLS
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  -- Contar policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Contar tabelas sem PK
  SELECT COUNT(*) INTO tables_without_pk
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = t.table_schema
        AND tc.table_name = t.table_name
        AND tc.constraint_type = 'PRIMARY KEY'
    );

  -- Contar tabelas sem FK em user_id/perfil_id (que deveriam ter)
  SELECT COUNT(*) INTO tables_without_fk
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('usuarios', 'perfis')
    AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = t.table_schema
        AND c.table_name = t.table_name
        AND c.column_name IN ('user_id', 'perfil_id')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = t.table_schema
        AND tc.table_name = t.table_name
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name IN ('user_id', 'perfil_id')
    );

  RAISE NOTICE '';
  RAISE NOTICE '===== RESUMO DE SEGURANÇA =====';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelas com RLS habilitado: %', tables_with_rls;
  RAISE NOTICE 'Total de policies criadas: %', total_policies;
  RAISE NOTICE 'Tabelas sem PRIMARY KEY: %', tables_without_pk;
  RAISE NOTICE 'Tabelas sem FK em user_id/perfil_id: %', tables_without_fk;
  RAISE NOTICE '';

  IF tables_with_rls >= 7 THEN
    RAISE NOTICE '✓ RLS está habilitado em todas as tabelas principais';
  ELSE
    RAISE WARNING '✗ RLS não está habilitado em todas as tabelas esperadas';
  END IF;

  IF total_policies >= 25 THEN
    RAISE NOTICE '✓ Policies criadas (esperado: ~28)';
  ELSE
    RAISE WARNING '✗ Poucas policies criadas (esperado: ~28, encontrado: %)', total_policies;
  END IF;

  IF tables_without_pk = 0 THEN
    RAISE NOTICE '✓ Todas as tabelas têm PRIMARY KEY';
  ELSE
    RAISE WARNING '✗ % tabelas sem PRIMARY KEY!', tables_without_pk;
  END IF;

  IF tables_without_fk = 0 THEN
    RAISE NOTICE '✓ Todas as tabelas têm FOREIGN KEYS apropriadas';
  ELSE
    RAISE WARNING '✗ % tabelas sem FOREIGN KEYS em user_id/perfil_id', tables_without_fk;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
END $$;

\echo ''
\echo '========================================='
\echo 'CONCLUSÃO'
\echo '========================================='
\echo ''
\echo 'Se todos os checks passaram:'
\echo '  1. RLS está habilitado corretamente'
\echo '  2. Policies estão criadas e permissivas'
\echo '  3. Índices estão otimizados'
\echo '  4. Foreign keys garantem integridade'
\echo ''
\echo 'Próximos passos:'
\echo '  1. Testar via API (curl ou Postman)'
\echo '  2. Verificar logs de performance'
\echo '  3. Monitorar queries lentas'
\echo '  4. Implementar audit logging (futuro)'
\echo ''
\echo '========================================='
