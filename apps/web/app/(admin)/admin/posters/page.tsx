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

export default async function PostersPage() {
  await requireAdmin();
  const posters = await getProducts("poster");

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
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
          <p className="text-text-secondary p-6">No posters yet.</p>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {posters.map((poster) => (
              <li
                key={poster.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-cream-50 font-semibold">{poster.name}</p>
                  <p className="text-text-muted text-sm">{poster.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="bg-charcoal-700 text-cream-100 rounded-full px-3 py-1 text-xs">
                    {poster.public_status}
                  </span>
                  <ProductActions
                    productId={poster.id}
                    status={poster.public_status}
                    action={transitionProductStatus}
                  />
                  <DuplicateButton
                    productId={poster.id}
                    action={duplicateProduct}
                    listHref="/admin/posters"
                  />
                  <Button asChild variant="secondary">
                    <Link href={`/admin/posters/${poster.id}`}>Edit</Link>
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
