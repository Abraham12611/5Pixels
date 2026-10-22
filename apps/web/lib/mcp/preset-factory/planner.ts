import { MAX_BATCH_ITEMS, type CatalogItem, type Category } from "./backend";

/**
 * Pure batch-planning normalization (#272). `plan_preset_batch` never
 * persists anything — it takes the model's creative proposal plus a catalog
 * snapshot and returns a server-normalized plan: canonical slugs, stable
 * client_item_ids, resolved category references, and every warning a human
 * should see before approving writes.
 */

export interface ProposedPlanItem {
  name: string;
  type: "filter" | "poster";
  concept: string;
  /** Slug or display name of an existing category, or a new category name. */
  category: string;
  /** Present when the item proposes a brand-new category. */
  proposes_new_category?: boolean;
  new_category_reason?: string;
  /** Slug of an existing preset to attach as a one-level variant, if any. */
  parent_preset_slug?: string;
  slug_hint?: string;
}

export interface PlannedCategory {
  slug: string;
  name: string;
  status: "existing" | "proposed_new";
  reason?: string;
}

export interface PlannedItem {
  client_item_id: string;
  name: string;
  type: "filter" | "poster";
  slug: string;
  concept: string;
  category: { slug: string; status: "existing" | "proposed_new" };
  parent: { slug: string; product_id: string } | null;
  warnings: string[];
}

export interface PlannedBatch {
  items: PlannedItem[];
  proposed_categories: PlannedCategory[];
  warnings: string[];
  summary: {
    filters: number;
    posters: number;
    new_categories: number;
    slug_collisions: number;
    items_rejected: number;
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const norm = (s: string) => s.trim().toLowerCase();

export function planPresetBatch(
  proposed: ProposedPlanItem[],
  catalog: CatalogItem[],
  categories: Category[]
): PlannedBatch {
  const warnings: string[] = [];
  const catalogSlugs = new Set(catalog.map((p) => norm(p.slug)));
  const catalogBySlug = new Map(catalog.map((p) => [norm(p.slug), p]));
  const categoryBySlug = new Map(categories.map((c) => [norm(c.slug), c]));
  const categoryByName = new Map(categories.map((c) => [norm(c.name), c]));

  const usedSlugs = new Set<string>();
  const plannedCategories = new Map<string, PlannedCategory>();
  const items: PlannedItem[] = [];
  let slugCollisions = 0;
  let itemsRejected = 0;

  if (proposed.length > MAX_BATCH_ITEMS) {
    warnings.push(
      `Batch capped at ${MAX_BATCH_ITEMS} items — ${proposed.length - MAX_BATCH_ITEMS} proposal(s) were dropped.`
    );
  }

  for (const [index, raw] of proposed.slice(0, MAX_BATCH_ITEMS).entries()) {
    const itemWarnings: string[] = [];
    const name = raw.name?.trim();
    if (!name || (raw.type !== "filter" && raw.type !== "poster") || !raw.concept?.trim()) {
      itemsRejected += 1;
      warnings.push(`Item ${index + 1} rejected: name, type ('filter'|'poster') and concept are required.`);
      continue;
    }

    // --- slug -------------------------------------------------------------
    let slug = slugify(raw.slug_hint || name);
    if (!slug) {
      itemsRejected += 1;
      warnings.push(`Item '${name}' rejected: could not derive a valid slug.`);
      continue;
    }
    if (catalogSlugs.has(slug)) {
      slugCollisions += 1;
      itemWarnings.push(`Slug '${slug}' already exists in the catalog — a variant was auto-suggested.`);
      let n = 2;
      while (catalogSlugs.has(`${slug}-${n}`) || usedSlugs.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    if (usedSlugs.has(slug)) {
      slugCollisions += 1;
      let n = 2;
      while (catalogSlugs.has(`${slug}-${n}`) || usedSlugs.has(`${slug}-${n}`)) n += 1;
      itemWarnings.push(`Duplicate slug within this batch — renamed to '${slug}-${n}'.`);
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    // --- category -----------------------------------------------------------
    const catSlug = slugify(raw.category ?? "");
    let catStatus: "existing" | "proposed_new";
    if (categoryBySlug.has(catSlug) || categoryByName.has(norm(raw.category))) {
      catStatus = "existing";
      const existing = categoryBySlug.get(catSlug) ?? categoryByName.get(norm(raw.category))!;
      if (!existing.is_active) {
        itemWarnings.push(`Category '${existing.slug}' exists but is inactive — it will need reactivation.`);
      }
      if (raw.proposes_new_category) {
        itemWarnings.push(`Requested new category '${catSlug}' but an identical one exists — reusing it.`);
      }
    } else if (raw.proposes_new_category) {
      catStatus = "proposed_new";
      if (!raw.new_category_reason?.trim()) {
        itemWarnings.push(`New category '${catSlug}' has no stated reason — owner should confirm it is not redundant.`);
      }
    } else {
      catStatus = "proposed_new";
      itemWarnings.push(
        `Category '${catSlug}' does not exist — it will be proposed as new (owner approval required).`
      );
    }
    if (!plannedCategories.has(catSlug)) {
      plannedCategories.set(catSlug, {
        slug: catSlug,
        name: raw.category.trim(),
        status: catStatus,
        reason: catStatus === "proposed_new" ? raw.new_category_reason?.trim() : undefined,
      });
    }

    // --- parent / family (one level only) ------------------------------------
    let parent: PlannedItem["parent"] = null;
    if (raw.parent_preset_slug?.trim()) {
      const parentSlug = slugify(raw.parent_preset_slug);
      const parentRow = catalogBySlug.get(parentSlug);
      if (!parentRow) {
        itemWarnings.push(`Parent preset '${parentSlug}' not found in the catalog — item left standalone.`);
      } else if (parentRow.parent_preset_id) {
        itemWarnings.push(
          `'${parentSlug}' is itself a variant — families are one level deep, so this item was left standalone.`
        );
      } else if (parentRow.type !== raw.type) {
        itemWarnings.push(`Parent '${parentSlug}' is a ${parentRow.type} — cross-type families are not allowed; left standalone.`);
      } else {
        parent = { slug: parentSlug, product_id: parentRow.id };
      }
    }

    items.push({
      client_item_id: `item-${String(index + 1).padStart(3, "0")}`,
      name,
      type: raw.type,
      slug,
      concept: raw.concept.trim(),
      category: { slug: catSlug, status: catStatus },
      parent,
      warnings: itemWarnings,
    });
  }

  return {
    items,
    proposed_categories: [...plannedCategories.values()],
    warnings,
    summary: {
      filters: items.filter((i) => i.type === "filter").length,
      posters: items.filter((i) => i.type === "poster").length,
      new_categories: [...plannedCategories.values()].filter((c) => c.status === "proposed_new").length,
      slug_collisions: slugCollisions,
      items_rejected: itemsRejected,
    },
  };
}
