/**
 * Discover skeleton (05 §5): three section skeletons with horizontal rails —
 * matches the MobileSection + MobileRail grammar (20px gutters, 15px title
 * gap, fixed-width cards).
 */
function RailSkeleton() {
  return (
    <section className="py-[15px]">
      <div className="flex items-center justify-between px-5">
        <div className="bg-charcoal-800 h-7 w-36 animate-pulse rounded" />
        <div className="bg-charcoal-800 h-5 w-16 animate-pulse rounded" />
      </div>
      <div className="scrollbar-none mt-[15px] flex gap-[10px] overflow-hidden px-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="bg-charcoal-800 aspect-[4/5] w-44 shrink-0 animate-pulse rounded-xl sm:w-52"
          />
        ))}
      </div>
    </section>
  );
}

export default function AppLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="px-5">
        <div className="bg-charcoal-800 h-44 w-full animate-pulse rounded-xl" />
      </div>
      <RailSkeleton />
      <RailSkeleton />
      <RailSkeleton />
    </div>
  );
}
