export default function BillingLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="bg-charcoal-800 mb-2 h-8 w-40 animate-pulse rounded-md" />
        <div className="bg-charcoal-800 mb-6 h-4 w-64 animate-pulse rounded-md" />
        <div className="bg-charcoal-800 mb-4 h-28 animate-pulse rounded-2xl" />
        <div className="bg-charcoal-800 mb-4 h-16 animate-pulse rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-charcoal-800 h-14 animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
