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
  responses, no SSE/sessions. Methods: `initialize`, `ping`,
  `notifications/*`, `tools/list`, `tools/call`. Protocol revisions
  `2025-06-18` / `2025-03-26`; Origin, `MCP-Protocol-Version`, body size
  (≤256 KB) and batch (≤10 messages, ≤4 concurrent) are enforced.
- **AuthN** — every request independently verified: Supabase JWT → user →
  per-call `profiles.is_admin || is_owner`. Optional
  `PRESET_FACTORY_MCP_CLIENT_IDS` restricts accepted tokens to the approved
  OAuth client.
- **Backend** — direct adapter to `createPresetFactoryContext` + the #271
  service functions; the caller's own token-scoped client drives every query
  and RPC (service role is never touched; `is_admin()/is_owner()` re-checks
  happen inside the SECURITY DEFINER RPCs too).
- **Owner-bound writes** — a `confirm` flag is *not* enough (the model can
  set it). Both write tools require `approval_token`: an HMAC token minted
  only inside the authenticated admin UI at `/admin/preset-factory/approve`,
  binding {owner id, operation, canonical payload digest, 10-min expiry}.
  The refused call returns the digest + approval link; the owner verifies
  the digest matches what ChatGPT showed, mints, and pastes the token.
- **Audit** — every tool call writes `mcp.{tool}.{outcome}` to
  `admin_audit_logs` with the verified `admin_user_id`.
- **Rate limits** — soft per-user buckets (120 reads, 20 writes per window;
  per-instance on serverless).

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
3. Set `PRESET_FACTORY_APPROVAL_SECRET` (openssl rand -hex 32) — without it
   reads work but every write refuses.
4. In ChatGPT → Settings → Connectors → Advanced → create a custom connector
   pointing at `https://<site>/api/mcp`. On first call the connector receives
   a 401 with `resource_metadata`, discovers OAuth metadata via the
   `.well-known` routes, and runs the PKCE authorization-code flow: the
   owner signs in, lands on `/oauth/consent`, and approves or denies.
5. Paste `plugin/preset-factory/INSTRUCTIONS.md` into the connector's
   instructions field.
6. Recommended: set `PRESET_FACTORY_MCP_CLIENT_IDS` to the registered client
   id so only connector-issued tokens can drive this surface.
7. Dev fallback: paste a short-lived Supabase access token as a static
   Bearer credential. It expires — OAuth is the intended path.

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `PRESET_FACTORY_BACKEND` | `direct` | `direct` = A's service in-process; `fixture` = simulated dev responses (refused outside development) |
| `PRESET_FACTORY_APPROVAL_SECRET` | — | HMAC key for owner write approvals; unset = writes fail closed |
| `PRESET_FACTORY_MCP_CLIENT_IDS` | — | Optional OAuth client-id allowlist for bearer tokens |
| `PRESET_FACTORY_MCP_ALLOWED_ORIGINS` | — | Optional extra Origins allowed to POST (same-origin always OK) |

## Rollback / limitations

- Remove the connector in ChatGPT + revoke OAuth grants in Supabase Auth —
  no server-side state remains (stateless endpoint).
- Per-instance rate limiting is best-effort (serverless).
- `fixture` backend fabricates obviously-simulated ids and can never run in
  production/preview.
- Review links follow the existing admin editor routes
  `/admin/filters/{id}` and `/admin/posters/{id}` (by product type).
- OAuth consent requires the project's OAuth 2.1 server to be enabled and
  the connector flow manually verified once — the `.well-known` metadata is
  proxied live from Supabase so it can't drift.
