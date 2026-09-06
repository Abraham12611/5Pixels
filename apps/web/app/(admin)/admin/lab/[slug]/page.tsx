import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/db/admin";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { TestLabForm } from "@/components/admin/test-lab-form";

export default async function AdminTestLabDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const { data: product } = await getPublicProductBySlug(slug);
  if (!product) notFound();

  const balance = await getUserCreditBalance();

  return (
    <main className="p-8">
      <Link
        href="/admin/lab"
        className="text-text-secondary hover:text-cream-100 text-sm transition"
      >
        ← Back to test lab
      </Link>

      <h1 className="text-cream-50 mt-4 text-3xl font-bold">
        Test {product.name}
      </h1>
      <p className="text-text-secondary mt-2">
        {product.short_description || product.long_description}
      </p>

      <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <p className="text-amber-300 text-sm">
          <strong>Admin test run.</strong> This uses your personal credit balance and stores the result in your generation history. The output is processed by the same pipeline as a consumer generation.
        </p>
      </div>

      <TestLabForm product={product} initialBalance={balance} />
    </main>
  );
}
