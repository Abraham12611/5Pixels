-- Issue #139 PR B: migration-history repair v3 (exact production script).
-- Supersedes v2 (which covered 58 rows before the editorial-block applies).
-- Preconditions (operational):
--   * #143, #145 (incl. 20261023000004), #146 (20261024000001_duplicate_article),
--     #147 (20261024000002_articles_listing_search, 20261026000001_public_article_media_map),
--     #148 (20261025000001_article_preset_publish_check) and the
--     article-prompt-settings PR (20261027000001_article_editorial_blocks)
--     merged to develop with exactly these versions.
--   * 20261023000004_converge_article_media applied on prod and recorded as
--     (version='20261023000004', name='converge_article_media',
--      created_by='issue-139-pr-b').
--   * Backups: schema_migrations_backup_139 (119), _backup_139_v2 (126),
--     _backup_139_v3 (128).
-- Guard: aborts unless the live history digest equals the rehearsed pre-state
-- (129 rows: 128 live + the recorded 0004 row), so it cannot run against a
-- history that has moved since rehearsal.
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
  IF v_digest <> '390b270a197e62bb774611aba55cbc2e' THEN
    RAISE EXCEPTION 'history digest % does not match rehearsed pre-state 390b270a197e62bb774611aba55cbc2e; re-plan', v_digest;
  END IF;
  IF array_length(v_targets, 1) <> 60 THEN RAISE EXCEPTION 'expected 60 targets'; END IF;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations_backup_139_v3 WHERE version = ANY (v_targets)) <> 60 THEN
    RAISE EXCEPTION 'not all 60 targets are in schema_migrations_backup_139_v3';
  END IF;

  INSERT INTO supabase_migrations.schema_migrations (version, name, created_by) VALUES
  ('20261017000001','subsidy_budgets','issue-139-history-repair'),
  ('20261018000001','referrer_cap_and_hold','issue-139-history-repair'),
  ('20261019000001','drop_legacy_claim_referrer_reward','issue-139-history-repair'),
  ('20261020000001','release_referral_hold','issue-139-history-repair'),
  ('20261018000002','articles_foundation','issue-139-history-repair'),
  ('20261020000002','article_media','issue-139-history-repair'),
  ('20261024000001','duplicate_article','issue-139-history-repair'),
  ('20261025000001','article_preset_publish_check','issue-139-history-repair'),
  ('20261027000001','article_editorial_blocks','issue-139-history-repair');

  DELETE FROM supabase_migrations.schema_migrations WHERE version = ANY (v_targets);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 60 THEN RAISE EXCEPTION 'deleted % rows, expected 60', v_deleted; END IF;
END $$;
COMMIT;
