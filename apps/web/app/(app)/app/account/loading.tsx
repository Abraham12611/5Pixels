export default function AccountLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="bg-charcoal-800 mb-6 h-8 w-36 animate-pulse rounded-md" />
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="mb-6">
            <div className="bg-charcoal-800 mb-2 h-4 w-24 animate-pulse rounded" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-charcoal-800 h-14 animate-pulse rounded-xl"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
