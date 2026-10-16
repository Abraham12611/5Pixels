-- Issue #139 PR B: migration-history repair (exact production script).
-- Precondition: supabase_migrations.schema_migrations_backup_139 exists (119 rows).
BEGIN;
LOCK TABLE supabase_migrations.schema_migrations IN EXCLUSIVE MODE;

-- 1. Record the 4 content-applied repo migrations under their repo versions.
INSERT INTO supabase_migrations.schema_migrations (version, name, created_by) VALUES

  ('20261017000001','subsidy_budgets','issue-139-history-repair'),
  ('20261018000001','referrer_cap_and_hold','issue-139-history-repair'),
  ('20261019000001','drop_legacy_claim_referrer_reward','issue-139-history-repair'),
  ('20261020000001','release_referral_hold','issue-139-history-repair')
ON CONFLICT (version) DO NOTHING;

-- 2. Remove the 54 app-timestamp duplicates (originals kept in the backup).
DO $$
DECLARE
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
  '20261014070615'
  ];
  v_backed  INT;
  v_deleted INT;
BEGIN
  IF array_length(v_targets, 1) <> 54 THEN RAISE EXCEPTION 'expected 54 targets'; END IF;
  SELECT count(*) INTO v_backed FROM supabase_migrations.schema_migrations_backup_139 b
   WHERE b.version = ANY (v_targets);
  IF v_backed <> 54 THEN RAISE EXCEPTION 'only % of 54 targets present in backup', v_backed; END IF;
  DELETE FROM supabase_migrations.schema_migrations WHERE version = ANY (v_targets);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 54 THEN RAISE EXCEPTION 'deleted % rows, expected 54', v_deleted; END IF;
END $$;
COMMIT;
