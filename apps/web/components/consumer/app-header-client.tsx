"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditBalanceChip } from "@/components/consumer/credit-balance-chip";
import { NotificationDropdown } from "@/components/consumer/notification-dropdown";
import { UserDropdown } from "@/components/consumer/user-dropdown";
import { GlobalSearch } from "@/components/consumer/global-search";
import { ExploreMenu } from "@/components/consumer/explore-menu";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import { LogoMark } from "@/components/logo-mark";
import type { NotificationItem } from "@/lib/db/notifications";
import type {
  SearchCategory,
  SearchLibraryItem,
  SearchPreset,
} from "@/lib/search";
import { Wrench } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AppHeaderClientProps {
  isAdmin: boolean;
  creditBalance: number;
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  unreadCount: number;
  notifications: NotificationItem[];
  planName: string | null;
  planRenewsAt: string | null;
  creditsGrant: number | null;
  inProgressCount: number;
  lowCreditAt: number;
  searchPresets: SearchPreset[];
  searchCategories: SearchCategory[];
  searchLibrary: SearchLibraryItem[];
  searchFavoriteIds: string[];
  catalogError: boolean;
}

interface NavItem {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

const DISCOVER: NavItem = {
  href: "/app",
  label: "Discover",
  isActive: (p) => p === "/app",
};

const AFTER_EXPLORE: NavItem[] = [
  {
    href: "/app/library",
    label: "Library",
    isActive: (p) =>
      p.startsWith("/app/library") ||
      p.startsWith("/app/generations") ||
      p.startsWith("/app/results"),
  },
  {
    href: "/app/favorites",
    label: "Favorites",
    isActive: (p) => p.startsWith("/app/favorites"),
  },
];

function isExploreActive(pathname: string): boolean {
  return pathname.startsWith("/explore") || pathname.startsWith("/presets");
}

export function AppHeaderClient({
  isAdmin,
  creditBalance,
  userName,
  userEmail,
  avatarUrl,
  unreadCount,
  notifications,
  planName,
  planRenewsAt,
  creditsGrant,
  inProgressCount,
  lowCreditAt,
  searchPresets,
  searchCategories,
  searchLibrary,
  searchFavoriteIds,
  catalogError,
}: AppHeaderClientProps) {
  const pathname = usePathname();

  return (
    <header className="border-cream-100/10 bg-ink-950/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/app"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50"
        >
          <LogoMark className="h-7 w-7" />
          <span className="text-cream-50 hidden text-lg font-bold tracking-tight sm:block">
            5Pixels
          </span>
        </Link>

        {/* Primary nav */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          <NavLink item={DISCOVER} pathname={pathname} />
          <ExploreMenu
            categories={searchCategories}
            featured={searchPresets}
            active={isExploreActive(pathname)}
          />
          {AFTER_EXPLORE.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <GlobalSearch
            presets={searchPresets}
            categories={searchCategories}
            library={searchLibrary}
            favoriteIds={searchFavoriteIds}
            catalogError={catalogError}
          />
          <CreditBalanceChip
            credits={creditBalance}
            lowCreditAt={lowCreditAt}
          />
          <NotificationDropdown
            unreadCount={unreadCount}
            notifications={notifications}
          />
          {isAdmin && (
            <Link
              href="/admin"
              className="border-cream-100/15 text-text-secondary hover:text-cream-100 hidden h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:outline-none sm:flex"
            >
              <Wrench size={14} weight="bold" />
              Admin
            </Link>
          )}
          <UserDropdown
            isAdmin={isAdmin}
            name={userName}
            email={userEmail}
            avatarUrl={avatarUrl}
            credits={creditBalance}
            creditsGrant={creditsGrant}
            planName={planName}
            planRenewsAt={planRenewsAt}
            inProgressCount={inProgressCount}
            lowCreditAt={lowCreditAt}
          />
        </div>
      </div>
    </header>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.isActive(pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-lime-500/50",
        active ? "text-cream-50" : "text-text-secondary hover:text-cream-100"
      )}
    >
      {item.label}
      {active && (
        <span className="absolute inset-x-3 -bottom-1 flex justify-center">
          <FivePixelMark />
        </span>
      )}
    </Link>
  );
}
