import { createHash } from "node:crypto";
import {
  MAX_BATCH_ITEMS,
  createCategoryRequestSchema,
  presetDraftItemSchema,
  type CatalogQuery,
  type CreateCategoryRequest,
  type FactoryResult,
  type PresetDraftItem,
  type StageWriteIntentRequest,
} from "@/lib/preset-factory/contract";
import {
  createBearerPresetFactoryContext,
  type PresetFactoryContext,
} from "@/lib/preset-factory/service";
import type { McpCallerContext } from "../auth";
import { auditMcpToolCall } from "../audit";
import { checkRateLimit } from "../rate-limit";
import { toolError, toolOk, type ToolResultPayload } from "../protocol";
import {
  CONTRACT_VERSION,
  getPresetFactoryBackend,
  type PresetFactoryBackend,
} from "./backend";
import {
  approvalRequired,
  buildIntentSummary,
  payloadDigest,
  verifyApprovalToken,
  type ApprovableOperation,
} from "./approval";
import { planPresetBatch, type ProposedPlanItem } from "./planner";
import { TOOL_DEFS, type ToolDef } from "./tool-definitions";

/** Per-request context threaded into every handler. */
export interface ToolContext {
  caller: McpCallerContext;
  requestOrigin: string;
  /** Lazily resolved canonical service context + backend. */
  factory?: PresetFactoryContext;
  backend?: PresetFactoryBackend;
}

const CATALOG_SEARCH_PAGES = 2; // find_existing_presets scans ≤400 rows

/** Deterministic key/id derivation — same inputs → same key, so a retry
 * that lost its keys still hits the service's idempotency ledger instead
 * of minting duplicates. */
function deriveKey(scope: string, ...parts: string[]): string {
  const h = createHash("sha256").update(`preset-factory:${scope}:${parts.join("|")}`).digest("hex");
  return `pf-${scope}-${h.slice(0, 32)}`;
}

function env<T>(data: T) {
  return { ok: true as const, contractVersion: CONTRACT_VERSION, data };
}

/** Uniform pass-through for canonical results. */
async function passthrough<T>(promise: Promise<FactoryResult<T>>): Promise<ToolResultPayload> {
  const res = await promise;
  if (!res.ok) return toolError(res.error.message, env(res.error));
  return toolOk(env(res.data));
}

/**
 * Resolve the caller-scoped factory context + backend once per request.
 * A's `createBearerPresetFactoryContext` builds the token-scoped client,
 * validates the JWT with GoTrue, and re-checks the profiles role — the
 * single authoritative authorization gate for every tool.
 */
async function resolveBackend(
  ctx: ToolContext
): Promise<{ ok: true; backend: PresetFactoryBackend } | { ok: false; result: ToolResultPayload }> {
  if (ctx.backend) return { ok: true, backend: ctx.backend };
  const factoryRes = await createBearerPresetFactoryContext(ctx.caller.accessToken);
  if (!factoryRes.ok) {
    return { ok: false, result: toolError(factoryRes.error.message, env(factoryRes.error)) };
  }
  ctx.factory = factoryRes.data;
  ctx.backend = await getPresetFactoryBackend({ ctx: factoryRes.data });
  return { ok: true, backend: ctx.backend };
}

type RawItem = {
  client_item_id?: string;
  idempotency_key?: string;
  product?: unknown;
  version?: unknown;
  fields?: unknown;
  asset_links?: unknown;
};

/**
 * Normalize raw items into the canonical PresetDraftItem shape:
 * deterministic idempotency keys where the client didn't supply one, then
 * a strict schema parse. Server-controlled fields (ids, states, statuses)
 * are REJECTED by the strict schema — never silently rewritten.
 */
interface NormalizedItems {
  items: PresetDraftItem[];
  failures: {
    client_item_id: string;
    errors: { code: string; message: string; field?: string }[];
  }[];
}

