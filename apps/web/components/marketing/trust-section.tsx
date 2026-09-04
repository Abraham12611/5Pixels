"use client";

import { ShieldCheck, RefreshCcw, Lock } from "lucide-react";

export function TrustSection() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Preset-specific quality testing",
      description:
        "Every preset is evaluated against a golden dataset before it goes live.",
    },
    {
      icon: Lock,
      title: "Private source-image handling",
      description:
        "Your uploads are used only for your generations and never exposed publicly.",
    },
    {
      icon: RefreshCcw,
      title: "Failed generations are refunded",
      description:
        "If a transformation fails, your credits are returned automatically.",
    },
  ];

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
            Why trust 5Pixels
          </p>
          <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
            Built for real results
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6"
            >
              <div className="text-lime-400 mb-4">
                <item.icon className="h-8 w-8" />
              </div>
              <h3 className="text-cream-50 text-lg font-semibold">
                {item.title}
              </h3>
              <p className="text-text-secondary mt-2">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
