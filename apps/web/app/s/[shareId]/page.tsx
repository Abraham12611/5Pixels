import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPublicGeneration } from "@/lib/db/share";

export const dynamic = "force-dynamic";

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const shared = await getPublicGeneration(shareId);

  if (!shared) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-cream-50 text-2xl font-bold">
            {shared.productName}
          </h1>
          <p className="text-text-secondary mt-2 text-sm">
            Created with 5Pixels
          </p>
        </div>

        {shared.outputUrl ? (
          <div className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border">
            <Image
              src={shared.outputUrl}
              alt={`Shared result for ${shared.productName}`}
              width={shared.outputWidth ?? 1024}
              height={shared.outputHeight ?? 1024}
              className="h-auto w-full"
              unoptimized
              priority
            />
          </div>
        ) : (
          <p className="text-text-secondary text-center">No output image found.</p>
        )}

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href={`/presets/${shared.productSlug}`}
            className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 rounded-xl px-5 py-2.5 text-sm font-semibold transition"
          >
            Try this look
          </Link>
          <Link
            href="/"
            className="text-text-secondary hover:text-cream-50 text-sm font-medium transition"
          >
            Explore more looks
          </Link>
        </div>
      </div>
    </main>
  );
}
