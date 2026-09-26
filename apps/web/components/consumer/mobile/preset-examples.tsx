"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageViewer } from "@/components/consumer/mobile/image-viewer";

/**
 * Mobile examples grid (25_MOBILE_WEB_POLISH/07 §3): square thumbs of the
 * preset's example outputs that open the shared ImageViewer — same affordance
 * as the quick sheet's example row.
 */
export function PresetExamples({
  urls,
  name,
}: {
  urls: string[];
  name: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const selected = index !== null ? urls[index] : null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {urls.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View ${name} example ${i + 1}`}
              className="media-frame focus-visible:ring-lime-500/70 relative block aspect-square w-full overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                unoptimized
                sizes="33vw"
              />
            </button>
          </li>
        ))}
      </ul>

      <ImageViewer
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setIndex(null);
        }}
        src={selected ?? ""}
        alt={`${name} example ${(index ?? 0) + 1} of ${urls.length}`}
      />
    </>
  );
}
