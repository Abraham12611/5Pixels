"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichSelect } from "@/components/ui/rich-select";
import { GenerationControls } from "@/components/consumer/generation-controls";
import { LabModelPicker } from "./lab-model-picker";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
import { validateGenerationOptions } from "@/lib/generation/validation";
import {
  finalizeSourceUpload,
  prepareSourceUpload,
} from "@/lib/generation/upload";
import { pollLabGeneration, runLabGeneration } from "@/lib/lab/actions";
import {
  CloudArrowUp,
  Rectangle,
  Spinner,
  Square,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { PublicProductDetail, OutputSizeOption } from "@/types/catalog";
import type { ProviderModelOption } from "@/lib/db/provider-catalog";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 20 * 1024 * 1024;
const TERMINAL = new Set(["completed", "failed", "cancelled", "blocked"]);
const POLL_INTERVAL_MS = 3500;

interface LabRun {
  endpointId: string;
  displayName: string;
  generationId?: string;
  status: "submitting" | "running" | "completed" | "failed" | "error";
  imageUrl?: string | null;
  error?: string;
  creditCost?: number;
}

interface LabWorkspaceProps {
  product: PublicProductDetail;
  models: ProviderModelOption[];
  defaultEndpointId: string | null;
  initialBalance: number;
  markup: number;
  /** The preset's saved private recipe — shown for reference, overridable per run. */
  recipe: { instruction: string; negative: string | null } | null;
}

function getDefaultSize(sizes: OutputSizeOption[] | undefined): OutputSizeOption {
  const available = sizes?.length
    ? sizes
    : [{ name: "Square (1:1)", width: 1024, height: 1024, is_default: true }];
  return available.find((s) => s.is_default) ?? available[0]!;
}

function sizeKey(size: OutputSizeOption): string {
  return `${size.name}:${size.width}:${size.height}`;
}

/** Client-side mirror of the DB credit-cost formula — estimates only. */
function estimateCredits(
  model: ProviderModelOption,
  size: OutputSizeOption,
  markup: number
): number {
  const quantity =
    model.unit === "megapixel"
      ? (size.width * size.height) / 1_000_000
      : model.unit === "compute seconds" || model.unit === "seconds"
        ? 15
        : 1;
  return Math.ceil(model.unitPrice * quantity * 1.1 * markup * 100 * 100) / 100;
}

export function LabWorkspace({
  product,
  models,
  defaultEndpointId,
  initialBalance,
  markup,
  recipe,
}: LabWorkspaceProps) {
  const isPoster = product.type === "poster";
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [instructionOverride, setInstructionOverride] = useState("");
  const [negativeOverride, setNegativeOverride] = useState("");
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of sortFields(product.active_fields)) {
      defaults[field.field_key] = normalizeField(field).defaultValue;
    }
    return defaults;
  });
  const [selectedSize, setSelectedSize] = useState<OutputSizeOption>(() =>
    getDefaultSize(product.output_sizes)
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultEndpointId ? [defaultEndpointId] : [])
  );
  const [runs, setRuns] = useState<LabRun[]>([]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "running">("idle");
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(initialBalance);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const outputSizes = useMemo(
    () =>
      product.output_sizes?.length
        ? product.output_sizes
        : [
            {
              name: "Square (1:1)",
              width: 1024,
              height: 1024,
              is_default: true,
            } as OutputSizeOption,
          ],
    [product.output_sizes]
  );

  const selectedModels = useMemo(
    () => models.filter((m) => selected.has(m.endpointId)),
    [models, selected]
  );

  const estimatedTotal = useMemo(
    () =>
      selectedModels.reduce(
        (sum, m) => sum + estimateCredits(m, selectedSize, markup),
        0
      ),
    [selectedModels, selectedSize, markup]
  );

  const busy = phase !== "idle";
  const hasActiveRuns = runs.some((r) => !TERMINAL.has(r.status));

  const toggleModel = useCallback((endpointId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(endpointId)) next.delete(endpointId);
      else next.add(endpointId);
      return next;
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError("");
      const selectedFile = e.target.files?.[0] ?? null;
      if (!selectedFile) return;
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        setError("Please select a JPEG, PNG, or WebP image.");
        return;
      }
      if (selectedFile.size > MAX_SIZE) {
        setError("Image must be 20 MB or smaller.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(selectedFile);
      });
    },
    []
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  // Poll every active run until it reaches a terminal status.
  useEffect(() => {
    if (!hasActiveRuns) return;
    let cancelled = false;

    const tick = async () => {
      const active = runs.filter(
        (r) => r.generationId && !TERMINAL.has(r.status)
      );
      const updates = await Promise.all(
        active.map(async (r) => {
          const res = await pollLabGeneration(r.generationId!);
          return { endpointId: r.endpointId, res };
        })
      );
      if (cancelled) return;
      setRuns((prev) =>
        prev.map((r) => {
          const update = updates.find((u) => u.endpointId === r.endpointId);
          if (!update) return r;
          const { res } = update;
          if (res.error && !res.status) {
            return { ...r, status: "error", error: res.error };
          }
          const status = res.status ?? r.status;
          return {
            ...r,
            status: TERMINAL.has(status)
              ? status === "completed"
                ? "completed"
                : "failed"
              : "running",
            imageUrl: res.imageUrl ?? r.imageUrl,
            error: status === "completed" ? undefined : (res.failureCode ?? res.error ?? r.error),
            creditCost: res.creditCost ?? r.creditCost,
          };
        })
      );
    };

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveRuns]);

  const runTests = async () => {
    setError("");

    if (!file) {
      setError("Please upload a source image.");
      return;
    }
    if (!product.version_id) {
      setError("Preset is not available for generation.");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least one model to test.");
      return;
    }
    const validation = validateGenerationOptions(product.active_fields, options);
    if (validation) {
      setError(validation.message);
      return;
    }
    if (balance < estimatedTotal && estimatedTotal > 0) {
      setError(
        `Estimated cost is ~${estimatedTotal.toFixed(2)} credits but your balance is ${balance}. Grant yourself credits on the support page if needed.`
      );
      return;
    }

    setPhase("uploading");
    try {
      const { signedUrl, path } = await prepareSourceUpload(file.type, file.size);
      const upload = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!upload.ok) throw new Error("Image upload failed.");
      const { assetId: sourceAssetId } = await finalizeSourceUpload(
        path,
        file.type,
        file.size
      );

      const entries: LabRun[] = selectedModels.map((m) => ({
        endpointId: m.endpointId,
        displayName: m.displayName,
        status: "submitting",
      }));
      setRuns(entries);
      setPhase("running");

      const results = await Promise.all(
        selectedModels.map(async (m) => ({
          endpointId: m.endpointId,
          res: await runLabGeneration({
            productId: product.id,
            productVersionId: product.version_id!,
            sourceAssetId,
            options,
            outputSize: selectedSize,
            endpointId: m.endpointId,
            instructionOverride: instructionOverride.trim() || undefined,
            negativeOverride: negativeOverride.trim() || undefined,
          }),
        }))
      );

      setRuns((prev) =>
        prev.map((r) => {
          const found = results.find((x) => x.endpointId === r.endpointId);
          if (!found) return r;
          const { res } = found;
          return {
            ...r,
            generationId: res.generationId,
            status: res.error
              ? res.generationId
                ? "failed"
                : "error"
              : "running",
            error: res.error,
            creditCost: res.creditCost,
          };
        })
      );
      const lastBalance = results
        .map((r) => r.res.balanceAfter)
        .filter((b): b is number => typeof b === "number")
        .at(-1);
      if (lastBalance !== undefined) setBalance(lastBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPhase("idle");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Source photo */}
        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-50 text-lg font-semibold">
            1. Source photo
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Shared across every model run below.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="border-cream-100/15 bg-charcoal-800/60 hover:border-lime-500/40 relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors disabled:opacity-60"
            >
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Source preview"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <CloudArrowUp size={24} className="text-text-muted" />
              )}
            </button>
            <div className="min-w-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {file ? "Change photo" : "Upload photo"}
              </Button>
              {file && (
                <p className="text-text-secondary mt-2 truncate text-xs">
                  {file.name} · {Math.round(file.size / 1024)} KB
                </p>
              )}
              <p className="text-text-muted mt-1 text-xs">
                JPG, PNG, or WebP · max 20 MB
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </section>

        {/* Output size */}
        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-50 text-lg font-semibold">2. Output size</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Applied to every run; per-model cost scales with size.
          </p>
          <div className="mt-4">
            <Label htmlFor="output-size" className="sr-only">
              Output size
            </Label>
            <RichSelect
              id="output-size"
              aria-label="Output size"
              value={sizeKey(selectedSize)}
              onValueChange={(key) => {
                const next = outputSizes.find((s) => sizeKey(s) === key);
                if (next) setSelectedSize(next);
              }}
              disabled={busy}
              options={outputSizes.map((size) => {
                const ratio = size.width / size.height;
                return {
                  value: sizeKey(size),
                  label: size.name,
                  description: `${size.width} × ${size.height}`,
                  icon:
                    Math.abs(ratio - 1) < 0.01 ? (
                      <Square size={15} />
                    ) : ratio > 1 ? (
                      <Rectangle size={15} />
                    ) : (
                      <Rectangle size={15} className="rotate-90" />
                    ),
                };
              })}
              className="w-full sm:w-72"
            />
          </div>
        </section>
      </div>

      {/* Controls */}
      {product.active_fields.length > 0 && (
        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-50 text-lg font-semibold">3. Controls</h2>
          <p className="text-text-secondary mt-1 text-sm">
            The same options a consumer would set.
          </p>
          <div className="mt-4">
            <GenerationControls
              fields={product.active_fields}
              values={options}
              onChange={setOptions}
            />
          </div>
        </section>
      )}

      {/* Recipe — saved instruction template + per-run overrides */}
      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 text-lg font-semibold">
          4. Recipe override
        </h2>
        <p className="text-text-secondary mt-1 text-sm">
          The preset&apos;s saved instruction template. Leave blank to test it
          as-is, or paste a variation to try a different prompt across every
          model — without changing what&apos;s published.
        </p>
        <div className="mt-4 space-y-4">
          {recipe?.instruction && (
            <div>
              <p className="text-text-secondary mb-1.5 text-xs font-medium">
                Saved instruction template
              </p>
              <pre className="border-cream-100/10 bg-charcoal-900 text-text-secondary max-h-36 overflow-y-auto rounded-[10px] border p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {recipe.instruction}
              </pre>
            </div>
          )}
          <div>
            <Label htmlFor="instruction-override" className="text-xs">
              Instruction override{" "}
              <span className="text-text-muted font-normal">(optional)</span>
            </Label>
            <textarea
              id="instruction-override"
              value={instructionOverride}
              onChange={(e) => setInstructionOverride(e.target.value)}
              disabled={busy}
              rows={4}
              placeholder={
                recipe?.instruction
                  ? "Overrides the saved template for these runs…"
                  : "Instruction template for these runs…"
              }
              className="border-cream-100/10 bg-charcoal-800 text-cream-50 placeholder:text-text-muted focus:border-lime-500/50 mt-1.5 w-full rounded-[10px] border px-3.5 py-2.5 font-mono text-xs leading-relaxed focus:outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <Label htmlFor="negative-override" className="text-xs">
              Negative instruction override{" "}
              <span className="text-text-muted font-normal">(optional)</span>
            </Label>
            <textarea
              id="negative-override"
              value={negativeOverride}
              onChange={(e) => setNegativeOverride(e.target.value)}
              disabled={busy}
              rows={2}
              placeholder={
                recipe?.negative
                  ? `Saved: ${recipe.negative}`
                  : "e.g. blurry, distorted face, watermark…"
              }
              className="border-cream-100/10 bg-charcoal-800 text-cream-50 placeholder:text-text-muted focus:border-lime-500/50 mt-1.5 w-full rounded-[10px] border px-3.5 py-2.5 font-mono text-xs leading-relaxed focus:outline-none disabled:opacity-60"
            />
          </div>
          {(instructionOverride || negativeOverride) && (
            <p className="bg-warning/10 text-warning rounded-[10px] px-3.5 py-2 text-xs">
              Overrides active — these runs use your edited recipe, not the
              saved one.
            </p>
          )}
        </div>
      </section>

      {/* Models */}
      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-cream-50 text-lg font-semibold">5. Models</h2>
            <p className="text-text-secondary mt-1 text-sm">
              Every selected model gets its own generation — results land side
              by side below.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <LabModelPicker
            models={models}
            defaultEndpointId={defaultEndpointId}
            selected={selected}
            onToggle={toggleModel}
            onSelectAll={() =>
              setSelected(new Set(models.map((m) => m.endpointId)))
            }
            onClear={() => setSelected(new Set())}
            disabled={busy}
          />
        </div>
      </section>

      {/* Run bar */}
      <section className="border-cream-100/10 bg-charcoal-850 sticky bottom-4 rounded-2xl border p-5 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-cream-50 text-sm font-medium">
              {selected.size === 0
                ? "No models selected"
                : `${selected.size} model${selected.size === 1 ? "" : "s"} · est. ~${estimatedTotal.toFixed(2)} credits total`}
            </p>
            <p className="text-text-muted mt-0.5 text-xs">
              Balance: {balance.toFixed(2)} credits · charged per run at each
              model&apos;s own rate
            </p>
          </div>
          <Button
            type="button"
            onClick={runTests}
            disabled={busy || !file || selected.size === 0}
          >
            {phase === "uploading"
              ? "Uploading…"
              : phase === "running"
                ? "Submitting runs…"
                : `Run ${selected.size > 0 ? selected.size : ""} test${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
        {isPoster && (
          <p className="text-text-secondary mt-3 text-sm">
            Poster generation includes deterministic text rendering.
          </p>
        )}
        {error && (
          <div className="border-error/30 bg-error/10 text-error mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm">
            <WarningCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* Results */}
      {runs.length > 0 && (
        <section>
          <h2 className="text-cream-50 text-lg font-semibold">Results</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Side-by-side output across the selected models.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {runs.map((run) => (
              <div
                key={run.endpointId}
                className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border"
              >
                <div className="bg-charcoal-900 relative aspect-square">
                  {run.imageUrl ? (
                    <Image
                      src={run.imageUrl}
                      alt={`${run.displayName} result`}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                      {run.status === "failed" || run.status === "error" ? (
                        <>
                          <WarningCircle size={22} className="text-error" />
                          <p className="text-error max-w-full break-words text-xs leading-relaxed">
                            {run.error ?? "Run failed"}
                          </p>
                        </>
                      ) : (
                        <>
                          <Spinner
                            size={22}
                            className="text-lime-400 animate-spin"
                          />
                          <p className="text-text-secondary text-xs">
                            {run.status === "submitting"
                              ? "Submitting…"
                              : "Generating…"}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-cream-50 truncate text-sm font-medium">
                      {run.displayName}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        run.status === "completed" &&
                          "bg-lime-500/15 text-lime-300",
                        (run.status === "failed" || run.status === "error") &&
                          "bg-error/15 text-error",
                        (run.status === "submitting" ||
                          run.status === "running") &&
                          "bg-warning/15 text-warning"
                      )}
                    >
                      {run.status === "error"
                        ? "error"
                        : run.status === "submitting"
                          ? "submitting"
                          : run.status}
                    </span>
                  </div>
                  <p className="text-text-muted mt-1 truncate font-mono text-[11px]">
                    {run.endpointId}
                  </p>
                  <p className="text-text-muted mt-1.5 text-xs">
                    {typeof run.creditCost === "number"
                      ? `${run.creditCost.toFixed(2)} credits`
                      : "cost pending"}
                    {run.generationId && (
                      <>
                        {" · "}
                        <a
                          href={`/admin/generations/${run.generationId}`}
                          className="text-text-secondary hover:text-cream-100 underline underline-offset-2"
                        >
                          detail
                        </a>
                        {" · "}
                        <a
                          href={`/app/results/${run.generationId}`}
                          className="text-text-secondary hover:text-cream-100 underline underline-offset-2"
                        >
                          open result
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
