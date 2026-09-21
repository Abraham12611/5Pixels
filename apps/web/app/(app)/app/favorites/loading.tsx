export default function FavoritesLoading() {
  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-12">
      <div className="bg-charcoal-800 mb-4 h-10 w-56 animate-pulse rounded-lg" />
      <div className="bg-charcoal-800 mb-8 h-5 w-1/3 animate-pulse rounded-lg" />

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-charcoal-800 aspect-[4/5] animate-pulse rounded-2xl"
          />
        ))}
      </section>
    </main>
  );
}
