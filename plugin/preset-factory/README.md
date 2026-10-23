# 5Pixels Preset Factory — private ChatGPT plugin (#272)

Owner-only ChatGPT connector that inspects the preset catalog, plans creative
batches, validates complete Filter/Poster definitions, and saves **draft**
presets through the canonical service contract (#271). First release is draft
creation only — **no image generation, no automated testing, no publishing,
ever.**

## Architecture

```
ChatGPT connector ──MCP (streamable HTTP, JSON-RPC)──▶ /api/mcp
      │                                                  │
      │  Authorization: Bearer <supabase access token>   │ verify JWT +
      │                                                  │ profiles.is_admin||is_owner
      ▼                                                  ▼
  OAuth 2.1 (PKCE) via Supabase Auth          Engineer A's service
  OAuth server on the 5Pixels project         (lib/preset-factory/service.ts)
        ▲                                     — direct in-process calls on a
        │                                       caller-scoped Supabase client
        │                                     (/oauth/consent = owner consent UI)
        └── /.well-known/oauth-protected-resource +
            /.well-known/oauth-authorization-server (live discovery proxy)
```

- **Transport** — stateless streamable HTTP, plain `application/json`
  responses, no SSE/sessions, **one JSON-RPC message per POST** (the
  2025-06-18 requirement; array batches are rejected). Methods:
  `initialize`, `ping`, `notifications/*`, `tools/list`, `tools/call`.
  Protocol revisions `2025-06-18` / `2025-03-26`; Origin,
  `MCP-Protocol-Version` and body size (≤256 KB) are enforced.
- **AuthN** — every request independently verified: Supabase JWT → user.
  `PRESET_FACTORY_MCP_CLIENT_IDS` is **required in production**: the token's
  `client_id` claim must match the approved OAuth client, so ordinary
  web-session tokens can never drive this surface.
- **Backend** — direct adapter: A's `createBearerPresetFactoryContext(jwt)`
  builds the token-scoped client, validates the JWT, and re-checks the
  profiles role; the #271 service functions run on it (service role never
  touched; `is_admin()/is_owner()` re-checked inside the RPCs).
- **Owner-bound, DB-enforced writes** — a `confirm` flag is *not* enough
  (the model can set it). A refused write STAGES a pending intent via A's
  `stageWriteIntent` — inside SQL (`admin_stage_write_intent`) the canonical
  items are SHA-256 fingerprinted per write-unit, `payload_digest` is
  computed, AND the owner-facing preview is derived from the payload itself
  (callers can no longer supply a preview — a request can never describe one
  payload and stage another). `/admin/preset-factory/approve?intent=…` reads
  `getWriteIntent` (caller-bound) to display that staged preview. The
  action first verifies `PRESET_FACTORY_APPROVAL_SECRET` is configured and
  ≥32 chars — an unconfigured secret must never reach the transition, or
  the approval would be consumed without producing a token — then
  `approveWriteIntent` performs the atomic `pending→approved` transition —
  refused inside the RPC for OAuth callers, non-owners, expired or
  non-pending intents. Only then is an HMAC `approval_token` minted,
  binding {owner, operation, intent_id, SQL digest, 10-min expiry}.
  - **Drafts**: the adapter forwards `approval_intent_id` into
    `createPresetDrafts` — A's draft RPC is **database-gated**: OAuth-issued
    JWTs (client_id claim) are rejected `approval_required` unless the
    intent covers each item's server-computed SHA-256 fingerprint, and it
    consumes them internally. Web/session JWTs are unaffected (unchanged
    admin UI).
  - **Categories**: can't be DB-gated (`categories_admin` policy allows
    direct admin inserts) — the adapter instead binds each requested
    category to the approval rigorously: it reads the staged intent back,
    matches the category's {name, slug, description, sort_order} against the
    SQL-derived staged units, then calls `consumeWriteIntent` **before**
    inserting. A token approved for categories {A,B} can never create a
    different category C — C matches no staged unit and the consume RPC
    additionally rejects any fingerprint the intent doesn't cover, already
    consumed, or staged under a different OAuth client_id. Payload
    mismatch = fail closed, no write.
- **Audit** — every tool call writes `mcp.{tool}.{outcome}` to
  `admin_audit_logs` with the verified `admin_user_id`.
- **Rate limits** — soft per-user buckets (120 reads, 20 writes per window;
  per-instance on serverless).

### Security boundary (explicit)

The HMAC `approval_token` is a **ChatGPT-layer confirmation** — it proves a
write call corresponds to a specific owner-approved intent. The real
authorization is A's **database gate**: OAuth-issued tokens calling
`admin_create_preset_draft` (directly or via this adapter) are refused
without a matching approved+unexpired intent covering each item's
server-computed fingerprint — approval for OAuth-origin draft creation is
enforced in Postgres, not in this adapter.

