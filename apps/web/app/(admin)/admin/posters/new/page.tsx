import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/db/admin";
import { getCategories } from "@/lib/db/categories";
import { createProduct } from "@/lib/db/products";
import { getProviderModelCatalog } from "@/lib/db/provider-catalog";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewPosterPage() {
  await requireAdmin();
  const [categories, modelCatalog] = await Promise.all([
    getCategories(),
    getProviderModelCatalog(),
  ]);

  return (
    <>
      <div className="mb-6">
        <Link
          href="/admin/posters"
          className="text-text-muted hover:text-cream-100 inline-flex items-center gap-0.5 rounded-md py-0.5 text-[13px] transition-colors"
        >
          <CaretLeft size={14} />
          Posters
        </Link>
        <h1 className="text-cream-50 mt-2 text-3xl font-bold">New poster</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Create a poster preset. Provider and model default to the catalog —
          only type a custom value when the endpoint isn&apos;t listed.
        </p>
      </div>
      <ProductForm
        type="poster"
        categories={categories}
        modelCatalog={modelCatalog}
        onSubmit={createProduct}
      />
    </>
  );
}
