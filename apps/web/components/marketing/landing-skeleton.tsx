/**
 * Landing skeleton (05 §5): mirrors the mobile composition below lg — 4:5
 * hero, search pill, chips row, rail + masonry — and a generic editorial
 * skeleton on desktop. Rendered inside a Suspense boundary on `/` (a root
 * `loading.tsx` would leak into auth + other root-level routes).
 */
export function LandingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* Mobile composition */}
      <div className="lg:hidden">
        <div className="px-5 pt-4">
          <div className="bg-charcoal-800 aspect-[4/5] w-full animate-pulse rounded-2xl" />
          <div className="mt-3 flex justify-center gap-1.5">
            <span className="bg-charcoal-700 h-1.5 w-4 rounded-full" />
            <span className="bg-charcoal-700 h-1.5 w-1.5 rounded-full" />
            <span className="bg-charcoal-700 h-1.5 w-1.5 rounded-full" />
          </div>
        </div>
        <div className="mt-5 px-5">
          <div className="bg-charcoal-800 h-12 animate-pulse rounded-full" />
        </div>
        <div className="scrollbar-none mt-5 flex gap-2 overflow-hidden px-5">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className="bg-charcoal-800 h-11 w-24 shrink-0 animate-pulse rounded-full"
            />
          ))}
        </div>
        <div className="mt-[30px] px-5">
          <div className="bg-charcoal-800 h-6 w-28 animate-pulse rounded" />
          <div className="scrollbar-none mt-[15px] flex gap-[10px] overflow-hidden">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="bg-charcoal-800 aspect-[4/5] w-[156px] shrink-0 animate-pulse rounded-xl"
              />
            ))}
          </div>
        </div>
        <div className="mt-[30px] px-5">
          <div className="bg-charcoal-800 h-6 w-32 animate-pulse rounded" />
          <div className="mt-[15px] columns-2 gap-3 [column-fill:_balance]">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={`bg-charcoal-800 mb-3 w-full animate-pulse break-inside-avoid rounded-xl ${
                  i % 3 === 0
                    ? "aspect-[3/4]"
                    : i % 3 === 1
                      ? "aspect-[4/5]"
                      : "aspect-square"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop composition */}
      <div className="mx-auto hidden w-full max-w-7xl px-6 py-16 lg:block">
        <div className="bg-charcoal-800 h-4 w-40 animate-pulse rounded" />
        <div className="bg-charcoal-800 mt-4 h-14 w-2/3 animate-pulse rounded-xl" />
        <div className="bg-charcoal-800 mt-4 h-5 w-1/3 animate-pulse rounded" />
        <div className="mt-12 grid grid-cols-4 gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="bg-charcoal-800 aspect-[4/5] animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
