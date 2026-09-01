import { requireAdmin } from "@/lib/db/admin";
import {
  getCategoriesForAdmin,
  createCategory,
  updateCategory,
  toggleCategoryActive,
} from "@/lib/db/categories";
import { CategoryManager } from "@/components/admin/category-manager";

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await getCategoriesForAdmin();

  return (
    <main className="p-8">
      <CategoryManager
        categories={categories}
        onCreate={createCategory}
        onUpdate={updateCategory}
        onToggleActive={toggleCategoryActive}
      />
    </main>
  );
}
