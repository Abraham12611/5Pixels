/**
 * Preset Factory service (#271, epic #270) — the narrow, admin-only backend
 * API Engineer B's private MCP plugin calls.
 *
 * Transport-agnostic: every operation takes an explicit
 * {@link PresetFactoryContext} — a *user-scoped* Supabase client plus the
 * verified caller identity. Authorization is enforced twice:
 *   1. here, via profiles.is_admin / is_owner on the caller's JWT identity;
 *   2. inside the SECURITY DEFINER RPCs, which re-check is_admin() /
 *      is_owner() against auth.uid() — a caller-supplied flag can never
 *      forge privilege.
 *
 * The MCP layer must call these functions with a client authenticated as
 * the end user (cookie session or verified bearer token). It must never
 * hold the service-role key itself; the only service-role use below is a
 * read of the internal provider pricing catalog, exactly like the existing
 * admin actions.
 *
 * Nothing here starts a generation, runs a preset test, calls a provider,
 * publishes, activates, or schedules anything. Draft creation is the only
 * mutation.
 */
import { createHash } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  getProviderEndpoint,
  type ProviderStrategy,
} from "@/lib/ai/provider-routing";
import {
  getRouteCapabilityByEndpoint,
  type RouteCapability,
} from "@/lib/ai/route-capabilities";
import { isMultiInputReleased } from "@/lib/generation/release-gates";
import { isUserPromptReleased } from "@/lib/generation/user-prompt";
import type { ParentCandidate } from "@/lib/validation/preset-family";
import {
  adminReviewPath,
  batchStatusQuerySchema,
  catalogQuerySchema,
  consumeWriteIntentSchema,
  createCategoryRequestSchema,
  intentIdQuerySchema,
  listWriteIntentsQuerySchema,
  presetDraftBatchSchema,
  presetDraftItemSchema,
  reviewLinksQuerySchema,
  stageWriteIntentRequestSchema,
  type ApproveWriteIntentResult,
  type BatchStatusItem,
  type CatalogItemSummary,
  type CatalogQuery,
  type CategorySummary,
  type ConsumeWriteIntentResult,
  type CreateCategoryResult,
  type FactoryError,
  type FactoryResult,
  type ModelOption,
  type PresetBatchResult,
  type PresetDraftItem,
  type PresetItemResult,
  type ReviewLinkEntry,
  type StageWriteIntentResult,
  type WriteIntentSummary,
} from "./contract";
import {
  checkDraftItem,
  isVersionBoundRole,
  type DraftItemContext,
  type LinkedAssetShape,
} from "./draft-checks";

export interface PresetFactoryContext {
  /** User-scoped client — RLS + RPC auth.uid() reflect the real caller. */
  supabase: SupabaseClient;
  userId: string;
  isAdmin: boolean;
  isOwner: boolean;
}

function ok<T>(data: T): FactoryResult<T> {
  return { ok: true, data };
}

function fail<T>(error: FactoryError): FactoryResult<T> {
  return { ok: false, error };
}

function zodIssuesToErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>
): FactoryError[] {
  return issues.map((issue) => ({
    code: "validation_failed",
    message: issue.message,
    field: issue.path.map(String).join(".") || undefined,
  }));
}

/**
 * Verify the caller behind an existing user-scoped client is admin/owner.
 * Returns a context only for privileged callers — everyone else gets a
 * structured `forbidden`/`unauthorized` result. Never redirects.
 *
 * Role model (per coordinator review): the gate is `is_admin OR is_owner`,
 * matching `requireAdmin` and the admin_* RPCs. Effective RLS on
 * products/categories/audit reads is `is_admin()`-only, so an owner-only
 * caller (is_owner=true, is_admin=false) passes context creation and RPC
 * authz but fails closed on RLS-bound lookups — safe, never silently
 * privileged. Owners are expected to hold `is_admin` per app convention.
 *
 * Transports:
 *  - Cookie session (server actions / same-origin routes): pass a client
 *    from `@/lib/supabase/server` and no options — `getUser()` reads the
 *    established session.
 *  - Bearer token (MCP/CLI): `getUser()` alone fails because no session is
 *    persisted. Either pass `{ bearerToken }` (validated against the GoTrue
 *    API) or use {@link createBearerPresetFactoryContext}, which builds a
 *    correctly-scoped client. A caller-supplied uid is never trusted — the
 *    JWT is validated server-side and the RPC re-checks auth.uid().
 */
