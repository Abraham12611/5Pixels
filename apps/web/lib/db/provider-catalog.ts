"use server";

import { requireAdminOrOwner } from "@/lib/db/admin";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The admin-facing provider/model catalog, sourced from
 * `provider_model_pricing` (seeded from fal.ai's pricing feed). Powers the
 * preset editor's provider/model dropdowns and the lab's multi-model
 * comparison picker. Admin-gated — this is internal routing data.
 */

export interface ProviderModelOption {
  provider: string;
  endpointId: string;
  displayName: string;
  description: string;
  category: string;
  unitPrice: number;
  unit: string;
}

interface PricingRow {
  provider: string;
  endpoint_id: string;
  unit_price: number | string;
  unit: string;
  metadata: {
    display_name?: string;
    description?: string;
    source_category?: string;
  } | null;
}

export async function getProviderModelCatalog(): Promise<
  ProviderModelOption[]
> {
  await requireAdminOrOwner();

  const service = createServiceClient();
  const { data, error } = await service
    .from("provider_model_pricing")
    .select("provider, endpoint_id, unit_price, unit, metadata")
    .eq("is_active", true)
    .order("endpoint_id", { ascending: true });

  if (error) {
    console.error("[getProviderModelCatalog] failed", error.message);
    return [];
  }

  return ((data ?? []) as PricingRow[]).map((row) => ({
    provider: row.provider,
    endpointId: row.endpoint_id,
    displayName:
      row.metadata?.display_name?.trim() || row.endpoint_id.split("/").pop() || row.endpoint_id,
    description: row.metadata?.description ?? "",
    category: row.metadata?.source_category ?? "other",
    unitPrice: Number(row.unit_price) || 0,
    unit: row.unit,
  }));
}

/** Distinct provider names present in the catalog, for provider dropdowns. */
export async function getProviderNames(): Promise<string[]> {
  const catalog = await getProviderModelCatalog();
  return [...new Set(catalog.map((o) => o.provider))];
}
