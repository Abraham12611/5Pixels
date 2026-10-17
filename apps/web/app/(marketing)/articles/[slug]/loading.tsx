/** Article detail skeleton — cover, title, byline, body lines, TOC rail. */
export default function ArticleLoading() {
  return (
    <main
      className="flex flex-1 flex-col"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-16 sm:px-8">
        <div className="bg-charcoal-800 h-5 w-20 animate-pulse rounded" />
        <div className="mt-6 max-w-3xl space-y-4">
          <div className="bg-charcoal-800 h-7 w-24 animate-pulse rounded-full" />
          <div className="bg-charcoal-800 h-10 w-3/4 animate-pulse rounded-lg" />
          <div className="bg-charcoal-800 h-5 w-full animate-pulse rounded" />
          <div className="flex items-center gap-3 pt-2">
            <div className="bg-charcoal-800 h-9 w-9 animate-pulse rounded-full" />
            <div className="bg-charcoal-800 h-4 w-28 animate-pulse rounded" />
            <div className="bg-charcoal-800 h-4 w-40 animate-pulse rounded" />
          </div>
        </div>
        <div className="bg-charcoal-800 mt-8 aspect-[16/8] w-full animate-pulse rounded-xl" />
        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
          <div className="max-w-3xl space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="bg-charcoal-800 h-4 animate-pulse rounded"
                style={{ width: `${92 - (i % 4) * 12}%` }}
              />
            ))}
            <div className="bg-charcoal-800 mt-6 h-40 w-full animate-pulse rounded-xl" />
          </div>
          <div className="hidden space-y-2 lg:block">
            <div className="bg-charcoal-800 h-3 w-20 animate-pulse rounded" />
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="bg-charcoal-800 h-4 w-3/4 animate-pulse rounded"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
