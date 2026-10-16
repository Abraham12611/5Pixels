import { File as FileIcon } from "@phosphor-icons/react/dist/ssr";
import { isArticleVideoMime, isArticleImageMime } from "@/lib/articles/media";
import type { ArticleBlockJson } from "@/lib/articles/document";
import type { PublicAssetRef } from "@/lib/articles/types";
import {
  anchorIdFor,
  isExternalHref,
  resolveMediaSrc,
  sanitizeLinkHref,
  type HeadingIndex,
} from "@/lib/articles/public-document";
import type { PublicProductDetail } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { ArticleImage } from "./article-image";
import {
  CalloutBlock,
  ComparisonBlockView,
  CtaBlock,
  GenerationBlockView,
  MediaUnavailable,
  PresetBlockCard,
  PromptRecipeBlock,
  SettingsBlockCard,
  WorkflowBlock,
} from "./custom-blocks";

/**
 * Read-only public renderer for the article document contract (#131).
 *
 * Server component: walks the BlockNote JSON and emits semantic HTML. Inline
 * content is rendered element-by-element — strings are escaped by React and
 * links pass through sanitizeLinkHref — so no untrusted markup can execute.
 * Nothing here mounts the editable BlockNote bundle.
 */

interface RenderContext {
  media: Record<string, PublicAssetRef>;
  presets: ReadonlyMap<string, PublicProductDetail | null>;
  headings: HeadingIndex;
}

/* --------------------------------------------------------------------------
 * Inline content
 * ------------------------------------------------------------------------ */

/** BlockNote's named text/background palette, mapped to readable dark-theme values. */
const INLINE_TEXT_COLORS: Record<string, string> = {
  gray: "#a8b0a8",
  brown: "#c9a587",
  red: "#f87171",
  orange: "#fb923c",
  yellow: "#facc15",
  green: "#86efac",
  blue: "#7dd3fc",
  purple: "#c4b5fd",
  pink: "#f9a8d4",
};

const INLINE_BG_COLORS: Record<string, string> = {
  gray: "rgba(168,176,168,0.16)",
  brown: "rgba(201,165,135,0.16)",
  red: "rgba(248,113,113,0.16)",
  orange: "rgba(251,146,60,0.16)",
  yellow: "rgba(250,204,21,0.16)",
  green: "rgba(134,239,172,0.16)",
  blue: "rgba(125,211,252,0.16)",
  purple: "rgba(196,181,253,0.16)",
  pink: "rgba(249,168,212,0.16)",
};

