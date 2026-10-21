# Issue #139 — Privileged RPC / RLS audit (PR D)

Audit of every `SECURITY DEFINER` function in `public`, its EXECUTE grants,
and its internal guard. Snapshot taken from a clean `supabase db reset` on
`develop` (9146d77) + `20261106000001_rpc_least_privilege.sql`.

## Scope & method

- 120 functions in `public`; **72 SECURITY DEFINER**.
- For each definer: `prosecdef`, `proconfig` (search_path), parsed `proacl`
  into four exposure tiers, and scanned the body for an authorization gate
  (`auth.uid()`, `auth.role()`, `is_admin()`, `is_owner()`,
  `is_editorial_staff()`, ownership columns, processing-token checks).
- Cross-checked RLS coverage on every `public` table and view exposure.

## Findings

**Already sound**

- **0 definers missing `SET search_path`** — every one resolves names
  against a pinned path, so search-path injection is closed.
- **Every `public` table has RLS enabled** — zero uncovered tables.
- **All privileged RPCs self-guard internally**: admin/editorial functions
  require `is_admin()`/`is_owner()`/`is_editorial_staff()`; generation
  pipeline functions (`attach_provider_request`, `complete_generation`,
  `fail_generation_refund`) require ownership **plus** a per-run
  processing-token hash; user getters scope to `auth.uid()`.
- Anonymous catalog/article access is intentional and content-filtered:
  `get_public_*`/`get_preset_family` select only
  `visibility='public' AND public_status='active'`, and
  `resolve_article_generation*` only resolves `status='completed'` rows
  with a non-null `public_share_id`.
