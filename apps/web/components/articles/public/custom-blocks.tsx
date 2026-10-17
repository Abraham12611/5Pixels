import Link from "next/link";
import {
  ArrowRight,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import type { PublicProductDetail } from "@/types/catalog";
import type { PublicAssetRef } from "@/lib/articles/types";
import {
  resolveAssetMedia,
  sanitizeCtaHref,
  sanitizePresetSlug,
} from "@/lib/articles/public-document";
import {
  isPinnedVersionStale,
  isPresetUuid,
  presetCardDataFromProduct,
  type PresetCardData,
} from "@/lib/articles/preset-card";
import { ArticlePresetCard } from "@/components/articles/blocks/preset-card";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { ArticleImage } from "./article-image";
import { ComparisonSlider } from "./comparison-slider";

/**
 * Public renderers for the 5Pixels custom blocks (#131).
 *
 * Every component reads only sanitized props + server-resolved data — a block
 * can never reach staff tables or private recipes because the data simply is
 * not in the published snapshot.
 */

export function MediaUnavailable({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} unavailable`}
      className="border-cream-100/10 bg-charcoal-850 text-text-muted my-6 flex h-40 items-center justify-center gap-2 rounded-xl border border-dashed text-sm"
    >
      <ImageIcon size={18} aria-hidden />
      {label} unavailable
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Preset card — delegates to the shared ArticlePresetCard (#127 contract).
 * The canonical reference is props.presetId (products.id); props.slug is a
 * deep-link fallback for documents authored before the picker existed.
 * ------------------------------------------------------------------------ */

export function PresetBlockView({
  presetId,
  slug,
  selectedPublicVersionId,
  displayVariant,
  presetCards,
  presets,
  articleId,
}: {
  presetId: unknown;
  slug: unknown;
  selectedPublicVersionId: unknown;
  displayVariant: unknown;
  /** productId -> PresetCardData; absent id = retired/unavailable. */
  presetCards: ReadonlyMap<string, PresetCardData>;
  /** slug -> catalog row, for pre-#127 slug-only blocks. */
  presets: ReadonlyMap<string, PublicProductDetail | null>;
  articleId: string;
}) {
  const id = typeof presetId === "string" ? presetId.trim() : "";
  let card: PresetCardData | null =
    id && isPresetUuid(id) ? (presetCards.get(id) ?? null) : null;
  if (!card && !id) {
    const s = sanitizePresetSlug(slug);
    const product = s ? (presets.get(s) ?? null) : null;
    card = product ? presetCardDataFromProduct(product) : null;
  }
  const pinned =
    typeof selectedPublicVersionId === "string"
      ? selectedPublicVersionId
      : "";

  return (
    <ArticlePresetCard
      preset={card}
      variant={displayVariant === "compact" ? "compact" : "card"}
      pinnedVersionStale={Boolean(
        card && pinned && isPinnedVersionStale(card, pinned)
      )}
      analyticsProps={{ surface: "article", article_id: articleId }}
      className="my-6"
    />
  );
}

/* --------------------------------------------------------------------------
 * Settings table
 * ------------------------------------------------------------------------ */

export function SettingsBlockCard({
  product,
}: {
  product: PublicProductDetail | null;
}) {
  if (!product) return null;
  const fields = product.active_fields ?? [];

  return (
    <div className="border-cream-100/10 bg-charcoal-850 my-6 overflow-hidden rounded-xl border">
      <div className="border-cream-100/10 border-b px-4 py-3">
        <p className="text-cream-50 text-sm font-semibold">
          {product.name} settings
        </p>
      </div>
      {fields.length === 0 ? (
        <p className="text-text-muted px-4 py-3 text-sm">
          This preset uses default settings — no extra controls.
        </p>
      ) : (
        <dl className="divide-cream-100/10 divide-y">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <dt className="text-cream-100 w-40 shrink-0 text-sm font-medium">
                {field.label}
              </dt>
              <dd className="text-text-secondary min-w-0 text-sm">
                {field.help_text ?? (
                  <span className="text-text-muted capitalize">
                    {field.field_type}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Prompt recipe
 * ------------------------------------------------------------------------ */

export function PromptRecipeBlock({
  recipe,
  presetSlug,
  presets,
}: {
  recipe: string;
  presetSlug: unknown;
  presets: ReadonlyMap<string, PublicProductDetail | null>;
}) {
  const slug = sanitizePresetSlug(presetSlug);
  const product = slug ? (presets.get(slug) ?? null) : null;

  if (!recipe.trim()) {
    return (
      <div className="border-cream-100/10 bg-charcoal-850 text-text-muted my-6 rounded-xl border border-dashed p-4 text-sm">
        Prompt recipe was removed by the author.
      </div>
    );
  }

  return (
    <figure className="border-lime-500/20 bg-charcoal-850 my-6 overflow-hidden rounded-xl border">
      <div className="border-cream-100/10 flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <figcaption className="text-text-secondary text-xs font-semibold tracking-wider uppercase">
          Prompt recipe
        </figcaption>
        <CopyButton text={recipe} />
      </div>
      <pre className="text-cream-100 max-w-full overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
        {recipe}
      </pre>
      {product ? (
        <div className="border-cream-100/10 border-t px-4 py-3">
          <Link
            href={`/presets/${product.slug}`}
            className="text-lime-400 hover:text-lime-300 focus-visible:ring-lime-500/70 inline-flex items-center gap-1.5 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Try this preset
            <ArrowRight size={14} weight="bold" aria-hidden />
          </Link>
        </div>
      ) : null}
    </figure>
  );
}

/* --------------------------------------------------------------------------
 * Generation embed + comparison
 * ------------------------------------------------------------------------ */

export function GenerationBlockView({
  assetId,
  caption,
  media,
}: {
  assetId: unknown;
  caption: unknown;
  media: Record<string, PublicAssetRef>;
}) {
  const resolved = resolveAssetMedia(assetId, media);
  if (!resolved) return <MediaUnavailable label="Media" />;

  const captionText = typeof caption === "string" ? caption : "";
  const { asset } = resolved;

  if (asset?.mimeType?.startsWith("video/")) {
    return (
      <figure className="my-6">
        <video
          src={resolved.src}
          controls
          playsInline
          preload="metadata"
          className="bg-charcoal-850 w-full rounded-xl"
        />
        {captionText ? (
          <figcaption className="text-text-muted mt-2 text-center text-sm">
            {captionText}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <ArticleImage
      src={resolved.src}
      alt={captionText || "Generated result"}
      caption={captionText || undefined}
      width={asset?.width}
      height={asset?.height}
    />
  );
}

export function ComparisonBlockView({
  beforeAssetId,
  afterAssetId,
  mode,
  media,
}: {
  beforeAssetId: unknown;
  afterAssetId: unknown;
  mode: unknown;
  media: Record<string, PublicAssetRef>;
}) {
  const before = resolveAssetMedia(beforeAssetId, media);
  const after = resolveAssetMedia(afterAssetId, media);
  if (!before || !after) {
    return <MediaUnavailable label="Comparison" />;
  }
  return (
    <ComparisonSlider
      beforeSrc={before.src}
      afterSrc={after.src}
      beforeAlt="Before"
      afterAlt="After"
      mode={mode === "slider" ? "slider" : "side-by-side"}
    />
  );
}

/* --------------------------------------------------------------------------
 * Workflow, callout, CTA
 * ------------------------------------------------------------------------ */

export function WorkflowBlock({
  steps,
}: {
  steps: unknown;
}) {
  const list = Array.isArray(steps)
    ? steps.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  if (list.length === 0) return null;
  return (
    <ol className="my-6 space-y-3">
      {list.map((step, i) => (
        <li
          key={i}
          className="border-cream-100/10 bg-charcoal-850 flex gap-3 rounded-xl border p-4"
        >
          <span
            aria-hidden="true"
            className="bg-lime-500/15 text-lime-400 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          >
            {i + 1}
          </span>
          <p className="text-cream-100 min-w-0 pt-0.5 text-sm leading-relaxed break-words">
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}

const CALLOUT_TONES = {
  info: {
    icon: Info,
    className: "border-sky-400/30 bg-sky-400/5",
    iconClass: "text-sky-300",
  },
  tip: {
    icon: Lightbulb,
    className: "border-lime-500/30 bg-lime-500/5",
    iconClass: "text-lime-400",
  },
  warning: {
    icon: Warning,
    className: "border-amber-400/30 bg-amber-400/5",
    iconClass: "text-amber-300",
  },
} as const;

export function CalloutBlock({
  tone,
  children,
}: {
  tone: unknown;
  children: React.ReactNode;
}) {
  const t = CALLOUT_TONES[tone as keyof typeof CALLOUT_TONES] ?? CALLOUT_TONES.info;
  const Icon = t.icon;
  return (
    <aside
      className={cn("my-6 flex gap-3 rounded-xl border p-4", t.className)}
    >
      <Icon size={18} aria-hidden className={cn("mt-0.5 shrink-0", t.iconClass)} />
      <div className="text-cream-100 min-w-0 text-sm leading-relaxed">
        {children}
      </div>
    </aside>
  );
}

export function CtaBlock({
  label,
  href,
  presetSlug,
  presets,
}: {
  label: unknown;
  href: unknown;
  presetSlug: unknown;
  presets: ReadonlyMap<string, PublicProductDetail | null>;
}) {
  const slug = sanitizePresetSlug(presetSlug);
  const product = slug ? (presets.get(slug) ?? null) : null;
  const safeHref = sanitizeCtaHref(href);
  const target = product ? `/presets/${product.slug}` : safeHref;
  if (!target) return null;

  const text =
    typeof label === "string" && label.trim()
      ? label.trim()
      : product
        ? "Try this look"
        : "Learn more";

  return (
    <div className="my-8 text-center">
      <Link
        href={target}
        className="bg-lime-500 text-ink-950 hover:bg-lime-400 focus-visible:ring-lime-300 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 focus-visible:outline-none"
      >
        <Sparkle size={16} weight="fill" aria-hidden />
        {text}
      </Link>
    </div>
  );
}