export async function createPresetFactoryContext(
  supabase: SupabaseClient,
  options: { bearerToken?: string } = {}
): Promise<FactoryResult<PresetFactoryContext>> {
  const {
    data: { user },
    error: authError,
  } = options.bearerToken
    ? await supabase.auth.getUser(options.bearerToken)
    : await supabase.auth.getUser();
  if (authError || !user) {
    return fail({
      code: "unauthorized",
      message: "An authenticated admin session is required.",
    });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();
  const isAdmin = Boolean(profile?.is_admin);
  const isOwner = Boolean(profile?.is_owner);
  if (error || !(isAdmin || isOwner)) {
    return fail({
      code: "forbidden",
      message: "Admin or owner privileges are required.",
    });
  }

  return ok({ supabase, userId: user.id, isAdmin, isOwner });
}

/**
 * Bearer-token transport for the MCP adapter (#272). Builds a user-scoped
 * client carrying the end user's JWT in `Authorization` — PostgREST RLS and
 * `auth.uid()` inside SECURITY DEFINER RPCs therefore resolve to the real
 * caller — then validates the JWT with `auth.getUser(jwt)`. Use this instead
 * of a cookie client whenever the caller presents a Supabase access token.
 */
export async function createBearerPresetFactoryContext(
  bearerToken: string
): Promise<FactoryResult<PresetFactoryContext>> {
  const token = bearerToken.trim();
  if (!token) {
    return fail({
      code: "unauthorized",
      message: "A Supabase access token is required.",
    });
  }
  const supabase = createSupabaseClient(supabaseUrl(), supabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return createPresetFactoryContext(supabase, { bearerToken: token });
}

/**
 * Convenience wrapper for the cookie-session transport (server actions /
 * same-origin route handlers). The MCP transport should use
 * createBearerPresetFactoryContext with the caller's verified token.
 */
export async function createSessionPresetFactoryContext(): Promise<
  FactoryResult<PresetFactoryContext>
> {
  return createPresetFactoryContext(await createClient());
}

// ---------------------------------------------------------------------------
// Read operations — catalog inspection. No private recipe columns are ever
// selected; provider pricing internals stay out of the payload.
// ---------------------------------------------------------------------------

export async function listPresetCatalog(
  ctx: PresetFactoryContext,
  rawQuery?: unknown
): Promise<FactoryResult<{ items: CatalogItemSummary[] }>> {
  const parsed = catalogQuerySchema.safeParse(rawQuery ?? {});
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid catalog query.",
      field: parsed.error.issues[0]?.path.map(String).join("."),
    });
  }
  const query: CatalogQuery = parsed.data;

  let q = ctx.supabase
    .from("products")
    .select(
      `id, type, slug, name, public_status, visibility, category_id,
       parent_preset_id, standalone_discoverable, variant_display_name,
       hero_asset_id, poster_asset_id, preview_video_asset_id,
       preview_gif_asset_id, created_at, updated_at,
       categories(slug),
       product_versions(id, version_number, state),
       product_fields(id),
       product_assets(id, role)`
    )
    .order("updated_at", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.type) q = q.eq("type", query.type);
  if (query.category_id) q = q.eq("category_id", query.category_id);
  if (query.public_status) q = q.eq("public_status", query.public_status);
  if (query.family === "roots") q = q.is("parent_preset_id", null);
  if (query.family === "variants") q = q.not("parent_preset_id", "is", null);

  const { data, error } = await q;
  if (error) {
    return fail({ code: "internal_error", message: "Catalog query failed." });
  }

  const items = (data ?? []).map((row): CatalogItemSummary => {
    const versions = Array.isArray(row.product_versions)
      ? (row.product_versions as Array<{
          id: string;
          version_number: number;
          state: string;
        }>)
      : [];
    const fields = Array.isArray(row.product_fields) ? row.product_fields : [];
    const links = Array.isArray(row.product_assets)
      ? (row.product_assets as Array<{ role: string }>)
      : [];
    const category = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories;
    return {
      product_id: row.id as string,
      type: row.type as "filter" | "poster",
      slug: row.slug as string,
      name: row.name as string,
      public_status: row.public_status as string,
      visibility: row.visibility as string,
      category_id: (row.category_id as string | null) ?? null,
      category_slug: (category?.slug as string | undefined) ?? null,
      parent_preset_id: (row.parent_preset_id as string | null) ?? null,
      standalone_discoverable: Boolean(row.standalone_discoverable),
      variant_display_name: (row.variant_display_name as string | null) ?? null,
      version_count: versions.length,
      has_active_version: versions.some((v) => v.state === "active"),
      has_editable_version: versions.some(
        (v) => v.state === "draft" || v.state === "testing"
      ),
      latest_version_number:
        versions.reduce<number | null>(
          (max, v) =>
            max == null || v.version_number > max ? v.version_number : max,
          null
        ) ?? null,
      field_count: fields.length,
      media: {
        has_hero: Boolean(row.hero_asset_id),
        has_poster: Boolean(row.poster_asset_id),
        has_preview_video: Boolean(row.preview_video_asset_id),
        has_preview_gif: Boolean(row.preview_gif_asset_id),
        reference_count: links.filter((l) => isVersionBoundRole(l.role)).length,
      },
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });

  return ok({ items });
}

export async function listPresetCategories(
  ctx: PresetFactoryContext
): Promise<FactoryResult<{ categories: CategorySummary[] }>> {
  const { data, error } = await ctx.supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (error) {
    return fail({
      code: "internal_error",
      message: "Category listing failed.",
    });
  }
  return ok({ categories: (data ?? []) as CategorySummary[] });
}

interface PricingRow {
  provider: string;
  endpoint_id: string;
  unit: string;
  metadata: {
    display_name?: string;
    description?: string;
    source_category?: string;
  } | null;
}

/**
 * Verified route/model options for drafting — the same provider_model_pricing
 * catalog the admin editor uses (service-role read inside this trusted
 * service; the MCP caller never touches the key), joined with the route
 * capability registry so B can offer only genuinely supported capability
 * combinations.
 */
export async function listCompatibleModelOptions(
  ctx: PresetFactoryContext
): Promise<FactoryResult<{ models: ModelOption[] }>> {
  void ctx;
  let service: SupabaseClient;
  try {
    service = createServiceClient();
  } catch {
    return fail({
      code: "internal_error",
      message: "Provider catalog is unavailable in this environment.",
    });
  }
  const { data, error } = await service
    .from("provider_model_pricing")
    .select("provider, endpoint_id, unit, metadata")
    .eq("is_active", true)
    .order("endpoint_id", { ascending: true });
  if (error) {
    return fail({
      code: "internal_error",
      message: "Provider catalog query failed.",
    });
  }

  const models = ((data ?? []) as PricingRow[]).map((row): ModelOption => {
    const capability = getRouteCapabilityByEndpoint(row.endpoint_id);
    return {
      provider: row.provider,
      endpoint_id: row.endpoint_id,
      display_name:
        row.metadata?.display_name?.trim() ||
        row.endpoint_id.split("/").pop() ||
        row.endpoint_id,
      description: row.metadata?.description ?? "",
      category: row.metadata?.source_category ?? "other",
      capability: {
        verified: capability != null,
        max_input_images: capability?.max_input_images ?? 1,
        supports_prompt_edit: capability?.supports_prompt_edit ?? false,
      },
    };
  });
  return ok({ models });
}

// ---------------------------------------------------------------------------
// Shared lookup resolution for validate + create
// ---------------------------------------------------------------------------

interface ResolvedBatchLookups {
  existingSlugs: string[];
  categoriesById: Map<string, { id: string; is_active: boolean }>;
  parentsById: Map<string, ParentCandidate>;
  assetsById: Map<string, LinkedAssetShape | null>;
  catalogEndpoints: Set<string>;
  routeCapabilities: Map<string, RouteCapability | null>;
  multiInputReleased: boolean;
  userPromptReleased: boolean;
}

