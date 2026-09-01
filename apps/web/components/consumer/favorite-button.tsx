"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/app/actions/favorites";

interface FavoriteButtonProps {
  productId: string;
  initialIsFavorite: boolean;
  isAuthenticated: boolean;
  returnPath: string;
  compact?: boolean;
}

export function FavoriteButton({
  productId,
  initialIsFavorite,
  isAuthenticated,
  returnPath,
  compact = false,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button
        asChild
        variant="ghost"
        size="icon"
        className={cn(
          "bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 rounded-full backdrop-blur-sm hover:text-lime-400",
          compact ? "h-8 w-8" : "h-10 w-10"
        )}
        aria-label="Sign in to favorite this preset"
      >
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          prefetch={false}
        >
          <Heart className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
        </Link>
      </Button>
    );
  }

  const handleToggle = () => {
    setError(null);
    const next = !isFavorite;
    setIsFavorite(next);

    startTransition(async () => {
      const result = await toggleFavorite(productId, next);
      if (!result.success) {
        setIsFavorite(!next);
        setError(result.error ?? "Could not update favorite.");
      }
    });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isPending}
        onClick={handleToggle}
        className={cn(
          "focus:ring-offset-ink-950 rounded-full backdrop-blur-sm transition focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:outline-none",
          isFavorite
            ? "bg-error/20 text-error hover:bg-error/30"
            : "bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 hover:text-lime-400",
          compact ? "h-8 w-8" : "h-10 w-10"
        )}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={cn(
            compact ? "h-4 w-4" : "h-5 w-5",
            isFavorite && "fill-current"
          )}
        />
      </Button>
      {error && (
        <span
          role="status"
          className="text-error absolute top-full right-0 mt-1 w-40 text-xs"
        >
          {error}
        </span>
      )}
    </div>
  );
}
