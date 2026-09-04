"use client";

import { Check } from "lucide-react";

export function NoPromptRequired() {
  const points = [
    "Keeps your likeness",
    "Controlled creative direction",
    "Private by default",
  ];

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
              No prompt required
            </p>
            <h2 className="text-cream-50 mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Pick the look.
              <br />
              <span className="text-lime-400">We&apos;ll handle the rest.</span>
            </h2>
            <p className="text-text-secondary mt-5 max-w-lg text-lg">
              Skip the prompt engineering. Every preset bundles the model,
              instructions, reference assets, and post-processing so you get a
              consistent result with a few simple controls.
            </p>

            <ul className="mt-8 space-y-4">
              {points.map((point) => (
                <li key={point} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime-500/20 text-lime-400">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-cream-50 font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-cream-100/10 bg-charcoal-850 relative flex aspect-square items-center justify-center rounded-3xl border p-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-charcoal-800 flex aspect-square items-center justify-center rounded-2xl">
                <span className="text-text-muted text-sm">Preset chosen</span>
              </div>
              <div className="bg-charcoal-800 flex aspect-square items-center justify-center rounded-2xl">
                <span className="text-text-muted text-sm">Photo uploaded</span>
              </div>
              <div className="bg-charcoal-800 col-span-2 flex aspect-[2/1] items-center justify-center rounded-2xl">
                <span className="text-lime-400 font-semibold">Transformation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
