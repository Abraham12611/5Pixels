/**
 * Shared loading skeleton for app surfaces without their own loading.tsx
 * (Discover, Account, Billing, Create, Generation, Result). Library and
 * Favorites have tailored skeletons in their segments.
 */
export default function AppLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="bg-charcoal-800 mb-3 h-3 w-28 animate-pulse rounded" />
      <div className="bg-charcoal-800 mb-2 h-8 w-64 max-w-full animate-pulse rounded-lg" />
      <div className="bg-charcoal-800 mb-8 h-4 w-40 animate-pulse rounded" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="bg-charcoal-800 aspect-[4/5] animate-pulse rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
