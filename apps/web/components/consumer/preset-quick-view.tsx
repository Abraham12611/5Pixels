"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PresetQuickSheet } from "@/components/consumer/preset-quick-sheet";
import { toQuickSheetPreset } from "@/lib/catalog/quick-sheet";
import { recordRecentPreset } from "@/lib/search/recents";
import type { PublicProductSummary } from "@/types/catalog";

type OpenQuickView = (product: PublicProductSummary) => void;

const QuickViewContext = createContext<OpenQuickView | null>(null);

/**
 * Subscribe inside a host's subtree. Returns null when no host is mounted —
 * surfaces where no provider exists keep card taps navigating to detail.
 */
export function usePresetQuickView(): OpenQuickView | null {
  return useContext(QuickViewContext);
}

interface PresetQuickViewHostProps {
  isAuthenticated: boolean;
  /** Server-loaded favorite product ids for this page. */
  favoriteIds?: string[];
  returnPath: string;
  /** Forwarded sheet toggles so surfaces (e.g. Favorites) can react. */
  onFavoriteToggled?: (productId: string, isFavorite: boolean) => void;
  children: ReactNode;
}

/**
 * Mounts one shared quick sheet for a discovery surface. Server-rendered
 * children compose through — ProductCard inside the subtree opens the sheet
 * on mobile instead of navigating.
 */
export function PresetQuickViewHost({
  isAuthenticated,
  favoriteIds = [],
  returnPath,
  onFavoriteToggled,
  children,
}: PresetQuickViewHostProps) {
  const [selected, setSelected] = useState<PublicProductSummary | null>(null);
  const [favorites, setFavorites] = useState(() => new Set(favoriteIds));

  const open = useCallback((product: PublicProductSummary) => {
    const sheet = toQuickSheetPreset(product);
    recordRecentPreset({
      slug: product.slug,
      name: product.name,
      thumbUrl: sheet.previewUrl,
    });
    setSelected(product);
  }, []);

  const handleToggled = useCallback(
    (productId: string, isFavorite: boolean) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorite) next.add(productId);
        else next.delete(productId);
        return next;
      });
      onFavoriteToggled?.(productId, isFavorite);
    },
    [onFavoriteToggled]
  );

  const item = useMemo(
    () => (selected ? toQuickSheetPreset(selected) : null),
    [selected]
  );

  return (
    <QuickViewContext.Provider value={open}>
      {children}
      <PresetQuickSheet
        item={item}
        onOpenChange={(openFlag) => {
          if (!openFlag) setSelected(null);
        }}
        isAuthenticated={isAuthenticated}
        initialIsFavorite={selected ? favorites.has(selected.id) : false}
        returnPath={returnPath}
        onFavoriteToggled={handleToggled}
      />
    </QuickViewContext.Provider>
  );
}
