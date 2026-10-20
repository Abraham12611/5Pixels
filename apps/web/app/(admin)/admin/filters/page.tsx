import { requireAdmin } from "@/lib/db/admin";
import {
  duplicateProduct,
  getProducts,
  transitionProductStatus,
} from "@/lib/db/products";
import { Button } from "@/components/ui/button";
import { PresetListRow } from "@/components/admin/preset-list-row";
import Link from "next/link";

export default async function FiltersPage() {
  await requireAdmin();
  const filters = await getProducts("filter");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-cream-50 text-sm font-medium">No filters yet</p>
            <p className="text-text-secondary max-w-xs text-sm">
              Create the first style preset to make it available in Explore.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/filters/new">New filter</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {filters.map((filter) => (
              <PresetListRow
                key={filter.id}
                name={filter.name}
                slug={filter.slug}
                status={filter.public_status}
                productId={filter.id}
                editHref={`/admin/filters/${filter.id}`}
                listHref="/admin/filters"
                statusAction={transitionProductStatus}
                duplicateAction={duplicateProduct}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
