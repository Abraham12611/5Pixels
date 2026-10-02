"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SpinnerGap, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { BlurredResultStage } from "@/components/promo/blurred-result-stage";
import {
  createPendingGeneration,
  prepareTeaserSourceUpload,
} from "@/lib/teaser/pending";
import { cn } from "@/lib/utils";

type Stage = "idle" | "uploading" | "working" | "gate";

// Ambient progress copy only — M6 (02 §4): describe activity, never assert
// that a generation already happened.
const WORK_STAGES = ["Working…", "Balancing tones…", "Almost there…"];

/**
 * Anonymous teaser funnel (08 §1): upload → simulated progress → blurred
 * stage + signup gate. Zero provider calls — the pending_generation row
 * holds intent server-side until the user signs up and unlocks.
 */
export function TeaserFlow({
  productVersionId,
  presetName,
  heroUrl,
  creditCost,
  className,
}: {
  productVersionId: string | null;
  presetName: string;
  heroUrl: string | null;
  creditCost: number;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [workStage, setWorkStage] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [variant, setVariant] = useState({
    blurPx: 28,
    cropX: 7,
    cropY: 7,
    zoom: 1.1,
  });
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!productVersionId) {
      setError("This preset isn't available yet.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setStage("uploading");
    try {
      const init = await prepareTeaserSourceUpload(file.type, file.size);
      const upload = await fetch(init.signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error("Upload failed");

      setStage("working");
      // Simulated staged progress — nothing is generating server-side.
      for (let i = 0; i < WORK_STAGES.length; i++) {
        setWorkStage(i);
        await new Promise((r) => setTimeout(r, 900));
      }

      const pending = await createPendingGeneration({
        productVersionId,
        sourcePath: init.path,
        mimeType: file.type,
        size: file.size,
      });
      setVariant(pending.teaserVariant);
      setStage("gate");
    } catch {
      setError("Something went wrong — try another photo.");
      setStage("idle");
      setPreviewUrl(null);
    }
  }

  if (stage === "gate" && heroUrl) {
    return (
      <div className="fixed inset-0 z-50">
        <BlurredResultStage
          imageUrl={heroUrl}
          alt={`${presetName} result preview`}
          variant={variant}
          className="h-full w-full"
        >
          <h2 className="font-display text-cream-50 text-3xl font-bold leading-tight sm:text-4xl">
            Create an account to see your result
          </h2>
          <p className="text-text-secondary mt-3 max-w-sm text-sm">
            Sign up to reveal it — your photo and settings are saved.
          </p>
          <Button asChild variant="brand" size="lg" className="mt-6 w-full max-w-xs">
            <Link href="/signup?next=%2Fapp">Sign up</Link>
          </Button>
          <p className="text-text-muted mt-4 text-sm">
            Already have an account?{" "}
            <Link
              href="/login?next=%2Fapp"
              className="text-cream-100 underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </BlurredResultStage>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {stage === "idle" && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="border-cream-100/20 bg-charcoal-850 hover:border-lime-500/50 focus-visible:ring-lime-500/50 group flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center outline-none transition-colors focus-visible:ring-2"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Your photo"
              className="h-24 w-24 rounded-xl object-cover"
            />
          ) : (
            <span className="bg-charcoal-800 text-lime-400 flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-150 group-active:scale-95">
              <UploadSimple size={22} weight="bold" />
            </span>
          )}
          <span>
            <span className="text-cream-50 block text-sm font-semibold">
              Upload your photo
            </span>
            <span className="text-text-muted mt-0.5 block text-xs">
              JPEG, PNG or WebP · up to 20 MB · deleted after 7 days if you
              don&rsquo;t sign up
            </span>
          </span>
          <span className="text-lime-400 text-xs font-semibold">
            {creditCost > 0
              ? `${presetName} · ${creditCost} ${creditCost === 1 ? "credit" : "credits"}`
              : presetName}
          </span>
        </button>
      )}

      {(stage === "uploading" || stage === "working") && (
        <div className="border-cream-100/10 bg-charcoal-850 flex w-full flex-col items-center gap-4 rounded-2xl border px-6 py-10">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Your photo"
              className="h-20 w-20 rounded-xl object-cover opacity-80"
            />
          )}
          <span className="flex items-center gap-2 text-sm">
            <SpinnerGap size={16} className="text-lime-400 animate-spin" weight="bold" />
            <span className="text-cream-50">
              {stage === "uploading" ? "Uploading…" : WORK_STAGES[workStage]}
            </span>
          </span>
          <span className="bg-charcoal-700 h-1.5 w-48 overflow-hidden rounded-full">
            <span
              className="bg-lime-500 h-full rounded-full transition-all duration-700"
              style={{
                width:
                  stage === "uploading"
                    ? "20%"
                    : `${30 + workStage * 25}%`,
              }}
            />
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-error mt-2 text-center text-xs">
          {error}
        </p>
      )}

      <p className="text-text-muted mt-3 text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login?next=%2Fapp"
          className="text-lime-400 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