Residual boundary: **category creation is not DB-gated** — the
`categories_admin` RLS policy already permits direct admin inserts, so a
DB gate could not restrict OAuth writes anyway. Category intents are
consumed at the tool layer (`consumeWriteIntent`); a direct OAuth
PostgREST insert into `categories` bypasses the intent entirely, exactly
as the admin UI always could. Web/session JWTs skip the draft gate too —
unchanged behavior for the admin UI.

## Tool inventory

| Tool | Side effects | Purpose |
|---|---|---|
| `get_catalog_summary` | none | Offset-paginated catalog inventory (no private recipes) |
| `find_existing_presets` | none | Name/slug substring scan over bounded catalog pages |
| `list_preset_categories` | none | All categories incl. inactive |
| `get_model_capabilities` | none | Server-verified provider/model options only |
| `plan_preset_batch` | none | Normalize plan: slugs, categories, families, warnings — pure |
| `validate_preset_batch` | none | Canonical schema + domain validation, dry run |
| `create_categories` | **writes** | Approved categories — requires `approval_token` |
| `create_draft_batch` | **writes** | Approved draft batch, ≤25 items, atomic+idempotent — requires `approval_token` |
| `get_batch_status` | none | Per-item created/failed by `batch_id` |
| `get_draft_review_links` | none | Admin edit links + blockers |
| `prepare_manual_preset_review` | none | Owner handoff checklist — manual-testing reminder |

Deliberately absent: any `test_*`, `evaluate_*`, `publish_*`, generation or
credit-spending tool. Do not add them without explicit owner authorization.

## Setup (owner, private)

1. Deploy the app so `/api/mcp` is reachable over stable HTTPS.
2. Enable the **Supabase OAuth server** on the project
   (Authentication → OAuth 2.1 Server) and set its **authorization/consent
   URL** to `https://<site>/oauth/consent`.
3. Set `PRESET_FACTORY_APPROVAL_SECRET` to a strong secret
   (`openssl rand -hex 32` — ≥32 chars enforced) — without it reads work
   but every write refuses, and approval is blocked BEFORE the
   pending→approved transition so a missing secret can't consume an
   approval without yielding a token.
4. **Deploy Engineer A's `preset_factory_write_intents` migration**
   (`20261109000001`) — the stage/approve/consume RPCs + OAuth draft gate
   the approval flow depends on. Until it lands every write fails closed
   at staging (reads still work).
5. In ChatGPT → Settings → Connectors → Advanced → create a custom connector
   pointing at `https://<site>/api/mcp`. On first call the connector receives
   a 401 with `resource_metadata`, discovers OAuth metadata via the
   `.well-known` routes, and runs the PKCE authorization-code flow: the
   owner signs in, lands on `/oauth/consent`, and approves or denies.
6. Paste `plugin/preset-factory/INSTRUCTIONS.md` into the connector's
   instructions field.
7. **Required in production:** set `PRESET_FACTORY_MCP_CLIENT_IDS` to the
   registered OAuth client id — without it every /api/mcp request fails
   closed. Locally it may stay unset for development.
8. Dev fallback: paste a short-lived Supabase access token as a static
   Bearer credential. It expires — OAuth is the intended path.

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `PRESET_FACTORY_BACKEND` | `direct` | `direct` = A's service in-process; `fixture` = simulated dev responses (refused outside development) |
| `PRESET_FACTORY_APPROVAL_SECRET` | — | HMAC key for owner write approvals; unset or <32 chars = writes fail closed |
| `PRESET_FACTORY_MCP_CLIENT_IDS` | — | **Required in production** — OAuth client-id allowlist for bearer tokens |
| `PRESET_FACTORY_MCP_ALLOWED_ORIGINS` | — | Optional extra Origins allowed to POST (same-origin always OK) |

## Rollback / limitations

- Remove the connector in ChatGPT + revoke OAuth grants in Supabase Auth —
  no server-side state remains (stateless endpoint).
- Per-instance rate limiting is best-effort (serverless).
- `fixture` backend fabricates obviously-simulated ids and can never run in
  production/preview.
- Review links follow the existing admin editor routes
  `/admin/filters/{id}` and `/admin/posters/{id}` (by product type).

## Verification status (honest)

Static checks only — the following are implemented but **UNVERIFIED** and
must not be described as working until the owner runs the live checklist:

- **Engineer A's `preset_factory_write_intents` migration**
  (`20261109000001`) must be applied to the target project — the code calls
  exactly A's shipped RPCs, but every write fails closed until it exists
  on the database.
- Supabase OAuth 2.1 server availability, the consent redirect into
  `/oauth/consent`, and the exact `client_id` claim value on issued tokens
  (code targets the documented claim).
- ChatGPT connector compatibility — registration, PKCE and discovery are
  wired per spec but never exercised end-to-end.
- The approval round-trip (stage → review → atomic claim → mint → write)
  against a live Supabase instance.
- Whether the owner account's `is_admin`/`is_owner` flags satisfy all RLS
  paths (owner-without-admin fails closed on `is_admin()`-gated paths by
  design; owners are expected to hold `is_admin` per app convention).

Live end-to-end checklist for the owner is in "Setup" above; every step is
manual-only per the owner's testing policy.
