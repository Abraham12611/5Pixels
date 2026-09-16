"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  ChartLine,
  SlidersHorizontal,
  Image as ImageIcon,
  Folder,
  Flask,
  Queue,
  ChatCircle,
  WarningOctagon,
  FileText,
  Users,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  label: string;
  href: string;
  icon: Icon;
  /** Path prefixes that should keep this item active. */
  match?: string[];
}

interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: SquaresFour },
      { label: "Analytics", href: "/admin/analytics", icon: ChartLine },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        label: "Filters",
        href: "/admin/filters",
        icon: SlidersHorizontal,
        match: ["/admin/filters/new"],
      },
      {
        label: "Posters",
        href: "/admin/posters",
        icon: ImageIcon,
        match: ["/admin/posters/new"],
      },
      { label: "Categories", href: "/admin/categories", icon: Folder },
      { label: "Lab", href: "/admin/lab", icon: Flask },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Generations", href: "/admin/generations", icon: Queue },
      { label: "Support", href: "/admin/support", icon: ChatCircle },
      { label: "Alerts", href: "/admin/alerts", icon: WarningOctagon },
      { label: "Audit", href: "/admin/audit", icon: FileText },
    ],
  },
  {
    label: "People",
    items: [{ label: "Users", href: "/admin/users", icon: Users }],
  },
];

function isActive(pathname: string, item: AdminNavItem): boolean {
  if (pathname === item.href) return true;
  if (item.match?.some((m) => pathname.startsWith(m))) return true;
  // Detail pages: /admin/<section>/<id> keeps the section active.
  return pathname.startsWith(item.href + "/");
}

function ActiveMarker() {
  return (
    <span aria-hidden="true" className="ml-auto inline-flex items-center gap-[2.5px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="bg-lime-400 h-[3px] w-[3px] rounded-[1px]" />
      ))}
    </span>
  );
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile/tablet: horizontal chip rail */}
      <nav
        aria-label="Admin sections"
        className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:hidden"
      >
        {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
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

      {/* Desktop: stable sidebar rail */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="border-cream-100/10 bg-charcoal-850 sticky top-20 rounded-[15px] border p-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-text-muted px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider first:pt-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  const ItemIcon = item.icon;
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
                          active
                            ? "text-lime-400"
                            : "text-text-muted group-hover:text-text-secondary"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {active && <ActiveMarker />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
