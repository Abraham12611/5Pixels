import { requireAdmin } from "@/lib/db/admin";
import { getProducts } from "@/lib/db/products";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function FiltersPage() {
  await requireAdmin();
  const filters = await getProducts("filter");

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-cream-50">Filters</h1>
        <Button asChild>
          <Link href="/admin/filters/new">New filter</Link>
        </Button>
      </div>
      <p className="mt-2 text-text-secondary">
        Manage style and transformation presets.
      </p>

      <div className="mt-8 rounded-2xl border border-cream-100/10 bg-charcoal-850">
        {filters.length === 0 ? (
          <p className="p-6 text-text-secondary">No filters yet.</p>
        ) : (
          <ul className="divide-y divide-cream-100/10">
            {filters.map((filter) => (
              <li key={filter.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-cream-50">{filter.name}</p>
                  <p className="text-sm text-text-muted">{filter.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-charcoal-700 px-3 py-1 text-xs text-cream-100">
                    {filter.public_status}
                  </span>
                  <Button asChild variant="secondary">
                    <Link href={`/admin/filters/${filter.id}`}>Edit</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
