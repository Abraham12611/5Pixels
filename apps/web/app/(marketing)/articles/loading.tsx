export default function ArticlesLoading() {
  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="bg-charcoal-800 mb-4 h-10 w-48 animate-pulse rounded-lg" />
        <div className="bg-charcoal-800 mb-8 h-6 w-full max-w-2xl animate-pulse rounded-lg" />

        <div className="mb-8 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-charcoal-800 h-9 w-24 animate-pulse rounded-full"
            />
          ))}
        </div>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-charcoal-850 border-cream-100/10 overflow-hidden rounded-2xl border"
            >
              <div className="bg-charcoal-800 aspect-[16/9] animate-pulse" />
              <div className="space-y-3 p-5">
                <div className="bg-charcoal-800 h-5 w-3/4 animate-pulse rounded" />
                <div className="bg-charcoal-800 h-4 w-full animate-pulse rounded" />
                <div className="bg-charcoal-800 h-4 w-2/3 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
