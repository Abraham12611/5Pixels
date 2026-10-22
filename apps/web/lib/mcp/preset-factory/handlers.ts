import { createHash, randomUUID } from "crypto";
import { productCreateSchema } from "@5pixels/shared";
import type { McpCallerContext } from "../auth";
import { auditMcpToolCall } from "../audit";
import { checkRateLimit } from "../rate-limit";
import { toolError, toolOk, type ToolResultPayload } from "../protocol";
import {
  CONTRACT_VERSION,
  MAX_BATCH_ITEMS,
  getPresetFactoryBackend,
  type ApiResponse,
  type DraftItem,
  type PresetFactoryBackend,
} from "./backend";
import { planPresetBatch, type ProposedPlanItem } from "./planner";
import { TOOL_DEFS, type ToolDef } from "./tool-definitions";

/** Per-request context threaded into every handler. */
export interface ToolContext {
  caller: McpCallerContext;
  requestOrigin: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deterministic uuid from a seed — same inputs → same key, so a retry that
 * lost its keys still hits the backend's idempotency check. */
function deriveKey(seed: string, scope: string): string {
  const h = createHash("sha256").update(`preset-factory:${seed}:${scope}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function env<T>(data: T) {
  return { ok: true as const, contractVersion: CONTRACT_VERSION, data };
}

/** Uniform pass-through for backend results. */
async function passthrough<T>(
  promise: Promise<ApiResponse<T>>
): Promise<ToolResultPayload> {
  const res = await promise;
  if (!res.ok) {
    return toolError(res.error.message, res);
  }
  return toolOk(res);
}

/** Client-side completeness check + draft-only enforcement before A ever sees it. */
interface ItemFailure {
  client_item_id: string;
  errors: { code: string; message: string; path?: string }[];
}

function precheckDraftItems(
  items: DraftItem[],
  keySeed?: string
): {
  items: DraftItem[];
  warnings: Record<string, string[]>;
  failures: ItemFailure[];
} {
  const warnings: Record<string, string[]> = {};
  const failures: ItemFailure[] = [];
  const seenIds = new Set<string>();

  const checked = items.map((item) => {
    const warn: string[] = (warnings[item.client_item_id] ??= []);
    if (!item.client_item_id || item.client_item_id.length > 64) {
      failures.push({ client_item_id: item.client_item_id || "?", errors: [{ code: "invalid_item_id", message: "client_item_id is required (max 64 chars)" }] });
    } else if (seenIds.has(item.client_item_id)) {
      failures.push({ client_item_id: item.client_item_id, errors: [{ code: "duplicate_item_id", message: "client_item_id must be unique within the batch" }] });
    }
    seenIds.add(item.client_item_id);
    if (item.item_idempotency_key && !UUID_RE.test(item.item_idempotency_key)) {
      warn.push("item_idempotency_key is not a uuid — a stable key was generated for it.");
    }

    const product = { ...(item.product ?? {}) } as Record<string, unknown>;
    const parsed = productCreateSchema.safeParse(product);
    if (!parsed.success) {
      failures.push({
        client_item_id: item.client_item_id,
        errors: parsed.error.issues.map((i) => ({
          code: "schema",
          message: i.message,
          path: i.path.join("."),
        })),
      });
    }
    // Draft-only enforcement — strip any state the caller tried to set.
    if (product.public_status && product.public_status !== "draft") {
      warn.push(`public_status '${String(product.public_status)}' ignored — server forces 'draft'.`);
      product.public_status = "draft";
    }
    const version = product.version as Record<string, unknown> | undefined;
    if (version && version.state && version.state !== "draft") {
      warn.push(`version.state '${String(version.state)}' ignored — forced to 'draft'.`);
      version.state = "draft";
    }
    for (const key of ["hero_asset_id", "poster_asset_id", "preview_video_asset_id", "preview_gif_asset_id"]) {
      if (product[key]) {
        warn.push(`${key} set on draft — the backend only accepts previously approved asset ids.`);
      }
    }
    return {
      client_item_id: item.client_item_id,
      item_idempotency_key:
        item.item_idempotency_key && UUID_RE.test(item.item_idempotency_key)
          ? item.item_idempotency_key
          : keySeed
            ? deriveKey(keySeed, item.client_item_id)
            : randomUUID(),
      product,
    };
  });

  return { items: checked, warnings, failures };
}

export function buildToolHandlers(): Map<string, ToolDef & { handler: (args: unknown, ctx: unknown) => Promise<ToolResultPayload> }> {
  const handlers = new Map<string, ToolDef & { handler: (args: unknown, ctx: unknown) => Promise<ToolResultPayload> }>();

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
          tool: name,
          entityType: def.auditEntity,
          outcome: result.isError ? "error" : "ok",
        });
        return result;
      },
    });
  };

  const backend = (ctx: ToolContext): Promise<PresetFactoryBackend> =>
    getPresetFactoryBackend({
      requestOrigin: ctx.requestOrigin,
      accessToken: ctx.caller.accessToken,
    });

  // --------------------------------------------------------------- reads
  register("get_catalog_summary", async (args, ctx) =>
    passthrough(
      (await backend(ctx)).listPresetCatalog({
        type: args.type as "filter" | "poster" | undefined,
        status: args.status as string | undefined,
        category_id: args.category_id as string | undefined,
        cursor: args.cursor as string | undefined,
        limit: typeof args.limit === "number" ? Math.min(args.limit, 100) : 50,
      })
    )
  );

  register("find_existing_presets", async (args, ctx) =>
    passthrough(
      (await backend(ctx)).listPresetCatalog({
        q: String(args.query ?? ""),
        type: args.type as "filter" | "poster" | undefined,
        limit: typeof args.limit === "number" ? Math.min(args.limit, 50) : 20,
      })
    )
  );

  register("list_preset_categories", async (_args, ctx) =>
    passthrough((await backend(ctx)).listCategories())
  );

  register("get_model_capabilities", async (_args, ctx) =>
    passthrough((await backend(ctx)).listCompatibleModelOptions())
  );

  // ---------------------------------------------------------------- plan
  register("plan_preset_batch", async (args, ctx) => {
    const b = await backend(ctx);
    const [catalogRes, categoryRes] = await Promise.all([
      b.listPresetCatalog({ limit: 100 }),
      b.listCategories(),
    ]);
    if (!catalogRes.ok) return toolError(catalogRes.error.message, catalogRes);
    if (!categoryRes.ok) return toolError(categoryRes.error.message, categoryRes);

    const proposed = (Array.isArray(args.items) ? args.items : []) as ProposedPlanItem[];
    const plan = planPresetBatch(proposed, catalogRes.data.items, categoryRes.data);
    return toolOk(
      env({
        plan,
        reminder:
          "Planning is pure — nothing was persisted. Present this plan to the owner; only create_categories/create_draft_batch with confirm=true writes.",
      })
    );
  });

  // ------------------------------------------------------------ validate
  register("validate_preset_batch", async (args, ctx) => {
    const items = (Array.isArray(args.items) ? args.items : []) as DraftItem[];
    if (items.length === 0 || items.length > MAX_BATCH_ITEMS) {
      return toolError(`items must contain 1..${MAX_BATCH_ITEMS} entries`);
    }
    const { items: checked, warnings, failures } = precheckDraftItems(items);
    const failedIds = new Set(failures.map((f) => f.client_item_id));
    const toBackend = checked.filter((i) => !failedIds.has(i.client_item_id));

    const remote =
      toBackend.length > 0
        ? await (await backend(ctx)).validatePresetBatch({ items: toBackend })
        : null;
    if (remote && !remote.ok && remote.error.code !== "backend_not_deployed") {
      return toolError(remote.error.message, remote);
    }

    const results = [
      ...failures.map((f) => ({ client_item_id: f.client_item_id, ok: false, errors: f.errors, warnings: warnings[f.client_item_id] ?? [] })),
      ...(remote?.ok
        ? remote.data.results.map((r) => ({
            ...r,
            warnings: [...(warnings[r.client_item_id] ?? []), ...r.warnings],
          }))
        : toBackend.map((i) => ({
            client_item_id: i.client_item_id,
            ok: true,
            errors: [],
            warnings: [...(warnings[i.client_item_id] ?? []), "backend validation unavailable — schema-level checks only"],
          }))),
    ];
    return toolOk(
      env({
        results,
        backend_validation: remote?.ok ? "performed" : "schema_only",
        note: "Validation is a dry run — no generation, testing, credits or persistence occurred.",
      })
    );
  });

  // -------------------------------------------------------------- writes
  register("create_categories", async (args, ctx) => {
    if (args.confirm !== true) {
      return toolError(
        "Write refused: re-call with confirm=true ONLY after the owner explicitly approves this category list.",
        { ok: false, error: { code: "confirmation_required", message: "confirm=true required" } }
      );
    }
    const categories = (Array.isArray(args.categories) ? args.categories : []) as {
      name: string; slug: string; description?: string; sort_order?: number;
    }[];
    if (categories.length === 0) return toolError("categories must be a non-empty array");

    const b = await backend(ctx);
    const results = [];
    for (const c of categories) {
      const res = await b.createCategory(c);
      results.push(
        res.ok
          ? { slug: c.slug, id: res.data.id, status: res.data.status }
          : { slug: c.slug, status: "failed" as const, error: res.error }
      );
    }
    return toolOk(
      env({
        results,
        summary: {
          created: results.filter((r) => r.status === "created").length,
          reused: results.filter((r) => r.status === "reused").length,
          failed: results.filter((r) => r.status === "failed").length,
        },
      })
    );
  });

  register("create_draft_batch", async (args, ctx) => {
    if (args.confirm !== true) {
      return toolError(
        "Write refused: present the validated plan to the owner, then re-call with confirm=true and the SAME idempotency keys.",
        { ok: false, error: { code: "confirmation_required", message: "confirm=true required" } }
      );
    }
    const items = (Array.isArray(args.items) ? args.items : []) as DraftItem[];
    if (items.length === 0 || items.length > MAX_BATCH_ITEMS) {
      return toolError(`items must contain 1..${MAX_BATCH_ITEMS} entries`);
    }
    // Batch key first: missing item keys derive deterministically from it,
    // so a retry that lost its keys still hits backend idempotency.
    const batchKey =
      typeof args.batch_idempotency_key === "string" && UUID_RE.test(args.batch_idempotency_key)
        ? args.batch_idempotency_key
        : randomUUID();
    const { items: checked, warnings, failures } = precheckDraftItems(items, batchKey);
    if (failures.length > 0) {
      return toolError("Some items failed local schema checks — fix and re-validate before creating.", {
        ok: false,
        error: { code: "validation_failed", message: "Local schema checks failed", details: failures },
      });
    }

    const res = await (await backend(ctx)).createPresetDrafts({
      batch_idempotency_key: batchKey,
      items: checked,
    });
    if (!res.ok) return toolError(res.error.message, res);
    return toolOk(
      env({
        ...res.data,
        batch_idempotency_key: batchKey,
        item_warnings: warnings,
        reminder:
          "All results are unpublished drafts. Manual owner review and manual-only testing are still required — nothing here was generated, tested or published.",
      })
    );
  });

  register("get_batch_status", async (args, ctx) =>
    passthrough(
      (await backend(ctx)).getBatchStatus({
        batch_idempotency_key: args.batch_idempotency_key as string | undefined,
        product_ids: args.product_ids as string[] | undefined,
      })
    )
  );

  register("get_draft_review_links", async (args, ctx) =>
    passthrough(
      (await backend(ctx)).getReviewLinks({ product_ids: (args.product_ids as string[]) ?? [] })
    )
  );

  register("prepare_manual_preset_review", async (args, ctx) => {
    const productIds = (args.product_ids as string[]) ?? [];
    const res = await (await backend(ctx)).getReviewLinks({ product_ids: productIds });
    if (!res.ok) return toolError(res.error.message, res);

    const items = res.data.links.map((l) => ({
      product_id: l.product_id,
      slug: l.slug,
      admin_edit_url: l.admin_edit_url,
      blockers: l.blockers,
      checklist: [
        "Open the admin editor link and eyeball name/descriptions/category",
        "Verify private_instruction_template reads correctly in the editor (content is never shown via MCP)",
        "Confirm provider_strategy matches an entry from get_model_capabilities",
        "Check input_capability/fields render correctly on the preset form",
        ...(l.blockers.length ? l.blockers.map((b) => `BLOCKER: ${b}`) : ["Attach hero/preview media assets when ready"]),
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
