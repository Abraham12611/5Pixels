import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Camera,
  FilmSlate,
  FrameCorners,
  PaintBrush,
  Plus,
  Snowflake,
  Sparkle,
  User,
} from "@phosphor-icons/react/dist/ssr";
import { SectionEyebrow } from "./section-eyebrow";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "Portraits", icon: User, active: true },
  { name: "Professional", icon: Briefcase },
  { name: "Cinematic", icon: FilmSlate },
  { name: "Covers", icon: FrameCorners },
  { name: "Illustration", icon: PaintBrush },
  { name: "Retro", icon: Camera },
  { name: "Fantasy", icon: Sparkle },
  { name: "Seasonal", icon: Snowflake },
];

const FAQS = [
  {
    q: "Which photos work best?",
    a: "Clear, well-lit photos where your face is easy to see. Everyday shots work well — no studio setup needed.",
  },
  {
    q: "Will the result still look like me?",
    a: "Yes. Presets are designed to keep your identity intact while changing light, mood, and style around you.",
  },
  {
    q: "How do credits work?",
    a: "Every transformation costs a set number of credits, and the cost is always shown before you generate.",
  },
  {
    q: "What happens if a transformation fails?",
    a: "If a generation doesn't complete, the credits are returned to your balance automatically.",
  },
  {
    q: "How are my photos handled?",
    a: "Your uploads stay private. They're used only for your generation and are never shown to other users.",
  },
];

export function CategoryFaq() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionEyebrow>Decision support &amp; category directory</SectionEyebrow>
        <h2 className="font-display text-cream-50 mt-5 max-w-2xl text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Find your look.
          <br />
          Know what to expect.
        </h2>
        <p className="text-text-secondary mt-4 max-w-lg text-base leading-relaxed">
          Browse categories to discover the right look. Find answers to common
          questions before you try.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {/* Categories */}
          <div className="flex flex-col gap-4">
            <div className="border-cream-100/10 bg-charcoal-850 flex-1 rounded-3xl border p-5">
              <p className="text-text-muted px-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                Browse look categories
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {CATEGORIES.map((cat) => (
                  <li key={cat.name}>
                    <Link
                      href="/categories"
                      className={cn(
                        "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition",
                        cat.active
                          ? "border-lime-500/60 bg-lime-500/5"
                          : "border-cream-100/10 hover:border-cream-100/25"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <cat.icon
                          size={17}
                          className={cn(
                            cat.active ? "text-lime-400" : "text-text-secondary"
                          )}
                        />
                        <span className="text-cream-50 text-sm font-medium">
                          {cat.name}
                        </span>
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-text-muted group-hover:text-lime-400 transition"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-cream-100/10 bg-charcoal-850 flex items-center justify-between gap-4 rounded-3xl border p-5">
              <div className="flex items-center gap-4">
                <span className="border-cream-100/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                  <Sparkle size={18} className="text-lime-400" />
                </span>
                <p className="text-text-secondary max-w-[220px] text-xs leading-relaxed">
                  Every look shows real before &amp; after results.
                  <span className="text-cream-50 mt-0.5 block font-medium">
                    What you see is what you can create.
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 -space-x-2">
                <div className="relative h-16 w-12 rotate-[-4deg] overflow-hidden rounded-lg shadow-elevated">
                  <Image
                    src="/landing/preview-1-before.jpg"
                    alt="Original photo"
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-16 w-12 rotate-[4deg] overflow-hidden rounded-lg shadow-elevated">
                  <Image
                    src="/landing/preview-1-after.jpg"
                    alt="Transformed result"
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="border-cream-100/10 bg-charcoal-850 flex flex-col rounded-3xl border p-5">
            <p className="text-text-muted px-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
              Frequently asked questions
            </p>
            <div className="mt-4 flex-1 space-y-2">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group border-cream-100/10 bg-charcoal-850 rounded-xl border"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="text-cream-50 text-sm font-medium">
                      {faq.q}
                    </span>
                    <Plus
                      size={15}
                      className="text-text-secondary shrink-0 transition-transform duration-200 group-open:rotate-45"
                    />
                  </summary>
                  <p className="text-text-secondary px-4 pb-4 text-sm leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-cream-100/10 px-2 pt-5">
              <p className="text-text-secondary max-w-[240px] text-xs leading-relaxed">
                Credit cost is shown before you generate.
                <span className="text-cream-50 mt-0.5 block font-medium">
                  You&rsquo;re in control, every step of the way.
                </span>
              </p>
              <div>
                <Link
                  href="/pricing"
                  className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition"
                >
                  View plans and credits
                  <ArrowRight size={15} weight="bold" />
                </Link>
                <p className="text-text-muted mt-2 text-[10px]">
                  See options that fit your workflow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
