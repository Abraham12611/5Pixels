import { getPublicProducts } from "@/lib/db/explore";

export default async function ExplorePage() {
  const products = await getPublicProducts();

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <h1 className="text-4xl font-bold text-cream-50">Explore looks</h1>
      <p className="mt-2 text-text-secondary">
        Browse curated Filters and Posters.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <a
            key={product.id}
            href={`/presets/${product.slug}`}
            className="group rounded-2xl border border-cream-100/10 bg-charcoal-850 p-4 transition hover:border-lime-500/30"
          >
            <div className="aspect-[4/5] rounded-xl bg-charcoal-800" />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-cream-50">{product.name}</p>
                <p className="text-sm capitalize text-lime-400">{product.type}</p>
              </div>
              <span className="rounded-full bg-charcoal-700 px-3 py-1 text-xs text-cream-100">
                {Array.isArray(product.product_versions) &&
                product.product_versions[0]
                  ? `${product.product_versions[0].credit_cost} cr`
                  : "Free"}
              </span>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
