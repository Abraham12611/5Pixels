"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/consumer/product-card";
import { PresetQuickViewHost } from "@/components/consumer/preset-quick-view";
import { RetiredPresetCard } from "@/components/consumer/retired-preset-card";
import { toggleFavorite } from "@/app/actions/favorites";
import type { FavoriteProduct } from "@/types/catalog";

/**
 * The saved-looks grid. Cards use the exact Explore card system; unavailable
 * presets render muted with a recovery path. Unfavoriting removes the card
 * with a reversible toast per the design bible (FV-03).
 */
export function FavoritesGrid({
  favorites,
  returnPath = "/app/library?tab=presets",
}: {
  favorites: FavoriteProduct[];
  returnPath?: string;
}) {
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const markRemoved = (productId: string, removed: boolean) =>
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (removed) next.add(productId);
      else next.delete(productId);
      return next;
    });

  const handleFavoriteChange = (productId: string, isFavorite: boolean) => {
    if (isFavorite) return;
    markRemoved(productId, true);
    toast("Removed from Favorites", {
      action: {
        label: "Undo",
        onClick: async () => {
          const result = await toggleFavorite(productId, true);
          if (result.success) {
            markRemoved(productId, false);
          } else {
            toast.error("Could not restore this preset.");
          }
        },
      },
    });
  };

  return (
    <PresetQuickViewHost
      isAuthenticated
      favoriteIds={favorites.map((f) => f.product.id)}
      returnPath={returnPath}
      onFavoriteToggled={handleFavoriteChange}
    >
      <section
        aria-label="Favorite presets"
        className="columns-2 gap-5 md:columns-3 xl:columns-4"
      >
        {favorites.map(({ product, isAvailable }) => {
          if (removedIds.has(product.id)) return null;
          return isAvailable ? (
            <div key={product.id} className="mb-5 break-inside-avoid">
              <ProductCard
                product={product}
                isAuthenticated
                initialIsFavorite
                returnPath={returnPath}
                onFavoriteChange={handleFavoriteChange}
              />
            </div>
          ) : (
            <RetiredPresetCard key={product.id} product={product} />
          );
        })}
      </section>
    </PresetQuickViewHost>
  );
}
