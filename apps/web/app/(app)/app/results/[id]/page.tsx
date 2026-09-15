import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssetUrl } from "@/lib/generation/upload";
import { getMyFeedbackForGeneration } from "@/lib/db/feedback";
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
    credit_cost: number | string;
    created_at: string;
    failure_code: string | null;
    failure_stage: string | null;
    output_asset_id: string | null;
    output_bucket: string | null;
    output_storage_key: string | null;
    output_width: number | null;
    output_height: number | null;
    source_bucket: string | null;
    source_storage_key: string | null;
    saved_at: string | null;
  };

  if (generation.status !== "completed") {
    redirect(`/app/generations/${id}`);
  }

  let outputUrl: string | null = null;
  let sourceUrl: string | null = null;

  const [myFeedback, shareMetaResult] = await Promise.all([
    getMyFeedbackForGeneration(id),
    supabase
      .from("generations")
      .select("public_share_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
  ]);
  const shareMeta = shareMetaResult.data;

  if (generation.output_bucket && generation.output_storage_key) {
    outputUrl = await getSignedAssetUrl(
      generation.output_bucket,
      generation.output_storage_key,
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

  const creditCost = Number(generation.credit_cost) || 0;
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
            href="/app/library"
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
              creditCost > 0
                ? `${creditCost} ${creditCost === 1 ? "credit" : "credits"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>

        {/* Hero media + optional compare */}
        {outputUrl ? (
          <ResultCompare
            resultUrl={outputUrl}
            originalUrl={sourceUrl}
            resultAlt={`${generation.product_name} result`}
            width={generation.output_width ?? 1024}
            height={generation.output_height ?? 1024}
          />
        ) : (
          <div className="media-frame bg-charcoal-850 flex aspect-video w-full items-center justify-center rounded-xl">
            <p className="text-text-muted text-sm">No output image found.</p>
          </div>
        )}

        {/* Action console */}
        <ResultActions
          generationId={generation.id}
          productSlug={generation.product_slug}
          creditCost={creditCost}
          downloadUrl={outputUrl}
          initialShareId={shareMeta?.public_share_id ?? null}
          initialSaved={Boolean(generation.saved_at)}
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
