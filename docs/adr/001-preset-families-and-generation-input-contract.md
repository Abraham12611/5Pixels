# ADR 001 — Preset families, per-version input capability, and immutable generation inputs

- **Status:** Accepted (contract — issue #176, epic #175)
- **Date:** 2026-10-18
- **Owner:** DB + shared API contract lane
- **Migration:** `supabase/migrations/20261028000001_preset_family_input_contract.sql`

## Context

Preset Studio 2.0 (epic #175) adds three capabilities to the existing
preset-first workflow at `/app/create/[slug]`:

1. **Multi-image inputs** — admin-enabled per preset; the default remains
   exactly one required user image.
2. **Preset families** — a single level of parent + child *variants* (each a
   real, administratively authored product with its own slug, version, recipe
   and price — not an AI-generated output option).
3. **Optional user prompt** — admin-enabled per preset; off by default,
   server-enforced. When released, user-entered generation text (the
   normalized prompt plus free-text option fields) is screened through the
   OpenAI Moderation API (`omni-moderation-latest`) before quoting — the
   fail-closed provider for the Bachs-backed workflow; the earlier
   Creem-based prompt screen was replaced.

The shipped schema had none of these: `products` had no parent/variant
relation, `generations.source_asset_id` and `CreateGenerationInput.sourceAssetId`
were singular, and no per-version contract described what inputs a recipe
accepts.

This ADR is the contract the parallel lanes (#177–#184) build against. It is
**additive and backward compatible**: every existing one-image preset and all
generation history keep working unchanged.

## Decisions

### 1. Preset family model

`public.products` gains:

| column | type | semantics |
| --- | --- | --- |
| `parent_preset_id` | `uuid NULL → products.id` | The family parent. `NULL` = standalone product or family root. |
| `standalone_discoverable` | `boolean NOT NULL DEFAULT false` | Child-only opt-in: may the variant appear in Explore/Search/sitemap on its own? |
| `variant_sort_order` | `int NOT NULL DEFAULT 0` | Child-only sibling ordering in family surfaces. |
| `variant_display_name` | `text NULL` | Child-only short label (e.g. "Warm", "B&W"). Falls back to `name`. |

Rules enforced in the database:

- **One level only.** A variant's parent must itself have
  `parent_preset_id IS NULL`. Assigning a variant as another product's parent,
  or parenting a product that already has children, is rejected —
  `enforce_preset_family_level` trigger fires on `parent_preset_id` writes.
- **No self-parenting:** `parent_preset_id <> id` (CHECK).
- **Same type:** variant `type` must equal the parent's (`filter`/`poster`);
  cross-type family links are rejected.
- **Child-only fields:** `standalone_discoverable`, `variant_display_name`
  and a non-zero `variant_sort_order` are only legal when
  `parent_preset_id IS NOT NULL` (CHECK).
- **Stable references, soft lifecycle:** the FK is `ON DELETE RESTRICT` —
  a product with children cannot be hard-deleted; children must be detached
  (`parent_preset_id → NULL`) or retired first. `public_status` remains the
  soft-lifecycle signal; retiring a parent does **not** cascade. A hidden
  (non-standalone) child of a retired parent stays addressable by direct URL
  but disappears from discovery and from `get_preset_family`.

Publish/quotable combinations:

- A variant is quotable exactly when it is independently
  `public_status = 'active' AND visibility = 'public'` — family membership
  never substitutes for the product's own publish state.
- `standalone_discoverable = true` without a published/active variant is
  inert — the catalog still filters on the variant's own status.
- `hidden` vs `retired` are distinct, consistent states: a variant is
  **hidden** when it is active but not `standalone_discoverable`
  (family-only discovery, direct URL still works); it is **unavailable**
  when `public_status <> 'active'` (excluded everywhere, including the
  family rail). `get_preset_family` emits each member's `public_status` so
  UIs render the two consistently.

### 2. Per-version input capability

`public.product_versions` gains an admin-owned, version-pinned contract:

| column | type | default |
| --- | --- | --- |
| `input_mode` | `text` `'single' \| 'multi'` | `'single'` |
| `input_min_images` | `int` | `1` |
| `input_max_images` | `int` | `1` |
| `input_image_roles` | `jsonb` | `'[]'` |
| `prompt_override_enabled` | `boolean` | `false` |
| `prompt_max_chars` | `int` | `0` |

The default row is exactly the legacy contract: one required image, no
custom prompt. Constraints:

- `single` ⇒ `min = max = 1`.
- `multi` ⇒ `1 ≤ min ≤ max ≤ 8`; enabling `multi` is an explicit admin
  assertion that the pinned provider route accepts that many inputs —
  the database cannot verify provider support, so lanes must not infer
  support from `input_mode` alone (#179 owns provider plumbing).
- `input_image_roles` is an ordered array of `{"name": "^[a-z0-9_]+$",
  "optional": bool}` — at most `input_max_images` entries, unique names.
  Declared names are the only roles `create_generation` accepts.
- `prompt_override_enabled = false` ⇒ `prompt_max_chars = 0`;
  `true` ⇒ `1 ≤ prompt_max_chars ≤ 2000`.

All six columns are added to `prevent_active_version_recipe_update`:
capability is part of the pinned recipe, so editing it requires a new
version, never an in-place mutation of an active one.

### 3. Immutable generation inputs

New table `public.generation_input_assets`:

```text
generation_id      uuid  → generations(id) ON DELETE CASCADE
ordinal            int   (1-based position — input order is semantically
                          significant for roles like subject/background)
asset_id           uuid  → assets(id)
role               text  NULL or one of the version's declared role names
product_version_id uuid  → product_versions(id)  (effective version copy)
created_at         timestamptz
PRIMARY KEY (generation_id, ordinal)
UNIQUE (generation_id, asset_id)
```

- **Immutable:** a trigger rejects UPDATE and DELETE (deletion only via
  generation cascade). Input history is audit data — never edited.
- **Integrity:** `product_version_id` must equal the generation's pinned
  `product_version_id` (insert trigger) — a mismatched version reference
  is rejected.
- **Ownership:** `create_generation` validates every input asset is owned
  by the caller and lives in `user-assets`, exactly as the legacy
  single-asset check did.
- **RLS:** SELECT is owner (through the parent generation, via the
  `generation_input_is_owner` SECURITY DEFINER helper) or admin
  (`public.is_admin()`); writes exist only inside the `create_generation`
  RPC (security definer). The helpers are required because the shipped
  `profiles_read_self` policy self-references `profiles` — any raw
  `profiles`/`generations` subquery inside a policy expression fails under
  RLS with "infinite recursion". The migration additionally routes the
  products/product_versions/product_fields/product_assets admin policies
  through `public.is_admin()` for the same reason; without that, family
  mutations through PostgREST fail for admins and non-admins alike.
- **Legacy projection:** `generations.source_asset_id` stays `NOT NULL`
  and always mirrors the ordinal-1 input. Existing readers
  (`get_user_generation_by_id`, results page, `regenerateGeneration`)
  need no changes; multi-input detail is additive via the new
  `input_assets` output column.
- **`pending_generations`** (deferred auth) gains
  `input_assets jsonb NOT NULL DEFAULT '[]'` — an ordered array of
  `{"asset_id": uuid, "role": text?}`. Empty means "derive from the legacy
  `source_asset_id`", so existing pending rows replay unchanged.

### 4. `create_generation` signature

New signature:

```sql
create_generation(
  p_quote_id        uuid,
  p_input_assets    jsonb,   -- [{"asset_id": uuid, "role": text?}, ...]
  p_options         jsonb,
  p_user_prompt     text,    -- NULL unless the pinned version permits it
  p_idempotency_key text
)
```

The legacy `(uuid, uuid, jsonb, text)` overload remains as a wrapper that
converts `p_source_asset_id` into a one-element `p_input_assets` array —
existing clients, tests and callers keep working.

Server-side enforcement inside the RPC (all `P0001` rejections):

- input count within `[input_min_images, input_max_images]` of the quoted
  version; every asset owned by the caller in `user-assets`; no duplicate
  asset ids; declared `role` values only.
- `p_user_prompt` rejected unless the quoted version has
  `prompt_override_enabled`; length bound by `prompt_max_chars`.
- **Quote binding:** new quotes carry `params.input_asset_ids`,
  `params.input_roles`, `params.input_count` and `params.prompt_hash`.
  The submitted ordered id list, the ordered role assignments, and the
  SHA-256 of `p_user_prompt` must match the quote — the same asset ids
  with swapped roles (e.g. subject ↔ reference) produce a materially
  different request and invalidate the quote, as does a substituted input
  or different prompt. Legacy quotes (no `input_asset_ids` in `params`)
  degrade to the original single-asset ownership check so in-flight
  clients never break.
- **Fail-closed guards (temporary, review-driven):** the multi-image raise
  was released by #179 in migration `20261030000001` once the ordered
  provider-submission pipeline shipped — every requested image is
  moderated, signed, budget-checked against the route-capability registry,
  and transmitted in its declared slot. The charged path stays behind the
  deploy-level `PRESET_MULTI_INPUT_ENABLED` brake
  (`isMultiInputReleased()`): while OFF, `createAndSubmitGeneration`
  rejects `inputs.length > 1` before moderation/quoting and the consumer
  UI renders the one-photo experience. The custom-prompt raise was
  converted by #183/#189 (`20261029000001`) into the protected
  `release_gates('preset_user_prompt')` rollout gate; both protections are
  preserved in the current `create_generation`.
- **Verified image approval (#179):** `assets.moderation_status` is the
  durable record of a completed image review — `approved` is required by
  `create_generation` for every input before a generation row or credit
  reservation can exist. The application screens each pending image
  through the fal `imageutils/nsfw` classifier (text moderation cannot
  attest to image content) and stamps the verdict before quoting;
  `prevent_asset_moderation_escalation` uses an explicit allowlist
  (service role, admins, non-PostgREST privileged contexts) so
  authenticated/anon/future roles cannot mint or move the approval
  record. Admin-authored uploads are trusted content and stamped
  `approved` at upload; blocked verdicts are stamped `flagged` so the
  image cannot be re-submitted.
- **Content binding (#179 security review):** an approval refers to the
  exact bytes screened — `assets.moderation_object_version` records the
  `storage.objects.version` at approval time, the app brackets every
  screen with before/after version reads (a mid-screen overwrite
  discards the verdict), `prevent_approved_asset_content_overwrite`
  makes the object behind an approved asset immutable for every role,
  and `create_generation` re-verifies the stored version against the
  live object. Pending assets may still be overwritten, preserving
  same-path upload retries.
- On success: generation row + `generation_input_assets` rows +
  reservation ledger entry, all in one transaction, exactly as before.

### 5. Public catalog contract

- **`get_public_catalog`** excludes non-standalone variants
  (`parent_preset_id IS NULL OR standalone_discoverable`) and adds
  additive columns `parent_preset_id`, `standalone_discoverable`,
  `variant_count` (published children count — powers "N styles" badges).
- **`get_public_product_by_slug`** remains retrievable by direct slug even
  for hidden variants (shareable safe URL per epic decision) and adds
  `parent_preset_id`, `variant_display_name`, `standalone_discoverable`
  and `input_capability` (public projection: mode, min/max images, role
  names, prompt enabled + max chars — no recipe or provider data).
- **`get_preset_family(p_product_id uuid)`** — new RPC, granted to
  `anon` + `authenticated`. Accepts any member id (parent or child),
  resolves the family root, and returns ordered members
  (`variant_sort_order, created_at`): `product_id, slug, name,
  variant_display_name, variant_sort_order, is_parent, is_current,
  public_status, credit_cost, hero/poster/preview asset ids`. Only
  `active + public` members are returned; a non-public input yields an
  empty result (no existence leak). Hidden variants **are** listed here —
  "hidden from independent discovery" does not mean hidden from the
  family rail.
- **`get_user_generation_by_id`** adds `input_assets` (ordered
  `asset_id/role/bucket/storage_key/mime/width/height` — signed by the
  usual owner-scoped URL path) and `user_prompt`.

## DTO surface (TypeScript)

- `packages/shared/src/schemas.ts`: `inputImageRoleSchema`,
  `versionInputCapabilitySchema` (merged into `productVersionSchema` as
  `input_capability`), `presetFamilyFieldsSchema` (admin family fields on
  `baseProductSchema`), `generationInputAssetRefSchema`,
  `createGenerationRequestSchema`, and `presetFamilyMemberSchema` /
  `presetFamilySchema` for the public RPC.
- `apps/web/types/catalog.ts`: `PublicInputCapability`,
  `PublicProductSummary` gains `parent_preset_id`,
  `standalone_discoverable`, `variant_count`; `PublicProductDetail` gains
  `variant_display_name`, `input_capability`, `family_id`;
  `PresetFamily`/`PresetFamilyMember` mirror the RPC output.
- `apps/web/lib/generation/types.ts`: `CreateGenerationInput` gains
  `inputs: GenerationInputAsset[]` and `prompt?: string`;
  `sourceAssetId` remains accepted (deprecated alias for
  `inputs: [{assetId}]`). `SafeGenerationDetail` gains `inputAssets` and
  `userPrompt`.

## Rollback / compatibility notes

- Every change is additive: new nullable/defaulted columns, one new table,
  new RPC, widened RPC return tables, a new `create_generation` overload.
- Rollback order: drop `generation_input_assets` and the new RPC, restore
  prior catalog RPC definitions, drop the new `create_generation`
  signature, then drop the columns. Because `source_asset_id` is
  maintained as the ordinal-1 projection, pre-rollback generations remain
  fully readable by old code.
- Existing quotes without `params.input_asset_ids` keep the legacy
  single-asset path — no quote TTL break for in-flight sessions.
- No production Supabase mutation is performed from this PR; the migration
  is exercised on the local Supabase stack via `pnpm test:db`.

## Coordination

- `#177` (admin) writes family + capability fields through the existing
  admin RLS (`products_admin`, `product_versions_admin`) using the shared
  schemas; publish-gate extension is a follow-up there.
- `#179` (pipeline) owns passing all ordered inputs to the provider route;
  this contract only guarantees they are validated, pinned and stored.
- `#182/#183` own the composer UI and moderation assembly; this contract
  guarantees the server-side prompt gate (`prompt_override_enabled`,
  `prompt_max_chars`, quote hash binding) and that the prompt text is
  screened alongside options before any credits move.
- Migrations serialize after the latest `develop` migration
  (`20261027000001`); this file is timestamped `20261028000001` and must
  re-serialize if #145/#151/#162 land first.
