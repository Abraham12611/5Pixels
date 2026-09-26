import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compact relative timestamp for owned-content surfaces (Library cards, Runs
 * rows): "just now", "12m", "3h", "2d", then a short date after 7 days.
 */
export function formatRelativeTime(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Date.now() - time;
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(time).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: time < Date.now() - 300 * 24 * 60 * 60 * 1000 ? "numeric" : undefined,
  });
}

/**
 * Splits timestamped items into Today / Earlier groups for inbox-style lists
 * (25_MOBILE_WEB_POLISH 14 §4.3). Order within each group is preserved.
 */
export function groupByDay<T extends { created_at: string }>(
  items: T[]
): { today: T[]; earlier: T[] } {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  const today: T[] = [];
  const earlier: T[] = [];
  for (const item of items) {
    (new Date(item.created_at).getTime() >= cutoff.getTime()
      ? today
      : earlier
    ).push(item);
  }
  return { today, earlier };
}
