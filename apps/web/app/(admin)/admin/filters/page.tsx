import { requireAdmin } from "@/lib/db/admin";
import {
  duplicateProduct,
  getProducts,
  transitionProductStatus,
} from "@/lib/db/products";
import { Button } from "@/components/ui/button";
import { DuplicateButton } from "@/components/admin/duplicate-button";
import { ProductActions } from "@/components/admin/product-actions";
import Link from "next/link";

export default async function FiltersPage() {
  await requireAdmin();
  const filters = await getProducts("filter");

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-cream-50 text-3xl font-bold">Filters</h1>
        <Button asChild>
          <Link href="/admin/filters/new">New filter</Link>
        </Button>
      </div>
      <p className="text-text-secondary mt-2">
        Manage style and transformation presets.
      </p>

      <div className="border-cream-100/10 bg-charcoal-850 mt-8 rounded-2xl border">
        {filters.length === 0 ? (
          <p className="text-text-secondary p-6">No filters yet.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {filters.map((filter) => (
              <li
                key={filter.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-cream-50 font-semibold">{filter.name}</p>
                  <p className="text-text-muted text-sm">{filter.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="bg-charcoal-700 text-cream-100 rounded-full px-3 py-1 text-xs">
                    {filter.public_status}
                  </span>
                  <ProductActions
                    productId={filter.id}
                    status={filter.public_status}
                    action={transitionProductStatus}
                  />
                  <DuplicateButton
                    productId={filter.id}
                    action={duplicateProduct}
                    listHref="/admin/filters"
                  />
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
