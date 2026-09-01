import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateGenerationForm } from "./create-form";

export default async function CreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=${encodeURIComponent(`/app/create/${slug}`)}`);
  }

  const { data: product } = await getPublicProductBySlug(slug);
  if (!product) notFound();

  const balance = await getUserCreditBalance();

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-cream-100/10 bg-charcoal-850 border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/presets/${slug}`} prefetch={false}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-cream-50 text-2xl font-bold sm:text-3xl">
          Create with {product.name}
        </h1>
        <p className="text-text-secondary mt-2">
          {product.short_description || product.long_description}
        </p>

        <CreateGenerationForm
          userId={user.id}
          product={product}
          initialBalance={balance}
        />
      </div>
    </main>
  );
}
