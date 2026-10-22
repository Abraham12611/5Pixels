import Link from "next/link";
import {
  Article,
  Check,
  Fire,
  Image as ImageIcon,
  Sparkle,
  SquaresFour,
  Tag,
} from "@phosphor-icons/react/dist/ssr";
import { AuthModalLink } from "@/components/auth/auth-modal-link";
import { cn } from "@/lib/utils";
import type { LandingTile } from "@/lib/marketing/landing-content";

const TILE_ICONS = {
  sparkle: Sparkle,
  image: ImageIcon,
  fire: Fire,
  squares: SquaresFour,
  article: Article,
  tag: Tag,
} as const;

const SIGNUP_BENEFITS = [
  "A free generation to start",
  "Curated presets — no prompt writing",
  "New drops every week",
];

function SignupCard({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="bg-lime-400 text-ink-950 relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 md:p-8">
      <div>
        <p className="text-2xl font-bold tracking-tight md:text-3xl">
          {isAuthenticated
            ? "New looks every week"
            : "Make any photo scroll-stopping"}
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {SIGNUP_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm font-medium">
              <Check size={16} weight="bold" aria-hidden />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        {isAuthenticated ? (
          <Link
            href="/explore"
            className="bg-ink-950 text-lime-400 hover:bg-ink-900 focus-visible:outline-ink-950 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Browse this week&apos;s presets
          </Link>
        ) : (
          <AuthModalLink
            tab="signup"
            className="bg-ink-950 text-lime-400 hover:bg-ink-900 focus-visible:outline-ink-950 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Create free account
          </AuthModalLink>
        )}
      </div>
      {/* Decorative band — placeholder until dedicated artwork ships. */}
      <div
        aria-hidden
        className="from-lime-300/0 via-lime-500/40 to-ink-950/20 pointer-events-none absolute -right-10 -bottom-10 h-40 w-64 rotate-[-8deg] rounded-full bg-gradient-to-br blur-xl"
      />
    </div>
  );
}

function Tile({ tile }: { tile: LandingTile }) {
  const Icon = TILE_ICONS[tile.icon];
  return (
    <Link
      href={tile.href}
      prefetch={false}
      className={cn(
        "group bg-charcoal-850 border-cream-100/10 hover:border-lime-500/40 focus-visible:outline-lime-400 relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 md:p-5"
      )}
    >
      <div className="flex items-start justify-between">
        <span className="bg-charcoal-800 text-lime-400 group-hover:bg-charcoal-700 flex h-9 w-9 items-center justify-center rounded-lg transition">
          <Icon size={18} weight="fill" aria-hidden />
        </span>
        {tile.badge ? (
          <span className="bg-lime-400 text-ink-950 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            {tile.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-auto">
        <p className="text-cream-50 group-hover:text-lime-400 text-sm font-semibold transition md:text-base">
          {tile.title}
        </p>
        <p className="text-text-secondary mt-1 line-clamp-2 text-xs md:text-sm">
          {tile.description}
        </p>
      </div>
    </Link>
  );
}

export function CtaGrid({
  isAuthenticated,
  tiles,
}: {
  isAuthenticated: boolean;
  tiles: LandingTile[];
}) {
  return (
    <section
      aria-label="Get started"
      className="px-4 pt-6 sm:px-6 md:pt-10 lg:px-10"
    >
      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <SignupCard isAuthenticated={isAuthenticated} />
        <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
}
