export default function ExploreLoading() {
  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-12">
      <div className="bg-charcoal-800 mb-8 h-10 w-64 animate-pulse rounded-lg" />
      <div className="bg-charcoal-800 mb-8 h-6 w-1/2 max-w-md animate-pulse rounded-lg" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-charcoal-800 h-10 w-24 animate-pulse rounded-full"
            />
          ))}
        </div>
        <div className="bg-charcoal-800 h-10 w-40 animate-pulse rounded-xl" />
      </div>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-charcoal-800 aspect-[4/5] animate-pulse rounded-2xl"
          />
        ))}
      </section>
    </main>
  );
}
