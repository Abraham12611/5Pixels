-- #185 release verification: hosted migration-chain + security invariants.
--
-- Read-only. Run AFTER the pending migration chain has been applied to the
-- hosted Supabase project:
--
--   psql "$DATABASE_URL" -f scripts/verify-security-chain.sql
--
-- Every check returns one row; the final section aborts with an exception
-- if any check failed, so this is safe to wire into a deploy gate.
--
-- Pending chain validated locally (clean `supabase db reset` replay):
--   20261028000001_preset_family_input_contract
--   20261029000001_preset_user_prompt_db_gate
--   20261030000001_release_multi_image_generation
--   20261030000002_variant_discovery_attribution
--   20261031000001_fix_profiles_rls_recursion

\set ON_ERROR_STOP on
SET check_function_bodies = off;

CREATE TEMP TABLE _verify(name TEXT PRIMARY KEY, pass BOOLEAN, detail TEXT);

-- ------------------------------------------------------------------
-- 1. Migration registration (drift check)
-- ------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    INSERT INTO _verify VALUES
      ('migrations.registry.exists', FALSE,
       'supabase_migrations.schema_migrations missing — how were migrations applied?');
  ELSE
    INSERT INTO _verify
    SELECT 'migrations.' || v || '.registered',
           EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = v),
           COALESCE(
             (SELECT 'registered' FROM supabase_migrations.schema_migrations
              WHERE version = v), 'NOT REGISTERED — migration ran without recording a version')
    FROM (VALUES
      ('20261028000001'), ('20261029000001'),
      ('20261030000001'), ('20261030000002'), ('20261031000001')) AS t(v);
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 2. release_gates — prompt gate must be OFF and unreachable
-- ------------------------------------------------------------------
INSERT INTO _verify
SELECT 'release_gates.table_exists', to_regclass('public.release_gates') IS NOT NULL, '';

INSERT INTO _verify
SELECT 'release_gates.rls_enabled',
       COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname='release_gates' AND relkind='r'), FALSE), '';

INSERT INTO _verify
SELECT 'release_gates.preset_user_prompt_disabled',
       COALESCE((SELECT NOT enabled FROM public.release_gates WHERE key='preset_user_prompt'), FALSE),
       (SELECT COALESCE('enabled=' || enabled::TEXT, 'ROW MISSING')
        FROM public.release_gates WHERE key='preset_user_prompt');

INSERT INTO _verify
SELECT 'release_gates.no_public_grants',
       NOT EXISTS (
         SELECT 1 FROM information_schema.role_table_grants
         WHERE table_name='release_gates' AND grantee IN ('anon','authenticated')),
       'anon/authenticated must hold zero privileges on release_gates';

-- ------------------------------------------------------------------
-- 3. #195 recursion fix — plpgsql helpers + clean profiles_read_self
-- ------------------------------------------------------------------
INSERT INTO _verify
SELECT 'helpers.is_admin.plpgsql_noninlinable',
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
               WHERE p.pronamespace='public'::regnamespace
                 AND p.proname='is_admin' AND l.lanname='plpgsql' AND p.prosecdef), '';

INSERT INTO _verify
SELECT 'helpers.is_owner.plpgsql_noninlinable',
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
               WHERE p.pronamespace='public'::regnamespace
                 AND p.proname='is_owner' AND l.lanname='plpgsql' AND p.prosecdef), '';

INSERT INTO _verify
SELECT 'profiles_read_self.no_self_subquery',
       EXISTS (SELECT 1 FROM pg_policies
               WHERE tablename='profiles' AND policyname='profiles_read_self'
                 AND qual LIKE '%is_admin()%'
                 AND qual NOT LIKE '%FROM public.profiles%'),
       'policy must route the admin check through is_admin(), not a raw self-subquery';

-- ------------------------------------------------------------------
-- 4. #176/#179/#181 contract objects
-- ------------------------------------------------------------------
INSERT INTO _verify
SELECT 'generation_input_assets.exists_rls',
       to_regclass('public.generation_input_assets') IS NOT NULL
         AND COALESCE((SELECT relrowsecurity FROM pg_class
                       WHERE relname='generation_input_assets' AND relkind='r'), FALSE), '';

INSERT INTO _verify
SELECT 'generation_input_assets.owner_policy',
       EXISTS (SELECT 1 FROM pg_policies
               WHERE tablename='generation_input_assets'
                 AND qual LIKE '%generation_input_is_owner%'
                 AND qual LIKE '%is_admin()%'), '';

INSERT INTO _verify
SELECT 'assets.moderation_object_version.text',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='assets'
                 AND column_name='moderation_object_version' AND data_type='text'), '';

