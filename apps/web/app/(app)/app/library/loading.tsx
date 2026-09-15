export default function LibraryLoading() {
  const aspects = ["4 / 5", "1 / 1", "4 / 3", "3 / 4", "4 / 5", "1 / 1", "3 / 4", "4 / 3"];
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 space-y-2">
          <div className="bg-charcoal-800 h-8 w-32 animate-pulse rounded-md" />
          <div className="bg-charcoal-800 h-4 w-48 animate-pulse rounded-md" />
        </div>
        <div className="mb-5 flex items-center gap-2">
          <div className="bg-charcoal-800 h-9 w-52 animate-pulse rounded-md" />
          <div className="bg-charcoal-800 ml-auto h-9 w-64 animate-pulse rounded-md" />
        </div>
        <div className="columns-2 gap-5 md:columns-3 xl:columns-4 [&>*]:mb-5 [&>*]:break-inside-avoid">
          {aspects.map((aspect, i) => (
            <div
              key={i}
              className="bg-charcoal-850 animate-pulse rounded-xl"
              style={{ aspectRatio: aspect, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
