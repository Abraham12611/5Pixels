"use client";

import { Upload, Sparkles, Image } from "lucide-react";

export function OnePhotoFiveDirections() {
  const directions = [
    { label: "Studio", icon: Image, color: "from-cream-100/20 to-cream-100/5" },
    { label: "Cinematic", icon: Sparkles, color: "from-lime-500/20 to-lime-500/5" },
    { label: "Retro", icon: Image, color: "from-warning/20 to-warning/5" },
    { label: "Illustration", icon: Sparkles, color: "from-error/20 to-error/5" },
    { label: "Cover", icon: Image, color: "from-success/20 to-success/5" },
  ];

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
            One upload
          </p>
          <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
            One photo. Five directions.
          </h2>
          <p className="text-text-secondary mt-3 max-w-2xl mx-auto">
            Choose the direction. 5Pixels handles the instructions.
          </p>
        </div>

        <div className="relative mx-auto grid max-w-4xl gap-6 md:grid-cols-3 md:grid-rows-2">
          {/* Center source image */}
          <div className="border-cream-100/10 bg-charcoal-850 relative order-1 flex aspect-square items-center justify-center rounded-3xl border p-6 md:col-start-2 md:row-start-1 md:row-end-3">
            <div className="text-center">
              <div className="bg-charcoal-700 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
                <Upload className="text-text-muted h-10 w-10" />
              </div>
              <p className="text-cream-50 font-medium">Your photo</p>
              <p className="text-text-muted mt-1 text-sm">
                One clear upload
              </p>
            </div>
          </div>

          {/* Direction tiles */}
          {directions.map((direction, index) => {
            const orderClasses = [
              "md:col-start-1 md:row-start-1",
              "md:col-start-3 md:row-start-1",
              "md:col-start-1 md:row-start-2",
              "md:col-start-3 md:row-start-2",
              "md:col-start-2 md:row-start-2",
            ];
            const Icon = direction.icon;
            return (
              <div
                key={direction.label}
                className={`border-cream-100/10 bg-gradient-to-br ${direction.color} relative order-2 flex aspect-square items-center justify-center rounded-3xl border p-6 ${orderClasses[index]}`}
              >
                <div className="text-center">
                  <div className="bg-ink-950/30 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm">
                    <Icon className="text-cream-50 h-6 w-6" />
                  </div>
                  <p className="text-cream-50 font-semibold">{direction.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
