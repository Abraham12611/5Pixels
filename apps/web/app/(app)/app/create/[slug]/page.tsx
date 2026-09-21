import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { LogoMark } from "@/components/logo-mark";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getSignedSourceUrlByAssetId } from "@/lib/generation/upload";
import { getPlansForPurchase } from "@/lib/db/plans";
import { CreateGenerationForm } from "./create-form";
import type { OutputSizeOption } from "@/types/catalog";

export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product } = await getPublicProductBySlug(slug);
  if (!product) notFound();

  const [balance, generationCount, plans] = await Promise.all([
    user ? getUserCreditBalance() : Promise.resolve(0),
    user
      ? supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    getPlansForPurchase(),
  ]);

  const generationPaused = process.env.GENERATION_PAUSED === "true";

  // Adjust flow (?from=<generationId>): restore the source photo and the
  // options used for that run. Everything is re-validated at submit time —
  // this only prefills what the user already owned.
  let initialSource: { assetId: string; url: string; name: string } | null =
    null;
  let initialOptions: Record<string, unknown> | null = null;
  let initialSize: OutputSizeOption | null = null;

  if (from && user) {
    const { data: previous } = await supabase
      .from("generations")
      .select("product_id, source_asset_id, requested_options, progress")
      .eq("id", from)
      .eq("user_id", user.id)
      .single();

    if (previous && previous.product_id === product.id) {
      if (previous.source_asset_id) {
        const url = await getSignedSourceUrlByAssetId(
          previous.source_asset_id
        );
        if (url) {
          initialSource = {
            assetId: previous.source_asset_id,
            url,
            name: "Your previous photo",
          };
        }
      }
      if (
        previous.requested_options &&
        typeof previous.requested_options === "object"
      ) {
        initialOptions = previous.requested_options as Record<string, unknown>;
      }
      const progress = previous.progress as Record<string, unknown> | null;
      const prevW = Number(progress?.output_width);
      const prevH = Number(progress?.output_height);
      if (prevW > 0 && prevH > 0) {
        initialSize =
          product.output_sizes?.find(
            (s) => s.width === prevW && s.height === prevH
          ) ?? null;
      }
    }
  }

  return (
    <main className="flex flex-1 flex-col lg:max-h-[calc(100dvh-3.5rem)]">
      {!user && (
        <header className="border-cream-100/10 flex items-center justify-between border-b px-4 py-3">
          <Link
            href="/explore"
            className="text-text-secondary hover:text-cream-50 flex items-center gap-1.5 text-sm transition-colors"
          >
            <CaretLeft size={15} weight="bold" />
            Explore
          </Link>
          <LogoMark className="h-6 w-6" />
          <Link
            href={`/login?next=${encodeURIComponent(`/app/create/${slug}`)}`}
            className="text-lime-400 text-sm font-semibold"
          >
            Sign in
          </Link>
        </header>
      )}
      <CreateGenerationForm
        userId={user?.id ?? null}
        product={product}
        initialBalance={balance}
        hasPriorGenerations={generationCount > 0}
        generationPaused={generationPaused}
        initialSource={initialSource}
        initialOptions={initialOptions}
        initialSize={initialSize}
        plans={plans}
      />
    </main>
  );
}
