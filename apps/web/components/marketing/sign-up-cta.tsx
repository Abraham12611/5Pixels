"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignUpCTA() {
  const benefits = [
    "Free credits when you join",
    "Access free and paid presets",
    "Save your favorite looks",
    "Track every generation",
  ];

  return (
    <section className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="border-cream-100/10 bg-charcoal-850 relative overflow-hidden rounded-3xl border p-8 sm:p-12 lg:p-16">
          <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
                Get started
              </p>
              <h2 className="text-cream-50 mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                Sign up and get your
                <br />
                <span className="text-lime-400">extra credits</span>
              </h2>
              <p className="text-text-secondary mt-4 max-w-md text-lg">
                Create an account to unlock your starter credits and try
                premium presets without entering a card.
              </p>
            </div>

            <div className="flex flex-col items-start gap-6 lg:items-end">
              <ul className="space-y-3">
                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="text-cream-50 flex items-center gap-3"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-500 text-ink-950">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="bg-lime-500 text-ink-950 hover:bg-lime-400"
              >
                <Link href="/signup">
                  Sign up and get your credits
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Decorative background gradient */}
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-lime-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-lime-500/5 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
