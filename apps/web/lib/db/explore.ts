import { createClient } from "@/lib/supabase/server";

export async function getPublicProducts(type?: "filter" | "poster") {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      `id, slug, name, short_description, type, public_status, visibility, featured_rank,
       categories(id, slug, name),
       product_versions(id, version_number, state, credit_cost)`
    )
    .eq("public_status", "active")
    .eq("visibility", "public");

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query.order("featured_rank", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