async function resolveBatchLookups(
  ctx: PresetFactoryContext,
  items: PresetDraftItem[]
): Promise<FactoryResult<ResolvedBatchLookups>> {
  // All catalog slugs — used for exact conflict checks and the
  // "confusingly similar slug" warning. The catalog is admin-scale
  // (dozens of rows), so a full slug read is cheap and deterministic.
  const { data: slugRows, error: slugError } = await ctx.supabase
    .from("products")
    .select("slug");
  if (slugError) {
    return fail({ code: "internal_error", message: "Slug lookup failed." });
  }

  const categoryIds = [
    ...new Set(
      items.map((i) => i.product.category_id).filter((v): v is string => !!v)
    ),
  ];
  const parentIds = [
    ...new Set(
      items
        .map((i) => i.product.parent_preset_id)
        .filter((v): v is string => !!v)
    ),
  ];
  const assetIds = [
    ...new Set([
      ...items.flatMap((i) => i.asset_links.map((l) => l.asset_id)),
      ...items.flatMap((i) =>
        [
          i.product.hero_asset_id,
          i.product.poster_asset_id,
          i.product.preview_video_asset_id,
          i.product.preview_gif_asset_id,
        ].filter((v): v is string => !!v)
      ),
    ]),
  ];

  const [categoriesRes, parentsRes, assetsRes] = await Promise.all([
    categoryIds.length
      ? ctx.supabase
          .from("categories")
          .select("id, is_active")
          .in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    parentIds.length
      ? ctx.supabase
          .from("products")
          .select("id, type, public_status, parent_preset_id")
          .in("id", parentIds)
      : Promise.resolve({ data: [], error: null }),
    assetIds.length
      ? ctx.supabase
          .from("assets")
          .select(
            "id, bucket, media_type, mime_type, visibility, moderation_status, deleted_at"
          )
          .in("id", assetIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (categoriesRes.error || parentsRes.error || assetsRes.error) {
    return fail({
      code: "internal_error",
      message: "Draft reference lookup failed.",
    });
  }

  // Server-verified provider catalog — drafts may only pin real routes.
  let catalogEndpoints = new Set<string>();
  try {
    const service = createServiceClient();
    const { data: pricing } = await service
      .from("provider_model_pricing")
      .select("endpoint_id")
      .eq("is_active", true);
    catalogEndpoints = new Set(
      ((pricing ?? []) as Array<{ endpoint_id: string }>).map(
        (r) => r.endpoint_id
      )
    );
  } catch {
    // Provider catalog unavailable → every model check reports unverified;
    // drafts simply cannot be validated against unknown routes.
    catalogEndpoints = new Set();
  }

  return ok({
    existingSlugs: ((slugRows ?? []) as Array<{ slug: string }>).map(
      (r) => r.slug
    ),
    categoriesById: new Map(
      (
        (categoriesRes.data ?? []) as Array<{
          id: string;
          is_active: boolean;
        }>
      ).map((c) => [c.id, c])
    ),
    parentsById: new Map(
      ((parentsRes.data ?? []) as ParentCandidate[]).map((p) => [p.id, p])
    ),
    assetsById: new Map(
      assetIds.map((id) => [
        id,
        ((assetsRes.data ?? []) as LinkedAssetShape[]).find(
          (a) => a.id === id
        ) ?? null,
      ])
    ),
    catalogEndpoints,
    routeCapabilities: new Map(
      items.map((item) => {
        const endpoint = getProviderEndpoint(
          item.version.provider_strategy as ProviderStrategy
        );
        return [item.client_item_id, getRouteCapabilityByEndpoint(endpoint)];
      })
    ),
    multiInputReleased: isMultiInputReleased(),
    userPromptReleased: isUserPromptReleased(),
  });
}

function itemContext(
  item: PresetDraftItem,
  lookups: ResolvedBatchLookups
): DraftItemContext {
  const endpoint = getProviderEndpoint(
    item.version.provider_strategy as ProviderStrategy
  );
  const category = item.product.category_id
    ? lookups.categoriesById.get(item.product.category_id)
    : undefined;
  return {
    categoryExists: item.product.category_id ? category != null : null,
    categoryIsActive: category?.is_active,
    parent: item.product.parent_preset_id
      ? (lookups.parentsById.get(item.product.parent_preset_id) ?? null)
      : null,
    endpoint,
    routeCapability: endpoint
      ? (lookups.routeCapabilities.get(item.client_item_id) ??
        getRouteCapabilityByEndpoint(endpoint))
      : null,
    modelVerified: endpoint != null && lookups.catalogEndpoints.has(endpoint),
    assets: lookups.assetsById,
    existingSlugs: lookups.existingSlugs,
    multiInputReleased: lookups.multiInputReleased,
    userPromptReleased: lookups.userPromptReleased,
  };
}

/**
 * Split a raw batch payload into individually parsed items. Batch-level
 * problems (oversized batch, duplicate keys) fail the whole request; item
 * schema failures land on that item only.
 */
function parseBatch(raw: unknown): FactoryResult<{
  batchId: string;
  approvalIntentId?: string;
  items: PresetDraftItem[];
  itemErrors: Map<number, FactoryError[]>;
}> {
  const envelope = presetDraftBatchSchema.safeParse(raw);
  if (envelope.success) {
    return ok({
      batchId: envelope.data.batch_id,
      approvalIntentId: envelope.data.approval_intent_id,
      items: envelope.data.items,
      itemErrors: new Map(),
    });
  }

  // When the envelope itself fails, decide whether it is a hard failure or
  // recoverable per-item schema errors.
  const issues = envelope.error.issues;
  const rawObj = raw as { batch_id?: unknown; items?: unknown } | null;
  const batchId =
    typeof rawObj?.batch_id === "string" && rawObj.batch_id.length > 0
      ? rawObj.batch_id
      : null;
  const itemArray = Array.isArray(rawObj?.items) ? rawObj.items : null;

  if (!batchId || !itemArray) {
    return fail({
      code: "validation_failed",
      message: issues[0]?.message ?? "Invalid batch payload.",
    });
  }
  if (itemArray.length === 0) {
    return fail({
      code: "validation_failed",
      message: "Batch must contain at least one item.",
    });
  }
  if (itemArray.length > 25) {
    return fail({
      code: "batch_limit_exceeded",
      message: `Batch is limited to 25 items; received ${itemArray.length}.`,
    });
  }

  // Envelope problems that are NOT per-item schema failures (duplicate
  // keys/slugs) must fail the whole batch — they are deliberately checked
  // before per-item parsing so a duplicated slug cannot be half-created.
  const envelopeOnlyIssues = issues.filter(
    (i) => !(i.path[0] === "items" && typeof i.path[1] === "number")
  );
  if (envelopeOnlyIssues.length > 0) {
    const message = envelopeOnlyIssues[0]?.message ?? "Invalid batch payload.";
    return fail({
      code: /unique within the batch/.test(message)
        ? "duplicate_item_key"
        : "validation_failed",
      message,
    });
  }

  const items: PresetDraftItem[] = [];
  const itemErrors = new Map<number, FactoryError[]>();
  itemArray.forEach((rawItem, index) => {
    const parsed = presetDraftItemSchema.safeParse(rawItem);
    if (parsed.success) {
      items.push(parsed.data);
    } else {
      itemErrors.set(index, zodIssuesToErrors(parsed.error.issues));
    }
  });

  // The batch-level uniqueness refines never ran (the envelope parse
  // aborted on the item errors), so re-check them against the items that
  // did parse — a duplicated key must fail the whole batch before any
  // draft is written.
  const seenItemIds = new Set<string>();
  const seenKeys = new Set<string>();
  const seenSlugs = new Set<string>();
  for (const item of items) {
    if (
      seenItemIds.has(item.client_item_id) ||
      seenKeys.has(item.idempotency_key) ||
      seenSlugs.has(item.product.slug)
    ) {
      return fail({
        code: "duplicate_item_key",
        message:
          "client_item_id, idempotency_key and product.slug must each be unique within the batch.",
      });
    }
    seenItemIds.add(item.client_item_id);
    seenKeys.add(item.idempotency_key);
    seenSlugs.add(item.product.slug);
  }

  const rawEnvelope = rawObj as { approval_intent_id?: unknown };
  return ok({
    batchId,
    approvalIntentId:
      typeof rawEnvelope.approval_intent_id === "string"
        ? rawEnvelope.approval_intent_id
        : undefined,
    items,
    itemErrors,
  });
}

function summarize(items: PresetItemResult[]) {
  return {
    total: items.length,
    created: items.filter((i) => i.status === "created").length,
    reused: items.filter((i) => i.status === "reused").length,
    validated: items.filter((i) => i.status === "validated").length,
    failed: items.filter((i) => i.status === "failed").length,
  };
}

// ---------------------------------------------------------------------------
// validate_preset_batch — pure checks, zero writes, zero provider calls.
// ---------------------------------------------------------------------------

export async function validatePresetBatch(
  ctx: PresetFactoryContext,
  rawBatch: unknown
): Promise<FactoryResult<PresetBatchResult>> {
  const parsed = parseBatch(rawBatch);
  if (!parsed.ok) return parsed;
  const { batchId, items, itemErrors } = parsed.data;

  const lookups = await resolveBatchLookups(ctx, items);
  if (!lookups.ok) return lookups;

  // Rebuild results in the caller's original item order.
  const rawItems = (rawBatch as { items?: unknown[] }).items ?? [];
  const parsedByIndex = new Map<number, PresetDraftItem>();
  let cursor = 0;
  rawItems.forEach((_, index) => {
    if (!itemErrors.has(index)) {
      parsedByIndex.set(index, items[cursor++]);
    }
  });

  const results: PresetItemResult[] = rawItems.map((rawItem, index) => {
    const clientItemId =
      typeof (rawItem as { client_item_id?: unknown })?.client_item_id ===
      "string"
        ? ((rawItem as { client_item_id: string }).client_item_id as string)
        : `item-${index}`;
    const schemaErrors = itemErrors.get(index);
    if (schemaErrors) {
      return {
        client_item_id: clientItemId,
        status: "failed",
        errors: schemaErrors,
        warnings: [],
      };
    }
    const item = parsedByIndex.get(index)!;
    const { errors, warnings } = checkDraftItem(
      item,
      itemContext(item, lookups.data)
    );
    return {
      client_item_id: item.client_item_id,
      status: errors.length > 0 ? "failed" : "validated",
      errors,
      warnings,
    };
  });

  return ok({ batch_id: batchId, items: results, summary: summarize(results) });
}

// ---------------------------------------------------------------------------
// create_category — explicit, individually authorized, idempotent.
// ---------------------------------------------------------------------------

export async function createPresetCategory(
  ctx: PresetFactoryContext,
  rawInput: unknown
): Promise<FactoryResult<CreateCategoryResult>> {
  const parsed = createCategoryRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid category input.",
      field: parsed.error.issues[0]?.path.map(String).join("."),
    });
  }
  const input = parsed.data;

  // Approval-bound path (MCP/OAuth callers): admin_create_preset_category
  // consumes the intent's fingerprint for THIS payload and inserts
  // atomically — the approval can never be spent on a different category,
  // and a failed insert rolls the consumption back. Ordinary admin calls
  // (no intent) keep the direct insert path below, unchanged.
  if (input.approval_intent_id) {
    const { data: rpcData, error: rpcError } = await ctx.supabase.rpc(
      "admin_create_preset_category",
      {
        p_name: input.name,
        p_slug: input.slug,
        p_description: input.description || null,
        p_sort_order: input.sort_order,
        p_approval_intent_id: input.approval_intent_id,
      }
    );
    if (rpcError) {
      return fail(mapRpcError(rpcError));
    }
    const res = rpcData as {
      status?: string;
      category?: CategorySummary;
      existing?: CategorySummary;
    } | null;
    if (res?.status === "conflict") {
      return fail({
        code: "category_conflict",
        message: `Slug "${input.slug}" already belongs to category "${res.existing?.name}". Reuse that category via category_id "${res.existing?.id}" or choose a distinct slug.`,
        field: "slug",
        details: { existing: res.existing },
      });
    }
    if (res?.status === "reused" && res.category) {
      return ok({
        status: "reused",
        category: res.category,
        warnings: [
          {
            code: "category_conflict",
            message: `Category "${res.category.slug}" already exists — reusing it.`,
            details: { existing_id: res.category.id },
          },
        ],
      });
    }
    const created = res?.category;
    if (!created) {
      return fail({
        code: "persistence_failed",
        message: "Category could not be created.",
      });
    }
    await logFactoryAudit(ctx, {
      action: "preset_factory.category_create",
      entityType: "category",
      entityId: created.id,
      after: created,
    });
    return ok({ status: "created", category: created, warnings: [] });
  }

  const { data: existingRows, error: lookupError } = await ctx.supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, is_active")
    .eq("slug", input.slug)
    .limit(1);
  if (lookupError) {
    return fail({ code: "internal_error", message: "Category lookup failed." });
  }
  const existing = existingRows?.[0] as CategorySummary | undefined;
  if (existing) {
    if (
      existing.name.trim().toLowerCase() === input.name.trim().toLowerCase()
    ) {
      return ok({
        status: "reused",
        category: existing,
        warnings: [
          {
            code: "category_conflict",
            message: `Category "${existing.slug}" already exists — reusing it.`,
            details: { existing_id: existing.id },
          },
        ],
      });
    }
    return fail({
      code: "category_conflict",
      message: `Slug "${input.slug}" already belongs to category "${existing.name}". Reuse that category via category_id "${existing.id}" or choose a distinct slug.`,
      field: "slug",
      details: { existing },
    });
  }

  const { data: created, error: insertError } = await ctx.supabase
    .from("categories")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      sort_order: input.sort_order,
      is_active: true,
    })
    .select("id, slug, name, description, sort_order, is_active")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      // Concurrent creator won the slug — return it deterministically.
      const { data: winner } = await ctx.supabase
        .from("categories")
        .select("id, slug, name, description, sort_order, is_active")
        .eq("slug", input.slug)
        .single();
      if (winner) {
        const winning = winner as CategorySummary;
        // Same slug does not mean same intent — only reuse when the name
        // matches; a different name under this slug is a real conflict.
        if (
          winning.name.trim().toLowerCase() !== input.name.trim().toLowerCase()
        ) {
          return fail({
            code: "category_conflict",
            message: `Slug "${input.slug}" was claimed concurrently by category "${winning.name}". Reuse it via category_id "${winning.id}" or choose a distinct slug.`,
            field: "slug",
            details: { existing: winning },
          });
        }
        return ok({
          status: "reused",
          category: winning,
          warnings: [
            {
              code: "category_conflict",
              message: `Category "${input.slug}" was created concurrently — reusing it.`,
            },
          ],
        });
      }
    }
    return fail({
      code: "persistence_failed",
      message: "Category could not be created.",
    });
  }

  await logFactoryAudit(ctx, {
    action: "preset_factory.category_create",
    entityType: "category",
    entityId: created.id,
    after: created,
  });

  return ok({
    status: "created",
    category: created as CategorySummary,
    warnings: [],
  });
}

