import Image from "next/image";
import type { PublicProductAsset } from "@/types/catalog";

interface ExampleGalleryProps {
  publicAssets: PublicProductAsset[];
}

export function ExampleGallery({ publicAssets }: ExampleGalleryProps) {
  const sourceAssets = publicAssets.filter((asset) => asset.role === "example_source");
  const resultAssets = publicAssets.filter((asset) => asset.role === "example_result");

  if (sourceAssets.length === 0 && resultAssets.length === 0) {
    return null;
  }

  return (
    <section className="border-cream-100/10 mt-10 border-t pt-10">
      <h2 className="text-cream-50 text-lg font-semibold">Examples</h2>
      <p className="text-text-secondary mt-1 text-sm">
        See what this preset does with a real source image.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {sourceAssets.map((source, index) => {
          const result = resultAssets[index];
          return (
            <div
              key={source.asset_id}
              className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border"
            >
              <div className="grid grid-cols-2">
                <div className="relative aspect-square">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${source.bucket}/${source.storage_key}`}
                    alt={`Example source ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-ink-950/70 px-2 py-1 text-xs font-medium text-cream-50 backdrop-blur-sm">
                    Original
                  </span>
                </div>
                <div className="relative aspect-square">
                  {result ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${result.bucket}/${result.storage_key}`}
                      alt={`Example result ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="bg-charcoal-800 flex h-full w-full items-center justify-center">
                      <span className="text-text-muted text-xs">Result</span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-lime-500 px-2 py-1 text-xs font-medium text-ink-950">
                    Result
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
