import Image from "next/image";
import Link from "next/link";
import { CaretRight, Flask } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/db/admin";
import {
  getAdminLabProducts,
  getProductAssetPreviews,
} from "@/lib/db/products";

export default async function AdminLabPage() {
  await requireAdmin();
  const products = await getAdminLabProducts();

  const previews = await getProductAssetPreviews(
    products.map((p) => p.hero_asset_id)
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-cream-50 text-3xl font-bold">Test lab</h1>
      </div>
      <p className="text-text-secondary mt-2 max-w-2xl">
        Run any preset — including drafts — against one or more provider models
        and compare the results side by side. Uses your personal credit balance
        at each model&apos;s real rate.
      </p>

      {products.length === 0 ? (
        <div className="border-cream-100/10 bg-charcoal-850 mt-8 flex flex-col items-center gap-3 rounded-2xl border px-6 py-14 text-center">
          <span className="bg-charcoal-800 text-text-muted rounded-[15px] p-4">
            <Flask size={24} />
          </span>
          <p className="text-cream-50 text-sm font-medium">
            No presets to test
          </p>
          <p className="text-text-secondary max-w-xs text-sm">
            Create a filter or poster to make it available in the lab.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => {
            const preview = product.hero_asset_id
              ? previews[product.hero_asset_id]
              : undefined;
            return (
              <Link
                key={product.id}
                href={`/admin/lab/${product.slug}`}
                className="group"
              >
                <div className="border-cream-100/10 bg-charcoal-850 group-hover:border-cream-100/25 overflow-hidden rounded-2xl border transition-colors">
                  <div className="bg-charcoal-900 relative aspect-[4/5]">
                    {preview ? (
                      <Image
                        src={preview.publicUrl}
                        alt={product.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="text-text-muted flex h-full items-center justify-center">
                        <Flask size={22} />
                      </div>
                    )}
                    <span className="bg-charcoal-900/80 text-cream-100 absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur">
                      {product.type}
                    </span>
                    {product.public_status !== "active" && (
                      <span className="bg-charcoal-900/80 text-warning absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur">
                        {product.public_status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="text-cream-50 truncate text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="text-text-muted mt-0.5 text-xs">
                        {product.credit_cost} credit
                        {product.credit_cost === 1 ? "" : "s"}
                      </p>
                    </div>
                    <CaretRight
                      size={15}
                      className="text-text-muted group-hover:text-cream-100 shrink-0 transition-colors"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
