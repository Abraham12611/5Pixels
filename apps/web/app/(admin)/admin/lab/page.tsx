import Link from "next/link";
import { requireAdmin } from "@/lib/db/admin";
import { getPublicProducts } from "@/lib/db/explore";

export default async function AdminTestLabPage() {
  await requireAdmin();
  const { data: products } = await getPublicProducts(undefined, undefined, undefined, undefined, "name_asc", 1, 100);

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Manual test lab</h1>
        <p className="text-text-secondary mt-2">
          Run a real generation against an active preset version to test output, cost, and latency.
        </p>
        <p className="text-text-muted mt-1 text-sm">
          Test runs use your admin account credits and appear in your generation history.
        </p>
      </div>

      <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        {products.length === 0 ? (
          <p className="text-text-secondary">No active presets to test.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="text-cream-50 font-semibold">{product.name}</p>
                  <p className="text-text-muted text-sm">
                    <span className="capitalize">{product.type}</span>
                    {product.category_name && ` · ${product.category_name}`}
                  </p>
                </div>
                <Link
                  href={`/admin/lab/${product.slug}`}
                  className="text-lime-400 hover:text-lime-300 text-sm font-medium transition"
                >
                  Test preset
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