// ---------------------------------------------------------------------------
// create_preset_drafts — owner-authorized batch mutation. Each item is an
// atomic RPC call; the batch is sequential and honestly reports partial
// success rather than pretending all-or-nothing.
// ---------------------------------------------------------------------------

const RPC_ERROR_MAP: Array<[RegExp, FactoryError["code"]]> = [
  [/PF_APPROVAL_REQUIRED/i, "approval_required"],
  [/PF_APPROVAL_EXPIRED/i, "approval_expired"],
  [/PF_APPROVAL_PAYLOAD_MISMATCH/i, "approval_payload_mismatch"],
  [/PF_APPROVAL_INVALID/i, "approval_invalid"],
  [/PF_BAD_REQUEST/i, "validation_failed"],
  [/PF_SLUG_CONFLICT/i, "slug_conflict"],
  [/PF_INVALID_CATEGORY/i, "category_not_found"],
  [/PF_INVALID_PARENT/i, "parent_invalid"],
  [/PF_INVALID_ASSET/i, "asset_invalid"],
  [/PF_IDEMPOTENCY_CONFLICT/i, "idempotency_conflict"],
  [/forbidden|admin or owner required/i, "forbidden"],
];

function mapRpcError(error: { message?: string; code?: string }): FactoryError {
  const message = error.message ?? "Draft creation failed.";
  for (const [pattern, code] of RPC_ERROR_MAP) {
    if (pattern.test(message)) {
      return { code, message: message.replace(/^PF_[A-Z_]+:\s*/i, "") };
    }
  }
  if (error.code === "23505") {
    return { code: "slug_conflict", message };
  }
  if (error.code === "23503") {
    return { code: "validation_failed", message };
  }
  return { code: "persistence_failed", message };
}

