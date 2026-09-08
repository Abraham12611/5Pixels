import Link from "next/link";
import {
  Compass,
  Faders,
  FrameCorners,
  GridFour,
} from "@phosphor-icons/react/dist/ssr";

const destinations = [
  {
    label: "Filters",
    description: "One-photo style transformations.",
    href: "/explore?type=filter",
    icon: Faders,
  },
  {
    label: "Posters",
    description: "AI visual + deterministic text layouts.",
    href: "/explore?type=poster",
    icon: FrameCorners,
  },
  {
    label: "Explore",
    description: "Browse every look by category.",
    href: "/explore",
    icon: Compass,
  },
  {
    label: "Categories",
    description: "Find presets by genre and use case.",
    href: "/categories",
    icon: GridFour,
  },
];

export function WhatWouldYouCreate() {
  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-cream-50 text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
          What would you create?
        </h2>
        <p className="text-text-secondary mt-2 max-w-xl">
          Presets do the prompt work. Pick the shape of your output.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((d) => {
            const Icon = d.icon;
            return (
              <Link
                key={d.label}
                href={d.href}
                className="group border-lime-400/40 bg-charcoal-850 hover:bg-charcoal-800 flex flex-col gap-3 rounded-2xl border p-5 transition hover:border-lime-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
              >
                <span className="bg-lime-400/10 text-lime-300 group-hover:bg-lime-400/20 flex h-10 w-10 items-center justify-center rounded-xl transition">
                  <Icon size={22} weight="fill" />
                </span>
                <div>
                  <p className="text-cream-50 font-semibold">{d.label}</p>
                  <p className="text-text-secondary mt-0.5 text-sm">
                    {d.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
