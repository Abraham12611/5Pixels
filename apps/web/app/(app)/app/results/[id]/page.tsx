import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssetUrl } from "@/lib/generation/upload";
import { getMyFeedbackForGeneration } from "@/lib/db/feedback";
import { getUserFavoriteProductIds } from "@/lib/db/explore";
import { ResultCompare } from "@/components/consumer/result-compare";
import { ResultActions } from "@/components/consumer/result-actions";
import { ResultFeedback } from "@/components/consumer/result-feedback";
import { ChevronLeft } from "lucide-react";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=${encodeURIComponent(`/app/results/${id}`)}`);
  }

  const { data, error } = await supabase.rpc("get_user_generation_by_id", {
    p_generation_id: id,
  });

  if (error || !data || (data as unknown[]).length === 0) {
    notFound();
  }

  const generation = (data as unknown[])[0] as {
    id: string;
    status: string;
    product_id: string;
    product_name: string;
    product_slug: string;
    credit_cost: number;
    created_at: string;
    failure_code: string | null;
    failure_stage: string | null;
    source_bucket: string | null;
    source_storage_key: string | null;
    outputs: Array<{
      asset_id: string;
      bucket: string;
      storage_key: string;
      mime_type: string | null;
      width: number | null;
      height: number | null;
    }>;
  };

  if (generation.status !== "completed") {
    redirect(`/app/generations/${id}`);
  }

  const primaryOutput = generation.outputs[0];
  let outputUrl: string | null = null;
  let sourceUrl: string | null = null;

  const [myFeedback, shareMetaResult, favoriteIds] = await Promise.all([
    getMyFeedbackForGeneration(id),
    supabase
      .from("generations")
      .select("public_share_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    getUserFavoriteProductIds(),
  ]);
  const shareMeta = shareMetaResult.data;

  if (primaryOutput) {
    outputUrl = await getSignedAssetUrl(
      primaryOutput.bucket,
      primaryOutput.storage_key,
      600
    );
  }

  if (generation.source_bucket && generation.source_storage_key) {
    sourceUrl = await getSignedAssetUrl(
      generation.source_bucket,
      generation.source_storage_key,
      600
    );
  }

  const createdLabel = generation.created_at
    ? new Date(generation.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-4xl space-y-5">
        {/* Context row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/app"
            className="text-text-muted hover:text-cream-100 -ml-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[13px] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Library
          </Link>
          <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">
            Result
          </span>
          <Link
            href={`/presets/${generation.product_slug}`}
            className="text-cream-50 hover:text-lime-400 text-sm font-semibold transition-colors"
          >
            {generation.product_name}
          </Link>
          <span className="text-text-muted text-xs">
            {[
              createdLabel,
              generation.credit_cost > 0
                ? `${generation.credit_cost} ${
                    generation.credit_cost === 1 ? "credit" : "credits"
                  }`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>

        {/* Hero media + optional compare */}
        {primaryOutput && outputUrl ? (
          <ResultCompare
            resultUrl={outputUrl}
            originalUrl={sourceUrl}
            resultAlt={`${generation.product_name} result`}
            width={primaryOutput.width ?? 1024}
            height={primaryOutput.height ?? 1024}
          />
        ) : (
          <div className="media-frame bg-charcoal-850 flex aspect-video w-full items-center justify-center rounded-xl">
            <p className="text-text-muted text-sm">No output image found.</p>
          </div>
        )}

        {/* Action console */}
        <ResultActions
          generationId={generation.id}
          productId={generation.product_id}
          productSlug={generation.product_slug}
          creditCost={generation.credit_cost}
          downloadUrl={outputUrl}
          initialShareId={shareMeta?.public_share_id ?? null}
          initialIsFavorite={favoriteIds.includes(generation.product_id)}
          returnPath={`/app/results/${generation.id}`}
        />

        {/* Feedback strip */}
        <ResultFeedback
          generationId={id}
          initialRating={myFeedback?.rating ?? null}
          initialNotes={myFeedback?.notes ?? null}
        />
      </div>
    </main>
  );
}
