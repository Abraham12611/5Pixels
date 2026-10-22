"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormContext, useWatch } from "react-hook-form";
import { Flask, Image as ImageIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ProductAssetPreview } from "./product-form";

export interface PresetPreviewPanelProps {
  type: "filter" | "poster";
  /** Already-authorized preview URLs for the preset's stored sample media. */
  assetPreviews?: Partial<
    Record<
      "hero" | "poster" | "preview-video" | "preview-gif",
      ProductAssetPreview
    >
  >;
  /** Saved product slug — enables the manual Test in Lab handoff. */
  slug?: string;
}

const hintClass = "text-text-muted mt-1.5 text-xs";

const MEDIA_SLOTS = [
  { key: "hero", label: "Hero image", kind: "image" },
  { key: "poster", label: "Poster image", kind: "image" },
  { key: "preview-video", label: "Preview video", kind: "video" },
  { key: "preview-gif", label: "Preview GIF", kind: "image" },
] as const;

const LAYOUT_RATIO_CLASS: Record<string, string> = {
  portrait: "aspect-[3/4]",
  square: "aspect-square",
  landscape: "aspect-[4/3]",
};

const TEXT_SIZE_CLASS: Record<string, string> = {
  small: "text-xs",
  medium: "text-base",
  large: "text-2xl",
};

