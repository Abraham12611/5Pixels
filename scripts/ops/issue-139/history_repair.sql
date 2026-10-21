-- Issue #139 PR B: migration-history repair v6 (exact production script).
-- Supersedes v5 (re-baselined: prod accumulated 4 more canonical rows —
-- 20261104000001, 20261105000001 (PR C profile grants, applied 2026-10-21),
-- 20261106000001 (PR D rpc_least_privilege, applied by owner), and
-- 20261107000001 — for a 152-row pre-state, not 148). Deletion set is
-- unchanged: the same 60 app-timestamp duplicates.
-- Preconditions (operational):
--   * All canonical rows already present on prod; this script inserts
--     nothing (delete-only).
--   * The 3 extra abraham-email rows 20260925151956, 20261024000002,
--     20261026000001 are canonical and MUST remain.
--   * Backups: schema_migrations_backup_139 (119), _v2 (126), _v3 (128),
--     _v4 (140), _v5 (148), _v6 (152 = current live).
--   * Off-production export: schema_migrations_20261021b.json.enc in the
--     Secure backups folder (152 rows, round-trip verified, sha256 in
--     schema_migrations_20261021b.sha256; key in Keychain under service
--     '5pixels-issue139-schema-migrations-20261021b').
-- Guard: aborts unless the live history digest equals the rehearsed
-- pre-state (152 rows), so it cannot run against a history that has moved
-- since rehearsal.
BEGIN;
LOCK TABLE supabase_migrations.schema_migrations IN EXCLUSIVE MODE;
DO $$
DECLARE
  v_digest TEXT;
  v_deleted INT;
  v_targets TEXT[] := ARRAY[
    '20260831185638',
    '20260831191440',
    '20260831202951',
    '20260831212748',
    '20260901103533',
    '20260901104206',
    '20260901160548',
    '20260901160737',
    '20260902090524',
    '20260902091317',
    '20260902092225',
    '20260907123128',
    '20260907131932',
    '20260907144707',
    '20260908112743',
    '20260912183720',
    '20260912183738',
    '20260912183755',
    '20260912183942',
    '20260915091743',
    '20260915095940',
    '20260915164356',
    '20260919214858',
    '20260919222905',
    '20260924141510',
    '20260924141520',
    '20260924141535',
    '20260926091913',
    '20260926211902',
    '20260926220729',
    '20260927135538',
    '20260927190758',
    '20260929205415',
    '20260929205426',
    '20260930081121',
    '20261002191012',
    '20261006105646',
    '20261008154027',
    '20261008154044',
    '20261008154057',
    '20261008154110',
    '20261009121129',
    '20261009141926',
    '20261009162204',
    '20261010183532',
    '20261010183557',
    '20261010183703',
    '20261010193014',
    '20261011140418',
    '20261011151517',
    '20261013100643',
    '20261013104642',
    '20261013153845',
    '20261014070615',
    '20261017061521',
    '20261017061642',
    '20261017061656',
    '20261017064237',
    '20261017075236',
    '20261017075303'
  ];
BEGIN
  SELECT md5(string_agg(version||'|'||coalesce(name,'')||'|'||coalesce(created_by,'')||'|'||coalesce(idempotency_key,'')||'|'||coalesce(array_to_string(statements,E'\x1f'),'')||'|'||coalesce(array_to_string(rollback,E'\x1f'),''), E'\x1e' ORDER BY version))
    INTO v_digest FROM supabase_migrations.schema_migrations;
  IF v_digest <> 'd35a4d6a800bc734cde168b532de226a' THEN
    RAISE EXCEPTION 'history digest % does not match rehearsed pre-state d35a4d6a800bc734cde168b532de226a; re-plan', v_digest;
  END IF;
  IF array_length(v_targets, 1) <> 60 THEN RAISE EXCEPTION 'expected 60 targets'; END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations_backup_139_v6 WHERE version = ANY (v_targets)) <> 60 THEN
    RAISE EXCEPTION 'not all 60 targets are in schema_migrations_backup_139_v6';
  END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = ANY (v_targets)) <> 60 THEN
    RAISE EXCEPTION 'not all 60 targets still present in live history';
  END IF;

  DELETE FROM supabase_migrations.schema_migrations WHERE version = ANY (v_targets);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 60 THEN RAISE EXCEPTION 'deleted % rows, expected 60', v_deleted; END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 92 THEN
    RAISE EXCEPTION 'post-repair count % <> 92', (SELECT count(*) FROM supabase_migrations.schema_migrations);
  END IF;
END $$;
COMMIT;
