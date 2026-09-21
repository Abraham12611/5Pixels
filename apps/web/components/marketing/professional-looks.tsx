import Image from "next/image";
import Link from "next/link";
import { SectionEyebrow } from "./section-eyebrow";
import { ArrowCircle } from "./arrow-circle";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    name: "Studio Standard",
    tagline: "A polished professional portrait in seconds.",
    uses: ["Profile photo", "Resume", "LinkedIn"],
    image: "/landing/pro-hero-after.jpg",
    original: "/landing/pro-hero-before.jpg",
    hero: true,
  },
  {
    name: "Founder Portrait",
    tagline: "An editorial look for people building something.",
    uses: ["About page", "Personal brand", "Speaker bio"],
    image: "/landing/pro-founder-after.jpg",
    original: "/landing/pro-founder-before.jpg",
  },
  {
    name: "Editorial Profile",
    tagline: "Mood and presence for feature-style portraits.",
    uses: ["Portfolio", "Creative industry", "Press kit"],
    image: "/landing/pro-editorial-after.jpg",
    original: "/landing/pro-editorial-before.jpg",
  },
  {
    name: "Modern Professional",
    tagline: "Clean, confident, and current.",
    uses: ["Work profile", "Team page", "Networking"],
    image: "/landing/pro-modern-after.jpg",
    original: "/landing/pro-modern-before.jpg",
  },
  {
    name: "Creative Headshot",
    tagline: "Personality-forward portraits for creative work.",
    uses: ["Portfolio", "Social media", "Personal website"],
    image: "/landing/pro-creative-after.jpg",
    original: "/landing/pro-creative-before.jpg",
  },
];

function ProCard({
  card,
  className,
}: {
  card: (typeof CARDS)[number];
  className?: string;
}) {
  return (
    <Link
      href="/explore"
      className={cn(
        "group bg-charcoal-850 shadow-border flex flex-col overflow-hidden rounded-2xl",
        className
      )}
    >
      <div className={cn("relative", card.hero ? "aspect-[4/3]" : "aspect-[16/10]")}>
        <Image
          src={card.image}
          alt={`${card.name} preset result`}
          fill
          sizes={card.hero ? "(min-width: 1024px) 42vw, 100vw" : "(min-width: 1024px) 21vw, 50vw"}
          className="media-frame object-cover"
        />
        <span className="bg-ink-950/80 absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 backdrop-blur-sm">
          <span className="relative h-6 w-6 overflow-hidden rounded-md">
            <Image
              src={card.original}
              alt=""
              fill
              sizes="24px"
              className="object-cover"
            />
          </span>
          <span className="text-cream-50 text-[10px] font-medium">Original</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-cream-50 text-lg font-semibold">
              {card.name}
            </p>
            <p className="text-text-secondary mt-1 text-xs leading-relaxed">
              {card.tagline}
            </p>
          </div>
          <ArrowCircle className="group-hover:border-lime-400 group-hover:text-lime-400 h-8 w-8" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.uses.map((u) => (
            <span
              key={u}
              className="border-cream-100/10 text-text-muted rounded-full border px-2.5 py-1 text-[10px] font-medium"
            >
              {u}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function ProfessionalLooks() {
  const [hero, ...rest] = CARDS;
  return (
    <section className="px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionEyebrow>Professional looks</SectionEyebrow>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-display text-cream-50 max-w-xl text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Your next first impression.
          </h2>
          <p className="text-text-secondary max-w-sm text-base leading-relaxed">
            Professional looks designed for profiles, portfolios, and personal
            brands.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <ProCard card={hero} />
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((card) => (
              <ProCard key={card.name} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