async function logFactoryAudit(
  ctx: PresetFactoryContext,
  entry: {
    action: string;
    entityType: string;
    entityId?: string;
    after?: unknown;
  }
) {
  // audit rows are written through the caller's own client so the recorded
  // admin_user_id is always the real caller regardless of transport.
  const { error } = await ctx.supabase.from("admin_audit_logs").insert({
    admin_user_id: ctx.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    after: entry.after ?? null,
  });
  if (error) {
    console.error("[preset-factory] audit write failed:", error.message);
  }
}

/**
 * Flattened RPC payload for one draft item — the exact five jsonb
 * arguments `admin_create_preset_draft` receives. `stageWriteIntent`
 * submits the same objects so the SQL-side canonical fingerprint
 * (SHA-256 over normalized jsonb text) binds an approved intent to this
 * precise payload.
 */
function draftRpcPayloads(item: PresetDraftItem): {
  product: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: Record<string, unknown>;
  fields: Record<string, unknown>[];
  asset_links: Record<string, unknown>[];
} {
  const { product, version } = item;
  return {
    product: {
      type: product.type,
      slug: product.slug,
      name: product.name,
      short_description: product.short_description ?? null,
      long_description: product.long_description ?? null,
      public_prompt_recipe: product.public_prompt_recipe ?? null,
      category_id: product.category_id ?? null,
      visibility: product.visibility,
      hero_asset_id: product.hero_asset_id ?? null,
      poster_asset_id: product.poster_asset_id ?? null,
      preview_video_asset_id: product.preview_video_asset_id ?? null,
      preview_gif_asset_id: product.preview_gif_asset_id ?? null,
      likeness_level: product.likeness_level ?? null,
      featured_rank: product.featured_rank ?? null,
      parent_preset_id: product.parent_preset_id ?? null,
      standalone_discoverable: product.standalone_discoverable,
      variant_display_name: product.variant_display_name ?? null,
      variant_sort_order: product.variant_sort_order,
    },
    metadata: {
      filter_config: product.filter_config,
      poster_config: product.poster_config,
      prompt_ui: product.prompt_ui,
    },
    version: {
      private_instruction_template: version.private_instruction_template,
      private_negative_instruction:
        version.private_negative_instruction ?? null,
      provider_strategy: version.provider_strategy,
      model_config: version.model_config,
      output_sizes: version.output_sizes ?? null,
      input_validation_config: version.input_validation_config,
      input_mode: version.input_capability.input_mode,
      input_min_images: version.input_capability.input_min_images,
      input_max_images: version.input_capability.input_max_images,
      input_image_roles: version.input_capability.input_image_roles,
      prompt_override_enabled: version.input_capability.prompt_override_enabled,
      prompt_max_chars: version.input_capability.prompt_max_chars,
      post_process_config: version.post_process_config,
      safety_config: version.safety_config,
      credit_cost: version.credit_cost,
    },
    fields: item.fields.map((f) => ({
      field_key: f.field_key,
      label: f.label,
      help_text: f.help_text ?? null,
      field_type: f.field_type,
      required: f.required,
      sort_order: f.sort_order,
      config: f.config,
      validation: f.validation,
      active: f.active,
    })),
    asset_links: item.asset_links.map((l) => ({
      asset_id: l.asset_id,
      role: l.role,
      // *_reference links are private recipe material — forced, not
      // defaulted (schema refine + RPC CASE both enforce this).
      internal_only: isVersionBoundRole(l.role)
        ? true
        : (l.internal_only ?? false),
      sort_order: l.sort_order,
      bind_to_version: isVersionBoundRole(l.role),
    })),
  };
}

