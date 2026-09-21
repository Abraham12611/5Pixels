import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedAssetUrl } from "@/lib/generation/upload";
import { mapSafeGenerationRow } from "@/lib/generation/map";
import { isFailureStatus, isTerminalStatus } from "@/lib/generation/stages";
import { LibraryGrid, type LibraryItem } from "@/components/consumer/library-grid";
import { cn } from "@/lib/utils";

function statusChip(status: string): { label: string; className: string } {
  if (isFailureStatus(status)) {
    return { label: "Failed", className: "bg-error/15 text-error" };
  }
  return { label: "In progress", className: "bg-cream-100/10 text-cream-100" };
}

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=/app/library");
  }

  const { data: rows } = await supabase.rpc("get_user_generations");
  const generations = ((rows ?? []) as Record<string, unknown>[]).map(
    mapSafeGenerationRow
  );

  const completed = generations.filter((g) => g.status === "completed");
  const inProgress = generations.filter((g) => !isTerminalStatus(g.status));

  // Sign private output assets for the result grid and progress rail.
  const [items, active] = await Promise.all([
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
      inProgress.map(async (g) => ({
        id: g.id,
        productName: g.productName,
        status: g.status,
        thumb:
          g.outputBucket && g.outputStorageKey
            ? await getSignedAssetUrl(g.outputBucket, g.outputStorageKey, 3600)
            : null,
      }))
    ),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-cream-50 text-2xl font-bold sm:text-3xl">
            Library
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            {items.length === 0
              ? "Your finished results live here."
              : `${items.length} ${items.length === 1 ? "result" : "results"}`}
          </p>
        </div>

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-text-secondary mb-3 text-sm font-medium">
              In progress
            </h2>
            <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
              {active.map((gen) => {
                const chip = statusChip(gen.status);
                return (
                  <Link
                    key={gen.id}
                    href={`/app/generations/${gen.id}`}
                    className="group shadow-border hover:shadow-border-hover w-36 shrink-0 snap-start overflow-hidden rounded-xl bg-charcoal-850 transition-colors sm:w-40"
                  >
                    <span className="bg-charcoal-800 media-frame relative block aspect-[4/5]">
                      {gen.thumb ? (
                        <Image
                          src={gen.thumb}
                          alt=""
                          fill
                          unoptimized
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="bg-charcoal-700 h-8 w-8 animate-pulse rounded-md" />
                        </span>
                      )}
                    </span>
                    <span className="block p-2.5">
                      <span className="text-cream-50 block truncate text-xs font-medium">
                        {gen.productName}
                      </span>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                          chip.className
                        )}
                      >
                        {chip.label}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <LibraryGrid items={items} />
      </div>
    </main>
  );
}
