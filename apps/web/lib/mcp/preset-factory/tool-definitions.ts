import type { McpTool } from "../protocol";

/**
 * MCP tool surface for the 5Pixels Preset Factory (#272), first release:
 * draft creation only. Deliberately absent — and never to be added without
 * explicit owner authorization — any tool that generates images, runs lab
 * tests, spends credits, or publishes/activates/retires presets.
 *
 * Input/output shapes mirror Engineer A's canonical contract
 * (`lib/preset-factory/contract.ts`, preset-factory.v1) — the same Zod
 * schemas validate on the server, so nothing a client sends can carry
 * server-controlled fields (product/version ids, states, statuses).
 *
 * `inputSchema` values are JSON Schema; `annotations` carry MCP behavioral
 * hints so the client can present confirmations correctly.
 */

const uuid = { type: "string", format: "uuid" } as const;
const idempotencyKey = {
  type: "string",
  minLength: 16,
  maxLength: 200,
  description:
    "Retry-safe key (≥16 chars). Generate once and REUSE it on retry — never regenerate after a failed attempt. If omitted, the server derives one deterministically from the batch + item identity.",
} as const;

const draftItemSchema = {
  type: "object",
  required: ["client_item_id", "product", "version"],
  properties: {
    client_item_id: {
      type: "string",
      maxLength: 120,
      description:
        "Stable id for this item within the plan (e.g. 'item-001'). Reuse the SAME id when retrying a batch.",
    },
    idempotency_key: idempotencyKey,
    product: {
      type: "object",
      description:
        "PresetDraftProduct: type, slug, name, short/long_description, public_prompt_recipe (editorial copy only — never the private recipe), category_id, visibility, hero/poster/preview asset ids (previously approved only), likeness_level, featured_rank, parent_preset_id, standalone_discoverable, variant_display_name, variant_sort_order, filter_config (style_archetype required for filters), poster_config (layout_template required for posters), prompt_ui. STRICT — server-controlled keys (id, public_status) are rejected.",
    },
    version: {
      type: "object",
      description:
        "PresetDraftVersion: private_instruction_template (required), private_negative_instruction, provider_strategy, model_config, output_sizes (≤4MP each), input_validation_config, input_capability, post_process_config, safety_config, credit_cost (display hint). STRICT — id/version_number/state are server-controlled and rejected if present.",
    },
    fields: {
      type: "array",
      maxItems: 64,
      items: { type: "object" },
      description: "productFieldSchema rows — the preset's user-facing controls.",
    },
    asset_links: {
      type: "array",
      maxItems: 32,
      items: { type: "object" },
      description:
        "{asset_id, role, internal_only?, sort_order?} — only previously approved preset-media asset ids.",
    },
  },
  additionalProperties: false,
} as const;

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
  /** Whether calls count against the tight write rate limit. */
  isWrite: boolean;
  /** Audit entity type recorded per call. */
  auditEntity: string;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: "get_catalog_summary",
    description:
      "Read-only catalog inventory: preset ids, slugs, names, types, categories, statuses, family links, version counts and media-readiness flags. Paginated by offset. Never returns private prompt recipes.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["filter", "poster"] },
        public_status: {
          type: "string",
          enum: ["draft", "internal_test", "private_beta", "scheduled", "active", "paused", "retired"],
        },
        category_id: uuid,
        family: {
          type: "string",
          enum: ["roots", "variants", "all"],
          description: "roots = no parent, variants = has parent.",
        },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 100 },
        offset: { type: "integer", minimum: 0, default: 0 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "catalog",
  },
  {
    name: "find_existing_presets",
    description:
      "Search the catalog by name/slug substring before proposing new presets — use this to avoid duplicate or confusingly similar slugs and names. Scans catalog pages server-side; match is case-insensitive substring.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", minLength: 1, maxLength: 120 },
        type: { type: "string", enum: ["filter", "poster"] },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "catalog",
  },
  {
    name: "list_preset_categories",
    description:
      "List all preset categories including inactive ones — check this BEFORE proposing new categories; reuse existing wherever possible.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "category",
  },
  {
    name: "get_model_capabilities",
    description:
      "List the server-verified provider/model options (endpoint ids, capability hints, display names) usable in provider_strategy. Use ONLY these — never invent model names. Unverified options are flagged, not hidden.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "provider_catalog",
  },
  {
    name: "plan_preset_batch",
    description:
      "Normalize a creative batch plan BEFORE drafting: canonical slugs, stable client_item_ids, category reuse vs new-category proposals, one-level family checks, collision warnings. Pure — nothing is persisted.",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          maxItems: 25,
          items: {
            type: "object",
            required: ["name", "type", "concept", "category"],
            properties: {
              name: { type: "string", maxLength: 120 },
              type: { type: "string", enum: ["filter", "poster"] },
              concept: {
                type: "string",
                maxLength: 1000,
                description: "One-paragraph creative intent for the preset.",
              },
              category: { type: "string", description: "Existing category name/slug, or a new name." },
              proposes_new_category: { type: "boolean", default: false },
              new_category_reason: { type: "string", maxLength: 300 },
              parent_preset_slug: {
                type: "string",
                description: "Existing preset slug to attach as a one-level variant (optional).",
              },
              slug_hint: { type: "string", maxLength: 120 },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "plan",
  },
  {
    name: "validate_preset_batch",
    description:
      "Dry-run validation of complete draft definitions through the canonical service (schema + domain checks: slugs, categories, model capability, family rules, asset links). NO generation, testing or persistence occurs. Run this on every item before asking the owner to approve creation.",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        batch_id: {
          type: "string",
          maxLength: 120,
          description: "Optional correlation id — reused on the later create call for a consistent trail.",
        },
        items: { type: "array", minItems: 1, maxItems: 25, items: draftItemSchema },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "validation",
  },
  {
    name: "create_categories",
    description:
      "Create ONLY the explicitly owner-approved proposed categories. Requires approval_token — a short-lived token the owner mints in the 5Pixels admin UI after inspecting the staged request's real item list. Call WITHOUT the token first to stage the intent and receive the approval link; on the approved re-call just pass the SAME categories — the database verifies each category's exact payload fingerprint against the approved intent, consumes it and inserts atomically. A category that was not staged is refused. Slug collisions return a conflict with the existing category for reuse (no approval is spent). NOT retry-safe after success: once a category's approval unit is consumed, repeating the same approved call is rejected — check list_preset_categories instead of re-calling.",
    inputSchema: {
      type: "object",
      required: ["categories"],
      properties: {
        categories: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            required: ["name", "slug"],
            properties: {
              name: { type: "string", minLength: 1, maxLength: 120 },
              slug: { type: "string", minLength: 1, maxLength: 120, pattern: "^[a-z0-9-]+$" },
              description: { type: "string", maxLength: 500 },
              sort_order: { type: "integer", minimum: 0, maximum: 9999 },
              idempotency_key: idempotencyKey,
            },
            additionalProperties: false,
          },
        },
        approval_token: {
          type: "string",
          description:
            "Owner-minted approval token binding the caller, operation and approved intent id. Obtain it via the approval flow, never fabricate it.",
        },
        approval_intent_id: {
          type: "string",
          format: "uuid",
          description:
            "Resume path — the intent_id returned by the staging refusal. Re-call with the SAME payload plus this id after the owner approves in the admin UI; no token needed. The database re-verifies every payload fingerprint against the intent.",
        },
      },
      additionalProperties: false,
    },
    // idempotentHint: false — a repeated approved call is rejected once the
    // payload's approval unit is consumed (the consume precedes the insert;
    // unlike drafts there is no ledger replay that bypasses it).
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    isWrite: true,
    auditEntity: "category",
  },
  {
    name: "create_draft_batch",
    description:
      "Persist a batch of complete preset drafts AFTER the owner approves the validated plan. Flow: (1) plan_preset_batch → (2) validate_preset_batch → (3) present summary to owner → (4) call WITHOUT approval_token to stage a server-held approval intent (SQL fingerprints the exact items) and get the approval link → (5) the owner inspects the staged items in the admin UI and approves → (6) re-call with approval_token and the SAME ids/keys — the approved intent id is forwarded to the draft RPC, which verifies and consumes each item's fingerprint. The atomic RPC forces every product+version to draft — nothing can be published here.",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        batch_id: {
          type: "string",
          minLength: 1,
          maxLength: 120,
          description:
            "Owner-visible correlation id for status/review lookups. If omitted, the server derives a stable one from the item set — reuse the returned id on retry.",
        },
        items: { type: "array", minItems: 1, maxItems: 25, items: draftItemSchema },
        approval_token: {
          type: "string",
          description:
            "Owner-minted approval token bound to this exact payload's digest, the operation and the caller. Obtain it via the approval flow, never fabricate it.",
        },
        approval_intent_id: {
          type: "string",
          format: "uuid",
          description:
            "Resume path — the intent_id returned by the staging refusal. Re-call with the SAME payload plus this id after the owner approves in the admin UI; no token needed. The database re-verifies every item fingerprint against the intent.",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    isWrite: true,
    auditEntity: "preset_draft",
  },
  {
    name: "get_batch_status",
    description:
      "Per-item outcome of a submitted batch: created/failed plus product ids, version ids and admin review paths. Looks up by the batch_id returned from create_draft_batch.",
    inputSchema: {
      type: "object",
      required: ["batch_id"],
      properties: {
        batch_id: { type: "string", minLength: 1, maxLength: 120 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "batch",
  },
  {
    name: "get_draft_review_links",
    description:
      "Admin editor links and blocker lists for created drafts — hand these to the owner for manual review. Missing media/verification show up as blockers.",
    inputSchema: {
      type: "object",
      required: ["product_ids"],
      properties: {
        product_ids: { type: "array", minItems: 1, maxItems: 200, items: uuid },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "batch",
  },
  {
    name: "prepare_manual_preset_review",
    description:
      "Compose the owner's manual-review handoff for a created batch: per-item admin links, missing-media/blocker checklist, and a reminder that ALL testing is manual-only — this server cannot generate, test or publish anything.",
    inputSchema: {
      type: "object",
      required: ["product_ids"],
      properties: {
        product_ids: { type: "array", minItems: 1, maxItems: 200, items: uuid },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "review",
  },
];

export type ToolDefMap = Map<string, ToolDef & { handler: McpTool["handler"] }>;
