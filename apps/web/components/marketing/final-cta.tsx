"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-cream-50 text-3xl font-bold sm:text-4xl lg:text-5xl">
          Your next photo has options.
        </h2>
        <p className="text-text-secondary mt-4 max-w-2xl mx-auto text-lg">
          Pick a preset, upload a photo, and see where 5Pixels takes it.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Create free account</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
