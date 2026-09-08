"use client";

import Link from "next/link";
import { CreditBalanceChip } from "@/components/consumer/credit-balance-chip";
import { NotificationDropdown } from "@/components/consumer/notification-dropdown";
import { UserDropdown } from "@/components/consumer/user-dropdown";
import { Faders, House } from "@phosphor-icons/react";

interface AppHeaderClientProps {
  creditBalance: number;
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  unreadNotifications: boolean;
}

const navLinks = [
  { href: "/app", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Faders },
];

export function AppHeaderClient({
  creditBalance,
  userName,
  userEmail,
  avatarUrl,
  unreadNotifications,
}: AppHeaderClientProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-cream-100/10 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/app" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-500 text-ink-950">
            <span className="grid grid-cols-3 gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1 w-1 rounded-full ${
                    i === 2 ? "bg-lime-500" : "bg-ink-950"
                  }`}
                />
              ))}
            </span>
          </span>
          <span className="text-cream-50 hidden text-lg font-bold tracking-tight sm:block">
            5Pixels
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:bg-charcoal-800 hover:text-cream-50 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition"
              >
                <Icon size={16} weight="bold" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <CreditBalanceChip credits={creditBalance} />
          <NotificationDropdown unread={unreadNotifications} />
          <UserDropdown
            name={userName}
            email={userEmail}
            avatarUrl={avatarUrl}
          />
        </div>
      </div>
    </header>
  );
}
