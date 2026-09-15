"use client";

import { useEffect } from "react";
import { recordRecentPreset } from "@/lib/search/recents";

interface RecentPresetRecorderProps {
  slug: string;
  name: string;
  thumbUrl: string | null;
}

/**
 * Records the visited preset into localStorage so the global search palette
 * can surface it under "Recent". Renders nothing.
 */
export function RecentPresetRecorder({
  slug,
  name,
  thumbUrl,
}: RecentPresetRecorderProps) {
  useEffect(() => {
    recordRecentPreset({ slug, name, thumbUrl });
  }, [slug, name, thumbUrl]);

  return null;
}
