"use client";

import { Upload, MousePointerClick, Sparkles } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: MousePointerClick,
      title: "Choose a preset",
      description:
        "Browse curated looks across portraits, cinematic scenes, covers, and posters.",
    },
    {
      icon: Upload,
      title: "Upload your photo",
      description:
        "Use a clear source image. Your upload stays private and is only used for your generation.",
    },
    {
      icon: Sparkles,
      title: "Get your transformation",
      description:
        "We generate, post-process, and deliver a high-quality result — no prompt writing needed.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
            How it works
          </p>
          <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
            Three steps. One great photo.
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="border-cream-100/10 bg-charcoal-850 relative rounded-2xl border p-6"
            >
              <div className="bg-lime-500/10 mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-lime-400">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="text-cream-50/20 absolute right-5 top-4 text-5xl font-bold">
                {index + 1}
              </div>
              <h3 className="text-cream-50 text-xl font-semibold">
                {step.title}
              </h3>
              <p className="text-text-secondary mt-2">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
