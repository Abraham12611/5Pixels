export default function CategoriesLoading() {
  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-12">
      <div className="bg-charcoal-800 mb-3 h-10 w-56 animate-pulse rounded-lg" />
      <div className="bg-charcoal-800 mb-8 h-5 w-1/2 max-w-md animate-pulse rounded-lg" />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-charcoal-800 aspect-[16/9] animate-pulse rounded-2xl"
          />
        ))}
      </section>
    </main>
  );
}
