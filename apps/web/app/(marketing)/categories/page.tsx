import Link from "next/link";
import { getActiveCategories, getPublicProducts } from "@/lib/db/explore";
import { ProductVideoCard } from "@/components/marketing/product-video-card";

export default async function CategoriesPage() {
  const [categories, { data: allProducts }] = await Promise.all([
    getActiveCategories(),
    getPublicProducts(undefined, undefined, undefined, undefined, "featured", 1, 96),
  ]);

  const productsByCategory = new Map<string, typeof allProducts>();
  for (const product of allProducts) {
    if (!product.category_slug) continue;
    const list = productsByCategory.get(product.category_slug) ?? [];
    list.push(product);
    productsByCategory.set(product.category_slug, list);
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="text-cream-50 text-3xl font-bold sm:text-4xl">
          Categories
        </h1>
        <p className="text-text-secondary mt-2">
          Browse presets by category.
        </p>

        <div className="mt-10 space-y-14">
          {categories.map((category) => {
            const products = productsByCategory.get(category.slug) ?? [];
            return (
              <section key={category.slug}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-cream-50 text-xl font-bold tracking-tight uppercase md:text-2xl">
                    {category.name}
                  </h2>
                  <Link
                    href={`/explore?category=${category.slug}`}
                    className="text-[#D1FE17] text-sm font-semibold hover:underline"
                  >
                    View all
                  </Link>
                </div>
                {products.length === 0 ? (
                  <p className="text-text-muted text-sm">
                    No presets in this category yet.
                  </p>
                ) : (
                  <div className="columns-2 gap-2 md:columns-3 lg:columns-4 [&>*]:mb-2 [&>*]:break-inside-avoid">
                    {products.slice(0, 8).map((product, index) => (
                      <ProductVideoCard
                        key={product.id}
                        product={product}
                        priority={index < 2}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
