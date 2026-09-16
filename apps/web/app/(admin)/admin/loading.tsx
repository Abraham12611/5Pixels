/**
 * Shared loading skeleton for admin surfaces. Dense/operational:
 * header line + stat/card placeholders + a table block.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div>
        <div className="bg-charcoal-800 h-8 w-56 animate-pulse rounded-lg" />
        <div className="bg-charcoal-800 mt-2 h-4 w-72 animate-pulse rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="bg-charcoal-800 h-24 animate-pulse rounded-2xl"
          />
        ))}
      </div>
      <div className="bg-charcoal-800 h-64 animate-pulse rounded-2xl" />
    </div>
  );
}
