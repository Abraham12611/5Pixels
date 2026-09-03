"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-2xl">
            <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
              AI photo presets
            </p>
            <h1 className="text-cream-50 mt-4 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              Still you.
              <br />
              <span className="text-lime-400">Completely different.</span>
            </h1>
            <p className="text-text-secondary mt-6 max-w-lg text-lg">
              Pick a preset. Upload your photo. 5Pixels handles the prompts,
              the models, and the post-processing — so you get a polished
              transformation in seconds.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-lime-500 text-ink-950 hover:bg-lime-400"
              >
                <Link href="/explore">
                  Explore presets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
              >
                <Link href="/app">Upload your photo</Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm">
              {[
                "Privacy first",
                "Fast workflow",
                "Curated presets",
              ].map((claim) => (
                <div key={claim} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                  <span className="text-text-secondary">{claim}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="bg-charcoal-850 border-cream-100/10 relative aspect-square overflow-hidden rounded-3xl border">
              {/* Central source image placeholder */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-charcoal-800 to-ink-900">
                <div className="text-center">
                  <div className="bg-charcoal-700 mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-text-muted h-12 w-12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                  </div>
                  <p className="text-text-muted text-sm">Your photo</p>
                </div>
              </div>

              {/* Floating transformation badges */}
              {[
                { label: "Studio", position: "top-4 left-4" },
                { label: "Cinematic", position: "top-8 right-4" },
                { label: "Retro", position: "bottom-16 left-2" },
                { label: "Illustration", position: "bottom-12 right-6" },
                { label: "Cover", position: "bottom-4 left-1/2 -translate-x-1/2" },
              ].map((item) => (
                <span
                  key={item.label}
                    className={`absolute ${item.position} border-cream-100/10 bg-ink-950/70 text-cream-50 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm`}
                  >
                    {item.label}
                  </span>
                ))}
            </div>

            {/* Decorative pixel dots */}
            <div className="absolute -right-4 -top-4 hidden h-24 w-24 grid-cols-3 gap-1 lg:grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-full w-full rounded-sm bg-lime-500/20"
                />
              ))}
            </div>
            <div className="absolute -bottom-4 -left-4 hidden h-16 w-16 grid-cols-2 gap-1 lg:grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-full w-full rounded-sm bg-lime-500/30"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
