# Preset Factory service contract — `preset-factory.v1`

Issue: [#271](https://github.com/Abraham12611/5Pixels/issues/271) (Engineer A) ·
Epic: [#270](https://github.com/Abraham12611/5Pixels/issues/270) ·
Peer: [#272](https://github.com/Abraham12611/5Pixels/issues/272) (Engineer B)

Backend implementation: `apps/web/lib/preset-factory/` — `contract.ts` (pure
Zod + types, safe for B to import), `draft-checks.ts` (pure domain checks),
`service.ts` (operations). DB layer: `supabase/migrations/20261108000001_preset_factory_drafts.sql`.

## Hard boundaries (non-negotiable)

- **Draft-only.** No operation can publish, activate, schedule, transition,
  or mutate a live preset. `public_status` and version `state` are not
  accepted inputs — the RPC writes `draft` unconditionally. Unknown keys
  (`id`, `public_status`, `state`, `created_by_admin_id`, …) are rejected
  by `.strictObject` schemas, so forging an active preset or authorship is
  impossible.
- **Zero generation.** Nothing in this contract starts a generation, runs a
  preset test, calls Fal/OpenRouter or any provider, or spends credits.
  Validation is schema + domain checks only.
- **Private intelligence stays server-side.** `list_preset_catalog` never
  returns `private_instruction_template`, negative instructions, provider
  internals, or user source assets. Audit rows store the product row, not
  the recipe.
- **Admin/owner only, enforced twice.** Service context checks
  `profiles.is_admin || is_owner`; the RPCs re-check `is_admin() ||
is_owner()` on `auth.uid()` inside the database. A client-supplied role
  claim is never trusted.

## Authentication / context

Every operation takes a `PresetFactoryContext`: a **user-scoped** Supabase
client plus the resolved caller identity. The MCP server never holds the
service-role key and never issues SQL — it calls these functions.

**Integration model (agreed with coordinator):** Engineer B imports this
service + `contract.ts` **directly inside the Next.js server** (a
same-process adapter for its MCP transport). There are no separate
`/api/admin/preset-factory/*` HTTP routes; `preset-factory.v1` is the
canonical contract and B adapts its wire types to it.

**Roles.** The gate is `profiles.is_admin OR is_owner`, matching
`requireAdmin` and the `admin_*` RPCs. Note that effective RLS on
`products`/`categories`/`admin_audit_logs`/`product_assets` is
`is_admin()`-only: an owner-only caller (`is_owner` without `is_admin`)
passes context creation and RPC authorization but **fails closed** on
RLS-bound reads/writes (lookup errors, not silent privilege). Owners are
expected to also hold `is_admin`; no existing broad policy was changed.

**Transports:**

```ts
// Cookie session — server actions / same-origin routes:
const ctx = await createPresetFactoryContext(await createServerClient());

// Bearer token — MCP adapter path. The caller's Supabase access token is
// validated against GoTrue and carried on every RLS-bound request:
const ctx = await createBearerPresetFactoryContext(accessToken);
// equivalently: build your own bearer client and pass the JWT for
// server-side validation:
const ctx = await createPresetFactoryContext(userScopedSupabase, {
  bearerToken: accessToken,
});
```

A caller-supplied user id is never trusted: `getUser(jwt)` verifies the
token with GoTrue, and `auth.uid()` inside the RPCs re-resolves it from the
request JWT.

## Error envelope

```ts
type FactoryResult<T> =
  { ok: true; data: T } | { ok: false; error: FactoryError };

type FactoryError = {
  code:
    | "unauthorized"
    | "forbidden"
    | "validation_failed"
    | "slug_conflict"
    | "category_not_found"
    | "category_conflict"
    | "parent_invalid"
    | "capability_invalid"
    | "model_unverified"
    | "asset_invalid"
    | "batch_limit_exceeded"
    | "duplicate_item_key"
    | "idempotency_conflict"
    | "persistence_failed"
    | "internal_error";
  message: string; // safe, actionable — never raw DB/provider detail
  field?: string; // dot path to the offending input field
  details?: Record<string, unknown>;
};
```

Item-level results embed `errors`/`warnings` arrays of `FactoryError`; only
transport/batch-level failures use the top-level `ok:false` envelope.

## Operations

### `list_preset_catalog` → `listPresetCatalog(ctx, query?)`

Read-only admin catalog summaries. **No private recipe content.**

```ts
// query (all optional): { type?: 'filter'|'poster', category_id?: uuid,
//   public_status?: enum, family?: 'roots'|'variants'|'all',
//   limit?: ≤200 (default 100), offset?: ≥0 }
// → { items: CatalogItemSummary[] }

{
  product_id, type, slug, name, public_status, visibility,
  category_id, category_slug, parent_preset_id, standalone_discoverable,
  variant_display_name,
  version_count, has_active_version, has_editable_version,
  latest_version_number, field_count,
  media: { has_hero, has_poster, has_preview_video, has_preview_gif,
           reference_count },
  created_at, updated_at
}
```

### `list_categories` → `listPresetCategories(ctx)` → `{ categories }`

All categories incl. inactive (`is_active` flag included) — drafts may
reference active categories; inactive ones produce a warning.

### `list_compatible_model_options` → `listCompatibleModelOptions(ctx)` → `{ models }`

Server-verified `provider_model_pricing` catalog joined with the route
capability registry:

```ts
{ provider, endpoint_id, display_name, description, category,
  capability: { verified: boolean,   // in ROUTE_CAPABILITIES registry
                max_input_images: n, // total user+reference slots
                supports_prompt_edit: boolean } }
```

`capability.verified === false` → single-image, no-roles, no-prompt drafts
only. This is routing metadata, not a quote — `unit_price` is intentionally
excluded from the contract.

### `validate_preset_batch` → `validatePresetBatch(ctx, batch)`

Pure schema + domain validation. **No writes, no provider calls.** Accepts
the same payload as `create_preset_drafts` so B can dry-run a plan.
Item statuses: `validated` | `failed`. Warnings flag publish blockers
(missing hero/poster media, no category, unreleased capability flags).

### `create_category` → `createPresetCategory(ctx, request)`

```ts
// request: { name, slug, description?, sort_order? = 0, idempotency_key }
// → { status: 'created'|'reused', category: { id, slug, name, description,
//     sort_order, is_active }, warnings }
```

- Slug exists with the same name (case/whitespace-insensitive) → `reused` +
  warning (safe replay).
- Slug exists with a different name → `category_conflict` error;
  `details.existing` carries the conflicting category so B can offer
  `category_id` reuse. The same name check applies to the concurrent-race
  recovery path — `reused` is never returned for a slug that names a
  different category.
- Concurrent creation races resolve deterministically via the unique slug
  constraint. Audited as `preset_factory.category_create`.
- **Retry semantics:** categories have no separate idempotency ledger —
  replay safety relies on slug/name semantics alone. `idempotency_key` is
  still required in the request schema for envelope uniformity, but retries
  are deduplicated purely by the slug-unique constraint + name match above.

### `create_preset_drafts` → `createPresetDrafts(ctx, batch)` → `PresetBatchResult`

```ts
// batch: { batch_id: string(1..120), items: DraftItem[1..25] }

item = {
  client_item_id: string,            // echoed back in results
  idempotency_key: string(16..200),  // per-admin unique; retries reuse
  product: {                         // strict — no id/status fields
    type: 'filter'|'poster', slug, name,
    short_description?, long_description?, public_prompt_recipe?,
    category_id?, visibility? = 'public',
    hero_asset_id?, poster_asset_id?,
    preview_video_asset_id?, preview_gif_asset_id?,
    likeness_level?, featured_rank?,
    parent_preset_id?,               // single-level family (root only)
    standalone_discoverable? = false,
    variant_display_name?, variant_sort_order? = 0,
    filter_config? /* required for type=filter */,
    poster_config? /* required for type=poster */,
    prompt_ui?,
  },
  version: {                         // strict — no id/version_number/state
    private_instruction_template,    // never echoed back in responses
    private_negative_instruction?,
    provider_strategy: { primary_provider, primary_model,
                         fallback_provider?, fallback_model? },
    model_config?, output_sizes?, input_validation_config?,
    input_capability?, post_process_config?, safety_config?,
    credit_cost? = 0,                // display hint, not runtime pricing
  },
  fields?: productFieldSchema[],     // ≤64
  asset_links?: [{ asset_id, role, internal_only?, sort_order? }], // ≤32
}

// result:
{
  batch_id,
  items: [{ client_item_id, status: 'created'|'reused'|'failed',
            product_id?, version_id?, slug?, review_path?,
            errors: FactoryError[], warnings: FactoryError[] }],
  summary: { total, created, reused, validated, failed },
}
```

**Semantics**

- **Per-item atomicity.** Each item is one `admin_create_preset_draft` RPC —
  product + v1 draft + fields + asset links + idempotency claim + audit in a
  single transaction. The _batch_ is sequential and honestly reports partial
  success; it is not transaction-scoped.
- **Idempotent retry.** Replaying the same `(admin_user_id, idempotency_key)`
  returns `status:'reused'` with the originally created `product_id` /
  `version_id` — safe after a lost response or reconnect. The RPC computes a
  canonical payload fingerprint itself (md5 over normalised `jsonb::text`)
  and stores it on the ledger row; a key replayed with a _different_
  payload fails with `idempotency_conflict` — unconditionally, so a forged
  or missing fingerprint can never bypass the check. The caller-supplied
  `p_request_fingerprint` is required non-empty as a submission marker but
  is never trusted for the comparison.
- **Item validation before write.** Per item: schema, slug conflict +
  similar-slug warning, category existence/active, single-level family
  rules, verified route/model, route-capability fit (multi-image budget
  counts linked `*_reference` assets), and asset
  ownership/visibility/media-kind constraints.
- **Asset rules.** Only public, undeleted, unrejected/unflagged
  `preset-media` assets. `preview_video` → video, `preview_gif` → GIF, all
  other roles → image. `*_reference` links bind to the new version and are
  **always** `internal_only` — enforced by schema refine, service coercion,
  and a `CASE` in the RPC (the public product_assets SELECT policy would
  otherwise expose them once the product goes active).
- **Family.** `parent_preset_id` must reference a same-type root preset,
  not retired; variant fields require a parent (Zod + DB trigger + CHECKs).
- **Batch guards.** ≤25 items; `client_item_id`, `idempotency_key`, and
  `product.slug` must be unique inside the batch — violations fail the whole
  request with `duplicate_item_key` before anything is written.

### `get_batch_status` → `getPresetBatchStatus(ctx, { batch_id })`

Reads the idempotency ledger → per-item `{ client_item_id,
idempotency_key, status:'created', product_id, version_id, review_path,
created_at }`. The ledger is **caller-bound**: query and RLS policy both
require `admin_user_id = auth.uid()`, so an admin can only read their own
operation rows. Only successfully created items persist rows; failed items
are reported in the `create_preset_drafts` response, not the ledger.

### `get_review_links` → `getPresetReviewLinks(ctx, { product_ids })`

Read-only handoff for the human review queue:

```ts
{ product_id, slug, name, type, public_status, review_path,   // /admin/filters|posters/<id>
  category_slug, parent_preset_id, has_version,
  blockers: string[] }   // e.g. "missing hero asset", "uncategorized"
```

## Sample request/response

```jsonc
// create_preset_drafts
{
  "batch_id": "owner-2026-10-22-cinematic-filters",
  "items": [{
    "client_item_id": "cine-01",
    "idempotency_key": "b8f2...32hex",
    "product": {
      "type": "filter", "slug": "cinematic-noir-01",
      "name": "Cinematic Noir", "short_description": "…",
      "category_id": "…uuid…", "filter_config": {
        "style_archetype": "noir", "identity_preservation": "high" }
    },
    "version": {
      "private_instruction_template": "…hidden…",
      "provider_strategy": { "primary_provider": "fal-ai",
        "primary_model": "nano-banana/edit" },
      "safety_config": { "allowed_nsfw": false,
        "block_public_figures": true, "block_minors": true },
      "credit_cost": 0
    },
    "fields": [], "asset_links": []
  }]
}
// →
{
  "ok": true,
  "data": {
    "batch_id": "owner-2026-10-22-cinematic-filters",
    "items": [{
      "client_item_id": "cine-01", "status": "created",
      "product_id": "…", "version_id": "…",
      "slug": "cinematic-noir-01",
      "review_path": "/admin/filters/…",
      "errors": [], "warnings": [
        { "code": "asset_invalid",
          "message": "No hero asset — a publish blocker for human review.",
          "field": "product.hero_asset_id" }]
    }],
    "summary": { "total": 1, "created": 1, "reused": 0,
                 "validated": 0, "failed": 0 }
  }
}
```

## Rejection summary (what the contract refuses)

- Non-admin/owner callers (`forbidden`), unauthenticated (`unauthorized`).
- Unknown/extra keys, `public_status`, version `state`, forged ids — strict
  schemas → `validation_failed`.
- Duplicate slug (existing or in-batch) → `slug_conflict` /
  `duplicate_item_key`.
- Missing/ambiguous category → `category_not_found`; slug taken →
  `category_conflict` with the existing record.
- Nested variants, cross-type or retired parents → `parent_invalid`.
- Unverified provider/model → `model_unverified`; capability beyond the
  verified route → `capability_invalid`.
- Non-preset-media / private / rejected / wrong-kind assets → `asset_invalid`.
- > 25 items per batch → `batch_limit_exceeded`.

## Manual test plan (unexecuted — owner authorization required)

Written, NOT run. Automated suite:
`apps/web/lib/preset-factory/__tests__/contract.test.ts`,
`.../draft-checks.test.ts`, `apps/web/tests/db/preset-factory-drafts.db.test.ts`
(`pnpm test:db` — requires local Supabase + owner CI approval).

Human verification checklist (owner-run):

1. Apply the migration on a local/disposable Supabase (`supabase db reset`)
   — never the hosted project without owner sign-off (#221).
2. As a non-admin: every operation returns `forbidden`; the RPC called
   directly also returns `Forbidden`.
3. `validate_preset_batch` with a deliberately broken item (bad slug, dead
   category, nested parent, unknown model, user-owned asset) reports
   per-item errors and writes nothing.
4. `create_preset_drafts` happy path: product + exactly one `state='draft'`
   v1 + all fields + links persist; `public_status='draft'`;
   `created_by_admin_id` = caller.
5. Retry the same request → `status:'reused'`, same ids, no duplicate row.
6. Force a mid-write failure (e.g. second item with a taken slug) → item
   marked `failed`, earlier items persist, no orphan product/versions.
7. `create_category` twice with same slug+name → `reused`; different name →
   `category_conflict` + `details.existing`.
8. `get_batch_status` + `get_review_links` return review paths and honest
   blockers; no private recipe text anywhere in payloads or audit.
9. Verify `admin_audit_logs` contains `preset_factory.draft_create` +
   `preset_factory.batch_create` rows.

## Notes for reviewers

- `createProduct`/`updateProduct`/`duplicateProduct`/`publish*` paths are
  untouched — no regression to the #233 atomic-write flows and no overlap
  with PR #266's `products.ts` edits (this change adds no calls there).
- The only new DB surface: `preset_factory_operations` (admin-read-only
  ledger) + `admin_create_preset_draft` (authenticated EXECUTE, internally
  admin-gated). No grants to `anon`; migration-file only, hosted DB
  untouched pending owner authorization.