/**
 * Caller-asserted fingerprint sent as `p_request_fingerprint`. The RPC
 * requires it non-empty as a submission marker but never trusts it —
 * idempotency and approval binding both use the server-computed
 * canonical SHA-256 instead.
 */
function draftItemFingerprint(item: PresetDraftItem): string {
  return createHash("sha256")
    .update(JSON.stringify(draftRpcPayloads(item)))
    .digest("hex");
}

export async function createPresetDrafts(
  ctx: PresetFactoryContext,
  rawBatch: unknown
): Promise<FactoryResult<PresetBatchResult>> {
  const parsed = parseBatch(rawBatch);
  if (!parsed.ok) return parsed;
  const { batchId, approvalIntentId, items, itemErrors } = parsed.data;

  const lookups = await resolveBatchLookups(ctx, items);
  if (!lookups.ok) return lookups;

  // Ledger pre-check (caller-bound): items whose idempotency key already
  // committed a product skip re-validation — the slug they created is
  // legitimately "conflicting" now — and go straight to the RPC, whose
  // server-computed payload fingerprint authoritatively decides `reused`
  // vs `idempotency_conflict`.
  const priorKeys = new Set<string>();
  const uniqueKeys = [...new Set(items.map((item) => item.idempotency_key))];
  if (uniqueKeys.length > 0) {
    const { data: opRows } = await ctx.supabase
      .from("preset_factory_operations")
      .select("idempotency_key")
      .eq("admin_user_id", ctx.userId)
      .in("idempotency_key", uniqueKeys);
    for (const row of (opRows ?? []) as Array<{ idempotency_key: string }>) {
      priorKeys.add(row.idempotency_key);
    }
  }

  const rawItems = (rawBatch as { items?: unknown[] }).items ?? [];
  const parsedByIndex = new Map<number, PresetDraftItem>();
  let cursor = 0;
  rawItems.forEach((_, index) => {
    if (!itemErrors.has(index)) parsedByIndex.set(index, items[cursor++]);
  });

  const results: PresetItemResult[] = [];
  for (const [index, rawItem] of rawItems.entries()) {
    const clientItemId =
      typeof (rawItem as { client_item_id?: unknown })?.client_item_id ===
      "string"
        ? (rawItem as { client_item_id: string }).client_item_id
        : `item-${index}`;

    const schemaErrors = itemErrors.get(index);
    if (schemaErrors) {
      results.push({
        client_item_id: clientItemId,
        status: "failed",
        errors: schemaErrors,
        warnings: [],
      });
      continue;
    }

    const item = parsedByIndex.get(index)!;
    const fingerprint = draftItemFingerprint(item);

    // Prior ledger hit → straight to the RPC: its server-computed canonical
    // fingerprint decides `reused` vs PF_IDEMPOTENCY_CONFLICT before any
    // validation or insert runs. Local fingerprint stays caller-asserted.
    let warnings: FactoryError[] = [];
    if (!priorKeys.has(item.idempotency_key)) {
      const check = checkDraftItem(item, itemContext(item, lookups.data));
      if (check.errors.length > 0) {
        results.push({
          client_item_id: item.client_item_id,
          status: "failed",
          errors: check.errors,
          warnings: check.warnings,
        });
        continue;
      }
      warnings = check.warnings;
    }

    const { product } = item;
    const payloads = draftRpcPayloads(item);
    const { data: rpcData, error: rpcError } = await ctx.supabase.rpc(
      "admin_create_preset_draft",
      {
        p_product: payloads.product,
        p_metadata: payloads.metadata,
        p_version: payloads.version,
        p_fields: payloads.fields,
        p_asset_links: payloads.asset_links,
        p_batch_id: batchId,
        p_client_item_id: item.client_item_id,
        p_idempotency_key: item.idempotency_key,
        p_request_fingerprint: fingerprint,
        p_approval_intent_id: approvalIntentId ?? null,
      }
    );

    if (rpcError) {
      results.push({
        client_item_id: item.client_item_id,
        status: "failed",
        errors: [mapRpcError(rpcError)],
        warnings,
      });
      continue;
    }

    const created = rpcData as {
      product_id?: string;
      version_id?: string;
      slug?: string;
      reused?: boolean;
    } | null;
    results.push({
      client_item_id: item.client_item_id,
      status: created?.reused ? "reused" : "created",
      product_id: created?.product_id,
      version_id: created?.version_id,
      slug: created?.slug ?? item.product.slug,
      review_path: created?.product_id
        ? adminReviewPath(product.type, created.product_id)
        : undefined,
      errors: [],
      warnings,
    });
  }

  const summary = summarize(results);
  await logFactoryAudit(ctx, {
    action: "preset_factory.batch_create",
    entityType: "preset_factory_batch",
    after: {
      batch_id: batchId,
      item_count: rawItems.length,
      created: summary.created,
      reused: summary.reused,
      failed: summary.failed,
    },
  });

  return ok({ batch_id: batchId, items: results, summary });
}

