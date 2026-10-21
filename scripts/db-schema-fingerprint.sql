-- db-schema-fingerprint.sql — schema drift check for issue #139.
--
-- Purpose: produce a stable, sorted "key|hash" fingerprint of everything
-- that matters in the public schema (function defs + EXECUTE grants,
-- columns, RLS policies + expressions, RLS flags, table/column grants,
-- triggers, indexes, constraints, views, storage buckets). Run it against
-- the local reset database and the hosted database, then diff the outputs
-- to surface repo-vs-prod drift.
--
-- Usage:
--   docker exec -i supabase_db_5pixels psql -U postgres -At < scripts/db-schema-fingerprint.sql
--   # and the equivalent psql invocation against the hosted DB.
--
-- Function bodies are hashed after stripping `--` comments and collapsing
-- whitespace: SQL applied through the Supabase MCP arrives comment-stripped,
-- so raw pg_get_functiondef hashes would flag comment-only differences.
with fp(k, h) as (
  select 'fn:' || p.oid::regprocedure::text,
         md5(btrim(regexp_replace(regexp_replace(pg_get_functiondef(p.oid), '--[^\n]*', '', 'g'), '\s+', ' ', 'g'))
             || p.prosecdef::text || coalesce(p.proconfig::text, ''))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  union all
  select 'fngrant:' || p.oid::regprocedure::text,
         concat_ws(',',
           case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'anon' end,
           case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'authenticated' end,
           case when has_function_privilege('service_role', p.oid, 'EXECUTE') then 'service_role' end)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  union all
  select 'col:' || c.table_name || '.' || c.column_name,
         md5(c.data_type || c.is_nullable || coalesce(c.column_default, ''))
  from information_schema.columns c
  where c.table_schema = 'public'
  union all
  select 'pol:' || p.schemaname || '.' || p.tablename || '.' || p.policyname,
         md5(p.cmd || p.permissive || p.roles::text || coalesce(p.qual, '') || coalesce(p.with_check, ''))
  from pg_policies p
  where p.schemaname in ('public', 'storage')
  union all
  select 'rls:' || c.relname, c.relrowsecurity::text || c.relforcerowsecurity::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
  union all
  select 'tgrant:' || g.table_name || ':' || g.grantee,
         string_agg(g.privilege_type, ',' order by g.privilege_type)
  from information_schema.role_table_grants g
  where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated', 'service_role')
  group by g.table_name, g.grantee
  union all
  select 'cgrant:' || g.table_name || '.' || g.column_name || ':' || g.grantee,
         string_agg(g.privilege_type, ',' order by g.privilege_type)
  from information_schema.column_privileges g
  where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
    and not exists (
      select 1 from information_schema.role_table_grants t
      where t.table_schema = g.table_schema and t.table_name = g.table_name
        and t.grantee = g.grantee and t.privilege_type = g.privilege_type)
  group by g.table_name, g.column_name, g.grantee
  union all
  select 'trg:' || c.relname || '.' || t.tgname, md5(pg_get_triggerdef(t.oid))
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'storage', 'auth') and not t.tgisinternal
    and (n.nspname = 'public' or t.tgname not like 'supabase%')
  union all
  select 'idx:' || i.indexname, md5(i.indexdef)
  from pg_indexes i where i.schemaname = 'public'
  union all
  select 'con:' || c.conrelid::regclass::text || '.' || c.conname, md5(pg_get_constraintdef(c.oid))
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public'
  union all
  select 'view:' || c.relname, md5(pg_get_viewdef(c.oid) || coalesce(c.reloptions::text, ''))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
  union all
  select 'bucket:' || b.id, b.public::text || coalesce(b.file_size_limit::text, '') || coalesce(b.allowed_mime_types::text, '')
  from storage.buckets b
)
SELECT k || '|' || coalesce(h,'') FROM fp ORDER BY k;