INSERT INTO _verify
SELECT 'products.family_columns',
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name='products'
          AND column_name IN ('parent_preset_id','standalone_discoverable','variant_display_name')) = 3, '';

INSERT INTO _verify
SELECT 'product_versions.input_capability_columns',
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name='product_versions'
          AND column_name IN ('input_min_images','input_max_images',
                              'input_image_roles','input_mode',
                              'prompt_override_enabled')) = 5, '';

-- ------------------------------------------------------------------
-- 5. Moderation + storage integrity triggers
-- ------------------------------------------------------------------
INSERT INTO _verify
SELECT 'trigger.assets.moderation_escalation',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='prevent_asset_moderation_escalation'), '';

INSERT INTO _verify
SELECT 'trigger.storage.approved_immutable',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='prevent_approved_asset_content_overwrite'), '';

INSERT INTO _verify
SELECT 'trigger.profiles.privilege_escalation',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='prevent_profile_privilege_escalation'), '';

-- ------------------------------------------------------------------
-- 6. create_generation — full 5-arg signature + embedded protections
-- ------------------------------------------------------------------
INSERT INTO _verify
SELECT 'create_generation.5arg_signature',
       EXISTS (SELECT 1 FROM pg_proc
               WHERE pronamespace='public'::regnamespace AND proname='create_generation'
                 AND pg_get_function_identity_arguments(oid) LIKE '%p_user_prompt%'), '';

INSERT INTO _verify
SELECT 'create_generation.enforces_moderation',
       EXISTS (SELECT 1 FROM pg_proc
               WHERE pronamespace='public'::regnamespace AND proname='create_generation'
                 AND pg_get_functiondef(oid) LIKE '%moderation_status%'
                 AND pg_get_functiondef(oid) LIKE '%approved%'), '';

INSERT INTO _verify
SELECT 'create_generation.binds_input_roles',
       EXISTS (SELECT 1 FROM pg_proc
               WHERE pronamespace='public'::regnamespace AND proname='create_generation'
                 AND pg_get_functiondef(oid) LIKE '%input_roles%'), '';

INSERT INTO _verify
SELECT 'create_generation.checks_release_gate',
       EXISTS (SELECT 1 FROM pg_proc
               WHERE pronamespace='public'::regnamespace AND proname='create_generation'
                 AND pg_get_functiondef(oid) LIKE '%release_gates%'), '';

INSERT INTO _verify
SELECT 'create_generation.empty_search_path',
       NOT EXISTS (SELECT 1 FROM pg_proc
                   WHERE pronamespace='public'::regnamespace AND proname='create_generation'
                     AND (proconfig IS NULL
                          OR array_to_string(proconfig, ' ') NOT LIKE '%search_path=%')), '';

-- ------------------------------------------------------------------
-- 7. asset_object_version helper — definer-only
-- ------------------------------------------------------------------
INSERT INTO _verify
SELECT 'asset_object_version.exists_secdef',
       EXISTS (SELECT 1 FROM pg_proc
               WHERE pronamespace='public'::regnamespace
                 AND proname='asset_object_version' AND prosecdef), '';

INSERT INTO _verify
SELECT 'asset_object_version.no_public_execute',
       NOT EXISTS (SELECT 1 FROM pg_proc
                   WHERE pronamespace='public'::regnamespace
                     AND proname='asset_object_version'
                     AND (proacl IS NULL
                          OR proacl::TEXT ~ '(anon|authenticated)[=/]')), '';

-- ------------------------------------------------------------------
-- 8. RLS enabled on every protected table
-- ------------------------------------------------------------------
INSERT INTO _verify
SELECT 'rls.' || t, COALESCE((SELECT relrowsecurity FROM pg_class WHERE relname=t AND relkind='r'), FALSE), ''
FROM (VALUES ('profiles'), ('assets'), ('products'), ('product_versions'),
             ('generation_input_assets'), ('release_gates'), ('generations'),
             ('credit_ledger')) AS t(t);

-- ------------------------------------------------------------------
-- Result
-- ------------------------------------------------------------------
SELECT name, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, detail
FROM _verify ORDER BY name;

DO $$
DECLARE v_fail INT;
BEGIN
  SELECT COUNT(*) INTO v_fail FROM _verify WHERE NOT pass;
  IF v_fail > 0 THEN
    RAISE EXCEPTION 'security-chain verification FAILED: % check(s) failed — see rows above', v_fail;
  END IF;
  RAISE NOTICE 'security-chain verification: all checks passed';
END $$;