// ---------------------------------------------------------------------------
// get_batch_status / get_review_links — read-only inventory and handoff.
// ---------------------------------------------------------------------------

export async function getPresetBatchStatus(
  ctx: PresetFactoryContext,
  rawQuery: unknown
): Promise<FactoryResult<{ batch_id: string; items: BatchStatusItem[] }>> {
  const parsed = batchStatusQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: "A batch_id is required.",
    });
  }
  const { data, error } = await ctx.supabase
    .from("preset_factory_operations")
    .select(
      "client_item_id, idempotency_key, status, product_id, version_id, created_at, products(slug, type)"
    )
    .eq("batch_id", parsed.data.batch_id)
    // Caller-bound: the ledger policy only exposes an admin's own rows,
    // and this filter keeps the query honest even for direct clients.
    .eq("admin_user_id", ctx.userId)
    .order("created_at", { ascending: true });
  if (error) {
    return fail({
      code: "internal_error",
      message: "Batch status lookup failed.",
    });
  }
  const items = ((data ?? []) as Array<Record<string, unknown>>).map(
    (row): BatchStatusItem => {
      const product = Array.isArray(row.products)
        ? (row.products[0] as { slug?: string; type?: string } | undefined)
        : (row.products as { slug?: string; type?: string } | undefined);
      return {
        client_item_id: (row.client_item_id as string | null) ?? null,
        idempotency_key: row.idempotency_key as string,
        status: row.status as "created" | "failed",
        product_id: (row.product_id as string | null) ?? null,
        version_id: (row.version_id as string | null) ?? null,
        review_path:
          row.product_id && product?.type
            ? adminReviewPath(
                product.type as "filter" | "poster",
                row.product_id as string
              )
            : null,
        created_at: row.created_at as string,
      };
    }
  );
  return ok({ batch_id: parsed.data.batch_id, items });
}

export async function getPresetReviewLinks(
  ctx: PresetFactoryContext,
  rawQuery: unknown
): Promise<FactoryResult<{ items: ReviewLinkEntry[] }>> {
  const parsed = reviewLinksQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: "product_ids required.",
    });
  }
  const { data, error } = await ctx.supabase
    .from("products")
    .select(
      `id, type, slug, name, public_status, category_id, parent_preset_id,
       hero_asset_id, poster_asset_id, categories(slug),
       product_versions(id)`
    )
    .in("id", parsed.data.product_ids);
  if (error) {
    return fail({ code: "internal_error", message: "Review lookup failed." });
  }

  const items = ((data ?? []) as Array<Record<string, unknown>>).map(
    (row): ReviewLinkEntry => {
      const versions = Array.isArray(row.product_versions)
        ? row.product_versions
        : [];
      const category = Array.isArray(row.categories)
        ? (row.categories[0] as { slug?: string } | undefined)
        : (row.categories as { slug?: string } | null);
      const blockers: string[] = [];
      if (versions.length === 0) blockers.push("no version recipe saved");
      if (!row.hero_asset_id) blockers.push("missing hero asset");
      if (!row.poster_asset_id) blockers.push("missing poster asset");
      if (!row.category_id) blockers.push("uncategorized");
      return {
        product_id: row.id as string,
        slug: row.slug as string,
        name: row.name as string,
        type: row.type as "filter" | "poster",
        public_status: row.public_status as string,
        review_path: adminReviewPath(
          row.type as "filter" | "poster",
          row.id as string
        ),
        category_slug: category?.slug ?? null,
        parent_preset_id: (row.parent_preset_id as string | null) ?? null,
        has_version: versions.length > 0,
        blockers,
      };
    }
  );
  return ok({ items });
}

// ---------------------------------------------------------------------------
// Write-approval intents (coordinator rev4 / #272)
//
// OAuth-issued JWTs (client_id claim present) are refused by the draft
// and category RPCs unless an approved intent covers the payload's
// fingerprint; web/session tokens are unaffected. Both RPCs compute and
// consume the fingerprint internally — the adapter never consumes
// itself. (Direct categories table inserts bypass intents via the
// categories_admin policy — a documented residual boundary.)
//
// Approval is owner-only with requester/approver separation: an admin
// requester cannot approve, an owner-staged intent needs a second owner,
// and OAuth tokens can never approve. Owners read every intent via the
// inbox (listWriteIntents); requesters read only their own.
// ---------------------------------------------------------------------------

export async function stageWriteIntent(
  ctx: PresetFactoryContext,
  rawRequest: unknown
): Promise<FactoryResult<StageWriteIntentResult>> {
  const parsed = stageWriteIntentRequestSchema.safeParse(rawRequest);
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid intent request.",
      field: parsed.error.issues[0]?.path.map(String).join("."),
    });
  }
  const req = parsed.data;

  // Payloads are canonicalized exactly as the write path sends them;
  // fingerprints, digest AND the owner-visible preview are all derived
  // *inside* admin_stage_write_intent from these payloads (same canonical
  // SHA-256 as admin_create_preset_draft). The approval therefore binds
  // to the SQL-verified payload, never to a caller-asserted hash or a
  // caller-written description.
  const items =
    req.operation === "create_draft_batch"
      ? req.items.map(draftRpcPayloads)
      : req.categories.map((c) => ({
          name: c.name,
          slug: c.slug,
          // '' → null, identical to createPresetCategory and the SQL-side
          // NULLIF — otherwise the staged fingerprint can't match.
          description: c.description || null,
          sort_order: c.sort_order,
        }));

  const { data, error } = await ctx.supabase.rpc("admin_stage_write_intent", {
    p_operation: req.operation,
    p_items: items,
    p_ttl_seconds: req.ttl_seconds,
  });
  if (error) {
    return fail(mapRpcError(error));
  }
  const staged = data as {
    intent_id?: string;
    digest?: string;
    preview?: Record<string, unknown>;
    item_fingerprints?: string[];
    expires_at?: string;
  } | null;
  return ok({
    intent_id: staged?.intent_id ?? "",
    status: "pending",
    digest: staged?.digest ?? "",
    preview: staged?.preview ?? {},
    item_fingerprints: staged?.item_fingerprints ?? [],
    expires_at: staged?.expires_at ?? "",
  });
}

