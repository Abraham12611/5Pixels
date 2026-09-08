"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, Image, Lightning, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const CENTER_LABEL = "Create";

const LEFT_ITEMS = [
  { href: "/app", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
];

const RIGHT_ITEMS = [
  { href: "/app/generations", label: "Works", icon: Image },
  { href: "/app/settings?section=profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  if (base === "/app") return pathname === "/app";
  return pathname.startsWith(base);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-cream-100/10 bg-charcoal-900/90 supports-[backdrop-filter]:bg-charcoal-900/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md md:hidden"
    >
      <div className="grid grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),4px)] pt-1.5">
        {LEFT_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
          />
        ))}

        {/* Center create action */}
        <Link
          href="/explore"
          aria-label={CENTER_LABEL}
          className="relative -mt-6 flex flex-col items-center gap-1"
        >
          <span className="bg-lime-400 text-ink-950 hover:bg-lime-300 active:scale-95 flex h-13 w-13 items-center justify-center rounded-full shadow-[0_6px_24px_-6px_rgba(130,234,58,0.5)] transition">
            <Lightning size={22} weight="fill" />
          </span>
          <span className="text-text-secondary text-[10px] font-medium">
            {CENTER_LABEL}
          </span>
        </Link>

        {RIGHT_ITEMS.map((item) => (
          <NavItem
            key={item.label}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
          />
        ))}
      </div>
    </nav>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold" | "fill" | "regular"; className?: string }>;
  active: boolean;
}

function NavItem({ href, label, icon: Icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-lg py-1"
    >
      <Icon
        size={22}
        weight={active ? "fill" : "bold"}
        className={cn(
          "transition",
          active ? "text-lime-400" : "text-text-secondary"
        )}
      />
      <span
        className={cn(
          "text-[10px] font-medium transition",
          active ? "text-cream-50" : "text-text-secondary"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
