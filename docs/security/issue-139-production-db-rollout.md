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
| 2026-10-17 | Backup tables `schema_migrations_backup_139_v2` (126 rows, `3ca5aaf3f99ace8c89a25be3a5e6e219`) and `schema_migrations_backup_139_v3` (128 rows, `cecdc8546df1318a8646ad31d4fd731b`) | — |
| 2026-10-17 (later) | 9 canonical rows inserted by `devin-drift-reconcile` (`20261017000001`, `20261018000001`, `20261018000002`, `20261019000001`, `20261020000001`, `20261020000002`, `20261024000001`, `20261025000001`, `20261027000001`); `20261024000002` and `20261026000001` applied under canonical versions | — |
| 2026-10-28 | `20261023000004_converge_article_media.sql` applied verbatim (adds `sweep_stale_article_uploads`, adds `invalid_cover_asset` check to `save_article_draft`); bodies hash-verified identical to repo | `20261023000004` (`issue-139-pr-b`) |
| 2026-10-28 | Backup table `schema_migrations_backup_139_v4` (140 rows = current live, `4fd342e5d61cd4bde7020145452676f5` name-digest) | — |

Each migration was applied verbatim from the repo file and recorded under its
**repo version**, so no new drift was introduced.

### Hosted Articles applies since the first rollout

Concurrent Articles work applied six more migrations directly to production
via the MCP (each recorded under an app timestamp, not the repo version):

