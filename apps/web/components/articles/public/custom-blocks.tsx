import Link from "next/link";
import {
  Image as ImageIcon,
  Info,
  Lightbulb,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import type { PublicProductDetail } from "@/types/catalog";
import type { PublicAssetRef } from "@/lib/articles/types";
import {
  parsePromptReferences,
  parseSettingsFields,
  settingsFieldsFromPublic,
} from "@/lib/articles/blocks/prompt-settings";
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
import { PromptRecipeCard } from "@/components/articles/blocks/prompt-recipe-card";
import { SettingsCard } from "@/components/articles/blocks/settings-card";
import { cn } from "@/lib/utils";
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
 * Preset link resolution shared by the editorial blocks (#128 contract):
 * canonical presetId -> resolved card; sanitized slug -> catalog row or a
 * plain /presets/{slug} link for documents authored before presetId existed.
 * ------------------------------------------------------------------------ */

function resolvePresetLink(
  presetId: unknown,
  slug: unknown,
  presetCards: ReadonlyMap<string, PresetCardData>,
  presets: ReadonlyMap<string, PublicProductDetail | null>
): { name: string | null; href: string | null } {
  const id = typeof presetId === "string" ? presetId.trim() : "";
  if (id && isPresetUuid(id)) {
    const card = presetCards.get(id) ?? null;
    return { name: card?.name ?? null, href: card?.href ?? null };
  }
  const s = sanitizePresetSlug(slug);
  if (!s) return { name: null, href: null };
  const product = presets.get(s) ?? null;
  return {
    name: product?.name ?? null,
    href: product ? `/presets/${product.slug}` : `/presets/${s}`,
  };
}

/* --------------------------------------------------------------------------
 * Settings table — shared SettingsCard (#128 contract).
 * ------------------------------------------------------------------------ */

export function SettingsBlockView({
  presetId,
  slug,
  fields,
  presetCards,
  presets,
}: {
  presetId: unknown;
  slug: unknown;
  /** JSON-stringified SettingsFieldRow[] snapshot; "" on pre-#128 docs. */
  fields: unknown;
  presetCards: ReadonlyMap<string, PresetCardData>;
  presets: ReadonlyMap<string, PublicProductDetail | null>;
}) {
  const link = resolvePresetLink(presetId, slug, presetCards, presets);
  let rows = parseSettingsFields(typeof fields === "string" ? fields : "");
  // Legacy fallback: pre-#128 documents stored no field snapshot — rebuild
  // the labelled-example rows from the preset's documented controls.
  if (rows.length === 0) {
    const s = sanitizePresetSlug(slug);
    const product = s ? (presets.get(s) ?? null) : null;
    if (product?.active_fields?.length) {
      rows = settingsFieldsFromPublic(product.active_fields);
    }
  }
  return (
    <SettingsCard
      presetName={link.name}
      presetHref={link.href}
      rows={rows}
      className="my-6"
    />
  );
}

/* --------------------------------------------------------------------------
 * Prompt recipe — shared PromptRecipeCard (#128 contract). Only the
 * article-local snapshot is rendered; private prompts are structurally absent.
 * ------------------------------------------------------------------------ */

export function PromptRecipeBlock({
  presetId,
  slug,
  recipeText,
  recipe,
  source,
  capturedAt,
  references,
  presetCards,
  presets,
}: {
  presetId: unknown;
  slug: unknown;
  /** #128 snapshot text; `recipe` is the pre-#128 prop. */
  recipeText: unknown;
  recipe: unknown;
  source: unknown;
  capturedAt: unknown;
  /** JSON-stringified PromptReference[]. */
  references: unknown;
  presetCards: ReadonlyMap<string, PresetCardData>;
  presets: ReadonlyMap<string, PublicProductDetail | null>;
}) {
  const text =
    typeof recipeText === "string" && recipeText
      ? recipeText
      : typeof recipe === "string"
        ? recipe
        : "";
  const link = resolvePresetLink(presetId, slug, presetCards, presets);
  const captured =
    typeof capturedAt === "string" &&
    capturedAt &&
    !Number.isNaN(Date.parse(capturedAt))
      ? capturedAt
      : undefined;

  return (
    <PromptRecipeCard
      recipeText={text}
      source={source === "approved_template" ? "approved_template" : "manual"}
      capturedAt={captured}
      presetName={link.name}
      presetHref={link.href}
      references={parsePromptReferences(
        typeof references === "string" ? references : ""
      )}
      className="my-6"
    />
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
