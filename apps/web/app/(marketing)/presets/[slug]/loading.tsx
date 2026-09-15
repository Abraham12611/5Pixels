export default function PresetDetailLoading() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="border-cream-100/10 bg-charcoal-850 border-b">
        <div className="mx-auto flex h-16 max-w-7xl animate-pulse items-center px-4 sm:px-6">
          <div className="bg-charcoal-700 h-5 w-24 rounded-lg" />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:py-12">
        <div className="order-2 lg:order-1">
          <div className="bg-charcoal-800 aspect-[4/5] animate-pulse rounded-2xl" />
        </div>
        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <div className="bg-charcoal-800 h-8 w-3/4 animate-pulse rounded-lg" />
          <div className="bg-charcoal-800 h-24 w-full animate-pulse rounded-lg" />
          <div className="bg-charcoal-800 h-48 w-full animate-pulse rounded-2xl" />
          <div className="bg-charcoal-800 mt-auto h-12 w-full animate-pulse rounded-full" />
        </div>
      </div>
    </main>
  );
}
