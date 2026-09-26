"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { PresetQuickSheet } from "@/components/consumer/preset-quick-sheet";
import { recordRecentPreset } from "@/lib/search/recents";
import type { LandingFeedItem } from "./landing-feed-types";

type OpenLandingQuickView = (item: LandingFeedItem) => void;

const LandingQuickViewContext =
  createContext<OpenLandingQuickView | null>(null);

/**
 * Subscribe inside a `LandingQuickViewHost` subtree — hero Preview ghosts and
 * feed cards call this to open the shared quick sheet. Returns null when no
 * host is mounted.
 */
export function useLandingQuickView(): OpenLandingQuickView | null {
  return useContext(LandingQuickViewContext);
}

/**
 * Mounts the landing page's one quick sheet so the hero carousel and the feed
 * share the same overlay (25_MOBILE_WEB_POLISH/05 §2, /07 §2).
 */
export function LandingQuickViewHost({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  const [item, setItem] = useState<LandingFeedItem | null>(null);

  const open = useCallback((next: LandingFeedItem) => {
    recordRecentPreset({
      slug: next.slug,
      name: next.name,
      thumbUrl: next.previewUrl,
    });
    setItem(next);
  }, []);

  return (
    <LandingQuickViewContext.Provider value={open}>
      {children}
      <PresetQuickSheet
        item={item}
        onOpenChange={(openFlag) => {
          if (!openFlag) setItem(null);
        }}
        isAuthenticated={isAuthenticated}
        returnPath="/"
      />
    </LandingQuickViewContext.Provider>
  );
}
