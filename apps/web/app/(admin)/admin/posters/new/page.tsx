import { requireAdmin } from "@/lib/db/admin";
import { getCategories } from "@/lib/db/categories";
import { createProduct } from "@/lib/db/products";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewPosterPage() {
  await requireAdmin();
  const categories = await getCategories();

  return (
    <main className="p-8">
      <ProductForm type="poster" categories={categories} onSubmit={createProduct} />
    </main>
  );
}
