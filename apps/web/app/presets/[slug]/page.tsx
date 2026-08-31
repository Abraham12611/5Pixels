import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PresetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, short_description, long_description, type, public_status, product_versions(credit_cost)")
    .eq("slug", slug)
    .eq("public_status", "active")
    .eq("visibility", "public")
    .single();

  if (!product) notFound();

  const creditCost =
    Array.isArray(product.product_versions) && product.product_versions[0]
      ? product.product_versions[0].credit_cost
      : 0;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-lime-400 text-sm font-medium uppercase tracking-wider">
        {product.type}
      </p>
      <h1 className="mt-4 text-4xl font-bold text-cream-50">{product.name}</h1>
      <p className="mt-4 max-w-xl text-text-secondary">
        {product.short_description || product.long_description}
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/app"
          className="inline-flex items-center justify-center rounded-full bg-lime-500 px-8 py-3 font-semibold text-ink-950 transition hover:bg-lime-400"
        >
          Try this look
        </a>
      </div>
      <p className="mt-4 text-sm text-text-muted">{creditCost} credits</p>
    </main>
  );
}
