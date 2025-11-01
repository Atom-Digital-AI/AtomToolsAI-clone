-- Verification Script: Check RLS Status
-- Run this in Supabase SQL Editor to see which tables need RLS

-- ============================================================================
-- 1. Check which tables have RLS enabled
-- ============================================================================
SELECT 
  tablename, 
  CASE WHEN rowsecurity THEN '✓ Enabled' ELSE '✗ DISABLED' END as rls_status,
  (SELECT count(*) 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
  AND tablename NOT IN ('spatial_ref_sys', '_prisma_migrations', 'drizzle_migrations')
ORDER BY 
  CASE WHEN rowsecurity THEN 1 ELSE 0 END,
  tablename;

-- ============================================================================
-- 2. List tables WITHOUT RLS (these need to be fixed)
-- ============================================================================
SELECT 
  'Tables missing RLS:' as status,
  count(*) as count
FROM pg_tables t
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
  AND tablename NOT IN ('spatial_ref_sys', '_prisma_migrations', 'drizzle_migrations')
  AND NOT rowsecurity;

-- ============================================================================
-- 3. Show actual table names missing RLS
-- ============================================================================
SELECT tablename
FROM pg_tables t
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
  AND tablename NOT IN ('spatial_ref_sys', '_prisma_migrations', 'drizzle_migrations')
  AND NOT rowsecurity
ORDER BY tablename;

-- ============================================================================
-- 4. List all policies currently defined
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN 'Allow'
    ELSE 'Restrict'
  END as type,
  CASE 
    WHEN cmd = '*' THEN 'ALL'
    ELSE cmd
  END as operations
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 5. Quick summary
-- ============================================================================
SELECT 
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%') as total_tables,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND rowsecurity) as tables_with_rls,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND NOT rowsecurity) as tables_without_rls,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as total_policies;

