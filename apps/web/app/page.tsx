export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-lime-400 text-sm font-medium uppercase tracking-wider">
        5Pixels
      </p>
      <h1 className="mt-4 max-w-2xl text-5xl font-bold leading-tight text-cream-50 md:text-7xl">
        Pick the look. Upload your photo. We handle the rest.
      </h1>
      <p className="mt-6 max-w-lg text-lg text-text-secondary">
        Curated AI transformations for portraits, posters, and everything in between. No prompt engineering required.
      </p>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <a
          href="/explore"
          className="inline-flex items-center justify-center rounded-full bg-lime-500 px-8 py-3 font-semibold text-ink-950 transition hover:bg-lime-400"
        >
          Explore looks
        </a>
        <a
          href="/app"
          className="inline-flex items-center justify-center rounded-full border border-cream-100/20 bg-charcoal-800 px-8 py-3 font-semibold text-cream-50 transition hover:bg-charcoal-700"
        >
          Open app
        </a>
      </div>
    </main>
  );
}
