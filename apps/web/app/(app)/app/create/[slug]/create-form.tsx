"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import { ArrowRight, Sparkle, Warning } from "@phosphor-icons/react";
import {
  AdjustAccordion,
  GenerationControls,
  PosterTextFields,
} from "@/components/consumer/generation-controls";
import { StudioStage } from "@/components/consumer/studio-stage";
import { AspectRatioMenu } from "@/components/consumer/aspect-ratio-menu";
import { SettingTile } from "@/components/consumer/setting-tile";
import { CreditConfirmDialog } from "@/components/consumer/credit-confirm-dialog";
import { InsufficientCreditsDialog } from "@/components/consumer/insufficient-credits-dialog";
import { AuthGateModal } from "@/components/consumer/auth-gate-modal";
import { PaywallSheet } from "@/components/consumer/paywall-sheet";
import { Button } from "@/components/ui/button";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
import { validateGenerationOptions } from "@/lib/generation/validation";
import { createAndSubmitGeneration } from "@/lib/generation/actions";
import { estimateGenerationCost } from "@/lib/billing/credit-cost";
import {
  shouldConfirmCost,
  SKIP_COST_CONFIRM_KEY,
} from "@/lib/generation/credit-confirm";
import {
  finalizeSourceUpload,
  prepareSourceUpload,
} from "@/lib/generation/upload";
import {
  clearStudioDraft,
  loadStudioDraft,
  saveStudioDraft,
} from "@/lib/anonymous-draft";
import { cn } from "@/lib/utils";
import type { PublicProductDetail, OutputSizeOption } from "@/types/catalog";
import type { PlanForPurchase } from "@/lib/db/plans";

interface ReusedSource {
  assetId: string;
  url: string;
  name: string;
}

