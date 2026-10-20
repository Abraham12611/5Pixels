"use client";

import { FilterStyleEditor } from "./filter-style-editor";
import { PosterCompositionEditor } from "./poster-composition-editor";

/**
 * Creative settings section (#223, Engineer B) — the single mount point
 * Engineer A drops into the shared product form in place of the old inline
 * "Filter settings"/"Poster settings" block. Reads and writes the existing
 * `filter_config.*` / `poster_config.*` RHF paths via `useFormContext`; no
 * props beyond the product type and no new server data.
 */
export function PresetCreativeSettings({
  type,
}: {
  type: "filter" | "poster";
}) {
  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <h2 className="text-cream-50 mb-4 text-lg font-semibold">
        {type === "filter" ? "Filter style" : "Poster composition"}
      </h2>
      {type === "filter" ? <FilterStyleEditor /> : <PosterCompositionEditor />}
    </section>
  );
}
