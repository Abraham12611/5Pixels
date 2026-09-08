"use client";

import Link from "next/link";
import {
  User,
  CreditCard,
  Coins,
  ChartLine,
  Ticket,
  Sliders,
  Lock,
  Trash,
  Question,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface SettingsNavItem {
  key: string;
  label: string;
  href?: string;
  icon: Icon;
  destructive?: boolean;
}

const SECTIONS: SettingsNavItem[] = [
  { key: "profile", label: "Personal Profile", icon: User },
  { key: "subscription", label: "Subscription", icon: CreditCard },
  { key: "credits", label: "Credits", icon: Coins },
  { key: "usage", label: "Usage", icon: ChartLine },
  { key: "promo", label: "Promo Code", icon: Ticket },
  { key: "preferences", label: "Preferences", icon: Sliders },
  { key: "security", label: "Security", icon: Lock },
  { key: "delete", label: "Delete Account", icon: Trash, destructive: true },
];

const FOOTER_LINKS: SettingsNavItem[] = [
  {
    key: "help",
    label: "Need help?",
    href: "/admin/support",
    icon: Question,
  },
];

interface SettingsNavProps {
  active: string;
  userName: string;
  userEmail: string;
}

export function SettingsNav({ active, userName, userEmail }: SettingsNavProps) {
  return (
    <aside className="flex flex-col gap-2">
      {/* Mobile horizontal rail */}
      <div className="md:hidden flex overflow-x-auto gap-2 pb-3">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/app/settings?section=${item.key}`}
              className={cn(
                "flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                active === item.key
                  ? "bg-lime-500/20 text-lime-300 border border-lime-500/40"
                  : "bg-charcoal-850 text-text-secondary hover:bg-charcoal-800 hover:text-cream-100 border border-transparent"
              )}
            >
              <Icon size={16} weight="bold" />
              {item.label}
            </Link>
          );
        })}
        {FOOTER_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href ?? "#"}
              className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-charcoal-850 px-3 py-2 text-sm text-text-secondary hover:bg-charcoal-800 hover:text-cream-100 border border-transparent transition"
            >
              <Icon size={16} weight="bold" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 rounded-2xl border border-cream-100/10 bg-charcoal-850 p-3">
        <div className="px-2 py-2.5">
          <p className="text-cream-50 text-sm font-semibold truncate">{userName}</p>
          <p className="text-text-muted truncate text-xs">{userEmail}</p>
        </div>
        <div className="border-t border-cream-100/10 my-1" />
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/app/settings?section=${item.key}`}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                active === item.key
                  ? "bg-lime-500/15 text-lime-300 border-l-2 border-lime-500"
                  : item.destructive
                    ? "text-rose-400 hover:bg-rose-950/40"
                    : "text-text-secondary hover:bg-charcoal-800 hover:text-cream-100"
              )}
            >
              <Icon size={18} weight="bold" />
              {item.label}
            </Link>
          );
        })}
        <div className="border-t border-cream-100/10 my-1" />
        {FOOTER_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href ?? "#"}
              className="text-text-secondary hover:bg-charcoal-800 hover:text-cream-100 flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition"
            >
              <Icon size={18} weight="bold" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
