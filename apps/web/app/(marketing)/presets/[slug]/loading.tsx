/**
 * Preset detail skeleton (07 §5): mobile mirrors the new composition —
 * full-bleed 4:5 hero, title + chips, bullets, 3 example thumbs, docked CTA.
 * Desktop keeps the two-column skeleton.
 */
export default function PresetDetailLoading() {
  return (
    <main className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading">
      {/* Mobile composition */}
      <div className="md:hidden">
        <div className="bg-charcoal-800 aspect-[4/5] w-full animate-pulse" />
        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="bg-charcoal-800 h-8 w-48 animate-pulse rounded-lg" />
            <div className="bg-charcoal-800 h-11 w-11 animate-pulse rounded-full" />
          </div>
          <div className="mt-3 flex gap-2">
            <div className="bg-charcoal-800 h-7 w-16 animate-pulse rounded-md" />
            <div className="bg-charcoal-800 h-7 w-20 animate-pulse rounded-md" />
          </div>
          <div className="bg-charcoal-800 mt-3 h-4 w-full animate-pulse rounded" />
          <div className="bg-charcoal-800 mt-2 h-4 w-3/4 animate-pulse rounded" />
        </div>
        <div className="mt-[30px] px-5">
          <div className="bg-charcoal-800 h-6 w-32 animate-pulse rounded" />
          <div className="mt-[15px] space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="bg-charcoal-800 h-5 w-full animate-pulse rounded"
              />
            ))}
          </div>
        </div>
        <div className="mt-[30px] px-5">
          <div className="bg-charcoal-800 h-6 w-28 animate-pulse rounded" />
          <div className="mt-[15px] grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="bg-charcoal-800 aspect-square animate-pulse rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop composition */}
      <div className="hidden md:block">
        <div className="border-cream-100/10 bg-charcoal-850 border-b">
          <div className="mx-auto flex h-16 max-w-7xl animate-pulse items-center px-4 sm:px-6">
            <div className="bg-charcoal-700 h-5 w-24 rounded-lg" />
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:py-12">
          <div>
            <div className="bg-charcoal-800 aspect-[4/5] animate-pulse rounded-2xl" />
          </div>
          <div className="flex flex-col gap-6">
            <div className="bg-charcoal-800 h-8 w-3/4 animate-pulse rounded-lg" />
            <div className="bg-charcoal-800 h-24 w-full animate-pulse rounded-lg" />
            <div className="bg-charcoal-800 h-48 w-full animate-pulse rounded-2xl" />
            <div className="bg-charcoal-800 mt-auto h-12 w-full animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
