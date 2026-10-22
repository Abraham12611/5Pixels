/**
 * Landing skeleton: mirrors the magazine composition — launch carousel rail,
 * signup + tiles grid, and a clipped preset shelf. Rendered inside a Suspense
 * boundary on `/` (a root `loading.tsx` would leak into auth + other
 * root-level routes).
 */
export function LandingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* Carousel rail */}
      <div className="scrollbar-none flex gap-4 overflow-hidden px-4 pt-6 sm:px-6 md:pt-10 lg:px-10">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="bg-charcoal-800 aspect-[4/3] w-[19rem] shrink-0 animate-pulse rounded-2xl sm:w-[24rem] md:aspect-[16/10] md:w-[27rem]"
          />
        ))}
      </div>

      {/* Signup + tiles */}
      <div className="mt-6 grid gap-4 px-4 sm:px-6 md:mt-10 lg:px-10 xl:grid-cols-[22rem_1fr]">
        <div className="bg-charcoal-800 h-56 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="bg-charcoal-800 h-28 animate-pulse rounded-2xl md:h-32"
            />
          ))}
        </div>
      </div>

      {/* Shelf */}
      <div className="mt-10 px-4 sm:px-6 md:mt-14 lg:px-10">
        <div className="bg-charcoal-800 h-7 w-44 animate-pulse rounded" />
        <div className="mt-5 columns-2 gap-3 md:columns-3 md:gap-4 xl:columns-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={`bg-charcoal-800 mb-3 w-full animate-pulse break-inside-avoid rounded-xl md:mb-4 ${
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
  );
}
