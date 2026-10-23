import type {
  BatchStatusItem,
  CatalogItemSummary,
  CategorySummary,
  CreateCategoryRequest,
  FactoryResult,
  ModelOption,
  PresetBatchResult,
  PresetDraftItem,
  ReviewLinkEntry,
  StageWriteIntentRequest,
} from "@/lib/preset-factory/contract";
import type { PresetFactoryBackend } from "./backend";

/**
 * Fixture backend — canned contract responses for developing the MCP layer
 * offline (#272). Selected ONLY by `PRESET_FACTORY_BACKEND=fixture` in a
 * non-production environment; `getPresetFactoryBackend` throws before this
 * module ever loads in production/preview deploys.
 *
 * Every response is unmistakably simulated: ids come from a reserved
 * `00000000-…` UUID namespace, slugs carry no resemblance to real presets,
 * and every payload is stamped `simulated: true` so nothing fabricated here
 * can be mistaken for a persisted record or a genuine admin link.
 */
const SIM = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

const CATEGORIES: CategorySummary[] = [
  { id: SIM("a1"), slug: "sim-cinematic", name: "Simulated Cinematic", description: null, sort_order: 10, is_active: true },
  { id: SIM("a2"), slug: "sim-portrait", name: "Simulated Portrait", description: null, sort_order: 20, is_active: true },
];

const CATALOG_ITEM: CatalogItemSummary = {
  product_id: SIM("b1"),
  type: "filter",
  slug: "sim-noir-portrait",
  name: "Simulated Noir Portrait",
  public_status: "draft",
  visibility: "public",
  category_id: CATEGORIES[1].id,
  category_slug: CATEGORIES[1].slug,
  parent_preset_id: null,
  standalone_discoverable: false,
  variant_display_name: null,
  version_count: 1,
  has_active_version: false,
  has_editable_version: true,
  latest_version_number: 1,
  field_count: 0,
  media: { has_hero: false, has_poster: false, has_preview_video: false, has_preview_gif: false, reference_count: 0 },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const SIM_WARNING = {
  code: "validation_failed" as const,
  message: "SIMULATED fixture response — nothing was validated or persisted.",
};

export function fixtureBackend(): PresetFactoryBackend {
  const created = new Map<string, { product_id: string; client_item_id: string; slug: string }>();

  const ok = <T>(data: T): FactoryResult<T> => ({ ok: true, data });
  const simulated = <T extends object>(data: T) => ({ ...data, simulated: true as const });

  return {
    async listPresetCatalog() {
      return ok(simulated({ items: [CATALOG_ITEM] }));
    },
    async listCategories() {
      return ok(simulated({ categories: CATEGORIES }));
    },
    async listCompatibleModelOptions() {
      const models: ModelOption[] = [
        {
          provider: "simulated",
          endpoint_id: "simulated/none",
          display_name: "Simulated Model (fixture)",
          description: "Fixture placeholder — not a real provider option.",
          category: "other",
          capability: { verified: false, max_input_images: 1, supports_prompt_edit: false },
        },
      ];
      return ok(simulated({ models }));
    },
    async validatePresetBatch(rawBatch) {
      const items = ((rawBatch as { items?: PresetDraftItem[] }).items ?? []).map((i) => ({
        client_item_id: i.client_item_id ?? "item-?",
        status: "validated" as const,
        slug: i.product?.slug,
        errors: [],
        warnings: [SIM_WARNING],
      }));
      const result: PresetBatchResult = {
        batch_id: (rawBatch as { batch_id?: string }).batch_id ?? "sim-batch",
        items,
        summary: { total: items.length, created: 0, reused: 0, validated: items.length, failed: 0 },
      };
      return ok(simulated(result));
    },
    async createCategory(input: CreateCategoryRequest) {
      return ok(
        simulated({
          status: "reused" as const,
          category: { id: SIM(`c-${input.slug}`.slice(0, 10)), slug: input.slug, name: input.name, description: input.description ?? null, sort_order: input.sort_order ?? 0, is_active: true },
          warnings: [{ ...SIM_WARNING, message: "SIMULATED — category was NOT persisted." }],
        })
      );
    },
    async createPresetDrafts(rawBatch) {
      const items = ((rawBatch as { items?: PresetDraftItem[] }).items ?? []).map((i, n) => {
        const product_id = SIM(`d${String(n + 1).padStart(2, "0")}`);
        created.set(i.idempotency_key, { product_id, client_item_id: i.client_item_id, slug: i.product?.slug ?? "sim-slug" });
        return {
          client_item_id: i.client_item_id,
          status: "created" as const,
          product_id,
          version_id: SIM(`e${String(n + 1).padStart(2, "0")}`),
          slug: i.product?.slug,
          errors: [],
          warnings: [{ ...SIM_WARNING, message: "SIMULATED — draft was NOT persisted." }],
        };
      });
      const result: PresetBatchResult = {
        batch_id: (rawBatch as { batch_id?: string }).batch_id ?? "sim-batch",
        items,
        summary: { total: items.length, created: items.length, reused: 0, validated: 0, failed: 0 },
      };
      return ok(simulated(result));
    },
    async stageWriteIntent(request: StageWriteIntentRequest) {
      const unitCount =
        request.operation === "create_draft_batch"
          ? request.items.length
          : request.categories.length;
      const preview =
        request.operation === "create_draft_batch"
          ? {
              operation: request.operation,
              total_items: unitCount,
              items: request.items.map((i) => ({
                slug: i.product?.slug ?? null,
                name: i.product?.name ?? null,
                type: i.product?.type ?? null,
              })),
            }
          : {
              operation: request.operation,
              total_items: unitCount,
              categories: request.categories.map((c) => ({
                name: c.name,
                slug: c.slug,
                description: c.description ?? null,
                sort_order: c.sort_order,
              })),
            };
      return ok(
        simulated({
          intent_id: SIM("f1"),
          status: "pending" as const,
          digest: "sim-digest-not-real",
          preview,
          item_fingerprints: Array.from(
            { length: unitCount },
            (_, i) => `sim-fp-${i + 1}`
          ),
          expires_at: new Date(Date.now() + 900_000).toISOString(),
        })
      );
    },
    async getWriteIntent(query) {
      return ok(
        simulated({
          intent: {
            intent_id: query.intent_id,
            operation: "create_draft_batch" as const,
            status: "approved" as const,
            payload_digest: "sim-digest-not-real",
            preview: { operation: "create_draft_batch", total_items: 0, items: [] },
            expires_at: new Date(Date.now() + 900_000).toISOString(),
            created_at: "2026-01-01T00:00:00.000Z",
          },
        })
      );
    },
    async getBatchStatus(query) {
      const items: BatchStatusItem[] = [...created.values()].map((r) => ({
        client_item_id: r.client_item_id,
        idempotency_key: "sim-key",
        status: "created" as const,
        product_id: r.product_id,
        version_id: null,
        review_path: `/admin/filters/${r.product_id} (SIMULATED)`,
        created_at: "2026-01-01T00:00:00.000Z",
      }));
      return ok(simulated({ batch_id: query.batch_id, items }));
    },
    async getReviewLinks(query) {
      const items: ReviewLinkEntry[] = query.product_ids.map((id) => ({
        product_id: id,
        slug: "sim-draft",
        name: "Simulated Draft",
        type: "filter" as const,
        public_status: "draft",
        review_path: `/admin/filters/${id} (SIMULATED — no real record exists)`,
        category_slug: "sim-portrait",
        parent_preset_id: null,
        has_version: true,
        blockers: ["SIMULATED fixture response — no real record exists"],
      }));
      return ok(simulated({ items }));
    },
  };
}