const TEXT_ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Preview & test panel (#223, Engineer B). Two honest tiers:
 *
 * 1. Stored sample media — the admin-uploaded hero/poster/video/GIF assets,
 *    i.e. curated examples of the look, not live output.
 * 2. For posters, an illustrative composition mock drawn from the draft
 *    `poster_config` — it shows where text would sit, never a generated
 *    image.
 *
 * Real results come only from the manual Test in Lab handoff, which runs a
 * genuine billed generation through `/admin/lab/[slug]`. This panel never
 * triggers a run and never fabricates one.
 */
export function PresetPreviewPanel({
  type,
  assetPreviews,
  slug,
}: PresetPreviewPanelProps) {
  const { control } = useFormContext();
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const posterConfig = useWatch({ control, name: "poster_config" }) as
    | {
        layout_template?: string;
        font_family?: string;
        text_fields?: Array<{
          key?: string;
          label?: string;
          default_value?: string;
          required?: boolean;
        }>;
        text_layer_config?: {
          position?: string;
          size?: string;
          color?: string;
          alignment?: string;
        };
      }
    | undefined;

  const hasAnyMedia = MEDIA_SLOTS.some(
    (s) => assetPreviews?.[s.key]?.publicUrl
  );
  const labHref = slug ? `/admin/lab/${slug}` : null;

  const textFields = posterConfig?.text_fields ?? [];
  const layer = posterConfig?.text_layer_config ?? {};
  const position = layer.position ?? "bottom";

  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-4 sm:p-6">
      <h2 className="text-cream-50 mb-4 text-lg font-semibold">
        Preview &amp; test
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-cream-50 text-sm font-medium">Sample media</p>
          <p className={cn(hintClass, "mt-0 mb-3")}>
            Hand-picked examples uploaded under Media — representative of the
            look, not live output.
          </p>
          {hasAnyMedia ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {MEDIA_SLOTS.map((slot) => {
                const preview = assetPreviews?.[slot.key];
                if (!preview?.publicUrl) return null;
                if (broken[slot.key]) {
                  return (
                    <div
                      key={slot.key}
                      className="border-cream-100/10 bg-charcoal-800 flex h-40 items-center justify-center rounded-xl border"
                    >
                      <p className="text-text-muted text-xs">
                        {slot.label} preview unavailable
                      </p>
                    </div>
                  );
                }
                return (
                  <figure key={slot.key}>
                    {slot.kind === "video" ? (
                      <video
                        src={preview.publicUrl}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        onError={() =>
                          setBroken((b) => ({ ...b, [slot.key]: true }))
                        }
                        className="border-cream-100/10 bg-charcoal-900 max-h-[50vh] w-full rounded-xl border object-contain"
                        aria-label={`${slot.label} sample`}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary stored assets; Next image optimization doesn't apply to these signed URLs
                      <img
                        src={preview.publicUrl}
                        alt={`${slot.label} sample`}
                        loading="lazy"
                        onError={() =>
                          setBroken((b) => ({ ...b, [slot.key]: true }))
                        }
                        className="border-cream-100/10 bg-charcoal-900 max-h-[50vh] w-full rounded-xl border object-contain"
                      />
                    )}
                    <figcaption className="text-text-muted mt-1 text-xs">
                      {slot.label}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ) : (
            <div className="border-cream-100/10 flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
              <ImageIcon size={20} className="text-text-muted" />
              <p className="text-text-muted text-xs">
                No sample media uploaded yet.
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-cream-50 text-sm font-medium">
            {type === "poster" ? "Composition mock" : "Test output"}
          </p>
          {type === "poster" ? (
            <>
              <p className={cn(hintClass, "mt-0 mb-3")}>
                Illustrative layout only — shows where the configured text layer
                sits. This is not a generated image.
              </p>
              <div
                role="img"
                aria-label="Illustrative poster layout mock"
                className={cn(
                  "border-cream-100/15 bg-charcoal-900 relative mx-auto w-full max-w-xs overflow-hidden rounded-xl border",
                  LAYOUT_RATIO_CLASS[posterConfig?.layout_template ?? ""] ??
                    "aspect-[3/4]"
                )}
              >
                <div className="border-cream-100/10 absolute inset-3 rounded-lg border border-dashed" />
                {textFields.length === 0 ? (
                  <p className="text-text-muted absolute inset-0 flex items-center justify-center px-4 text-center text-xs">
                    No text fields configured
                  </p>
                ) : (
                  <div
                    className={cn(
                      "absolute inset-x-4 flex flex-col gap-1 p-3",
                      position === "top" && "top-0",
                      position === "center" && "top-1/2 -translate-y-1/2",
                      position === "bottom" && "bottom-0"
                    )}
                  >
                    {textFields.map((f, i) => (
                      <p
                        key={i}
                        className={cn(
                          "font-bold drop-shadow",
                          TEXT_SIZE_CLASS[layer.size ?? ""] ?? "text-base",
                          TEXT_ALIGN_CLASS[layer.alignment ?? ""] ??
                            "text-center"
                        )}
                        style={{
                          color: layer.color || "#F7F2E8",
                          fontFamily: posterConfig?.font_family || undefined,
                        }}
                      >
                        {f.default_value?.trim() ||
                          f.label?.trim() ||
                          f.key ||
                          "Text"}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className={cn(hintClass, "mt-0 mb-3")}>
                No generated test output is stored on a preset — use the lab for
                a real result.
              </p>
              <div className="border-cream-100/10 flex h-40 items-center justify-center rounded-xl border border-dashed">
                <p className="text-text-muted px-4 text-center text-xs">
                  No test output yet.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-cream-100/10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-text-muted max-w-md text-xs">
          Lab runs are manual, real generations — they charge your credit
          balance at the model&apos;s quoted rate and appear in your history.
        </p>
        {labHref ? (
          <Link
            href={labHref}
            className="inline-flex items-center gap-2 rounded-xl border border-lime-500/40 bg-lime-500/10 px-4 py-2 text-sm font-medium text-lime-400 transition-colors hover:bg-lime-500/20"
          >
            <Flask size={16} />
            Test in Lab
          </Link>
        ) : (
          <span
            className="border-cream-100/10 text-text-muted inline-flex cursor-not-allowed items-center gap-2 rounded-xl border px-4 py-2 text-sm"
            aria-disabled="true"
          >
            <Flask size={16} />
            Save this preset to test in Lab
          </span>
        )}
      </div>
    </section>
  );
}