- `promo_funnel_metrics` view is service_role-only.
- `get_active_plan_id` still shows the unhardened body on this base — the
  caller-check fix ships with PR A (#143); not re-fixed here.

**Gaps closed by `20261106000001_rpc_least_privilege.sql`**

1. `get_user_balance()` — SECURITY DEFINER over `credit_ledger`, callable
   by PUBLIC via the default grant. Arg-less + `auth.uid()`-scoped so anon
   only ever saw 0, and the sole caller (`lib/generation/balance.ts`)
   returns 0 for signed-out users before calling — PUBLIC EXECUTE was
   unnecessary. Now restricted to `authenticated` + `service_role`.
2. Three SECURITY DEFINER trigger functions —
   `notify_on_generation_status_change`,
   `prevent_approved_asset_content_overwrite`,
   `prevent_asset_moderation_escalation` — carried explicit
   `anon`/`authenticated` EXECUTE grants from a later blanket grant (the
   four older trigger functions are already service_role-only).
   Trigger firing does not consult EXECUTE, so the grant only governed
   direct calls, which can never succeed for a trigger-returning function
   — but the ACL now matches the rest: PUBLIC/anon/authenticated revoked.
3. `notify_on_generation_status_change` had `SET search_path TO 'public'`
   — the only definer not using `''`. Harmless today (PUBLIC has no CREATE
   on the schema); aligned for convention.

**Kept intentionally (documented, not changed)**

- `is_admin()`/`is_owner()` remain anon-executable: arg-less,
  `auth.uid()`-scoped, they return FALSE for anon and are evaluated inside
  RLS policies under every role.
- `resolve_article_generation*` stay anon-executable: public share pages
  render for logged-out viewers; the functions only project shared,
  completed generations.
- `sweep_stale_article_uploads` keeps its `authenticated` grant: the body
  raises `42501` unless the caller is editorial staff or service_role —
  the ACL is not the guard, the function is.
- `admin_*`/`publish_*`/`transition_product_status` keep `authenticated`
  grants: every body starts with `is_admin()`/`is_owner()` gates.

## Permissions matrix

Tiers reflect the least-privileged role that can EXECUTE (each tier also
includes all higher roles granted explicitly). `authenticated` means
`authenticated` + `service_role`; `anon` means `anon` + higher.

### PUBLIC (all roles incl. anon) — 2

| Function | Guard |
|---|---|
| `get_public_catalog(p_type text, p_category_slug text, p_product_ids uuid[], p_search text, p_sort text, p_page integer, p_page_size integer)` | — |
| `get_public_product_by_slug(p_slug text)` | — |

### anon (+ authenticated, service_role) — 9

| Function | Guard |
|---|---|
| `get_preset_family(p_product_id uuid)` | — |
| `get_public_article_by_slug(p_slug text)` | — |
| `get_public_article_topics()` | — |
| `get_public_articles(p_page integer, p_page_size integer, p_topic text, p_query text)` | — |
| `get_public_product_editorial(p_product_id uuid)` | — |
| `is_admin()` | admin/staff |
| `is_owner()` | admin/staff |
| `resolve_article_generation(p_generation_id uuid)` | — |
| `resolve_article_generation_by_share_id(p_share_id uuid)` | — |

### authenticated (+ service_role) — 44

| Function | Guard |
|---|---|
| `admin_duplicate_product(p_source_product_id uuid, p_slug text, p_name text, p_parent_product_id uuid, p_variant_display_name text)` | admin/staff |
| `admin_update_product(p_product_id uuid, p_product jsonb, p_source_version_id uuid, p_version jsonb, p_fields jsonb)` | admin/staff |
| `archive_article(p_article_id uuid)` | admin/staff |
| `article_media_check_quota(p_article_id uuid, p_additional_bytes bigint)` | — |
| `attach_provider_request(p_generation_id uuid, p_token text, p_provider_request_id text, p_provider_endpoint text)` | ownership/auth |
| `clone_version_as_draft(p_source_version_id uuid)` | admin/staff |
| `complete_generation(p_generation_id uuid, p_token text, p_output_asset_id uuid, p_compute_seconds numeric)` | ownership/auth |
| `confirm_article_media_revocation(p_article_asset_ids uuid[])` | admin/staff |
| `create_article(p_title text)` | admin/staff |
| `create_article_media_upload(p_article_id uuid, p_mime_type text, p_bytes bigint)` | admin/staff |
| `create_generation(p_quote_id uuid, p_source_asset_id uuid, p_options jsonb, p_idempotency_key text)` | ownership/auth |
| `create_generation(p_quote_id uuid, p_input_assets jsonb, p_options jsonb, p_user_prompt text, p_idempotency_key text)` | ownership/auth |
| `create_generation(p_product_id uuid, p_product_version_id uuid, p_source_asset_id uuid, p_options jsonb, p_idempotency_key text, p_provider_endpoint text, p_output_width integer, p_output_height integer)` | admin/staff |
| `credits_for_provider_cost(p_cost_usd numeric)` | — |
| `delete_article_media(p_article_asset_id uuid)` | admin/staff |
| `delete_generation(p_generation_id uuid)` | ownership/auth |
| `duplicate_article(p_article_id uuid)` | admin/staff |
| `fail_generation_refund(p_generation_id uuid, p_token text, p_failure_code text, p_failure_stage text)` | ownership/auth |
| `finalize_article_media_upload(p_asset_id uuid, p_verified_mime_type text, p_verified_bytes bigint, p_width integer, p_height integer, p_duration_ms integer)` | admin/staff |
| `generation_input_is_owner(p_generation_id uuid)` | admin/staff |
| `get_active_plan_id(p_user_id uuid)` | — |
| `get_available_balance()` | ownership/auth |
| `get_user_balance()` | ownership/auth |
| `get_user_favorite_products()` | ownership/auth |
| `get_user_generation_by_id(p_generation_id uuid)` | ownership/auth |
| `get_user_generations()` | ownership/auth |
| `is_editorial_staff()` | admin/staff |
| `is_public_product(p_product_id uuid)` | — |
| `mark_generation_downloaded(p_generation_id uuid)` | ownership/auth |
| `public_asset_json(p_asset_id uuid)` | — |
| `publish_article(p_article_id uuid, p_expected_edit_version bigint)` | admin/staff |
| `publish_product_version(p_product_id uuid, p_version_id uuid, p_override_reason text)` | admin/staff |
| `register_article_generation_derivative(p_article_id uuid, p_generation_id uuid, p_asset_id uuid, p_mime_type text, p_bytes bigint, p_width integer, p_height integer)` | admin/staff |
| `resume_generation(p_generation_id uuid)` | ownership/auth |
| `revoke_article_media(p_article_id uuid)` | admin/staff |
| `rollback_product_version(p_product_id uuid, p_target_version_id uuid, p_reason text)` | admin/staff |
| `save_article_draft(p_article_id uuid, p_expected_edit_version bigint, p_title text, p_summary text, p_slug text, p_topic text, p_tags text[], p_cover_asset_id uuid, p_clear_cover boolean, p_content jsonb, p_schema_version integer, p_source text)` | admin/staff |
| `set_generation_saved(p_generation_id uuid, p_saved boolean)` | ownership/auth |
| `sweep_stale_article_uploads(p_older_than timestamp with time zone)` | admin/staff |
| `transition_product_status(p_product_id uuid, p_new_status text, p_reason text)` | admin/staff |
| `unarchive_article(p_article_id uuid)` | admin/staff |
| `unpublish_article(p_article_id uuid)` | admin/staff |
| `update_article_media(p_article_asset_id uuid, p_alt_text text, p_caption text)` | admin/staff |
| `validate_generation_options(p_product_id uuid, p_options jsonb)` | — |

### service_role only — 17

| Function | Guard |
|---|---|
| `asset_object_version(p_bucket text, p_name text)` | — |
| `calculate_credit_cost(p_unit_price numeric, p_quantity numeric, p_markup_multiplier numeric)` | — |
| `check_publish_gates(p_product products, p_version product_versions)` | admin/staff |
| `claim_referrer_reward(p_referrer_id uuid, p_referee_id uuid, p_kind text, p_credits numeric, p_source_ref text, p_status text, p_hold_until timestamp with time zone)` | — |
| `create_user_settings_on_profile()` | trigger-only |
| `get_user_markup_multiplier(p_user_id uuid)` | — |
| `grant_subsidy_credits(p_user_id uuid, p_program text, p_credits numeric, p_idempotency_key text, p_metadata jsonb)` | — |
| `handle_new_user()` | trigger-only |
| `notify_on_generation_status_change()` | trigger-only |
| `options_fingerprint(p_options jsonb)` | — |
| `prevent_approved_asset_content_overwrite()` | trigger-only |
| `prevent_asset_moderation_escalation()` | trigger-only |
| `prevent_profile_privilege_escalation()` | trigger-only |
| `reconcile_billing_event(p_provider text, p_request_id text, p_endpoint_id text, p_event_timestamp timestamp with time zone, p_output_units numeric, p_unit text, p_unit_price numeric, p_percent_discount numeric, p_cost_subtotal numeric, p_cost_discount numeric, p_cost_total numeric, p_raw jsonb)` | — |
| `release_referral_hold(p_source_ref text)` | — |
| `set_profiles_updated_at()` | trigger-only |
| `settle_unbilled_generations(p_completed_before timestamp with time zone, p_limit integer)` | — |

