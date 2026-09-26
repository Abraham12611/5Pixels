import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssetUrl } from "@/lib/generation/upload";
import { mapSafeGenerationRow } from "@/lib/generation/map";
import { isTerminalStatus } from "@/lib/generation/stages";
import { getPublicProducts, getUserFavoriteProducts } from "@/lib/db/explore";
import {
  LibrarySegments,
  type ActiveRun,
  type LibrarySegment,
} from "@/components/consumer/library-segments";
import type { LibraryItem } from "@/components/consumer/library-grid";
import type { LibraryRun } from "@/components/consumer/runs-list";
import type { PublicProductSummary } from "@/types/catalog";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const { tab } = await searchParams;
    const next =
      tab === "presets" || tab === "runs" ? `/app/library?tab=${tab}` : "/app/library";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const [{ tab }, { data: rows }, { data: favorites }] = await Promise.all([
    searchParams,
    supabase.rpc("get_user_generations"),
    getUserFavoriteProducts(),
  ]);
  const generations = ((rows ?? []) as Record<string, unknown>[]).map(
    mapSafeGenerationRow
  );
  const segment: LibrarySegment =
    tab === "presets" || tab === "runs" ? tab : "results";

  const completed = generations.filter((g) => g.status === "completed");
  const inProgress = generations.filter((g) => !isTerminalStatus(g.status));

  // Sign private output assets for the result grid, progress rail, and run
  // rows — all three segments share the same generation rows.
  const [items, active, runs] = await Promise.all([
    Promise.all(
      completed.map(
        async (g): Promise<LibraryItem> => ({
          id: g.id,
          productName: g.productName,
          productSlug: g.productSlug,
          createdAt: g.createdAt,
          savedAt: g.savedAt,
          downloadedAt: g.downloadedAt,
          outputUrl:
            g.outputBucket && g.outputStorageKey
              ? await getSignedAssetUrl(g.outputBucket, g.outputStorageKey, 3600)
              : null,
          outputWidth: g.outputWidth,
          outputHeight: g.outputHeight,
        })
      )
    ),
    Promise.all(
      inProgress.map(
        async (g): Promise<ActiveRun> => ({
          id: g.id,
          productName: g.productName,
          status: g.status,
          thumb:
            g.outputBucket && g.outputStorageKey
              ? await getSignedAssetUrl(g.outputBucket, g.outputStorageKey, 3600)
              : null,
        })
      )
    ),
    Promise.all(
      generations.map(
        async (g): Promise<LibraryRun> => ({
          id: g.id,
          productName: g.productName,
          status: g.status,
          creditCost: g.creditCost,
          createdAt: g.createdAt,
          thumb:
            g.outputBucket && g.outputStorageKey
              ? await getSignedAssetUrl(g.outputBucket, g.outputStorageKey, 3600)
              : null,
        })
      )
    ),
  ]);

  // The empty Presets segment suggests a few looks to save (11 §5). Only
  // fetched when the shelf is bare.
  let suggestions: PublicProductSummary[] = [];
  if (favorites.length === 0) {
    const { data } = await getPublicProducts(
      undefined,
      undefined,
      undefined,
      undefined,
      "featured",
      1,
      3
    );
    suggestions = data;
  }

  const subtitleParts = [
    items.length > 0 &&
      `${items.length} ${items.length === 1 ? "result" : "results"}`,
    favorites.length > 0 &&
      `${favorites.length} saved ${favorites.length === 1 ? "look" : "looks"}`,
    generations.length > 0 &&
      `${generations.length} ${generations.length === 1 ? "run" : "runs"}`,
  ].filter(Boolean);

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-cream-50 text-2xl font-bold sm:text-3xl">
            Library
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {subtitleParts.length === 0
              ? "Your results, saved looks, and runs live here."
              : subtitleParts.join(" · ")}
          </p>
        </div>

        <LibrarySegments
          key={segment}
          initialTab={segment}
          results={items}
          activeRuns={active}
          favorites={favorites}
          suggestions={suggestions}
          runs={runs}
        />
      </div>
    </main>
  );
}
