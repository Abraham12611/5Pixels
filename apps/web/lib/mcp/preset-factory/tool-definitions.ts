import type { McpTool } from "../protocol";

/**
 * MCP tool surface for the 5Pixels Preset Factory (#272), first release:
 * draft creation only. Deliberately absent — and never to be added without
 * explicit owner authorization — any tool that generates images, runs lab
 * tests, spends credits, or publishes/activates/retires presets.
 *
 * `inputSchema` values are JSON Schema; `annotations` carry MCP behavioral
 * hints so the client can present confirmations correctly.
 */

const uuid = { type: "string", format: "uuid" } as const;

const draftItemSchema = {
  type: "object",
  required: ["client_item_id", "product"],
  properties: {
    client_item_id: {
      type: "string",
      maxLength: 64,
      description:
        "Stable id for this item within the plan (e.g. 'item-001'). Reuse the SAME id when retrying a batch.",
    },
    item_idempotency_key: {
      ...uuid,
      description:
        "Retry-safety key. Generate once per item and REUSE it on retry — never regenerate after a failed attempt.",
    },
    product: {
      type: "object",
      description:
        "Complete productCreateSchema payload: type, slug, name, descriptions, category_id, version (with private_instruction_template, provider_strategy, input_capability, output_sizes), fields, and filter_config or poster_config. Server forces public_status/version.state to 'draft'.",
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
      "Read-only catalog inventory: preset ids, slugs, names, types, categories, statuses, version counts and media-readiness flags. Compact + paginated. Never returns private prompt recipes.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["filter", "poster"] },
        status: { type: "string", description: "public_status filter, e.g. draft|active|archived" },
        category_id: uuid,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
        cursor: { type: "string", description: "Pass back next_cursor for the next page." },
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
      "Search the catalog by name/slug substring before proposing new presets — use this to avoid duplicate or confusingly similar slugs and names.",
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
      "List the admin-verified provider/model options (endpoint ids, cost units) usable in provider_strategy. Use ONLY these — never invent model names.",
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
      "Dry-run validation of complete draft definitions (schema + domain checks: slugs, categories, model capability, family rules). NO generation or testing occurs. Run this on every item before asking the owner to approve creation.",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        items: { type: "array", maxItems: 25, items: draftItemSchema },
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
      "Create ONLY the explicitly owner-approved proposed categories. Present the plan to the owner first, then call with confirm=true. Slug collisions return a conflict with the existing category for reuse.",
    inputSchema: {
      type: "object",
      required: ["categories", "confirm"],
      properties: {
        categories: {
          type: "array",
          maxItems: 10,
          items: {
            type: "object",
            required: ["name", "slug"],
            properties: {
              name: { type: "string", maxLength: 120 },
              slug: { type: "string", maxLength: 120, pattern: "^[a-z0-9-]+$" },
              description: { type: "string", maxLength: 500 },
              sort_order: { type: "integer", minimum: 0 },
            },
            additionalProperties: false,
          },
        },
        confirm: {
          type: "boolean",
          description: "MUST be true — asserts the owner explicitly approved these categories.",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    isWrite: true,
    auditEntity: "category",
  },
  {
    name: "create_draft_batch",
    description:
      "Persist a batch of complete preset drafts AFTER the owner approves the validated plan. Always: (1) plan_preset_batch → (2) validate_preset_batch → (3) present summary to owner → (4) call with confirm=true and the SAME idempotency keys on retry. Server forces every product+version to draft state — nothing can be published here.",
    inputSchema: {
      type: "object",
      required: ["items", "confirm"],
      properties: {
        batch_idempotency_key: {
          ...uuid,
          description: "Stable key for the whole batch — reuse on retry to avoid duplicate writes.",
        },
        items: { type: "array", minItems: 1, maxItems: 25, items: draftItemSchema },
        confirm: {
          type: "boolean",
          description: "MUST be true — asserts the owner explicitly approved this exact item set.",
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
    description: "Per-item outcome of a submitted batch: created/reused/failed plus product ids and slugs.",
    inputSchema: {
      type: "object",
      properties: {
        batch_idempotency_key: uuid,
        product_ids: { type: "array", maxItems: 50, items: uuid },
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
        product_ids: { type: "array", minItems: 1, maxItems: 50, items: uuid },
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
        product_ids: { type: "array", minItems: 1, maxItems: 50, items: uuid },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    isWrite: false,
    auditEntity: "review",
  },
];

export type ToolDefMap = Map<string, ToolDef & { handler: McpTool["handler"] }>;
