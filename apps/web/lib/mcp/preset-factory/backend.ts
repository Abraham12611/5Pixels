/**
 * Engineer A ↔ B service contract (#271/#272), transport = same-origin HTTP.
 *
 * The MCP server is the ONLY caller: it has already authenticated the user
 * and forwards their Bearer token so A's handlers independently re-verify
 * identity + admin role. If A lands a service module instead of HTTP routes,
 * this file's factory is the single swap point — handlers and tool schemas
 * do not change.
 *
 * `PRESET_FACTORY_BACKEND=fixture` swaps in canned responses for offline
 * development. Fixture mode never writes and must never reach production —
 * see fixture.ts.
 */

export const CONTRACT_VERSION = "1" as const;
export const MAX_BATCH_ITEMS = 25;

// ---------------------------------------------------------------------------
// Wire types (contractVersion "1" — agreed on issue #271)
// ---------------------------------------------------------------------------

export interface ApiOk<T> {
  ok: true;
  contractVersion: string;
  data: T;
}
export interface ApiErr {
  ok: false;
  contractVersion: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
    item_id?: string;
  };
}
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  type: "filter" | "poster";
  public_status: string;
  visibility: string;
  category_id: string | null;
  parent_preset_id: string | null;
  version_count: number;
  latest_version_state: string | null;
  media_flags: { hero: boolean; preview: boolean };
}
export interface CatalogResult {
  items: CatalogItem[];
  next_cursor: string | null;
  totals: { filters: number; posters: number; draft: number; active: number };
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface ModelOption {
  provider: string;
  endpoint_id: string;
  display_name: string;
  category: string;
  unit: string;
  unit_price: number;
}

export interface DraftItem {
  client_item_id: string;
  item_idempotency_key: string;
  product: Record<string, unknown>; // productCreateSchema payload — A validates
}

export interface ItemValidation {
  client_item_id: string;
  ok: boolean;
  errors: { code: string; message: string; path?: string }[];
  warnings: string[];
}
export interface ValidateBatchResult {
  results: ItemValidation[];
}

export interface CreatedCategory {
  id: string;
  slug: string;
  status: "created" | "reused";
}

export interface BatchItemOutcome {
  client_item_id: string;
  outcome: "created" | "reused_idempotent" | "failed";
  product_id?: string;
  version_id?: string;
  errors?: { code: string; message: string; path?: string }[];
}
export interface CreateDraftBatchResult {
  batch_id: string;
  items: BatchItemOutcome[];
  summary: { created: number; reused: number; failed: number };
}

export interface BatchStatusResult {
  items: {
    client_item_id: string;
    product_id: string | null;
    outcome: string;
    slug: string | null;
  }[];
}

export interface ReviewLink {
  product_id: string;
  slug: string;
  admin_edit_url: string;
  blockers: string[];
}
export interface ReviewLinksResult {
  links: ReviewLink[];
}

// ---------------------------------------------------------------------------
// Backend interface — one method per contract operation
// ---------------------------------------------------------------------------

export interface PresetFactoryBackend {
  listPresetCatalog(params: {
    type?: "filter" | "poster";
    status?: string;
    category_id?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ApiResponse<CatalogResult>>;

  listCategories(): Promise<ApiResponse<Category[]>>;

  listCompatibleModelOptions(): Promise<ApiResponse<ModelOption[]>>;

  validatePresetBatch(input: { items: DraftItem[] }): Promise<ApiResponse<ValidateBatchResult>>;

  createCategory(input: {
    name: string;
    slug: string;
    description?: string;
    sort_order?: number;
  }): Promise<ApiResponse<CreatedCategory>>;

  createPresetDrafts(input: {
    batch_idempotency_key: string;
    items: DraftItem[];
  }): Promise<ApiResponse<CreateDraftBatchResult>>;

  getBatchStatus(input: {
    batch_idempotency_key?: string;
    product_ids?: string[];
  }): Promise<ApiResponse<BatchStatusResult>>;

  getReviewLinks(input: { product_ids: string[] }): Promise<ApiResponse<ReviewLinksResult>>;
}

// ---------------------------------------------------------------------------
// HTTP implementation — forwards the caller's token to A's API
// ---------------------------------------------------------------------------

const OP_PATH: Record<string, string> = {
  listPresetCatalog: "list_preset_catalog",
  listCategories: "list_categories",
  listCompatibleModelOptions: "list_compatible_model_options",
  validatePresetBatch: "validate_preset_batch",
  createCategory: "create_category",
  createPresetDrafts: "create_preset_drafts",
  getBatchStatus: "get_batch_status",
  getReviewLinks: "get_review_links",
};

export function httpPresetFactoryBackend(
  baseUrl: string,
  accessToken: string
): PresetFactoryBackend {
  const call = async <T>(op: keyof PresetFactoryBackend, body: unknown): Promise<ApiResponse<T>> => {
    const path = OP_PATH[op as string];
    let res: Response;
    try {
      res = await fetch(`${baseUrl.replace(/\/+$/, "")}/${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
          "x-preset-factory-contract": CONTRACT_VERSION,
        },
        body: JSON.stringify(body ?? {}),
        cache: "no-store",
      });
    } catch (err) {
      return {
        ok: false,
        contractVersion: CONTRACT_VERSION,
        error: {
          code: "backend_unavailable",
          message: `Preset factory API unreachable: ${err instanceof Error ? err.message : "network error"}`,
        },
      };
    }
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json || typeof json !== "object" || typeof json.ok !== "boolean") {
      return {
        ok: false,
        contractVersion: CONTRACT_VERSION,
        error: {
          code: res.status === 404 ? "backend_not_deployed" : "backend_bad_response",
          message:
            res.status === 404
              ? `Preset factory API '${path}' is not deployed yet (HTTP 404)`
              : `Preset factory API '${path}' returned HTTP ${res.status} with an unexpected body`,
        },
      };
    }
    return json;
  };

  return {
    listPresetCatalog: (params) => call("listPresetCatalog", params),
    listCategories: () => call("listCategories", {}),
    listCompatibleModelOptions: () => call("listCompatibleModelOptions", {}),
    validatePresetBatch: (input) => call("validatePresetBatch", input),
    createCategory: (input) => call("createCategory", input),
    createPresetDrafts: (input) => call("createPresetDrafts", input),
    getBatchStatus: (input) => call("getBatchStatus", input),
    getReviewLinks: (input) => call("getReviewLinks", input),
  };
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export async function getPresetFactoryBackend(opts: {
  requestOrigin: string;
  accessToken: string;
}): Promise<PresetFactoryBackend> {
  if (process.env.PRESET_FACTORY_BACKEND === "fixture") {
    const { fixtureBackend } = await import("./fixture");
    return fixtureBackend();
  }
  const base =
    process.env.PRESET_FACTORY_API_BASE?.trim() ||
    `${opts.requestOrigin}/api/admin/preset-factory/v1`;
  return httpPresetFactoryBackend(base, opts.accessToken);
}
