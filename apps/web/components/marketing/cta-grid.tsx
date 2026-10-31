import Link from "next/link";
import Image from "next/image";
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
  "Access Nano Banana 2 & Pro presets",
  "Unlock your extra annual discount",
  "4K studio filters & typographic posters",
];

function CtaCardInner({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <>
      <Image
        src="/marketing/cta-discount-banner.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 640px"
        className="pointer-events-none absolute inset-0 size-full object-cover object-right"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.72) 40%, rgba(0, 0, 0, 0.25) 72%, rgba(0, 0, 0, 0.12) 100%)",
        }}
      />
      <div className="relative z-10 flex min-h-[inherit] w-full flex-col items-start justify-between gap-2 p-4 max-lg:min-h-full min-[700px]:px-6 min-[700px]:pt-6 lg:gap-3 lg:p-[22px]">
        <h3 className="max-w-[34rem] text-[20px] leading-[1.32] font-bold tracking-[-0.04em] uppercase min-[480px]:whitespace-nowrap min-[480px]:text-[28px] min-[480px]:leading-8 lg:text-[2.25rem] lg:leading-10">
          <span
            className="block bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(rgb(255, 255, 255) 0%, rgb(163, 163, 163) 100%)",
            }}
          >
            {isAuthenticated
              ? "Upgrade and get your"
              : "Sign up and get your"}
          </span>
          <span
            className="block bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgb(209, 254, 23) 0%, rgba(209, 254, 23, 0.8) 100%)",
            }}
          >
            extra discount
          </span>
        </h3>

        <ul className="flex max-w-[19rem] flex-col gap-1.5 text-xs leading-[18px] font-medium text-white/65 md:text-sm">
          {SIGNUP_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-1.5">
              <Check
                size={15}
                weight="bold"
                aria-hidden
                className="mt-0.5 shrink-0 text-white/65"
              />
              <span className="text-xs leading-[18px]">{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="mt-1 flex w-full items-center min-[430px]:w-auto">
          <span
            className="text-ink-950 inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-[0_8px_16px_0_rgba(0,0,0,0.2)] transition-transform group-hover/cta:scale-[1.01] min-[430px]:w-auto min-[430px]:min-w-[16rem] lg:h-12 lg:px-5 lg:text-base"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255, 255, 20, 0) 0%, rgb(255, 255, 20) 100%), linear-gradient(90deg, rgb(209, 254, 23) 0%, rgb(209, 254, 23) 100%)",
            }}
          >
            {isAuthenticated ? (
              "Unlock your extra discount"
            ) : (
              <>
                <span className="lg:hidden">Get your discount</span>
                <span className="hidden lg:inline">
                  Sign up and get your discount
                </span>
              </>
            )}
          </span>
        </div>
      </div>
    </>
  );
}

function SignupCard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const cardClasses =
    "group/cta bg-charcoal-900 relative isolate block aspect-[351/197] w-full cursor-pointer overflow-hidden rounded-xl text-left ring-1 ring-white/20 transition-opacity ring-inset hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 md:rounded-[20px] lg:aspect-auto lg:min-h-[16.5rem] lg:self-stretch";

  return (
    <div className="grid w-full lg:min-h-[16.5rem] lg:w-[48%] lg:max-w-[40rem] lg:shrink-0">
      {isAuthenticated ? (
        <Link href="/pricing" className={cardClasses}>
          <CtaCardInner isAuthenticated />
        </Link>
      ) : (
        <AuthModalLink tab="signup" className={cardClasses}>
          <CtaCardInner isAuthenticated={false} />
        </AuthModalLink>
      )}
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
        "group focus-visible:outline-lime-400 relative flex min-h-[7.875rem] overflow-hidden rounded-2xl border border-white/8 bg-transparent p-0.5 transition-all duration-300 ease-out hover:border-white/20 focus-visible:outline-2 focus-visible:outline-offset-2"
      )}
    >
      <div className="bg-charcoal-850/90 relative isolate flex h-full w-full flex-1 flex-col items-start justify-between gap-3 overflow-hidden rounded-[14px] p-3.5 transition-all duration-300 ease-out group-hover:p-4">
        {tile.featuredGlow ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 50%)",
            }}
          >
            <div className="pointer-events-none absolute top-[68%] left-[-10%] h-[78%] w-[120%] blur-[32px]">
              <div className="h-full w-full bg-[linear-gradient(90deg,#0B9F09,#0875C3_50%,#D1FE17)] opacity-75" />
            </div>
          </div>
        ) : null}

        <div className="relative flex w-full items-center justify-between">
          <Icon
            size={20}
            weight="regular"
            aria-hidden
            className="text-cream-50 drop-shadow-[0_3px_2px_rgba(0,0,0,0.15)] transition group-hover:text-[#D1FE17]"
          />
        </div>

        <div className="relative mt-auto flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-cream-50 text-sm font-medium transition group-hover:text-[#D1FE17]">
              {tile.title}
            </span>
            {tile.badge ? (
              <span className="text-ink-950 rounded bg-[#D1FE17] px-1.5 py-0.5 text-[10px] leading-3 font-extrabold tracking-wider uppercase italic">
                {tile.badge}
              </span>
            ) : null}
          </div>
          <p className="line-clamp-1 text-xs leading-[18px] text-white/50">
            {tile.description}
          </p>
        </div>
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
      className="px-4 pt-6 sm:px-6 md:pt-8 lg:px-10"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-5">
        <SignupCard isAuthenticated={isAuthenticated} />
        <div className="grid min-w-0 flex-1 auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
          {tiles.map((tile) => (
            <Tile key={tile.id} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
}
