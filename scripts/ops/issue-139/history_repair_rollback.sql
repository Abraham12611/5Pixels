-- Issue #139 PR B: ROLLBACK of history repair — restores schema_migrations
-- byte-for-byte to the pre-repair state (all backup_139 rows + the 3 PR-B rows).
BEGIN;
LOCK TABLE supabase_migrations.schema_migrations IN EXCLUSIVE MODE;
DELETE FROM supabase_migrations.schema_migrations
 WHERE version IN ('20261017000001','20261018000001','20261019000001','20261020000001')
   AND created_by = 'issue-139-history-repair';
INSERT INTO supabase_migrations.schema_migrations
SELECT b.* FROM supabase_migrations.schema_migrations_backup_139 b
 WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations m WHERE m.version = b.version);
COMMIT;