function normalizeDraftItems(rawItems: RawItem[], batchId: string): NormalizedItems {
  const failures: NormalizedItems["failures"] = [];
  const items: PresetDraftItem[] = [];

  rawItems.forEach((raw, index) => {
    const clientItemId =
      typeof raw.client_item_id === "string" && raw.client_item_id.trim()
        ? raw.client_item_id
        : `item-${String(index + 1).padStart(3, "0")}`;
    const candidate = {
      client_item_id: clientItemId,
      idempotency_key:
        typeof raw.idempotency_key === "string" && raw.idempotency_key.length >= 16
          ? raw.idempotency_key
          : deriveKey("it", batchId, clientItemId),
      product: raw.product,
      version: raw.version,
      fields: raw.fields ?? [],
      asset_links: raw.asset_links ?? [],
    };
    const parsed = presetDraftItemSchema.safeParse(candidate);
    if (!parsed.success) {
      failures.push({
        client_item_id: clientItemId,
        errors: parsed.error.issues.map((i) => ({
          code: "validation_failed" as const,
          message: i.message,
          field: i.path.map(String).join(".") || undefined,
        })),
      });
      return;
    }
    items.push(parsed.data);
  });

  return { items, failures };
}

/**
 * The owner-approval gate shared by both write tools (A's intent contract):
 *
 *   No token → `stageWriteIntent` on the caller's bearer context — SQL
 *   fingerprints the canonical payload and returns {intent_id, digest,
 *   item_fingerprints} → refuse with `approval_required` + approval_url.
 *
 *   Token → verify the ChatGPT-layer HMAC (binds owner, operation, the
 *   approved intent id + A's SQL digest) and return the intent id — the
 *   write then forwards `approval_intent_id` (drafts: the RPC verifies +
 *   consumes internally) or consumes each fingerprint (categories).
 */
async function stageOrVerifyApproval(
  ctx: ToolContext,
  backend: PresetFactoryBackend,
  operation: ApprovableOperation,
  stageRequest: StageWriteIntentRequest,
  token: unknown
): Promise<
  | { approved: true; intentId: string }
  | { approved: false; result: ToolResultPayload }
> {
  if (typeof token !== "string" || !token) {
    const staged = await backend.stageWriteIntent(stageRequest);
    if (!staged.ok) {
      return {
        approved: false,
        result: toolError(`Write refused: ${staged.error.message}`, env({
          error: { code: "approval_staging_failed", message: staged.error.message },
        })),
      };
    }
    return {
      approved: false,
      result: toolError(
        "Owner approval required — a pending approval request was staged.",
        env({
          error: approvalRequired({
            operation,
            intentId: staged.data.intent_id,
            digest: staged.data.digest,
            itemFingerprints: staged.data.item_fingerprints,
            expiresAt: staged.data.expires_at,
            siteOrigin: ctx.requestOrigin,
          }),
        })
      ),
    };
  }
  const check = verifyApprovalToken(token, {
    userId: ctx.caller.user.id,
    operation,
  });
  if (!check.ok) {
    return {
      approved: false,
      result: toolError(
        `Write refused: approval token rejected (${check.reason}). The owner must approve this request in the admin UI.`,
        env({ error: { code: "approval_invalid", reason: check.reason } })
      ),
    };
  }
  return { approved: true, intentId: check.intentId };
}

export function buildToolHandlers(): Map<
  string,
  ToolDef & { handler: (args: unknown, ctx: unknown) => Promise<ToolResultPayload> }
