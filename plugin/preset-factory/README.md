# 5Pixels Preset Factory — private ChatGPT plugin (#272)

Owner-only ChatGPT connector that inspects the preset catalog, plans creative
batches, validates complete Filter/Poster definitions, and saves **draft**
presets through the narrow backend API (#271). First release is draft creation
only — **no image generation, no automated testing, no publishing, ever.**

## Architecture

```
ChatGPT connector ──MCP (streamable HTTP, JSON-RPC)──▶ /api/mcp
      │                                                  │
      │  Authorization: Bearer <supabase access token>   │ verify JWT +
      │                                                  │ profiles.is_admin||is_owner
      ▼                                                  ▼
  OAuth 2.1 (PKCE) via Supabase Auth         Preset Factory backend API
  OAuth server on the 5Pixels project        (#271, Engineer A):
        ▲                                    POST /api/admin/preset-factory/v1/*
        └── /.well-known/oauth-protected-resource +
            /.well-known/oauth-authorization-server (discovery)
```

- **Transport** — stateless streamable HTTP, plain `application/json`
  responses, no SSE/sessions. Methods: `initialize`, `ping`,
  `notifications/*`, `tools/list`, `tools/call`.
- **AuthZ** — every request independently verified: Supabase JWT → user →
  per-call `profiles.is_admin || is_owner`. The same Bearer token is forwarded
  to the backend API, which re-checks it — no trust inheritance.
- **Audit** — every tool call writes `mcp.{tool}.{outcome}` to
  `admin_audit_logs` under the caller's uid.
- **Rate limits** — soft per-user buckets (120 reads, 20 writes per window;
  per-instance on serverless).

## Tool inventory

| Tool | Side effects | Purpose |
|---|---|---|
| `get_catalog_summary` | none | Paginated catalog inventory (no private recipes) |
| `find_existing_presets` | none | Name/slug search to avoid duplicates |
| `list_preset_categories` | none | All categories incl. inactive |
| `get_model_capabilities` | none | Verified provider/model options only |
| `plan_preset_batch` | none | Normalize plan: slugs, categories, families, warnings — pure |
| `validate_preset_batch` | none | Local schema + backend domain validation, dry run |
| `create_categories` | **writes** | Approved new categories only (`confirm:true`) |
| `create_draft_batch` | **writes** | Approved draft batch, ≤25 items, idempotent (`confirm:true`) |
| `get_batch_status` | none | Per-item created/reused/failed |
| `get_draft_review_links` | none | Admin edit links + blockers |
| `prepare_manual_preset_review` | none | Owner handoff checklist — manual-testing reminder |

Deliberately absent: any `test_*`, `evaluate_*`, `publish_*`, generation or
credit-spending tool. Do not add them without explicit owner authorization.

## Setup (owner, private)

1. Deploy the app so `/api/mcp` is reachable over stable HTTPS.
2. Enable the **Supabase OAuth server** on the project
   (Authentication → OAuth 2.1 Server) — required for the consent flow.
3. In ChatGPT → Settings → Connectors → create a custom connector pointing at
   `https://<site>/api/mcp`. On first call the connector receives a 401 with
   `resource_metadata`, discovers OAuth metadata via the `.well-known`
   routes, dynamically registers, and runs the PKCE flow against the
   project's auth server — the owner signs in with their normal account.
4. Paste `plugin/preset-factory/INSTRUCTIONS.md` into the connector's
   instructions field.
5. Fallback (dev only): paste a short-lived Supabase access token as a static
   Bearer credential. It expires — OAuth is the intended path.

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `PRESET_FACTORY_BACKEND` | `http` | `http` = A's API; `fixture` = canned dev responses (never prod) |
| `PRESET_FACTORY_API_BASE` | `{origin}/api/admin/preset-factory/v1` | Backend API base |

## Rollback / limitations

- Remove the connector in ChatGPT + revoke OAuth grants in Supabase Auth —
  no server-side state remains (stateless endpoint).
- Per-instance rate limiting is best-effort (serverless).
- `fixture` backend fabricates ids; use it only for offline development.
- Review links follow the existing admin editor routes
  `/admin/filters/{id}` and `/admin/posters/{id}` (by product type).
