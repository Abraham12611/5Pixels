# Issue #139 — Production database rollout record

Hosted project: `5Pixels` (`euoasoqxowgcafcnzljq`, eu-west-1, PostgreSQL 17).
All production changes below were made with explicit owner approval. No
secrets, JWTs or user data are recorded here.

## 1. Changes applied (done)

| When (UTC) | Change | Recorded in `schema_migrations` as |
|---|---|---|
| 2026-10-16 ~10:55 | PR A (#143): `get_active_plan_id` caller check | `20261023000001` |
| 2026-10-16 ~11:20 | PR B (#145): backup table `supabase_migrations.schema_migrations_backup_139` (119 rows, digest `2917941d9849489a9e7a538f55e3afd2`) | — |
| same transaction | `20261016000001_fix_referral_code_search_path.sql` (never previously applied) | `20261016000001` |
| same transaction | `20261023000002_referral_trigger_search_path.sql` | `20261023000002` |
| same transaction | `20261023000003_converge_hosted_drift.sql` | `20261023000003` |

Each migration was applied verbatim from the repo file and recorded under its
**repo version**, so no new drift was introduced.

History digest formula (used throughout):
`md5(string_agg(version|name|created_by|idempotency_key|array_to_string(statements,E'\x1f')|array_to_string(rollback,E'\x1f'), E'\x1e' ORDER BY version))`

- Before PR B: 119 rows, `2917941d9849489a9e7a538f55e3afd2` (= backup table).
- After PR B (current): 122 rows, `ec1801cb960b78cd14484633d6046b04`.

### Schema fingerprint after rollout

`scripts/db-schema-fingerprint.sql` (1240 keys locally, 1030 on prod) run on
production and on a local `supabase db reset` of `develop` + #143 + #145:

- Production keys not in repo: **0**. Hash mismatches outside Articles: **0**.
- Remaining differences are exclusively the intentionally pending Articles
  work (`20261018000002_articles_foundation`, `20261020000002_article_media`):
  210 Articles-only keys plus the Articles clause in `pol:public.assets.assets_select`.

### Rollback of the applied schema changes

Not expected to be needed; if required, re-apply the previous definitions:

- `get_active_plan_id`: the `LANGUAGE sql` body from `20260905100001_credit_cost_engine.sql`.
- `generate_referral_code` / `set_profile_referral_code`: the bodies from
  `20261001000001_referral_codes.sql` (re-introduces the signup bug — do not
  roll back without a replacement).
- Policies: `20261023000003` was a no-op on prod (it restates prod's own
  `public.is_admin()` policies), so there is nothing to roll back.
- `create_generation`: the only prod change is the `'reserve:'` prefix on new
  reservation keys. The previous definition is the `create_generation` block
  in the `statements` of backup row `20261010183532`; re-run only that
  `CREATE OR REPLACE FUNCTION` statement (never the whole migration).

## 2. Original history preservation (done)

1. **In-database:** `supabase_migrations.schema_migrations_backup_139` — full
   copy incl. original `statements`; no `anon`/`authenticated` privileges.
2. **Off-production, encrypted:** `~/Secure/5pixels-backups/schema_migrations_20261016.json.enc`
   on the operator's machine (mode 0600).
   - Cipher: `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256`.
   - Passphrase: macOS Keychain item service
     `5pixels-issue139-schema-migrations-20261016`, account
     `5pixels-migration-history-backup`.
   - Plaintext SHA-256: `9b852954479302bc0544004a8c1564a0aa5dcf42e0f6a1bb7ebe9988c29e1675`
     (also in `schema_migrations_20261016.sha256`); round-trip decrypt verified.
   - Decrypt:
     ```bash
     security find-generic-password -s 5pixels-issue139-schema-migrations-20261016 -w \
       | openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 \
           -in ~/Secure/5pixels-backups/schema_migrations_20261016.json.enc -pass stdin
     ```
   - Recommended: copy the `.enc` file to a second off-machine location
     (owner action).

## 3. Pending — history repair (awaiting owner authorization)

Scripts: `scripts/ops/issue-139/history_repair.sql` and
`scripts/ops/issue-139/history_repair_rollback.sql` (exact text to be run).

The repair, in one transaction with `LOCK TABLE … IN EXCLUSIVE MODE`:

1. Inserts repo-version rows for 4 migrations whose content is already applied
   on prod under app timestamps (verified: identical function/table
   fingerprints): `20261017000001`, `20261018000001`, `20261019000001`,
   `20261020000001`.
2. Deletes the 54 app-timestamp duplicates listed below. Guards: aborts unless
   exactly 54 targets are listed, all 54 exist in the backup table, and exactly
   54 rows are deleted.

### Why each deletion is safe

Common to all 54 rows:

- `schema_migrations` rows do not affect schema or data; they only tell the
  CLI what has been applied.
- Every row duplicates exactly one repo migration file whose repo-version row
  is present (or is inserted by step 1); the production schema already equals
  the repo's (fingerprint above), so the repo-version row is the accurate
  record.
- The Supabase CLI independently names exactly these 54 versions as
  "Remote migration versions not found in local migrations directory" and
  refuses to push until they are reverted (rehearsal step 2).
- Each row, including the original SQL that ran, is preserved in the backup
  table and the encrypted export, and the rollback script restores them.

### The 54 versions

| # | Remote version (to delete) | Recorded name | Duplicates repo migration | Repo-version row | Note |
|---|---|---|---|---|---|
| 1 | `20260831185638` | `initial_schema` | `00000000000000_initial_schema.sql` | present | Applied an earlier draft of initial_schema; resulting policy deltas converged by 20261023000003. |
| 2 | `20260831191440` | `harden_security` | `20260831190000_harden_security.sql` | present |  |
| 3 | `20260831202951` | `admin_asset_storage` | `20260901000000_admin_asset_storage.sql` | present |  |
| 4 | `20260831212748` | `publish_gates_admin_actions` | `20260901000001_publish_gates_admin_actions.sql` | present |  |
| 5 | `20260901103533` | `consumer_catalog_favorites` | `20260901000002_consumer_catalog_favorites.sql` | present |  |
| 6 | `20260901104206` | `remove_duplicate_favorites_index` | `20260901000003_remove_duplicate_favorites_index.sql` | present |  |
| 7 | `20260901160548` | `generation_vertical_slice` | `20260901000004_generation_vertical_slice.sql` | present |  |
| 8 | `20260901160737` | `remove_legacy_user_asset_policies` | `20260901000005_remove_legacy_user_asset_policies.sql` | present |  |
| 9 | `20260902090524` | `fix_create_generation_ambiguous_status` | `20260902000001_fix_create_generation_ambiguous_status.sql` | present |  |
| 10 | `20260902091317` | `fix_generation_pgcrypto_search_path` | `20260902000002_fix_generation_pgcrypto_search_path.sql` | present |  |
| 11 | `20260902092225` | `fix_attach_provider_request_ambiguous_status` | `20260902000003_fix_attach_provider_request_ambiguous_status.sql` | present |  |
| 12 | `20260907123128` | `admin_alerts` | `20260909100000_admin_alerts.sql` | present |  |
| 13 | `20260907131932` | `generation_feedback` | `20260910100000_generation_feedback.sql` | present |  |
| 14 | `20260907144707` | `public_sharing` | `20260911100000_public_sharing.sql` | present |  |
| 15 | `20260908112743` | `notifications` | `20260912100000_notifications.sql` | present |  |
| 16 | `20260912183720` | `account_deletion` | `20260907100000_account_deletion.sql` | present |  |
| 17 | `20260912183738` | `user_settings_and_retention` | `20260908100000_user_settings_and_retention.sql` | present |  |
| 18 | `20260912183755` | `profile_fields` | `20260913100000_profile_fields.sql` | present |  |
| 19 | `20260912183942` | `settings_rls_and_function_hardening` | `20260914100000_settings_rls_and_function_hardening.sql` | present |  |
| 20 | `20260915091743` | `catalog_add_created_at_likeness` | `20260915000001_catalog_created_at_likeness.sql` | present | Name differs from file (catalog_add_… vs catalog_…); same migration. |
| 21 | `20260915095940` | `library_saved_downloaded_delete` | `20260916000001_library_saved_downloaded_delete.sql` | present |  |
| 22 | `20260915164356` | `notification_preferences_columns` | `20260917000001_notification_preferences.sql` | present | Name differs from file (…_columns); same migration. |
| 23 | `20260919214858` | `admin_lab_draft_generations` | `20260921000001_admin_lab_draft_generations.sql` | present |  |
| 24 | `20260919222905` | `resume_generation` | `20260921000002_resume_generation.sql` | present |  |
| 25 | `20260924141510` | `annual_plans_and_credit_drip` | `20260924000001_annual_plans_and_credit_drip.sql` | present |  |
| 26 | `20260924141520` | `polar_columns` | `20260925000001_polar_columns.sql` | present |  |
| 27 | `20260924141535` | `polar_sandbox_product_ids` | `20260926000001_polar_sandbox_product_ids.sql` | present |  |
| 28 | `20260926091913` | `growsurf_bridge` | `20260929000001_growsurf_bridge.sql` | present |  |
| 29 | `20260926211902` | `growsurf_milestone_rewards` | `20260929000002_growsurf_milestone_rewards.sql` | present |  |
| 30 | `20260926220729` | `creem_provider` | `20260929000003_creem_provider.sql` | present |  |
| 31 | `20260927135538` | `notifications_paused` | `20260927120000_notifications_paused.sql` | present |  |
| 32 | `20260927190758` | `20260929000004_creem_product_ids` | `20260929000004_creem_product_ids.sql` | present |  |
| 33 | `20260929205415` | `20261001000001_referral_codes` | `20261001000001_referral_codes.sql` | present |  |
| 34 | `20260929205426` | `20261001000002_onboarding` | `20261001000002_onboarding.sql` | present |  |
| 35 | `20260930081121` | `20261002000002_referee_signup_bonus` | `20261002000002_referee_signup_bonus.sql` | present |  |
| 36 | `20261002191012` | `legal_consent` | `20261003000001_legal_consent.sql` | present |  |
| 37 | `20261006105646` | `20261005000001_whop_provider` | `20261005000001_whop_provider.sql` | present |  |
| 38 | `20261008154027` | `20261004000001_credit_ledger_integrity` | `20261004000001_credit_ledger_integrity.sql` | present |  |
| 39 | `20261008154044` | `20261004000002_billing_rls_hardening` | `20261004000002_billing_rls_hardening.sql` | present |  |
| 40 | `20261008154057` | `20261004000003_drip_invoice_linkage_backfill` | `20261004000003_drip_invoice_linkage_backfill.sql` | present |  |
| 41 | `20261008154110` | `20261007000001_release_stale_reservations` | `20261007000001_release_stale_reservations.sql` | present |  |
| 42 | `20261009121129` | `20261008000001_bachs_provider` | `20261008000001_bachs_provider.sql` | present |  |
| 43 | `20261009141926` | `20261009000001_bachs_uniqueness` | `20261009000001_bachs_uniqueness.sql` | present |  |
| 44 | `20261009162204` | `20261009000002_bachs_live_catalog` | `20261009000002_bachs_live_catalog.sql` | present |  |
| 45 | `20261010183532` | `20261009000001_fixed_credit_pricing` | `20261010000001_fixed_credit_pricing.sql` | present | Applied an earlier draft of fixed_credit_pricing; create_generation delta converged by 20261023000003. |
| 46 | `20261010183557` | `20261011000001_fal_billing_reconciliation` | `20261011000001_fal_billing_reconciliation.sql` | present |  |
| 47 | `20261010183703` | `20261012000001_reserve_until_authoritative_settlement` | `20261012000001_reserve_until_authoritative_settlement.sql` | present |  |
| 48 | `20261010193014` | `20261013000001_redenominate_bonus_credits` | `20261013000001_redenominate_bonus_credits.sql` | present |  |
| 49 | `20261011140418` | `20261014000001_credit_denomination_0_01` | `20261014000001_credit_denomination_0_01.sql` | present |  |
| 50 | `20261011151517` | `20261015000001_pricing_policy_v2` | `20261015000001_pricing_policy_v2.sql` | present |  |
| 51 | `20261013100643` | `subsidy_budgets` | `20261017000001_subsidy_budgets.sql` | inserted by repair step 1 |  |
| 52 | `20261013104642` | `referrer_cap_and_hold` | `20261018000001_referrer_cap_and_hold.sql` | inserted by repair step 1 |  |
| 53 | `20261013153845` | `drop_legacy_claim_referrer_reward` | `20261019000001_drop_legacy_claim_referrer_reward.sql` | inserted by repair step 1 |  |
| 54 | `20261014070615` | `20261020000001_release_referral_hold` | `20261020000001_release_referral_hold.sql` | inserted by repair step 1 |  |

## 4. Rehearsal (done, local staging replica)

Replica construction: local Supabase stack reset from `develop` + #143 + #145
with the two Articles migrations withheld → schema fingerprint **identical to
production (1030/1030 keys, 0 differences)**. Production's exact
`schema_migrations` (122 rows, digest `ec1801cb…`) and backup table (119 rows,
digest `2917941d…`) were loaded from the encrypted export; digests verified
equal to production.

| Step | Command | Result |
|---|---|---|
| 1 | `supabase migration list --local` (before) | 68 matched, 6 local-only (4 content-applied + 2 Articles), **54 remote-only** |
| 2 | `supabase db push --local --dry-run` (before) | Refused: "Remote migration versions not found…"; CLI's suggested revert list == our 54 (diffed) |
| 3 | `history_repair.sql` | `INSERT 0 4`, 54 deleted; history 72 rows, digest `79cc6b4ec2865150a555ceaf8857ef76` |
| 4 | `supabase migration list --local` (after) | **72 matched, 0 remote-only**, 2 local-only (Articles) |
| 5 | `supabase db push --local --dry-run` (after) | Only the 2 Articles files reported (out-of-order); **no existing migration replayed** |
| 6 | `supabase db push --local --dry-run --include-all` | "Would push: 20261018000002_articles_foundation, 20261020000002_article_media" only |
| 7 | `history_repair_rollback.sql` | History restored to 122 rows, digest `ec1801cb…` (byte-identical to prod pre-repair) |
| 8 | `history_repair.sql` again | Back to 72 rows / `79cc6b4e…` (repeatable) |
| 9 | `history_repair.sql` a third time (already repaired) | Aborts: "deleted 0 rows, expected 54"; no change (fail-safe) |
| 10 | Real `supabase db push --local --include-all` | Applied only the 2 Articles migrations, cleanly; resulting schema fingerprint == full repo; `db push --dry-run` → "Local database is up to date" |

Note for the eventual Articles rollout: because `20261018000002` /
`20261020000002` sort before already-applied versions, `db push` needs
`--include-all` (rehearsed, step 10). That is an Articles-owner decision.

## 5. Regression checks on production (done, after section 1)

Executed in a single transaction that always rolls back (`RAISE` at end),
with synthetic users only; verified afterwards that **0** synthetic users,
ledger rows, snapshots and generations persisted.

| Area | Check | Result |
|---|---|---|
| Signup | 25 `auth.users` inserts under `search_path = ''` | 25/25 profiles, 25/25 valid 6-char codes, 25 distinct, 25 `user_settings` |
| Catalog | anon `get_public_catalog(…,'featured',1,24)` | 11 rows (= launch catalog), 0 rows with private markers in metadata |
| Catalog | anon `get_public_product_by_slug('cinematic-still')` | found |
| Catalog | anon direct `SELECT` on `products` | 42501 (pre-existing, intended — discovery is via definer RPCs) |
| Profile | user reads `profiles` | exactly 1 row (own) |
| Profile | update own / another user's `display_name` | 1 row / 0 rows |
| Profile | user sets `is_admin` | denied |
| Generation | `create_generation` with fresh quote | `created`, token issued, balance 100 → 90 |
| Generation | same idempotency key retried | same id, no token, balance still 90, 1 ledger row |
| Generation | reservation ledger key | `reserve:` prefix ✓ |
| Generation | user B uses user A's quote | rejected ("Invalid generation quote") |
| Billing | `get_active_plan_id(self)` with active subscription | returns plan ✓ |
| Billing | `get_active_plan_id(other user)` | denied (42501) |
| Billing | `get_available_balance()` | 90 ✓ |
| Billing | user calls `reconcile_billing_event` | denied |
| Isolation | user B sees user A's ledger / generations | 0 / 0 |
| Referral | anon calls `generate_referral_code()` | denied |
| HTTP | `/`, `/explore`, `/pricing`, `/presets/cinematic-still`, `/login` | 200 |
| HTTP | unsigned `POST /api/webhooks/bachs` | 401 |

Supabase security advisor after rollout: `function_search_path_mutable` — **0**
(was 2). Remaining warnings (`anon_/authenticated_security_definer_function_executable`,
`auth_leaked_password_protection`, `extension_in_public`, `rls_enabled_no_policy`)
are tracked by #139 PR D / operations checklist.

Real-browser checks that create persistent records or charge money (email
signup, OAuth signup, paid checkout/refund, live generation) were not run here
and require an owner-approved staging/production smoke.

## 6. After the history repair is authorized

1. Run `scripts/ops/issue-139/history_repair.sql` on production.
2. Verify: 72 rows, digest `79cc6b4ec2865150a555ceaf8857ef76` *only if no other
   migration was applied in between* (otherwise verify the 54 are gone and the
   4 are present); `supabase migration list` shows 0 remote-only.
3. Rollback if anything is off: `scripts/ops/issue-139/history_repair_rollback.sql`
   (restores the 54 rows from `schema_migrations_backup_139` and removes the 4
   inserted rows), then re-check digest `ec1801cb…`.
4. Keep `schema_migrations_backup_139` for at least one release cycle.
