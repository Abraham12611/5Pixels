"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ImageBroken, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchCatalogPage } from "@/lib/catalog/browser";
import {
  isVideoMimeType,
  publicAssetUrl,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import { cn } from "@/lib/utils";
import type { ProductType, PublicProductSummary } from "@/types/catalog";

/**
 * /preset picker (#127). Searches the PUBLIC catalog only — the same
 * get_public_catalog RPC anon readers use — so no private recipe or
 * unpublished-version data can ever appear here.
 *
 * A pick stores the canonical products.id (plus slug + the currently
 * public version id for display pinning). The block never stores
 * description/CTA copy — those resolve server-side at render time.
 */
export interface PresetPick {
  presetId: string;
  slug: string;
  /** The product's public version at pick time — stored as
   * selectedPublicVersionId so the block can pin what the author saw. */
  publicVersionId: string | null;
  name: string;
}

interface PresetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pick: PresetPick) => void;
}

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

const TYPE_TABS: { value: ProductType | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "filter", label: "Filters" },
  { value: "poster", label: "Posters" },
];

function resultThumb(product: PublicProductSummary) {
  const media = selectCatalogMediaAsset(product.public_assets, "card");
  if (!media) {
    return (
      <span className="bg-charcoal-800 flex size-12 items-center justify-center rounded-lg">
        <ImageBroken size={16} className="text-text-muted" aria-hidden />
      </span>
    );
  }
  const url = publicAssetUrl(media.bucket, media.storage_key);
  return isVideoMimeType(media.mime_type) ? (
    <video
      src={url}
      muted
      playsInline
      preload="metadata"
      aria-hidden
      className="size-12 rounded-lg object-cover"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- remote public storage URL
    <img
      src={url}
      alt=""
      loading="lazy"
      className="size-12 rounded-lg object-cover"
    />
  );
}

export function PresetPicker({
  open,
  onOpenChange,
  onPick,
}: PresetPickerProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ProductType | null>(null);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<PublicProductSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryTick, setRetryTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);

  // Debounce the search term before it reaches the catalog query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Query changes reset pagination inside the event handlers below —
  // setState-in-effect is deliberately avoided (react-hooks rule).

  // Fetch the public catalog page. The parent mounts this component on
  // open and unmounts on close, so all state starts fresh per open and no
  // in-flight response from a prior session can land.
  useEffect(() => {
    if (!open) return;
    const seq = ++requestSeq.current;
    void (async () => {
      setLoading(true);
      setError(false);
      const result = await fetchCatalogPage({
        type,
        search: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      });
      if (seq !== requestSeq.current) return; // stale response
      if (result.products.length === 0 && result.totalCount === 0 && page > 1) {
        // Page out of range after a filter change — the same async
        // continuation may setState; react-hooks only bans sync calls.
        setPage(1);
      }
      setProducts(result.products);
      setTotalCount(result.totalCount);
      setActiveIndex(result.products.length > 0 ? 0 : -1);
      setLoading(false);
    })().catch(() => {
      if (seq !== requestSeq.current) return;
      setError(true);
      setProducts([]);
      setLoading(false);
    });
  }, [open, type, debouncedSearch, page, retryTick]);

  const pick = useCallback(
    (product: PublicProductSummary) => {
      onPick({
        presetId: product.id,
        slug: product.slug,
        publicVersionId: product.version_id ?? null,
        name: product.name,
      });
      onOpenChange(false);
    },
    [onPick, onOpenChange]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (products.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, products.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(products[activeIndex]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(products.length - 1);
    }
  };

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelector(
      `[data-index="${activeIndex}"]`
    );
    // scrollIntoView is missing in jsdom — feature-detect, don't assume.
    el?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Embed a preset</DialogTitle>
        <DialogDescription>
          Search the live catalog — only published filters and posters appear.
          Readers see the preset&apos;s current public card.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="max-w-xl">
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="text-text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // new query → back to page 1
              }}
              onKeyDown={onListKeyDown}
              placeholder="Search presets…"
              aria-label="Search presets"
              role="combobox"
              aria-expanded
              aria-controls="preset-picker-listbox"
              aria-activedescendant={
                activeIndex >= 0 ? `preset-option-${activeIndex}` : undefined
              }
              className="pl-9"
              autoFocus
            />
          </div>

          <div
            className="flex gap-1.5"
            role="tablist"
            aria-label="Preset type"
          >
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={type === tab.value}
                onClick={() => {
                  setType(tab.value);
                  setPage(1); // new filter → back to page 1
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  type === tab.value
                    ? "bg-lime-400 text-ink-950"
                    : "bg-charcoal-800 text-text-secondary hover:text-cream-100"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            ref={listRef}
            id="preset-picker-listbox"
            role="listbox"
            tabIndex={-1}
            aria-label="Preset results"
            aria-busy={loading}
            className="max-h-[320px] min-h-[180px] space-y-1 overflow-y-auto pr-1"
            onKeyDown={onListKeyDown}
          >
            {loading && products.length === 0 ? (
              <div className="text-text-muted flex h-[180px] items-center justify-center text-sm">
                Loading presets…
              </div>
            ) : error ? (
              <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
                <p className="text-cream-100 text-sm">
                  Couldn&apos;t load the catalog.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setRetryTick((t) => t + 1)}
                >
                  Try again
                </Button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-text-muted flex h-[180px] flex-col items-center justify-center gap-1 text-center text-sm">
                <p>No presets match your search.</p>
                <p className="text-xs">
                  Only published filters and posters can be embedded.
                </p>
              </div>
            ) : (
              products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  id={`preset-option-${i}`}
                  data-index={i}
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(p)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors",
                    i === activeIndex
                      ? "border-lime-400/50 bg-charcoal-800"
                      : "hover:bg-charcoal-800/60"
                  )}
                >
                  {resultThumb(p)}
                  <span className="min-w-0 flex-1">
                    <span className="text-cream-50 block truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="text-text-muted block truncate text-xs">
                      {p.type === "filter" ? "Filter" : "Poster"}
                      {p.category_name ? ` · ${p.category_name}` : ""}
                      {p.short_description
                        ? ` — ${p.short_description}`
                        : ""}
                    </span>
                  </span>
                  <span className="text-text-muted shrink-0 text-xs">
                    {p.credit_cost}cr
                  </span>
                </button>
              ))
            )}
          </div>

          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-text-muted text-xs">
                Page {page} of {totalPages} · {totalCount} presets
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
