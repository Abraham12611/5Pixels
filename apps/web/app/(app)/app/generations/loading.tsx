export default function GenerationsLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="bg-charcoal-800 mb-6 h-8 w-44 animate-pulse rounded-md" />
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className="mb-6">
            <div className="bg-charcoal-800 mb-3 h-4 w-20 animate-pulse rounded" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-charcoal-800 h-20 animate-pulse rounded-xl"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
