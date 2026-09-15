"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowRight,
  Clock,
  GridFour,
  Image as ImageIcon,
  MagnifyingGlass,
  Warning,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import {
  filterCategories,
  filterLibrary,
  filterPresets,
  type SearchCategory,
  type SearchLibraryItem,
  type SearchPreset,
  type SearchScope,
} from "@/lib/search";
import {
  getRecentPresets,
  recordRecentPreset,
  type RecentPreset,
} from "@/lib/search/recents";

const SCOPES: { key: SearchScope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "presets", label: "Presets" },
  { key: "categories", label: "Categories" },
  { key: "library", label: "Library" },
];

const ITEM_CLASS =
  "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none data-[selected=true]:bg-charcoal-700";
const GROUP_HEADING_CLASS =
  "[&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider";

export interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: SearchPreset[];
  categories: SearchCategory[];
  library: SearchLibraryItem[];
  /** True when the catalog fetch failed — shows a retryable error state. */
  catalogError?: boolean;
}

export function SearchPalette({
  open,
  onOpenChange,
  presets,
  categories,
  library,
  catalogError,
}: SearchPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [recents, setRecents] = useState<RecentPreset[]>([]);

  // Reset query/scope and re-read recents each time the palette opens.
  // Render-phase state adjustment (React docs pattern) — recents live in
  // localStorage and must be re-read per open without an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setScope("all");
      setRecents(getRecentPresets());
    }
  }

  const filteredPresets = useMemo(
    () => filterPresets(presets, query),
    [presets, query]
  );
  const filteredCategories = useMemo(
    () => filterCategories(categories, query),
    [categories, query]
  );
  const filteredLibrary = useMemo(
    () => filterLibrary(library, query),
    [library, query]
  );

  const close = () => onOpenChange(false);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const goPreset = (preset: { slug: string; name: string; thumbUrl: string | null }) => {
    recordRecentPreset({
      slug: preset.slug,
      name: preset.name,
      thumbUrl: preset.thumbUrl,
    });
    go(`/presets/${preset.slug}`);
  };

  const generationHref = (item: SearchLibraryItem) =>
    item.status === "completed"
      ? `/app/results/${item.id}`
      : `/app/generations/${item.id}`;

  const showPresets = scope === "all" || scope === "presets";
  const showCategories = scope === "all" || scope === "categories";
  const showLibrary = scope === "all" || scope === "library";
  const isZeroQuery = query.trim() === "";

  const presetCap = scope === "presets" ? filteredPresets.length : 5;
  const categoryCap = scope === "categories" ? filteredCategories.length : 3;
  const libraryCap = scope === "library" ? filteredLibrary.length : 4;

  const emptyCopy: Record<SearchScope, string> = {
    all: `No results for “${query}”`,
    presets: `No matching presets for “${query}”`,
    categories: `No matching categories for “${query}”`,
    library: `Nothing in your library for “${query}”`,
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      loop
      label="Search presets, categories, and your library"
      overlayClassName="bg-ink-950/85 animate-overlay-in fixed inset-0 z-50 backdrop-blur-sm"
      contentClassName="bg-charcoal-900 animate-dialog-in fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[8vh] sm:h-auto sm:max-h-[84vh] sm:w-[min(56rem,92vw)] sm:-translate-x-1/2 sm:rounded-xl sm:border sm:border-cream-100/10 sm:shadow-elevated"
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* Sticky search header */}
      <div className="border-cream-100/10 border-b">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <MagnifyingGlass
            size={20}
            weight="bold"
            className="text-text-muted shrink-0"
          />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search presets, categories, and your library"
            className="text-cream-50 placeholder:text-text-muted h-6 flex-1 bg-transparent text-base outline-none"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-text-muted hover:text-cream-100 rounded-md p-1 transition-colors"
              aria-label="Clear search"
            >
              <X size={16} weight="bold" />
            </button>
          )}
          <kbd className="border-cream-100/15 text-text-muted hidden rounded-md border px-1.5 py-0.5 font-mono text-[11px] sm:block">
            esc
          </kbd>
          <button
            type="button"
            onClick={close}
            className="text-text-muted hover:text-cream-100 hover:bg-charcoal-800 rounded-md p-1.5 transition-colors sm:hidden"
            aria-label="Close search"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scope chips */}
        <div
          className="flex gap-1.5 overflow-x-auto px-4 pb-3 sm:px-5"
          role="tablist"
          aria-label="Search scope"
        >
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={scope === s.key}
              onClick={() => setScope(s.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                scope === s.key
                  ? "bg-charcoal-700 text-cream-50"
                  : "text-text-secondary hover:text-cream-100 hover:bg-charcoal-800"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results body */}
      <Command.List className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 sm:px-3">
        {catalogError && (
          <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
            <Warning size={15} weight="bold" className="shrink-0" />
            <span className="flex-1">
              Couldn&apos;t load the catalog. Your library search still works.
            </span>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="text-cream-50 hover:text-lime-300 font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <Command.Empty>
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <p className="text-cream-50 text-sm font-medium">
              {isZeroQuery
                ? "Nothing to show yet — new looks are on the way."
                : emptyCopy[scope]}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => go("/explore")}
                className="bg-charcoal-800 text-cream-100 hover:bg-charcoal-700 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
              >
                Explore all presets
              </button>
              {scope === "library" && (
                <button
                  type="button"
                  onClick={() => go("/app/generations")}
                  className="text-text-secondary hover:text-cream-100 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
                >
                  Open Library
                </button>
              )}
            </div>
          </div>
        </Command.Empty>

        {isZeroQuery ? (
          <>
            {recents.length > 0 && showPresets && (
              <Command.Group heading="Recent" className={GROUP_HEADING_CLASS}>
                {recents.map((r) => (
                  <Command.Item
                    key={`recent-${r.slug}`}
                    value={`recent-${r.slug}`}
                    onSelect={() => goPreset(r)}
                    className={ITEM_CLASS}
                  >
                    <RowMarker />
                    <Thumb url={r.thumbUrl} fallback={<Clock size={16} weight="bold" />} />
                    <span className="text-cream-100 min-w-0 flex-1 truncate">
                      {r.name}
                    </span>
                    <span className="text-text-muted text-xs">Recent</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {showPresets && presets.length > 0 && (
              <Command.Group
                heading="Trending now"
                className={GROUP_HEADING_CLASS}
              >
                {presets.slice(0, 3).map((p) => (
                  <PresetRow key={`trend-${p.slug}`} preset={p} onSelect={goPreset} />
                ))}
              </Command.Group>
            )}

            {showCategories && categories.length > 0 && (
              <Command.Group
                heading="Browse categories"
                className={GROUP_HEADING_CLASS}
              >
                {categories.map((c) => (
                  <CategoryRow
                    key={`cat-${c.slug}`}
                    category={c}
                    onSelect={() => go(`/explore?category=${c.slug}`)}
                  />
                ))}
              </Command.Group>
            )}

            {showLibrary && library.length > 0 && (
              <Command.Group
                heading="From your library"
                className={GROUP_HEADING_CLASS}
              >
                {library.slice(0, 4).map((item) => (
                  <LibraryRow
                    key={`lib-${item.id}`}
                    item={item}
                    onSelect={() => go(generationHref(item))}
                  />
                ))}
              </Command.Group>
            )}
          </>
        ) : (
          <>
            {showPresets && filteredPresets.length > 0 && (
              <Command.Group heading="Presets" className={GROUP_HEADING_CLASS}>
                {filteredPresets.slice(0, presetCap).map((p) => (
                  <PresetRow key={`p-${p.slug}`} preset={p} onSelect={goPreset} />
                ))}
                {filteredPresets.length > presetCap && (
                  <Command.Item
                    value="see-all-presets"
                    onSelect={() =>
                      go(`/explore?search=${encodeURIComponent(query)}`)
                    }
                    className={ITEM_CLASS}
                  >
                    <RowMarker />
                    <span className="text-lime-300 flex flex-1 items-center gap-1.5 text-xs font-medium">
                      See all {filteredPresets.length} matching presets
                      <ArrowRight size={13} weight="bold" />
                    </span>
                  </Command.Item>
                )}
              </Command.Group>
            )}

            {showCategories && filteredCategories.length > 0 && (
              <Command.Group
                heading="Categories"
                className={GROUP_HEADING_CLASS}
              >
                {filteredCategories.slice(0, categoryCap).map((c) => (
                  <CategoryRow
                    key={`cat-${c.slug}`}
                    category={c}
                    onSelect={() => go(`/explore?category=${c.slug}`)}
                  />
                ))}
              </Command.Group>
            )}

            {showLibrary && filteredLibrary.length > 0 && (
              <Command.Group heading="Library" className={GROUP_HEADING_CLASS}>
                {filteredLibrary.slice(0, libraryCap).map((item) => (
                  <LibraryRow
                    key={`lib-${item.id}`}
                    item={item}
                    onSelect={() => go(generationHref(item))}
                  />
                ))}
              </Command.Group>
            )}
          </>
        )}
      </Command.List>

      {/* Keyboard hints */}
      <div className="border-cream-100/10 text-text-muted hidden items-center gap-4 border-t px-5 py-2.5 text-[11px] sm:flex">
        <span className="flex items-center gap-1.5">
          <kbd className="border-cream-100/15 rounded border px-1 font-mono">↑↓</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="border-cream-100/15 rounded border px-1 font-mono">↵</kbd>
          Open
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="border-cream-100/15 rounded border px-1 font-mono">esc</kbd>
          Close
        </span>
      </div>
    </Command.Dialog>
  );
}

/** Leading five-pixel marker, revealed when the row is keyboard-selected. */
function RowMarker() {
  return (
    <FivePixelMark className="w-[27px] shrink-0 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
  );
}

function Thumb({
  url,
  fallback,
}: {
  url: string | null;
  fallback: React.ReactNode;
}) {
  return (
    <span className="bg-charcoal-800 text-text-muted media-frame relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny search thumbs don't need next/image optimization
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          {fallback}
        </span>
      )}
    </span>
  );
}

function PresetRow({
  preset,
  onSelect,
}: {
  preset: SearchPreset;
  onSelect: (preset: SearchPreset) => void;
}) {
  return (
    <Command.Item
      value={`preset-${preset.slug}`}
      onSelect={() => onSelect(preset)}
      className={ITEM_CLASS}
    >
      <RowMarker />
      <Thumb
        url={preset.thumbUrl}
        fallback={<ImageIcon size={16} weight="bold" />}
      />
      <span className="min-w-0 flex-1">
        <span className="text-cream-100 block truncate text-sm font-medium">
          {preset.name}
        </span>
        <span className="text-text-muted block truncate text-xs">
          {preset.description ??
            [preset.categoryName, preset.type === "poster" ? "Poster" : "Filter"]
              .filter(Boolean)
              .join(" · ")}
        </span>
      </span>
      {preset.badge === "trending" && (
        <span className="bg-lime-400/15 text-lime-300 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide">
          TRENDING
        </span>
      )}
      {preset.badge === "new" && (
        <span className="bg-charcoal-700 text-cream-100 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide">
          NEW
        </span>
      )}
      <span className="text-text-muted shrink-0 font-mono text-xs">
        {preset.creditCost} cr
      </span>
    </Command.Item>
  );
}

function CategoryRow({
  category,
  onSelect,
}: {
  category: SearchCategory;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={`category-${category.slug}`}
      onSelect={onSelect}
      className={ITEM_CLASS}
    >
      <RowMarker />
      <span className="bg-charcoal-800 text-text-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
        <GridFour size={16} weight="bold" />
      </span>
      <span className="text-cream-100 min-w-0 flex-1 truncate text-sm font-medium">
        {category.name}
      </span>
      <ArrowRight
        size={14}
        weight="bold"
        className="text-text-muted shrink-0 opacity-0 transition-opacity group-data-[selected=true]:opacity-100"
      />
    </Command.Item>
  );
}

function LibraryRow({
  item,
  onSelect,
}: {
  item: SearchLibraryItem;
  onSelect: () => void;
}) {
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <Command.Item
      value={`library-${item.id}`}
      onSelect={onSelect}
      className={ITEM_CLASS}
    >
      <RowMarker />
      <Thumb
        url={item.thumbUrl}
        fallback={<ImageIcon size={16} weight="bold" />}
      />
      <span className="min-w-0 flex-1">
        <span className="text-cream-100 block truncate text-sm font-medium">
          {item.productName}
        </span>
        <span className="text-text-muted block truncate text-xs">
          {item.status === "completed" ? "Result" : "In progress"} · {date}
        </span>
      </span>
    </Command.Item>
  );
}
