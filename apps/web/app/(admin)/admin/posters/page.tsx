import { requireAdmin } from "@/lib/db/admin";
import { duplicateProduct, getProducts } from "@/lib/db/products";
import { Button } from "@/components/ui/button";
import { DuplicateButton } from "@/components/admin/duplicate-button";
import Link from "next/link";

export default async function PostersPage() {
  await requireAdmin();
  const posters = await getProducts("poster");

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-cream-50">Posters</h1>
        <Button asChild>
          <Link href="/admin/posters/new">New poster</Link>
        </Button>
      </div>
      <p className="mt-2 text-text-secondary">
        Manage cover, poster, and composition presets.
      </p>

      <div className="mt-8 rounded-2xl border border-cream-100/10 bg-charcoal-850">
        {posters.length === 0 ? (
          <p className="p-6 text-text-secondary">No posters yet.</p>
        ) : (
          <ul className="divide-y divide-cream-100/10">
            {posters.map((poster) => (
              <li key={poster.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-cream-50">{poster.name}</p>
                  <p className="text-sm text-text-muted">{poster.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-charcoal-700 px-3 py-1 text-xs text-cream-100">
                    {poster.public_status}
                  </span>
                  <DuplicateButton productId={poster.id} action={duplicateProduct} listHref="/admin/posters" />
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
