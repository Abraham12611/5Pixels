/**
 * Engineer A ↔ B service integration (#271/#272), transport = direct call.
 *
 * The MCP server is the ONLY caller: it authenticates the user once per
 * request (Bearer token → verified Supabase user → fresh admin/owner check),
 * then hands A's service a {@link PresetFactoryContext} built on a client
 * bound to the caller's own token. A's functions re-derive identity and
 * re-check privilege inside the SECURITY DEFINER RPCs — the MCP layer never
 * holds the service-role key and never bypasses RLS.
 *
 * The backend interface mirrors {@link ../preset-factory/contract} exactly —
 * types, error codes, and result shapes are A's canonical definitions.
 *
 * `PRESET_FACTORY_BACKEND=fixture` swaps in canned responses for offline
 * development. Fixture mode never writes and is REFUSED in production —
 * see fixture.ts.
 */
import type {
  BatchStatusItem,
  BatchStatusQuery,
  CatalogItemSummary,
  CatalogQuery,
  CategorySummary,
  CreateCategoryRequest,
  CreateCategoryResult,
  FactoryResult,
  ModelOption,
  PresetBatchResult,
  ReviewLinkEntry,
  ReviewLinksQuery,
} from "@/lib/preset-factory/contract";
import {
  createPresetCategory,
  createPresetDrafts,
  getPresetBatchStatus,
  getPresetReviewLinks,
  listCompatibleModelOptions,
  listPresetCatalog,
  listPresetCategories,
  validatePresetBatch,
  type PresetFactoryContext,
} from "@/lib/preset-factory/service";

export {
  MAX_BATCH_ITEMS,
  PRESET_FACTORY_CONTRACT_VERSION as CONTRACT_VERSION,
} from "@/lib/preset-factory/contract";
export type { FactoryResult };

// ---------------------------------------------------------------------------
// Backend interface — one method per canonical operation
// ---------------------------------------------------------------------------

export interface PresetFactoryBackend {
  listPresetCatalog(
    query: CatalogQuery
  ): Promise<FactoryResult<{ items: CatalogItemSummary[] }>>;

  listCategories(): Promise<FactoryResult<{ categories: CategorySummary[] }>>;

  listCompatibleModelOptions(): Promise<FactoryResult<{ models: ModelOption[] }>>;

  /** Schema + domain validation. Pure — writes nothing. */
  validatePresetBatch(batch: unknown): Promise<FactoryResult<PresetBatchResult>>;

  createCategory(input: CreateCategoryRequest): Promise<FactoryResult<CreateCategoryResult>>;

  /** The ONLY persistence path — atomic draft-only RPC per item. */
  createPresetDrafts(batch: unknown): Promise<FactoryResult<PresetBatchResult>>;

  getBatchStatus(
    query: BatchStatusQuery
  ): Promise<FactoryResult<{ batch_id: string; items: BatchStatusItem[] }>>;

  getReviewLinks(
    query: ReviewLinksQuery
  ): Promise<FactoryResult<{ items: ReviewLinkEntry[] }>>;
}

// ---------------------------------------------------------------------------
// Direct implementation — Engineer A's canonical service
// ---------------------------------------------------------------------------

export function directPresetFactoryBackend(
  ctx: PresetFactoryContext
): PresetFactoryBackend {
  return {
    listPresetCatalog: (query) => listPresetCatalog(ctx, query),
    listCategories: () => listPresetCategories(ctx),
    listCompatibleModelOptions: () => listCompatibleModelOptions(ctx),
    validatePresetBatch: (batch) => validatePresetBatch(ctx, batch),
    createCategory: (input) => createPresetCategory(ctx, input),
    createPresetDrafts: (batch) => createPresetDrafts(ctx, batch),
    getBatchStatus: (query) => getPresetBatchStatus(ctx, query),
    getReviewLinks: (query) => getPresetReviewLinks(ctx, query),
  };
}

// ---------------------------------------------------------------------------
// Selection — direct by default; fixture is development-only.
// ---------------------------------------------------------------------------

function fixtureAllowed(): boolean {
  // Fail closed anywhere near production: a fixture can fabricate
  // successful-looking writes, so it must be impossible to select there.
  return (
    process.env.PRESET_FACTORY_BACKEND === "fixture" &&
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.VERCEL_ENV !== "preview"
  );
}

export async function getPresetFactoryBackend(opts: {
  ctx: PresetFactoryContext;
}): Promise<PresetFactoryBackend> {
  if (process.env.PRESET_FACTORY_BACKEND === "fixture" && !fixtureAllowed()) {
    throw new Error(
      "PRESET_FACTORY_BACKEND=fixture is development-only and cannot run in this environment."
    );
  }
  if (fixtureAllowed()) {
    const { fixtureBackend } = await import("./fixture");
    return fixtureBackend();
  }
  return directPresetFactoryBackend(opts.ctx);
}
