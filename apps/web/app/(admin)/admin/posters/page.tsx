import { requireAdmin } from "@/lib/db/admin";
import {
  duplicateProduct,
  getProducts,
  transitionProductStatus,
} from "@/lib/db/products";
import { Button } from "@/components/ui/button";
import { PresetListRow } from "@/components/admin/preset-list-row";
import Link from "next/link";

export default async function PostersPage() {
  await requireAdmin();
  const posters = await getProducts("poster");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-cream-50 text-3xl font-bold">Posters</h1>
        <Button asChild>
          <Link href="/admin/posters/new">New poster</Link>
        </Button>
      </div>
      <p className="text-text-secondary mt-2">
        Manage cover, poster, and composition presets.
      </p>

      <div className="border-cream-100/10 bg-charcoal-850 mt-8 rounded-2xl border">
        {posters.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-cream-50 text-sm font-medium">No posters yet</p>
            <p className="text-text-secondary max-w-xs text-sm">
              Create the first poster preset to make it available in Explore.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/posters/new">New poster</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {posters.map((poster) => (
              <PresetListRow
                key={poster.id}
                name={poster.name}
                slug={poster.slug}
                status={poster.public_status}
                productId={poster.id}
                editHref={`/admin/posters/${poster.id}`}
                listHref="/admin/posters"
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
