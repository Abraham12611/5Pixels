/**
 * Landing skeleton: mirrors the magazine composition — 16:9 launch carousel
 * rail, wide signup card + tiles grid, and a clipped preset shelf. Rendered
 * inside a Suspense boundary on `/` (a root `loading.tsx` would leak into
 * auth + other root-level routes).
 */
export function LandingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* Carousel rail — 16:9 media + two text rows below */}
      <div className="scrollbar-none flex gap-5 overflow-hidden px-4 pt-3 sm:px-6 md:pt-5 lg:px-10">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="w-[19.5rem] shrink-0 sm:w-[25rem] xl:w-[32rem]">
            <div className="bg-charcoal-800 aspect-video animate-pulse rounded-xl" />
            <div className="bg-charcoal-800 mt-3 h-4 w-2/3 animate-pulse rounded" />
            <div className="bg-charcoal-800/70 mt-2 h-3 w-1/2 animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Wide signup card + tiles */}
      <div className="mt-6 flex flex-col gap-3 px-4 sm:px-6 md:mt-8 lg:flex-row lg:gap-5 lg:px-10">
        <div className="bg-charcoal-800 aspect-[351/197] w-full animate-pulse rounded-xl md:rounded-[20px] lg:aspect-auto lg:min-h-[16.5rem] lg:w-[48%] lg:max-w-[40rem]" />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="bg-charcoal-800 min-h-[7.875rem] animate-pulse rounded-2xl"
            />
          ))}
        </div>
      </div>

      {/* Shelf */}
      <div className="mt-10 px-4 sm:px-6 md:mt-14 lg:px-10">
        <div className="bg-charcoal-800 h-7 w-44 animate-pulse rounded" />
        <div className="mt-5 columns-2 gap-2 md:columns-3 lg:columns-4 xl:columns-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={`bg-charcoal-800 mb-2 w-full animate-pulse break-inside-avoid rounded-xl ${
                i % 4 === 0
                  ? "aspect-[9/16]"
                  : i % 4 === 1
                    ? "aspect-[3/4]"
                    : i % 4 === 2
                      ? "aspect-video"
                      : "aspect-square"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
