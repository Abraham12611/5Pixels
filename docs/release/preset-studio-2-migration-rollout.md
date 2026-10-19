# Preset Studio 2.0 — hosted migration rollout & verification runbook

Scope: applying the merged-but-undeployed migration chain to hosted Supabase
project `euoasoqxowgcafcnzljq`, in the exact checked-in order, without losing
version parity between `supabase/migrations/` and the hosted migration
registry. **Owner-controlled. Nobody else applies hosted migrations.**

Last verified locally: clean `supabase db reset` replayed the full chain and
the DB suite passed 142/142; `scripts/verify-security-chain.sql` reported
30/30 PASS.

## Pending chain (apply in this order — it is load-bearing)

| # | Version | File | Lands |
|---|---------|------|-------|
| 1 | `20261028000001` | `preset_family_input_contract.sql` | preset-family columns (`products.parent_preset_id`, `variant_*`, `standalone_discoverable`), `generation_input_assets`, ordered-role `create_generation` |
| 2 | `20261029000001` | `preset_user_prompt_db_gate.sql` | `release_gates` table (prompt gate OFF), redefines `create_generation` with the prompt gate |
| 3 | `20261030000001` | `release_multi_image_generation.sql` | redefines `create_generation` again: keeps #189's prompt gate, removes the multi raise, adds per-input `moderation_status='approved'` + object-version binding; adds `moderation_object_version`, `asset_object_version()`, `prevent_asset_moderation_escalation`, `prevent_approved_asset_content_overwrite` |
| 4 | `20261030000002` | `variant_discovery_attribution.sql` | variant discovery/SEO/catalog attribution (#199) |
| 5 | `20261031000001` | `fix_profiles_rls_recursion.sql` | `is_admin()`/`is_owner()` → `plpgsql` (non-inlinable), `profiles_read_self` seed removed, anon EXECUTE grants (#202) |

Ordering matters and cannot be compressed: #189 and #193 both redefine
`create_generation` — applying out of order leaves the wrong function body.
#202's fix presumes nothing about the earlier files (it is independently
safe), but the app layer that #208 is debugging needs all five.

Hosted is registered through `20261027000001`, so all five are pending —
**verified against hosted `euoasoqxowgcafcnzljq` on 2026-10-19**: registered
tip is `20261027000001 article_editorial_blocks`; `generation_input_assets`,
`release_gates`, and all ten family/input columns are absent; `is_admin()` is
still `LANGUAGE sql`; its ACL is `{postgres, authenticated, service_role}`
with **no `anon` grant** — the direct cause of the 12 `42501
permission denied for function is_admin` errors (policies without a `TO`
clause are planned for `anon` too, and any policy containing `is_admin()`
then 42501s for anonymous requests). `20261028000001` and `20261031000001`
both grant `anon` EXECUTE — the chain fixes it.

**Hosted `profiles_read_self` note:** the hosted policy text is already
`auth.uid() = id OR is_admin()` — no raw self-subquery. The hosted `42P17`
recursion comes purely from `is_admin()` being an **inlinable `LANGUAGE
sql`** function: inlining it into the policy inserts a `profiles` read
under caller RLS, which re-enters `profiles_read_self` forever. The
`plpgsql` conversion alone terminates it; the policy rewrite in
`20261031000001` is belt-and-braces.

## Step 0 — backup (before anything writes)

Take a point-in-time restorable backup of the hosted database **before** the
first statement runs:

- Supabase Dashboard → Database → Backups — confirm a recent scheduled
  backup exists and, on plans that support it, trigger a manual/PITR
  snapshot; or
- `supabase db dump` (or plain `pg_dump`) of the current schema + data
  retained somewhere off-project.

These migrations are additive and backward-compatible, so a restore should
never be needed — but version-preserving means *evidence before mutation*.

## Pre-flight (read-only, ~1 minute)

```sql
-- 1. Confirm registered tip — expected: 20261027000001
SELECT version FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 5;

-- 2. Confirm the pending objects are absent — all should return 0/false:
SELECT to_regclass('public.generation_input_assets'),      -- NULL
       to_regclass('public.release_gates'),                 -- NULL
       (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='products'
           AND column_name IN ('parent_preset_id','standalone_discoverable',
                               'variant_display_name','variant_sort_order')), -- 0
       (SELECT pg_get_functiondef('public.is_admin'::regproc) ILIKE '%language plpgsql%'); -- false
```

If any of those unexpectedly exist, STOP — the DB was touched outside the
checked-in chain and needs reconciliation before proceeding.

## Apply

Preferred: `supabase db push` (or `supabase migration up`) from the repo with
the project linked — the CLI applies files in filename order and registers
each version verbatim, so checked-in versions == hosted versions. Requires
`SUPABASE_ACCESS_TOKEN` + project link (not provisioned on this machine).

Fallback already proven available: Supabase MCP `execute_sql` — apply each
file body verbatim in order, spot-verify each landed, then insert the
matching version row per the rule below. Do **not** use MCP
`apply_migration` — it generates divergent version names.

If a different tool is used (e.g. Supabase MCP `apply_migration`, dashboard
SQL), it **must** register the checked-in version strings — `apply_migration`
and friends generate their own timestamps, which desyncs the registry and
breaks every future `db push`/diff. If versions are applied out-of-band, run
each file body verbatim and register its version row **only after that
file's SQL has executed successfully and been spot-verified** — a version
row without its migration applied is worse than none: `db push` will skip
the file forever while the objects don't exist, and the verifier will report
the mismatch. Registration is bookkeeping for completed work, never a
substitute for it:

```sql
-- Only AFTER the corresponding migration file's SQL ran cleanly:
INSERT INTO supabase_migrations.schema_migrations(version)
VALUES ('<the-version-that-just-applied>');
```

Each file is idempotent-within-itself but NOT re-runnable as a group — apply
each once, in order, ideally in its own transaction/session so a mid-chain
failure is attributable to one file.

## Post-apply verification (gate)

```bash
psql "$DATABASE_URL" -f scripts/verify-security-chain.sql
```

30 checks; exits non-zero on any FAIL. It asserts, among others:

- all five versions registered in `supabase_migrations.schema_migrations`
- `release_gates` exists, prompt gate still OFF, no public privileges
- `is_admin()`/`is_owner()` are `plpgsql` (non-inlinable); `profiles_read_self`
  has no raw self-subquery
- `generation_input_assets` policy surface present
- all #193 triggers + `create_generation` protections intact
- RLS enabled on every protected table

Then the smoke probes (all read-only / zero-side-effect):

```sql
-- A. Admin gate path: returns the caller's row or empty — must NOT 42P17.
--    (Run as a JWT-authenticated role, not service_role.)
SELECT id, is_admin FROM public.profiles WHERE id = auth.uid();

-- B. Column probes — must NOT 42703:
SELECT parent_preset_id FROM public.products LIMIT 1;
SELECT 1 FROM public.generation_input_assets LIMIT 1;
```

## Compatibility with production `main`

The chain is backward-compatible with the `main` app build:

- All new columns (`parent_preset_id`, `variant_*`, `standalone_discoverable`)
  are **nullable/additive** — `main` never selects them and is unaffected.
- New tables (`generation_input_assets`, `release_gates`) are additive.
- `create_generation` gains parameters but retains a backward-compatible
  signature/wrapper for the legacy single-image path used by `main`.
- `20261031000001` only restores access that should already work — it fixes
  `main` too (its admin pages share `requireAdmin*` → `profiles` reads).

So the DB can migrate **while `main` is still deployed**, then `develop` can
deploy whenever ready. The app must never run ahead of the schema — the
reverse order is safe.

## Rollback posture

These migrations are additive plus function/policy replacements — there is
no destructive step (no drops of customer data).

**Rolling back the application does NOT roll back the database.** If a
deploy goes wrong, redeploying the older app build leaves the new schema in
place — which is fine, because the chain is backward-compatible (above).
Rolling the *database* back is a separate, heavier operation (restore from
the Step 0 backup, or hand-written reversal migrations) and should not be
attempted reactively for an app-level problem.

## Relation to #208

The admin crash is a code/schema mismatch at one of two layers; the server
log's PostgREST/Postgres code is the discriminator:

| Observed code | Fault | Fix |
|---|---|---|
| `42P17` infinite recursion in policy "profiles" | pre-#202 hosted helpers (`is_admin()` inlines into `assets_update` etc.; `profiles_read_self` self-subquery) | migration 5 of this chain — unblocks `main` **and** `develop` |
| `42703` column does not exist (`parent_preset_id`, `standalone_discoverable`, `variant_*`) | `develop` build against unmigrated DB | migrations 1–4 of this chain |
| both, in sequence | chain partially applied | finish the chain in order |

Note the masking order on `develop` builds: `requireAdminOrOwner` reads
`profiles` **before** any `parent_preset_id` query runs, so `42P17` can hide
an underlying `42703`. Fixing the recursion first may surface the missing
columns on the next request — that is expected, not a regression.

Release flags stay OFF throughout: `PRESET_MULTI_INPUT_ENABLED=false`,
`PRESET_USER_PROMPT_ENABLED=false`, DB `release_gates.preset_user_prompt`
disabled.
