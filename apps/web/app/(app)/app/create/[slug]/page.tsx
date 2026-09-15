import { notFound, redirect } from "next/navigation";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getSignedSourceUrlByAssetId } from "@/lib/generation/upload";
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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=${encodeURIComponent(`/app/create/${slug}`)}`);
  }

  const { data: product } = await getPublicProductBySlug(slug);
  if (!product) notFound();

  const balance = await getUserCreditBalance();

  // Adjust flow (?from=<generationId>): restore the source photo and the
  // options used for that run. Everything is re-validated at submit time —
  // this only prefills what the user already owned.
  let initialSource: { assetId: string; url: string; name: string } | null =
    null;
  let initialOptions: Record<string, unknown> | null = null;
  let initialSize: OutputSizeOption | null = null;

  if (from) {
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
      <CreateGenerationForm
        userId={user.id}
        product={product}
        initialBalance={balance}
        initialSource={initialSource}
        initialOptions={initialOptions}
        initialSize={initialSize}
      />
    </main>
  );
}