| Recorded version | Migration | Repo counterpart |
|---|---|---|
| `20261017061521` | `20261018000002_articles_foundation` | `20261018000002` |
| `20261017061642` | `20261020000002_article_media` | `20261020000002` |
| `20261017061656` | `20261024000001_duplicate_article` | `20261024000001` (PR #146) |
| `20261017064237` | `article_preset_publish_check` | `20261025000001` (PR #148) |
| `20261017075236` | `article_editorial_blocks` | `20261027000001` (article-prompt-settings PR, #128) — first half of the file |
| `20261017075303` | `article_editorial_publish_gate` | `20261027000001` — second half (`publish_article` redefinition) |

Content-equivalence verified by comment-insensitive schema fingerprint
(`scripts/db-schema-fingerprint.sql`): every object these six applies created
matches the repo files **except** two real drifts inside `article_media`:

- production's `save_article_draft` lacked the `invalid_cover_asset`
  same-article ready/published cover check;
- `sweep_stale_article_uploads` did not exist at all.

Those are real behaviour differences, not comment/formatting noise. All other
apparent differences were proven comment-only (the MCP strips `--` comments).
`20261024000002_articles_listing_search` and
`20261026000001_public_article_media_map` have since been applied on prod
under their canonical versions.

### Convergence migration `20261023000004_converge_article_media` (applied 2026-10-28)

Re-stated the two drifted functions verbatim from
`20261020000002_article_media.sql`. Verified post-apply: both
`SECURITY DEFINER` with `search_path=''`; anon has no `EXECUTE` on either;
`save_article_draft` now contains the `invalid_cover_asset` check;
`sweep_stale_article_uploads` allows the service-role path. Comment- and
whitespace-insensitive body hashes match the local repo build exactly
(`save_article_draft` `f811ded6…`, `sweep_stale_article_uploads`
`21884f44…`).

History digest formula (used throughout):
`md5(string_agg(version|name|created_by|idempotency_key|array_to_string(statements,E'\x1f')|array_to_string(rollback,E'\x1f'), E'\x1e' ORDER BY version))`

- Before PR B: 119 rows, `2917941d9849489a9e7a538f55e3afd2` (= backup v1).
- After PR B: 122 rows, `ec1801cb960b78cd14484633d6046b04`.
- After hosted Articles applies: 128 rows,
  `cecdc8546df1318a8646ad31d4fd731b` (= backup v3).
- After the 9 `devin-drift-reconcile` canonical inserts + canonical
  `20261024000002`/`20261026000001` applies: 139 rows.
- After `20261023000004` was recorded (current pre-state): **140 rows**
  — rich digest `a8845ab8d900e1d87a920b59ed496313`, name-digest
  `4fd342e5d61cd4bde7020145452676f5` (= backup v4).

### Schema fingerprint after rollout

`scripts/db-schema-fingerprint.sql` (comment-insensitive function hashing)
run on production vs a local `supabase db reset` of `develop` + #143 + #145 +
the pending Articles files:

- Production keys not in repo: **0** outside genuinely pending migrations.
- The last two real drifts (`save_article_draft` cover check,
  `sweep_stale_article_uploads` + its grant) were converged by
  `20261023000004` — applied 2026-10-28, bodies hash-verified.
- Everything else in the diff is pending-work local-only
  (`article_document_word_count`, `get_public_article_topics`, the 4-arg
  `get_public_articles`, the media-map `get_public_article_by_slug`).

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
- `20261023000004` (once applied): the drifted `save_article_draft` body is in
  the `statements` of backup row `20261017061642`; `sweep_stale_article_uploads`
  has no previous definition (drop it to roll back).

## 2. Original history preservation (done)

1. **In-database:**
   - `supabase_migrations.schema_migrations_backup_139` — 119 rows
     (pre-PR-B), digest `2917941d9849489a9e7a538f55e3afd2`.
   - `supabase_migrations.schema_migrations_backup_139_v2` — 126 rows
     (after first four Articles applies), `3ca5aaf3f99ace8c89a25be3a5e6e219`.
   - `supabase_migrations.schema_migrations_backup_139_v3` — 128 rows,
    `cecdc8546df1318a8646ad31d4fd731b`.
   - `supabase_migrations.schema_migrations_backup_139_v4` — **140 rows
     (current live), `4fd342e5d61cd4bde7020145452676f5`** — this is the table
     the v4 repair script checks before deleting.
   - All copies include original `statements`; no `anon`/`authenticated`
     privileges.
2. **Off-production, encrypted** (`~/Secure/5pixels-backups/`, mode 0600;
   cipher `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256`;
   passphrase in macOS Keychain item service
   `5pixels-issue139-schema-migrations-20261016`, account
   `5pixels-migration-history-backup`):
   - `schema_migrations_20261016.json.enc` — 119 rows.
   - `schema_migrations_20261017.json.enc` — 126 rows.
   - `schema_migrations_20261017b.json.enc` — 128 rows; plaintext SHA-256
     `f6a4ccd79307e2b02c1b5ddea4ab6ac6a36ef7a7cca8087198fb37b3d6eac0a5`;
     round-trip decrypt verified; digest recomputed from the export equals the
     live digest `cecdc854…` (proves the export is byte-complete).
   - `schema_migrations_20261028.json.enc` — **140 rows (current)**;
     plaintext SHA-256
     `2019ab9b8e16fc4a11010dde5a6fc920d1d51e7b3a2457d69ecea9c4646caf33`;
     round-trip decrypt verified; digest recomputed from the export equals the
     live digest `4fd342e5…`.
   - Recommended: copy the `.enc` files to a second off-machine location
     (owner action).

## 3. Pending — history repair (awaiting owner authorization)

Scripts: `scripts/ops/issue-139/history_repair.sql` (v4) and
`scripts/ops/issue-139/history_repair_rollback.sql` (exact text to be run).
v4 supersedes v3: the 9 canonical rows it used to insert are now already on
prod (applied by `devin-drift-reconcile`), so v4 is **delete-only**. Its
digest guard makes it impossible to run against a history that has moved
since rehearsal.

**Preconditions before running:**

1. Merged to `develop` with exactly these versions: #143
   (`20261023000001`), #145 (`20261023000002`–`20261023000004`), #146
   (`20261024000001`), #147 (`20261024000002`, `20261026000001`), #148
   (`20261025000001`), and the article-prompt-settings PR
   (`20261027000001`). Only the canonical versions need to exist as files;
   pending ones simply stay pending. (PR #151 is superseded — its
   `20261028000001`/`20261028000002` duplicate `0001`/`0002` and should be
   closed, not merged.)
2. `20261023000004_converge_article_media` applied on prod and recorded —
   **done 2026-10-28**.
3. Live history digest equals `a8845ab8d900e1d87a920b59ed496313` — the script
   checks this itself and aborts otherwise.

The repair, in one transaction with `LOCK TABLE … IN EXCLUSIVE MODE`:

Deletes the 60 app-timestamp duplicates listed below. Guards: aborts unless
the pre-state digest matches, exactly 60 targets are listed, all 60 exist in
`schema_migrations_backup_139_v4`, all 60 still exist in the live history,
exactly 60 rows are deleted, and the post-count is exactly 80.

### Why each deletion is safe

Common to all 60 rows:

- `schema_migrations` rows do not affect schema or data; they only tell the
  CLI what has been applied.
- Every row duplicates repo migration content whose canonical version row is
  present on prod; the production schema already equals the
  repo's (fingerprint above — the only deltas were the two functions `0004`
  fixes, which is why `0004` must land first).
- The Supabase CLI independently names exactly these 60 versions as
  "Remote migration versions not found in local migrations directory" and
  refuses to push until they are reverted (rehearsal step 2).
- Each row, including the original SQL that ran, is preserved in the backup
  tables and the encrypted exports, and the rollback script restores them.

### The 60 versions

The original 54 (pre-Articles duplicates):

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
| 51 | `20261013100643` | `subsidy_budgets` | `20261017000001_subsidy_budgets.sql` | present (devin-drift-reconcile) |  |
| 52 | `20261013104642` | `referrer_cap_and_hold` | `20261018000001_referrer_cap_and_hold.sql` | present (devin-drift-reconcile) |  |
| 53 | `20261013153845` | `drop_legacy_claim_referrer_reward` | `20261019000001_drop_legacy_claim_referrer_reward.sql` | present (devin-drift-reconcile) |  |
| 54 | `20261014070615` | `20261020000001_release_referral_hold` | `20261020000001_release_referral_hold.sql` | present (devin-drift-reconcile) |  |

The 6 Articles/editorial app-timestamp duplicates (new in v3):

| # | Remote version (to delete) | Recorded name | Duplicates repo migration | Repo-version row | Note |
|---|---|---|---|---|---|
| 55 | `20261017061521` | `20261018000002_articles_foundation` | `20261018000002_articles_foundation.sql` | present (devin-drift-reconcile) | Fingerprint-identical to repo version. |
| 56 | `20261017061642` | `20261020000002_article_media` | `20261020000002_article_media.sql` | present (devin-drift-reconcile) | Applied an earlier draft; `save_article_draft` + `sweep_stale_article_uploads` deltas converged by `20261023000004`. |
| 57 | `20261017061656` | `20261024000001_duplicate_article` | `20261024000001_duplicate_article.sql` (PR #146) | present (devin-drift-reconcile) | Fingerprint-identical. |
| 58 | `20261017064237` | `article_preset_publish_check` | `20261025000001_article_preset_publish_check.sql` (PR #148) | present (devin-drift-reconcile) | Fingerprint-identical. |
| 59 | `20261017075236` | `article_editorial_blocks` | `20261027000001_article_editorial_blocks.sql` (prompt-settings PR) | present (devin-drift-reconcile) | First half of the repo file; fingerprint-identical. |
| 60 | `20261017075303` | `article_editorial_publish_gate` | same `20261027000001` file | (same row as #59) | Second half (`publish_article` redefinition); fingerprint-identical. |

## 4. Rehearsal v4 (done 2026-10-28, local staging replica)

Replica construction: local Supabase stack holding production's exact
**140-row history** (`a8845ab8…` rich digest — byte-identical to live, loaded
from the verified encrypted export `schema_migrations_20261028.json.enc`).
`schema_migrations_backup_139_v4` (140 rows) loaded identically. Local
migrations dir = `develop` + #143 + #145 files, i.e. the state after all
precondition merges (all Articles files now exist on develop).

| Step | Command | Result |
|---|---|---|
| 1 | `supabase migration list --local` (before) | 80 matched, **60 remote-only** |
| 2 | `supabase db push --local --dry-run` (before) | Refused: "Remote migration versions not found…"; CLI's suggested revert list == our 60 (diffed, byte-identical) |
| 3 | `history_repair.sql` (v4, delete-only) | COMMIT; history **80 rows**, digest `61ddd1ca10c77b14f569c0184ccfc4ee` |
| 4 | `supabase db push --local --dry-run` (after) | **"Local database is up to date"** — zero replays, zero pending |
| 5 | `history_repair_rollback.sql` | History restored to exactly 140 rows / `a8845ab8…` (byte-identical to pre-repair) |
| 6 | `history_repair.sql` again | Back to 80 rows / `61ddd1ca…` (repeatable) |
| 7 | Simulated extra migration row inserted, then repair | Aborts on digest mismatch; no change — the script cannot run against a history that moved after rehearsal |

Earlier rehearsals (v2: 127→77 rows; v3: 129→78 rows) passed the same
checks; superseded by v4 after the devin-drift-reconcile canonical inserts
made the script delete-only.

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

1. Confirm preconditions in §3 (merges done, digest still
   `a8845ab8…`). If the digest differs — more migrations were applied
   directly — stop and re-baseline (new backup, updated script, new
   rehearsal).
2. Run `scripts/ops/issue-139/history_repair.sql` on production.
3. Verify: **80 rows**, digest `61ddd1ca10c77b14f569c0184ccfc4ee`;
   `supabase migration list` shows 0 remote-only;
   `supabase db push --dry-run` reports "up to date".
4. Rollback if anything is off:
   `scripts/ops/issue-139/history_repair_rollback.sql` (restores the 60 rows
   from `schema_migrations_backup_139_v4`),
   then re-check digest `a8845ab8…`.
5. Keep `schema_migrations_backup_139*` for at least one release cycle.