function InlineNode({ node }: { node: unknown }) {
  if (!node || typeof node !== "object") return null;
  const item = node as {
    type?: string;
    text?: string;
    href?: string;
    styles?: Record<string, unknown>;
    content?: unknown;
  };

  if (item.type === "link") {
    const href = sanitizeLinkHref(item.href);
    const inner = <InlineSequence content={item.content} />;
    if (!href) return inner; // disallowed scheme — keep the text, drop the link
    const external = isExternalHref(href);
    return (
      <a
        href={href}
        {...(external && !href.startsWith("mailto:")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className="text-lime-400 hover:text-lime-300 underline decoration-lime-500/40 underline-offset-2 transition-colors"
      >
        {inner}
      </a>
    );
  }

  if (typeof item.text === "string") {
    const styles = item.styles ?? {};
    let out: React.ReactNode = item.text;
    if (styles.code) {
      out = (
        <code className="bg-charcoal-800 text-lime-300 rounded px-1.5 py-0.5 font-mono text-[0.85em] break-words">
          {out}
        </code>
      );
    }
    if (styles.bold) out = <strong className="font-semibold">{out}</strong>;
    if (styles.italic) out = <em>{out}</em>;
    if (styles.strike) out = <s>{out}</s>;
    if (styles.underline) out = <u>{out}</u>;

    const textColor =
      typeof styles.textColor === "string"
        ? INLINE_TEXT_COLORS[styles.textColor]
        : undefined;
    const bgColor =
      typeof styles.backgroundColor === "string"
        ? INLINE_BG_COLORS[styles.backgroundColor]
        : undefined;
    if (textColor || bgColor) {
      out = <span style={{ color: textColor, backgroundColor: bgColor }}>{out}</span>;
    }
    return out;
  }

  // Unknown inline node — recurse into nested content if present so nothing
  // silently drops, but never fabricate markup from its other props.
  if (Array.isArray(item.content)) {
    return <InlineSequence content={item.content} />;
  }
  return null;
}

function InlineSequence({ content }: { content: unknown }) {
  if (!Array.isArray(content) || content.length === 0) return null;
  return (
    <>
      {content.map((node, i) => (
        <InlineNode key={i} node={node} />
      ))}
    </>
  );
}

/* --------------------------------------------------------------------------
 * Standard blocks
 * ------------------------------------------------------------------------ */

function alignmentClass(block: ArticleBlockJson): string | undefined {
  const align = block.props?.textAlignment;
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  if (align === "justify") return "text-justify";
  return undefined;
}

const HEADING_TAGS = { 1: "h2", 2: "h3", 3: "h4" } as const;
const HEADING_CLASSES = {
  1: "font-display text-cream-50 mt-10 mb-4 scroll-mt-24 text-2xl font-bold sm:text-3xl",
  2: "font-display text-cream-50 mt-8 mb-3 scroll-mt-24 text-xl font-semibold sm:text-2xl",
  3: "font-display text-cream-50 mt-6 mb-2 scroll-mt-24 text-lg font-semibold",
} as const;

function ParagraphBlock({ block }: { block: ArticleBlockJson }) {
  const inline = <InlineSequence content={block.content} />;
  const isEmpty =
    !Array.isArray(block.content) || block.content.length === 0;
  return (
    <p
      className={cn(
        "text-cream-100 my-4 leading-relaxed break-words",
        alignmentClass(block),
        isEmpty && "min-h-[1.5em]"
      )}
    >
      {inline}
    </p>
  );
}

function HeadingBlock({
  block,
  ctx,
}: {
  block: ArticleBlockJson;
  ctx: RenderContext;
}) {
  const raw = Number(block.props?.level);
  const level = raw >= 1 && raw <= 3 ? (Math.floor(raw) as 1 | 2 | 3) : 1;
  const Tag = HEADING_TAGS[level];
  return (
    <Tag
      id={anchorIdFor(ctx.headings, block)}
      className={cn(HEADING_CLASSES[level], alignmentClass(block), "break-words")}
    >
      <InlineSequence content={block.content} />
    </Tag>
  );
}

function CodeBlockView({ block }: { block: ArticleBlockJson }) {
  // Code content is plain-text inline nodes; preserve newlines verbatim.
  const text = Array.isArray(block.content)
    ? block.content
        .map((n) =>
          n && typeof n === "object" && typeof (n as { text?: unknown }).text === "string"
            ? (n as { text: string }).text
            : ""
        )
        .join("")
    : "";
  const language =
    typeof block.props?.language === "string" && block.props.language
      ? block.props.language
      : null;
  return (
    <figure className="border-cream-100/10 bg-ink-900 my-6 overflow-hidden rounded-xl border">
      {language ? (
        <div className="border-cream-100/10 text-text-muted border-b px-4 py-2 text-[11px] font-semibold tracking-wider uppercase">
          {language}
        </div>
      ) : null}
      <pre className="text-cream-100 overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        <code>{text}</code>
      </pre>
    </figure>
  );
}

function TableBlockView({ block }: { block: ArticleBlockJson }) {
  const content = block.content;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return null;
  }
  const table = content as {
    type?: string;
    headerRows?: number;
    headerCols?: number;
    rows?: { cells?: unknown[] }[];
  };
  const rows = Array.isArray(table.rows) ? table.rows : [];
  if (rows.length === 0) return null;
  const headerRows = Math.min(table.headerRows ?? 0, rows.length);
  const headerCols = table.headerCols ?? 0;

  return (
    <div className="my-6 overflow-x-auto">
      <table className="border-cream-100/10 w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-cream-100/10 border-b">
              {(Array.isArray(row.cells) ? row.cells : []).map((cell, c) => {
                const cellContent = Array.isArray(cell)
                  ? cell
                  : cell && typeof cell === "object"
                    ? (cell as { content?: unknown }).content
                    : null;
                const isHeader = r < headerRows || c < headerCols;
                const CellTag = isHeader ? "th" : "td";
                return (
                  <CellTag
                    key={c}
                    scope={isHeader ? (r < headerRows ? "col" : "row") : undefined}
                    className={cn(
                      "border-cream-100/10 px-3 py-2 text-left align-top",
                      isHeader
                        ? "bg-charcoal-800 text-cream-50 font-semibold"
                        : "text-cream-100"
                    )}
                  >
                    <InlineSequence content={cellContent} />
                  </CellTag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FileCard({
  src,
  name,
  caption,
}: {
  src: string;
  name: string;
  caption?: string;
}) {
  return (
    <figure className="my-6">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="border-cream-100/10 bg-charcoal-850 hover:border-lime-500/30 text-cream-100 focus-visible:ring-lime-500/70 flex items-center gap-3 rounded-xl border p-4 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <FileIcon size={20} aria-hidden className="text-text-muted shrink-0" />
        <span className="min-w-0 flex-1 truncate">{name || "Attachment"}</span>
        <span className="text-text-muted shrink-0 text-xs">Open</span>
      </a>
      {caption ? (
        <figcaption className="text-text-muted mt-2 text-center text-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function MediaBlockView({
  block,
  ctx,
}: {
  block: ArticleBlockJson;
  ctx: RenderContext;
}) {
  const props = block.props ?? {};
  const resolved = resolveMediaSrc(props.url, ctx.media);
  const caption = typeof props.caption === "string" ? props.caption : "";
  const name = typeof props.name === "string" ? props.name : "";

  if (!resolved) {
    const label =
      block.type === "video" ? "Video" : block.type === "audio" ? "Audio" : "Media";
    return <MediaUnavailable label={label} />;
  }

  const showPreview = props.showPreview !== false;
  const mime = resolved.asset?.mimeType ?? "";
  const isImage =
    block.type === "image" ||
    (block.type === "file" && isArticleImageMime(mime));
  const isVideo =
    block.type === "video" ||
    (block.type === "file" && isArticleVideoMime(mime));

  if (block.type === "file" || !showPreview) {
    return <FileCard src={resolved.src} name={name} caption={caption} />;
  }
  if (isVideo) {
    return (
      <figure className="my-6">
        <video
          src={resolved.src}
          controls
          playsInline
          preload="metadata"
          className="bg-charcoal-850 w-full rounded-xl"
        />
        {caption ? (
          <figcaption className="text-text-muted mt-2 text-center text-sm">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }
  if (block.type === "audio") {
    return (
      <figure className="my-6">
        <audio src={resolved.src} controls preload="metadata" className="w-full" />
        {caption ? (
          <figcaption className="text-text-muted mt-2 text-center text-sm">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }
  if (isImage) {
    return (
      <ArticleImage
        src={resolved.src}
        alt={caption || name || ""}
        caption={caption || undefined}
        width={resolved.asset?.width}
        height={resolved.asset?.height}
      />
    );
  }
  return <FileCard src={resolved.src} name={name} caption={caption} />;
}

/* --------------------------------------------------------------------------
 * List grouping
 * ------------------------------------------------------------------------ */

type ListKind = "ul" | "ol";

function listKindOf(type: string): ListKind | null {
  if (type === "numberedListItem") return "ol";
  if (
    type === "bulletListItem" ||
    type === "checkListItem" ||
    type === "toggleListItem"
  ) {
    return "ul";
  }
  return null;
}

function ListGroup({
  kind,
  run,
  ctx,
}: {
  kind: ListKind;
  run: ArticleBlockJson[];
  ctx: RenderContext;
}) {
  const className = cn(
    "my-4 space-y-1.5 pl-6 marker:text-text-muted",
    kind === "ol" ? "list-decimal" : "list-disc"
  );
  const items = run.map((item, j) => (
    <ListItemBlock key={item.id ?? j} block={item} ctx={ctx} />
  ));
  return kind === "ol" ? (
    <ol className={className}>{items}</ol>
  ) : (
    <ul className={className}>{items}</ul>
  );
}

function ListItemBlock({
  block,
  ctx,
}: {
  block: ArticleBlockJson;
  ctx: RenderContext;
}) {
  const isCheck = block.type === "checkListItem";
  const checked = block.props?.checked === true;
  return (
    <li className="text-cream-100 leading-relaxed break-words">
      {isCheck ? (
        <span className="mr-2 inline-flex items-center">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            disabled
            aria-label={checked ? "Completed item" : "Incomplete item"}
            className="accent-lime-500 h-4 w-4"
          />
        </span>
      ) : null}
      <InlineSequence content={block.content} />
      {block.children?.length ? (
        <RenderBlocks blocks={block.children} ctx={ctx} />
      ) : null}
    </li>
  );
}

/* --------------------------------------------------------------------------
 * Custom + unknown blocks
 * ------------------------------------------------------------------------ */

function CustomBlock({
  block,
  ctx,
}: {
  block: ArticleBlockJson;
  ctx: RenderContext;
}) {
  const props = block.props ?? {};
  switch (block.type) {
    case "preset": {
      const slug = typeof props.productSlug === "string" ? props.productSlug : "";
      const product = slug ? (ctx.presets.get(slug) ?? null) : null;
      return <PresetBlockCard product={product} />;
    }
    case "settings": {
      const slug = typeof props.productSlug === "string" ? props.productSlug : "";
      const product = slug ? (ctx.presets.get(slug) ?? null) : null;
      return <SettingsBlockCard product={product} />;
    }
    case "promptRecipe":
      return (
        <PromptRecipeBlock
          recipe={typeof props.recipe === "string" ? props.recipe : ""}
          presetSlug={props.presetSlug}
          presets={ctx.presets}
        />
      );
    case "generation":
      return (
        <GenerationBlockView
          assetId={props.assetId}
          caption={props.caption}
          media={ctx.media}
        />
      );
    case "comparison":
      return (
        <ComparisonBlockView
          beforeAssetId={props.beforeAssetId}
          afterAssetId={props.afterAssetId}
          mode={props.mode}
          media={ctx.media}
        />
      );
    case "workflow":
      return <WorkflowBlock steps={props.steps} />;
    case "callout":
      return (
        <CalloutBlock tone={props.tone}>
          <InlineSequence content={block.content} />
        </CalloutBlock>
      );
    case "cta":
      return (
        <CtaBlock
          label={props.label}
          href={props.href}
          presetSlug={props.presetSlug}
          presets={ctx.presets}
        />
      );
    default:
      return null;
  }
}

/**
 * Unknown/legacy block fallback: render its inline content inside a muted
 * container so future block types degrade to readable text instead of
 * vanishing or breaking the page.
 */
function UnknownBlock({
  block,
  ctx,
}: {
  block: ArticleBlockJson;
  ctx: RenderContext;
}) {
  const hasInline =
    Array.isArray(block.content) && block.content.length > 0;
  if (!hasInline && !block.children?.length) return null;
  return (
    <div className="text-cream-100 my-4 leading-relaxed break-words">
      {hasInline ? <InlineSequence content={block.content} /> : null}
      {block.children?.length ? (
        <RenderBlocks blocks={block.children} ctx={ctx} />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Document walker
 * ------------------------------------------------------------------------ */

function RenderBlocks({
  blocks,
  ctx,
}: {
  blocks: ArticleBlockJson[];
  ctx: RenderContext;
}) {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    const kind = listKindOf(block.type);
    if (kind) {
      // Group a consecutive run of same-kind list items into one list.
      const run: ArticleBlockJson[] = [];
      while (i < blocks.length && listKindOf(blocks[i].type) === kind) {
        run.push(blocks[i]);
        i++;
      }
      out.push(
        <ListGroup key={`list-${i}`} kind={kind} run={run} ctx={ctx} />
      );
      continue;
    }

    out.push(<RenderBlock key={block.id ?? i} block={block} ctx={ctx} />);
    i++;
  }
  return out;
}

function RenderBlock({
  block,
  ctx,
}: {
  block: ArticleBlockJson;
  ctx: RenderContext;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <>
          <ParagraphBlock block={block} />
          {block.children?.length ? (
            <RenderBlocks blocks={block.children} ctx={ctx} />
          ) : null}
        </>
      );
    case "heading":
      return (
        <>
          <HeadingBlock block={block} ctx={ctx} />
          {block.children?.length ? (
            <RenderBlocks blocks={block.children} ctx={ctx} />
          ) : null}
        </>
      );
    case "quote":
      return (
        <blockquote className="border-lime-500/40 text-cream-100 my-6 border-l-4 pl-4 leading-relaxed italic">
          <InlineSequence content={block.content} />
          {block.children?.length ? (
            <RenderBlocks blocks={block.children} ctx={ctx} />
          ) : null}
        </blockquote>
      );
    case "codeBlock":
      return <CodeBlockView block={block} />;
    case "table":
      return <TableBlockView block={block} />;
    case "image":
    case "video":
    case "audio":
    case "file":
      return <MediaBlockView block={block} ctx={ctx} />;
    case "divider":
      return <hr className="border-cream-100/10 my-8" />;
    default:
      if (
        block.type === "preset" ||
        block.type === "settings" ||
        block.type === "promptRecipe" ||
        block.type === "generation" ||
        block.type === "comparison" ||
        block.type === "workflow" ||
        block.type === "callout" ||
        block.type === "cta"
      ) {
        return (
          <>
            <CustomBlock block={block} ctx={ctx} />
            {block.children?.length ? (
              <RenderBlocks blocks={block.children} ctx={ctx} />
            ) : null}
          </>
        );
      }
      return <UnknownBlock block={block} ctx={ctx} />;
  }
}

export function ArticleRenderer({
  content,
  media,
  presets,
  headings,
}: {
  content: ArticleBlockJson[];
  media: Record<string, PublicAssetRef>;
  presets: ReadonlyMap<string, PublicProductDetail | null>;
  headings: HeadingIndex;
}) {
  return (
    <div className="min-w-0">
      <RenderBlocks blocks={content} ctx={{ media, presets, headings }} />
    </div>
  );
}
