import {
  CONTRACT_VERSION,
  type ApiResponse,
  type BatchStatusResult,
  type CatalogResult,
  type Category,
  type CreatedCategory,
  type CreateDraftBatchResult,
  type ModelOption,
  type PresetFactoryBackend,
  type ReviewLinksResult,
  type ValidateBatchResult,
} from "./backend";

/**
 * Fixture backend — canned contract responses for developing the MCP layer
 * before Engineer A's API ships (#272). Selected ONLY by the explicit env
 * `PRESET_FACTORY_BACKEND=fixture`; writes are simulated in-memory and never
 * reach a database. If this file ever executes in production it is a
 * misconfiguration: it fabricates no data access and returns obvious ids.
 */
const CATEGORIES: Category[] = [
  { id: "11111111-0000-0000-0000-0000000000a1", slug: "cinematic", name: "Cinematic", is_active: true, sort_order: 10 },
  { id: "11111111-0000-0000-0000-0000000000a2", slug: "portrait", name: "Portrait", is_active: true, sort_order: 20 },
  { id: "11111111-0000-0000-0000-0000000000a3", slug: "editorial", name: "Editorial", is_active: true, sort_order: 30 },
];

export function fixtureBackend(): PresetFactoryBackend {
  const created = new Map<string, { product_id: string; client_item_id: string; slug: string }>();

  const ok = <T>(data: T): ApiResponse<T> => ({ ok: true, contractVersion: CONTRACT_VERSION, data });

  return {
    async listPresetCatalog() {
      return ok<CatalogResult>({
        items: [
          {
            id: "22222222-0000-0000-0000-0000000000b1",
            slug: "noir-portrait",
            name: "Noir Portrait",
            type: "filter",
            public_status: "active",
            visibility: "public",
            category_id: CATEGORIES[1].id,
            parent_preset_id: null,
            version_count: 2,
            latest_version_state: "active",
            media_flags: { hero: true, preview: true },
          },
        ],
        next_cursor: null,
        totals: { filters: 17, posters: 1, draft: 4, active: 14 },
      });
    },
    async listCategories() {
      return ok(CATEGORIES);
    },
    async listCompatibleModelOptions() {
      return ok<ModelOption[]>([
        {
          provider: "fal",
          endpoint_id: "fal-ai/nano-banana-2/edit",
          display_name: "Nano Banana 2 Edit",
          category: "image_edit",
          unit: "image",
          unit_price: 0.05,
        },
      ]);
    },
    async validatePresetBatch(input) {
      return ok<ValidateBatchResult>({
        results: input.items.map((i) => ({
          client_item_id: i.client_item_id,
          ok: true,
          errors: [],
          warnings: ["fixture backend — schema checks only, domain validation not run"],
        })),
      });
    },
    async createCategory(input) {
      return ok<CreatedCategory>({ id: `fixture-${input.slug}`, slug: input.slug, status: "created" });
    },
    async createPresetDrafts(input) {
      const items = input.items.map((i) => {
        const slug = String((i.product as { slug?: string }).slug ?? i.client_item_id);
        const product_id = `fixture-${i.item_idempotency_key}`;
        created.set(i.item_idempotency_key, { product_id, client_item_id: i.client_item_id, slug });
        return { client_item_id: i.client_item_id, outcome: "created" as const, product_id, version_id: `${product_id}-v1` };
      });
      return ok<CreateDraftBatchResult>({
        batch_id: `fixture-batch-${input.batch_idempotency_key}`,
        items,
        summary: { created: items.length, reused: 0, failed: 0 },
      });
    },
    async getBatchStatus(input) {
      const items = [...created.values()].filter(
        (r) => !input.product_ids || input.product_ids.includes(r.product_id)
      );
      return ok<BatchStatusResult>({
        items: items.map((r) => ({
          client_item_id: r.client_item_id,
          product_id: r.product_id,
          outcome: "created",
          slug: r.slug,
        })),
      });
    },
    async getReviewLinks(input) {
      return ok<ReviewLinksResult>({
        links: input.product_ids.map((id) => ({
          product_id: id,
          slug: created.get(id.replace("fixture-", ""))?.slug ?? "fixture-draft",
          admin_edit_url: `/admin/filters/${id}`,
          blockers: ["fixture mode — no real record exists"],
        })),
      });
    },
  };
}
