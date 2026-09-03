import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssetUrl } from "@/lib/generation/upload";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";

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
    product_name: string;
    product_slug: string;
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

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/app">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/app/create/${generation.product_slug}`}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Create again
            </Link>
          </Button>
        </div>

        <h1 className="text-cream-50 text-3xl font-bold">
          {generation.product_name}
        </h1>

        {primaryOutput && outputUrl ? (
          <div className="border-cream-100/10 bg-charcoal-850 mt-6 overflow-hidden rounded-2xl border">
            <Image
              src={outputUrl}
              alt={`Generated result for ${generation.product_name}`}
              width={primaryOutput.width ?? 1024}
              height={primaryOutput.height ?? 1024}
              className="h-auto w-full"
              unoptimized
              priority
            />
          </div>
        ) : (
          <p className="text-text-secondary mt-6">No output image found.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {outputUrl && (
            <Button asChild variant="secondary">
              <a href={outputUrl} download target="_blank" rel="noreferrer">
                Download result
              </a>
            </Button>
          )}
        </div>

        {sourceUrl && (
          <div className="mt-8">
            <p className="text-text-secondary mb-3 text-sm">Source photo</p>
            <Image
              src={sourceUrl}
              alt="Source"
              width={256}
              height={256}
              className="rounded-xl"
              unoptimized
            />
          </div>
        )}
      </div>
    </main>
  );
}