/**
 * Single intent read — drives the approval page's staged preview. RLS is
 * the authority: an admin sees only their own intents; an is_owner()
 * session sees every intent (the approval inbox). A stale open intent is
 * reported as 'expired' for display — the same lazily-materialized status
 * the owner inbox sweep persists.
 */
export async function getWriteIntent(
  ctx: PresetFactoryContext,
  rawQuery: unknown
): Promise<FactoryResult<{ intent: WriteIntentSummary }>> {
  const parsed = intentIdQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: "An intent_id is required.",
    });
  }
  const { data, error } = await ctx.supabase
    .from("preset_factory_write_intents")
    .select(
      "id, admin_user_id, approved_by, operation, status, payload_digest, preview, item_fingerprints, consumed_fingerprints, expires_at, created_at"
    )
    .eq("id", parsed.data.intent_id)
    .single();
  if (error || !data) {
    return fail({
      code: "approval_invalid",
      message: "Write intent not found.",
    });
  }
  return ok({ intent: mapWriteIntentRow(data as Record<string, unknown>) });
}

/**
 * Owner approval inbox — every intent across requesters, latest 100. The
 * RPC is owner-only and lazily flips stale open intents to 'expired'.
 */
export async function listWriteIntents(
  ctx: PresetFactoryContext,
  rawQuery: unknown
): Promise<FactoryResult<{ intents: WriteIntentSummary[] }>> {
  const parsed = listWriteIntentsQuerySchema.safeParse(rawQuery ?? {});
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid inbox query.",
    });
  }
  const { data, error } = await ctx.supabase.rpc("admin_list_write_intents", {
    p_statuses: parsed.data.statuses ?? null,
  });
  if (error) {
    return fail(mapRpcError(error));
  }
  const rows = (data as { intents?: Record<string, unknown>[] } | null)
    ?.intents;
  return ok({
    intents: (rows ?? []).map((r) =>
      mapWriteIntentRow({ ...r, id: r.intent_id })
    ),
  });
}

function mapWriteIntentRow(row: Record<string, unknown>): WriteIntentSummary {
  const status = row.status as WriteIntentSummary["status"];
  const expiresAt = row.expires_at as string;
  return {
    intent_id: (row.id ?? row.intent_id) as string,
    requested_by: (row.requested_by ?? row.admin_user_id) as string,
    approved_by: (row.approved_by as string) ?? null,
    operation: row.operation as WriteIntentSummary["operation"],
    // Display-derived expiry — the persisted status flips when the owner
    // inbox sweep (or a gate) next touches the row.
    status:
      (status === "pending" || status === "approved") &&
      new Date(expiresAt).getTime() <= Date.now()
        ? "expired"
        : status,
    payload_digest: row.payload_digest as string,
    preview: (row.preview as Record<string, unknown>) ?? {},
    total_items:
      (row.total_items as number) ??
      (row.item_fingerprints as unknown[] | null)?.length ??
      0,
    consumed_items:
      (row.consumed_items as number) ??
      (row.consumed_fingerprints as unknown[] | null)?.length ??
      0,
    expires_at: expiresAt,
    created_at: row.created_at as string,
  };
}

/**
 * pending → approved, atomically. Owner-only with requester/approver
 * separation enforced inside the RPC — an admin requester can never
 * approve, and an owner-staged intent needs a second owner. OAuth tokens
 * are refused: approval must come from a non-connector session.
 */
export async function approveWriteIntent(
  ctx: PresetFactoryContext,
  rawQuery: unknown
): Promise<FactoryResult<ApproveWriteIntentResult>> {
  const parsed = intentIdQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: "An intent_id is required.",
    });
  }
  const { data, error } = await ctx.supabase.rpc("admin_approve_write_intent", {
    p_intent_id: parsed.data.intent_id,
  });
  if (error) {
    return fail(mapRpcError(error));
  }
  const approved = data as {
    intent_id?: string;
    status?: string;
    approved_by?: string;
    expires_at?: string;
  } | null;
  return ok({
    intent_id: approved?.intent_id ?? parsed.data.intent_id,
    status: "approved",
    approved_by: approved?.approved_by ?? "",
    expires_at: approved?.expires_at ?? "",
  });
}

/**
 * Raw single-claim consume primitive. Both write paths consume inside
 * their own atomic RPCs (admin_create_preset_draft /
 * admin_create_preset_category), so callers normally never need this —
 * it's kept for completeness/future tool-gated operations. The claim is
 * atomic: a fingerprint can never be consumed twice.
 */
export async function consumeWriteIntent(
  ctx: PresetFactoryContext,
  rawRequest: unknown
): Promise<FactoryResult<ConsumeWriteIntentResult>> {
  const parsed = consumeWriteIntentSchema.safeParse(rawRequest);
  if (!parsed.success) {
    return fail({
      code: "validation_failed",
      message: parsed.error.issues[0]?.message ?? "Invalid consume request.",
      field: parsed.error.issues[0]?.path.map(String).join("."),
    });
  }
  const { data, error } = await ctx.supabase.rpc("admin_consume_write_intent", {
    p_intent_id: parsed.data.intent_id,
    p_operation: parsed.data.operation,
    p_request_fingerprint: parsed.data.request_fingerprint,
  });
  if (error) {
    return fail(mapRpcError(error));
  }
  const consumed = data as {
    intent_id?: string;
    status?: string;
    consumed?: number;
    total?: number;
  } | null;
  return ok({
    intent_id: consumed?.intent_id ?? parsed.data.intent_id,
    status: consumed?.status === "consumed" ? "consumed" : "approved",
    consumed: consumed?.consumed ?? 0,
    total: consumed?.total ?? 0,
  });
}