> {
  const handlers = new Map<
    string,
    ToolDef & { handler: (args: unknown, ctx: unknown) => Promise<ToolResultPayload> }
  >();

  const register = (
    name: string,
    handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResultPayload>
  ) => {
    const def = TOOL_DEFS.find((t) => t.name === name);
    if (!def) throw new Error(`No tool def for ${name}`);
    handlers.set(name, {
      ...def,
      handler: async (args, rawCtx) => {
        const ctx = rawCtx as ToolContext;
        // Per-call rate limit (tighter for writes) + audit — outside the
        // handler so no tool can forget either.
        const rl = checkRateLimit(ctx.caller.user.id, def.isWrite ? "write" : "default");
        if (!rl.allowed) {
          await auditMcpToolCall(ctx.caller.supabase, {
            userId: ctx.caller.user.id,
            tool: name,
            entityType: def.auditEntity,
            outcome: "denied",
          });
          return toolError(`Rate limited — retry in ~${rl.retryAfterSec}s.`, {
            ok: false,
            contractVersion: CONTRACT_VERSION,
            error: { code: "rate_limited", message: `Retry in ~${rl.retryAfterSec}s.` },
          });
        }
        let result: ToolResultPayload;
        try {
          result = await handler((args ?? {}) as Record<string, unknown>, ctx);
        } catch (err) {
          result = toolError(err instanceof Error ? err.message : "Tool failed");
        }
        await auditMcpToolCall(ctx.caller.supabase, {
          userId: ctx.caller.user.id,
          tool: name,
          entityType: def.auditEntity,
          outcome: result.isError ? "error" : "ok",
        });
        return result;
      },
    });
  };

  const backend = async (ctx: ToolContext) => resolveBackend(ctx);

  // --------------------------------------------------------------- reads
  register("get_catalog_summary", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    const limit = typeof args.limit === "number" ? Math.min(args.limit, 200) : 100;
    const offset = typeof args.offset === "number" ? Math.max(0, args.offset) : 0;
    const res = await b.backend.listPresetCatalog({
      type: args.type as CatalogQuery["type"],
      category_id: args.category_id as string | undefined,
      public_status: args.public_status as CatalogQuery["public_status"],
      family: (args.family as CatalogQuery["family"]) ?? "all",
      limit,
      offset,
    });
    if (!res.ok) return toolError(res.error.message, env(res.error));
    return toolOk(
      env({
        items: res.data.items,
        page: { limit, offset, next_offset: res.data.items.length === limit ? offset + limit : null },
      })
    );
  });

  register("find_existing_presets", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    const query = String(args.query ?? "").trim().toLowerCase();
    const limit = typeof args.limit === "number" ? Math.min(args.limit, 50) : 20;
    // The canonical catalog op has no text filter — scan bounded pages and
    // match client-side; the scope is reported honestly in the result.
    const scanned = [];
    for (let page = 0; page < CATALOG_SEARCH_PAGES; page++) {
      const res = await b.backend.listPresetCatalog({
        type: args.type as "filter" | "poster" | undefined,
        family: "all",
        limit: 200,
        offset: page * 200,
      });
      if (!res.ok) return toolError(res.error.message, env(res.error));
      scanned.push(...res.data.items);
      if (res.data.items.length < 200) break;
    }
    const matches = scanned
      .filter((i) => i.slug.toLowerCase().includes(query) || i.name.toLowerCase().includes(query))
      .slice(0, limit);
    return toolOk(
      env({
        items: matches,
        search_scope: { scanned: scanned.length, max_pages: CATALOG_SEARCH_PAGES, complete: scanned.length < 200 * CATALOG_SEARCH_PAGES },
      })
    );
  });

  register("list_preset_categories", async (_args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    return passthrough(b.backend.listCategories());
  });

  register("get_model_capabilities", async (_args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    return passthrough(b.backend.listCompatibleModelOptions());
  });

  // ---------------------------------------------------------------- plan
  register("plan_preset_batch", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    const [catalogRes, categoryRes] = await Promise.all([
      b.backend.listPresetCatalog({ family: "all", limit: 200, offset: 0 }),
      b.backend.listCategories(),
    ]);
    if (!catalogRes.ok) return toolError(catalogRes.error.message, env(catalogRes.error));
    if (!categoryRes.ok) return toolError(categoryRes.error.message, env(categoryRes.error));

    const proposed = (Array.isArray(args.items) ? args.items : []) as ProposedPlanItem[];
    const plan = planPresetBatch(proposed, catalogRes.data.items, categoryRes.data.categories);
    return toolOk(
      env({
        plan,
        reminder:
          "Planning is pure — nothing was persisted. Present this plan to the owner; writes require the owner-approved token flow on create_categories/create_draft_batch.",
      })
    );
  });

  // ------------------------------------------------------------ validate
  register("validate_preset_batch", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    const rawItems = (Array.isArray(args.items) ? args.items : []) as RawItem[];
    if (rawItems.length === 0 || rawItems.length > MAX_BATCH_ITEMS) {
      return toolError(`items must contain 1..${MAX_BATCH_ITEMS} entries`);
    }
    const batchId =
      typeof args.batch_id === "string" && args.batch_id.trim()
        ? args.batch_id
        : `pf-batch-${payloadDigest(rawItems).slice(0, 24)}`;
    const normalized = normalizeDraftItems(rawItems, batchId);

    // Items that fail strict schema are reported locally; the rest go to the
    // service's real validation — the mode is reported honestly either way.
    const toService = normalized.items;
    const localFailures = normalized.failures;
    const remote =
      toService.length > 0
        ? await b.backend.validatePresetBatch({ batch_id: batchId, items: toService })
        : null;
    if (remote && !remote.ok) return toolError(remote.error.message, env(remote.error));

    const results = [
      ...localFailures.map((f) => ({
        client_item_id: f.client_item_id,
        status: "failed" as const,
        errors: f.errors,
        warnings: [],
      })),
      ...(remote?.ok ? remote.data.items : []),
    ];
    return toolOk(
      env({
        batch_id: batchId,
        items: results,
        summary: remote?.ok
          ? {
              ...remote.data.summary,
              total: results.length,
              failed: remote.data.summary.failed + localFailures.length,
            }
          : {
              total: results.length,
              created: 0,
              reused: 0,
              validated: 0,
              failed: localFailures.length,
            },
        validation_mode: remote?.ok
          ? "schema_and_domain" // canonical service ran real domain checks
          : "schema_only", // local strict-schema failures only
        note: "Validation is a dry run — no generation, testing, credits or persistence occurred.",
      })
    );
  });

  // -------------------------------------------------------------- writes
  register("create_categories", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    const rawCats = (Array.isArray(args.categories) ? args.categories : []) as {
      name: string;
      slug: string;
      description?: string;
      sort_order?: number;
      idempotency_key?: string;
    }[];
    if (rawCats.length === 0 || rawCats.length > 10) {
      return toolError("categories must contain 1..10 entries");
    }

    // Canonical payload — the digest is computed over EXACTLY this, after
    // deterministic idempotency-key derivation, so approval binds the real write.
    const candidates = rawCats.map((c) => ({
      name: c.name,
      slug: c.slug,
      ...(c.description !== undefined ? { description: c.description } : {}),
      sort_order: c.sort_order ?? 0,
      idempotency_key:
        typeof c.idempotency_key === "string" && c.idempotency_key.length >= 16
          ? c.idempotency_key
          : deriveKey("cat", String(c.slug), String(c.name)),
    }));
    // Local schema check before the approval round-trip — no point asking the
    // owner to approve a payload the strict schema would refuse anyway.
    const parsedCats = candidates.map((c) => ({
      slug: String(c.slug),
      parsed: createCategoryRequestSchema.safeParse(c),
    }));
    const catFailures = parsedCats.filter((r) => !r.parsed.success);
    if (catFailures.length > 0) {
      return toolError("Some categories failed schema checks — fix and retry.", {
        ok: false,
        contractVersion: CONTRACT_VERSION,
        error: {
          code: "validation_failed",
          message: "Local schema checks failed",
          details: catFailures.map((f) => ({
            slug: f.slug,
            errors: f.parsed.success ? [] : f.parsed.error.issues.map((i) => ({ message: i.message, field: i.path.join(".") })),
          })),
        },
      });
    }
    const canonicalCategories = parsedCats
      .map((r) => (r.parsed.success ? r.parsed.data : null))
      .filter((c): c is CreateCategoryRequest => c !== null)
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        ...(c.description !== undefined ? { description: c.description } : {}),
        sort_order: c.sort_order,
        idempotency_key: c.idempotency_key,
      }));

    const gate = await stageOrVerifyApproval(
      ctx,
      b.backend,
      "create_categories",
      {
        operation: "create_categories",
        categories: canonicalCategories,
        preview: buildIntentSummary("create_categories", {
          categories: canonicalCategories,
        }) as unknown as Record<string, unknown>,
        ttl_seconds: 900,
      },
      args.approval_token
    );
    if (!gate.approved) return gate.result;
    const intentId = gate.intentId;

    // Per-item approved fingerprints, echoed back verbatim from the staged
    // response (index-aligned with the categories). SQL verifies coverage
    // on every consume — these are claims, not authority.
    const fingerprints = Array.isArray(args.item_fingerprints)
      ? (args.item_fingerprints as string[])
      : [];

    const results = [];
    for (const [i, c] of canonicalCategories.entries()) {
      const res = await b.backend.createCategory(c);
      if (!res.ok) {
        results.push({
          slug: c.slug,
          status: "failed" as const,
          error: res.error,
          approval: { consumed: false },
        });
        continue;
      }
      // Only an actual CREATE consumes an approval unit — a `reused`
      // category wrote nothing, so its fingerprint stays unconsumed and
      // the intent's consumed/total accounting stays truthful.
      let consumption: { consumed: boolean; error?: string } = { consumed: false };
      if (res.data.status === "created") {
        const fp = fingerprints[i];
        if (typeof fp !== "string" || !fp) {
          consumption = { consumed: false, error: "item_fingerprints missing for this item" };
        } else {
          const consumed = await b.backend.consumeWriteIntent({
            intent_id: intentId,
            operation: "create_categories",
            request_fingerprint: fp,
          });
          consumption = consumed.ok
            ? { consumed: true }
            : { consumed: false, error: consumed.error.message };
        }
      }
      results.push({
        slug: c.slug,
        status: res.data.status,
        category: res.data.category,
        warnings: res.data.warnings,
        approval: consumption,
      });
    }
    return toolOk(
      env({
        results,
        summary: {
          created: results.filter((r) => r.status === "created").length,
          reused: results.filter((r) => r.status === "reused").length,
          failed: results.filter((r) => r.status === "failed").length,
          consumed: results.filter((r) => r.approval.consumed).length,
        },
      })
    );
  });

  register("create_draft_batch", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    const rawItems = (Array.isArray(args.items) ? args.items : []) as RawItem[];
    if (rawItems.length === 0 || rawItems.length > MAX_BATCH_ITEMS) {
      return toolError(`items must contain 1..${MAX_BATCH_ITEMS} entries`);
    }
    // batch_id is owner-visible correlation — deterministic derivation keeps
    // a keyless retry on the same ledger instead of minting a new batch.
    const batchId =
      typeof args.batch_id === "string" && args.batch_id.trim()
        ? args.batch_id
        : `pf-batch-${payloadDigest(rawItems).slice(0, 24)}`;
    const normalized = normalizeDraftItems(rawItems, batchId);
    if (normalized.failures.length > 0) {
      return toolError("Some items failed strict schema checks — fix and re-validate before creating.", {
        ok: false,
        contractVersion: CONTRACT_VERSION,
        error: { code: "validation_failed", message: "Local schema checks failed", details: normalized.failures },
      });
    }

    // The staged intent fingerprints exactly this canonical item set in
    // SQL — the approval binds what would actually be written.
    const canonical = { batch_id: batchId, items: normalized.items };
    const gate = await stageOrVerifyApproval(
      ctx,
      b.backend,
      "create_draft_batch",
      {
        operation: "create_draft_batch",
        batch_id: batchId,
        items: normalized.items,
        preview: buildIntentSummary("create_draft_batch", canonical) as unknown as Record<
          string,
          unknown
        >,
        ttl_seconds: 900,
      },
      args.approval_token
    );
    if (!gate.approved) return gate.result;

    // The approved intent id goes INTO the batch — A's draft RPC verifies
    // it (OAuth gate) and consumes each item's fingerprint internally.
    const res = await b.backend.createPresetDrafts({
      ...canonical,
      approval_intent_id: gate.intentId,
    });
    if (!res.ok) return toolError(res.error.message, env(res.error));
    return toolOk(
      env({
        ...res.data,
        reminder:
          "All results are unpublished drafts. Manual owner review and manual-only testing are still required — nothing here was generated, tested or published.",
      })
    );
  });

  register("get_batch_status", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    return passthrough(b.backend.getBatchStatus({ batch_id: String(args.batch_id ?? "") }));
  });

  register("get_draft_review_links", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    return passthrough(b.backend.getReviewLinks({ product_ids: (args.product_ids as string[]) ?? [] }));
  });

  register("prepare_manual_preset_review", async (args, ctx) => {
    const b = await backend(ctx);
    if (!b.ok) return b.result;
    const productIds = (args.product_ids as string[]) ?? [];
    const res = await b.backend.getReviewLinks({ product_ids: productIds });
    if (!res.ok) return toolError(res.error.message, env(res.error));

    const items = res.data.items.map((l) => ({
      product_id: l.product_id,
      slug: l.slug,
      name: l.name,
      type: l.type,
      admin_edit_url: `${ctx.requestOrigin}${l.review_path}`,
      blockers: l.blockers,
      checklist: [
        "Open the admin editor link and eyeball name/descriptions/category",
        "Verify private_instruction_template reads correctly in the editor (content is never shown via MCP)",
        "Confirm provider_strategy matches an entry from get_model_capabilities",
        "Check input_capability/fields render correctly on the preset form",
        ...(l.blockers.length ? l.blockers.map((bl) => `BLOCKER: ${bl}`) : ["Attach hero/preview media assets when ready"]),
      ],
    }));

    return toolOk(
      env({
        items,
        handoff: {
          state: "draft — unpublished",
          testing:
            "MANUAL ONLY: this integration cannot generate, test, evaluate or publish. The owner tests presets one-by-one in the existing admin lab when they choose to.",
          publication: "Publishing remains a separate, owner-driven admin action.",
        },
      })
    );
  });

  return handlers;
}
