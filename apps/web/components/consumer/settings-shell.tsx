"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  ShieldCheck,
  LockSimple,
  Bell,
  SquaresFour,
  Crown,
  Coins,
  Receipt,
  Question,
  SignOut,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

interface SettingsNavItem {
  label: string;
  href: string;
  icon: Icon;
  /** Additional paths that should keep this item active. */
  match?: string[];
}

const ACCOUNT_ITEMS: SettingsNavItem[] = [
  {
    label: "Profile",
    href: "/app/account",
    icon: User,
    match: ["/app/account/profile", "/app/account/delete"],
  },
  { label: "Security", href: "/app/account/security", icon: ShieldCheck },
  { label: "Privacy", href: "/app/account/privacy", icon: LockSimple },
  { label: "Notifications", href: "/app/account/notifications", icon: Bell },
];

const BILLING_ITEMS: SettingsNavItem[] = [
  { label: "Overview", href: "/app/billing", icon: SquaresFour },
  { label: "Plan", href: "/app/billing/plan", icon: Crown },
  { label: "Credits", href: "/app/billing/credits", icon: Coins },
  { label: "History", href: "/app/billing/history", icon: Receipt },
];

function isActive(pathname: string, item: SettingsNavItem): boolean {
  return pathname === item.href || (item.match ?? []).includes(pathname);
}

interface SettingsShellProps {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function SettingsShell({
  userName,
  userEmail,
  children,
}: SettingsShellProps) {
  const pathname = usePathname();

  const renderLink = (item: SettingsNavItem) => {
    const ItemIcon = item.icon;
    const active = isActive(pathname, item);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors",
          active
            ? "bg-charcoal-800 text-cream-50 font-medium"
            : "text-text-secondary hover:bg-charcoal-800/60 hover:text-cream-100"
        )}
      >
        <ItemIcon
          size={17}
          weight={active ? "fill" : "regular"}
          className={cn(
            "shrink-0 transition-colors",
            active ? "text-lime-400" : "text-text-muted group-hover:text-text-secondary"
          )}
        />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {active && (
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-[2.5px]"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="bg-lime-400 h-[3px] w-[3px] rounded-[1px]"
              />
            ))}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Mobile: horizontal chip rail */}
        <nav
          aria-label="Account settings"
          className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
        >
          {[...ACCOUNT_ITEMS, ...BILLING_ITEMS].map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                  active
                    ? "border-lime-500/40 bg-lime-500/10 text-cream-50"
                    : "border-cream-100/10 bg-charcoal-850 text-text-secondary hover:text-cream-100"
                )}
              >
                <item.icon size={15} weight={active ? "fill" : "regular"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop: stable settings rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="border-cream-100/10 bg-charcoal-850 rounded-[15px] border p-2">
              <div className="px-3 pb-2 pt-2">
                <p className="text-cream-50 truncate text-sm font-semibold">
                  {userName}
                </p>
                <p className="text-text-muted truncate text-xs">{userEmail}</p>
              </div>
              <div className="border-cream-100/10 border-t px-2 pt-3">
                <p className="text-text-muted px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider">
                  Account
                </p>
                <div className="space-y-0.5">{ACCOUNT_ITEMS.map(renderLink)}</div>
                <p className="text-text-muted px-1 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider">
                  Billing
                </p>
                <div className="space-y-0.5">{BILLING_ITEMS.map(renderLink)}</div>
              </div>
            </div>

            <div className="border-cream-100/10 bg-charcoal-850 rounded-[15px] border p-4">
              <div className="flex items-center gap-2">
                <Question size={16} className="text-lime-400" weight="fill" />
                <p className="text-cream-50 text-sm font-medium">Need help?</p>
              </div>
              <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">
                Answers about credits, plans, and billing live in the FAQ.
              </p>
              <Link
                href="/pricing#faq"
                className="text-lime-400 hover:text-lime-300 mt-2 inline-block text-xs font-medium transition-colors"
              >
                Browse FAQ
              </Link>
            </div>

            <form action={signOut} className="px-1">
              <button
                type="submit"
                className="text-text-secondary hover:text-cream-50 flex items-center gap-2 text-sm transition-colors"
              >
                <SignOut size={16} />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
