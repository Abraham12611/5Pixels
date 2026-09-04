"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BrandBillboard() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28 lg:py-40">
      <div className="bg-lime-500 absolute inset-0" />
      <div className="mx-auto max-w-7xl">
        <div className="relative z-10">
          <h2 className="text-ink-950 max-w-4xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-7xl">
            Your photo doesn&apos;t have to stay one thing.
          </h2>
          <p className="text-ink-900 mt-6 max-w-xl text-lg">
            One upload. Five directions. Infinite ways to see yourself.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 border-ink-950 bg-ink-950 text-lime-400 hover:bg-ink-900"
          >
            <Link href="/explore">
              Try 5Pixels
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Decorative grain-ish pattern via simple shapes */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute right-0 top-0 h-2/3 w-1/2 bg-gradient-to-bl from-ink-950/50 to-transparent" />
        <div className="absolute bottom-0 left-0 h-1/2 w-1/3 bg-gradient-to-tr from-ink-950/30 to-transparent" />
      </div>
    </section>
  );
}