interface CreateGenerationFormProps {
  /** null when anonymous — the studio works without an account until Generate. */
  userId: string | null;
  product: PublicProductDetail;
  initialBalance: number;
  /** Whether the user has any prior generation — drives first-run cost confirmation. */
  hasPriorGenerations: boolean;
  /** Degraded mode: transformations paused, browsing still available. */
  generationPaused?: boolean;
  /** Pre-filled source from an earlier generation (Adjust flow). */
  initialSource?: ReusedSource | null;
  initialOptions?: Record<string, unknown> | null;
  initialSize?: OutputSizeOption | null;
  /** Purchasable plans for the credits paywall (insufficient balance). */
  plans: PlanForPurchase[];
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 20 * 1024 * 1024;

function getDefaultSize(sizes: OutputSizeOption[] | undefined): OutputSizeOption {
  const available = sizes?.length
    ? sizes
    : [{ name: "Square (1:1)", width: 1024, height: 1024, is_default: true }];
  return available.find((s) => s.is_default) ?? available[0]!;
}

const SUBMIT_STEPS = [
  "Uploading your photo",
  "Preparing the transformation",
  "Starting",
] as const;

function submitStepIndex(progress: string): number {
  if (progress.startsWith("Preparing secure")) return 0;
  if (progress.startsWith("Uploading")) return 0;
  if (progress.startsWith("Finalizing")) return 1;
  return 2;
}

export function CreateGenerationForm({
  userId,
  product,
  initialBalance,
  hasPriorGenerations,
  generationPaused = false,
  initialSource,
  initialOptions,
  initialSize,
  plans,
}: CreateGenerationFormProps) {
  const isAnonymous = userId === null;
  const [file, setFile] = useState<File | null>(null);
  const [reusedSource, setReusedSource] = useState<ReusedSource | null>(
    initialSource ?? null
  );
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of sortFields(product.active_fields)) {
      defaults[field.field_key] = normalizeField(field).defaultValue;
    }
    return initialOptions ? { ...defaults, ...initialOptions } : defaults;
  });
  const [selectedSize, setSelectedSize] = useState<OutputSizeOption>(
    () => initialSize ?? getDefaultSize(product.output_sizes)
  );
  // Real dims of the loaded photo — drives "Match photo" previews/estimates.
  const [sourceDims, setSourceDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  const isPoster = product.type === "poster";
  // Poster text fields live in their own "Your text" section (08 §4).
  const posterTextKeys = new Set(
    isPoster
      ? product.active_fields
          .filter((f) => f.field_type === "short_text")
          .map((f) => f.field_key)
      : []
  );
  const controlFields = isPoster
    ? product.active_fields.filter((f) => !posterTextKeys.has(f.field_key))
    : product.active_fields;
  const hasSource = Boolean(file) || Boolean(reusedSource);
  const canAfford = isAnonymous
    ? true
    : estimatedCost !== null && estimatedCost > 0
      ? initialBalance >= estimatedCost
      : initialBalance >= product.credit_cost;

  const outputSizes = useMemo(
    () =>
      product.output_sizes?.length
        ? product.output_sizes
        : ([{
            name: "Square (1:1)",
            width: 1024,
            height: 1024,
            is_default: true,
          }] as OutputSizeOption[]),
    [product.output_sizes]
  );

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return reusedSource?.url ?? null;
  }, [file, reusedSource]);

  // Decode the preview once to learn the photo's real dimensions.
  useEffect(() => {
    if (!previewUrl) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setSourceDims({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      }
    };
    img.src = previewUrl;
    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && file) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, file]);

  const presetThumb = useMemo(() => {
    const asset =
      product.public_assets?.find((a) => a.role === "hero") ??
      product.public_assets?.[0];
    if (!asset) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${asset.bucket}/${asset.storage_key}`;
  }, [product.public_assets]);

  // Narrow viewport → paywall sheet; wide → the existing dialog.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Restore a staged draft after the auth round trip (?draft=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== "1") return;
    let cancelled = false;

    void loadStudioDraft(product.slug).then((draft) => {
      if (cancelled || !draft) return;
      const restored = new File([draft.file], draft.fileName, {
        type: draft.fileType,
      });
      setFile(restored);
      setReusedSource(null);
      setOptions((prev) => ({ ...prev, ...draft.options }));
      if (draft.sizeName) {
        const match = product.output_sizes?.find(
          (s) => s.name === draft.sizeName
        );
        if (match) setSelectedSize(match);
      }
      params.delete("draft");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`
      );
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  // Anonymous setups persist to IndexedDB so the auth redirect can't lose them.
  useEffect(() => {
    if (!isAnonymous) return;
    const handle = setTimeout(() => {
      if (!file) return;
      void saveStudioDraft({
        slug: product.slug,
        file,
        fileName: file.name,
        fileType: file.type,
        options,
        sizeName: selectedSize.name ?? null,
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [isAnonymous, file, options, selectedSize, product.slug]);

  useEffect(() => {
    let cancelled = false;

    async function loadEstimate() {
      if (!product.version_id) return;
      // "Match photo" is billed on the resolved source dims — estimate with
      // the measured photo size when we have it.
      const estimateSize =
        selectedSize.match_source && sourceDims
          ? { ...selectedSize, ...sourceDims }
          : selectedSize;
      const { estimatedCredits, providerEndpoint } =
        await estimateGenerationCost({
          productVersionId: product.version_id,
          outputSize: estimateSize,
        });

      if (cancelled) return;

      if (providerEndpoint === null) {
        setEstimatedCost(product.credit_cost);
        return;
      }

      setEstimatedCost(
        estimatedCredits > 0 ? estimatedCredits : product.credit_cost
      );
    }

    loadEstimate();
    return () => {
      cancelled = true;
    };
  }, [product.version_id, product.credit_cost, selectedSize, sourceDims]);

  const handleFileSelected = useCallback((selected: File | null) => {
    setError("");
    setSourceDims(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Please select a JPEG, PNG, or WebP image.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_SIZE) {
      setError("Image must be 20 MB or smaller.");
      setFile(null);
      return;
    }
    setReusedSource(null);
    setFile(selected);
  }, []);

  const handleClearSource = useCallback(() => {
    setFile(null);
    setReusedSource(null);
    setSourceDims(null);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setProgress("");

    if (!hasSource) {
      setError("Add a photo to get started.");
      return;
    }
    if (!product.version_id) {
      setError("This look isn't available right now.");
      return;
    }
    if (generationPaused) {
      return;
    }

    const validation = validateGenerationOptions(
      product.active_fields,
      options
    );
    if (validation) {
      setError(validation.message);
      return;
    }

    // Deferred auth: anonymous setups are fully prepared first — the account
    // prompt only appears at the moment of intent.
    if (isAnonymous) {
      void saveStudioDraft({
        slug: product.slug,
        file: file!,
        fileName: file!.name,
        fileType: file!.type,
        options,
        sizeName: selectedSize.name ?? null,
      });
      setAuthGateOpen(true);
      return;
    }

    if (!canAfford) {
      setInsufficientOpen(true);
      return;
    }

    let skipPreference = false;
    try {
      skipPreference =
        localStorage.getItem(SKIP_COST_CONFIRM_KEY) === "1";
    } catch {
      // storage unavailable — treat as not skipped
    }

    const cost = estimatedCost ?? product.credit_cost;
    if (
      shouldConfirmCost({
        cost,
        hasPriorGenerations,
        skipPreference,
      })
    ) {
      setConfirmOpen(true);
      return;
    }

    void runGeneration();
  };

  const runGeneration = async () => {
    setLoading(true);

    try {
      let sourceAssetId = reusedSource?.assetId ?? null;

      if (file) {
        setProgress("Preparing secure upload...");
        const { signedUrl, path } = await prepareSourceUpload(
          file.type,
          file.size
        );

        setProgress("Uploading image...");
        const upload = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!upload.ok) {
          throw new Error("Image upload failed. Please try again.");
        }

        setProgress("Finalizing upload...");
        const finalized = await finalizeSourceUpload(
          path,
          file.type,
          file.size
        );
        sourceAssetId = finalized.assetId;
      }

      if (!sourceAssetId) {
        throw new Error("Add a photo to get started.");
      }

      setProgress("Starting generation...");
      void clearStudioDraft();
      const idempotencyKey = `create:${userId}:${product.id}:${uuidv4()}`;
      const result = await createAndSubmitGeneration({
        productId: product.id,
        productVersionId: product.version_id ?? "",
        sourceAssetId,
        options,
        outputSize: selectedSize,
        idempotencyKey,
      });

      if (result?.error) {
        setError(result.error);
      }
      // On success the server action redirects. On idempotent retry it also redirects.
    } catch (err) {
      if (
        err instanceof Error &&
        ((err as { digest?: string }).digest === "NEXT_REDIRECT" ||
          err.message === "NEXT_REDIRECT")
      ) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const displayCost = estimatedCost ?? product.credit_cost;
  const stepIndex = submitStepIndex(progress);

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col lg:flex-row">
      {/* Configuration rail */}
      <aside className="border-cream-100/10 order-last flex w-full shrink-0 flex-col lg:order-first lg:max-h-full lg:w-[340px] lg:overflow-y-auto lg:border-r xl:w-[370px]">
        <div className="flex-1 space-y-6 px-4 py-6 sm:px-5">
          {/* Preset context card */}
          <div className="shadow-border flex items-center gap-3 rounded-lg bg-charcoal-800/80 p-3">
            {presetThumb ? (
              <div className="media-frame relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                <Image
                  src={presetThumb}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="media-frame flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-charcoal-700">
                <Sparkle size={20} weight="fill" className="text-lime-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-cream-50 truncate text-sm font-semibold">
                {product.name}
              </p>
              <p className="text-text-muted text-xs capitalize">
                {product.type} look
              </p>
            </div>
            <Link
              href="/explore"
              className="text-text-secondary hover:text-lime-400 flex shrink-0 items-center gap-1 text-xs font-medium transition-colors"
            >
              Change
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>

          {/* Source status line */}
          <div>
            <p className="text-text-muted mb-2 text-[11px] font-semibold uppercase tracking-wide">
              Source
            </p>
            {hasSource ? (
              <p className="text-text-secondary flex items-center gap-2 text-[13px]">
                <span className="bg-lime-400 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span className="truncate">
                  {file?.name ?? reusedSource?.name ?? "Photo added"}
                </span>
              </p>
            ) : (
              <p className="text-text-muted text-[13px]">
                No photo yet — add one in the workspace.
              </p>
            )}
          </div>

          {/* Preset controls — a collapsed accordion on mobile (08 §4). */}
          <div>
            <div className="mb-2.5 hidden items-baseline justify-between md:flex">
              <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wide">
                Adjust the look
              </p>
              {!hasSource && (
                <span className="text-text-muted text-[11px]">
                  Add a photo first
                </span>
              )}
            </div>
            {controlFields.length > 0 ? (
              <AdjustAccordion count={controlFields.length + 1}>
                <GenerationControls
                  fields={controlFields}
                  values={options}
                  disabled={!hasSource || loading}
                  onChange={setOptions}
                />
                <SettingTile label="Output size" disabled={loading}>
                  <AspectRatioMenu
                    sizes={outputSizes}
                    selected={selectedSize}
                    disabled={loading}
                    onChange={setSelectedSize}
                    sourceDims={sourceDims}
                  />
                </SettingTile>
              </AdjustAccordion>
            ) : (
              <>
                <GenerationControls
                  fields={controlFields}
                  values={options}
                  disabled={!hasSource || loading}
                  onChange={setOptions}
                />
                <div className="mt-2.5">
                  <SettingTile label="Output size" disabled={loading}>
                    <AspectRatioMenu
                      sizes={outputSizes}
                      selected={selectedSize}
                      disabled={loading}
                      onChange={setSelectedSize}
                      sourceDims={sourceDims}
                    />
                  </SettingTile>
                </div>
              </>
            )}
            {isPoster && posterTextKeys.size === 0 && (
              <p className="text-text-muted mt-3 text-[11px]">
                Posters include text rendered over the finished image.
              </p>
            )}
          </div>

          {/* Poster copy — its own section, rendered exactly as typed. */}
          {isPoster && posterTextKeys.size > 0 && (
            <div>
              <p className="text-text-muted mb-2.5 text-[11px] font-semibold uppercase tracking-wide">
                Your text
              </p>
              <PosterTextFields
                fields={product.active_fields}
                values={options}
                disabled={!hasSource || loading}
                onChange={setOptions}
              />
              <p className="text-text-muted mt-2 text-[11px]">
                Text is rendered exactly as typed.
              </p>
            </div>
          )}
        </div>

        {/* Sticky generate console */}
        <div className="border-cream-100/10 bg-charcoal-850/95 sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.5rem)] border-t px-4 py-4 backdrop-blur sm:px-5 lg:bottom-0">
          {error && (
            <p className="bg-error/10 text-error mb-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs">
              <Warning size={14} weight="fill" className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <div className="mb-3 flex items-baseline justify-between text-[13px]">
            <span className="text-text-secondary">Cost</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                canAfford ? "text-cream-50" : "text-error"
              )}
            >
              {displayCost} {displayCost === 1 ? "credit" : "credits"}
            </span>
          </div>
          {!isAnonymous && (
            <div className="mb-3 flex items-baseline justify-between text-[13px]">
              <span className="text-text-secondary">Balance</span>
              <span
                className={cn(
                  "tabular-nums",
                  canAfford ? "text-text-secondary" : "text-error"
                )}
              >
                {initialBalance} {initialBalance === 1 ? "credit" : "credits"}
              </span>
            </div>
          )}
          {isAnonymous && (
            <p className="text-text-muted mb-3 text-[11px]">
              No account needed to prepare — sign in only when you generate.
            </p>
          )}
          {generationPaused && (
            <p
              role="status"
              className="text-text-secondary border-cream-100/10 bg-charcoal-800 mb-3 rounded-md border px-3 py-2 text-xs"
            >
              Transformations are temporarily paused. You can keep preparing —
              Generate will be back shortly.
            </p>
          )}
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={loading || !hasSource || generationPaused}
          >
            {loading ? "Working…" : "Generate"}
          </Button>
        </div>
      </aside>

      {/* Visual stage */}
      <StudioStage
        previewUrl={previewUrl}
        sourceName={file?.name ?? reusedSource?.name ?? null}
        aspectRatio={
          selectedSize.match_source
            ? sourceDims
              ? sourceDims.width / sourceDims.height
              : null
            : selectedSize.width && selectedSize.height
              ? selectedSize.width / selectedSize.height
              : null
        }
        disabled={loading}
        submitting={loading}
        submitStepIndex={stepIndex}
        submitStepLabel={SUBMIT_STEPS[Math.min(stepIndex, 2)]}
        onFileSelected={handleFileSelected}
        onClear={handleClearSource}
      />

      <CreditConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        cost={displayCost}
        balance={initialBalance}
        onConfirm={() => void runGeneration()}
      />
      {isNarrow ? (
        <PaywallSheet
          open={insufficientOpen}
          onOpenChange={setInsufficientOpen}
          plans={plans}
          required={displayCost}
          presetName={product.name}
        />
      ) : (
        <InsufficientCreditsDialog
          open={insufficientOpen}
          onOpenChange={setInsufficientOpen}
          required={displayCost}
          balance={initialBalance}
          presetName={product.name}
          presetThumbUrl={presetThumb}
        />
      )}
      <AuthGateModal
        open={authGateOpen}
        onOpenChange={setAuthGateOpen}
        nextPath={`/app/create/${product.slug}?draft=1`}
        onBeforeLeave={() =>
          file
            ? saveStudioDraft({
                slug: product.slug,
                file,
                fileName: file.name,
                fileType: file.type,
                options,
                sizeName: selectedSize.name ?? null,
              })
            : undefined
        }
      />
    </form>
  );
}
