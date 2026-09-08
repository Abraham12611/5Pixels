"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  Check,
  CreditCard,
  Image,
  Info,
} from "@phosphor-icons/react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/db/notifications";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  unreadCount: number;
  notifications: NotificationItem[];
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function typeIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "billing":
      return CreditCard;
    case "system":
      return Info;
    default:
      return Image;
  }
}

export function NotificationDropdown({
  unreadCount,
  notifications,
}: NotificationDropdownProps) {
  const [isPending, startTransition] = useTransition();
  const hasUnread = unreadCount > 0;

  const markRead = (id: string) => {
    startTransition(() => {
      void markNotificationRead(id);
    });
  };

  const markAll = () => {
    if (!hasUnread) return;
    startTransition(() => {
      void markAllNotificationsRead();
    });
  };

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="relative flex items-center rounded-full p-1.5 transition hover:bg-charcoal-800 focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:outline-none"
                aria-label={
                  hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"
                }
              >
                {hasUnread ? (
                  <Bell size={22} weight="fill" className="text-cream-50" />
                ) : (
                  <Bell size={22} weight="bold" className="text-text-secondary" />
                )}
                {hasUnread && (
                  <span className="ring-ink-950 absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-lime-400 ring-2" />
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className="w-96 border-cream-100/10 bg-charcoal-900 p-0 text-cream-50"
        align="end"
        sideOffset={8}
      >
        <div className="border-b-cream-100/10 flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <button
            type="button"
            onClick={markAll}
            disabled={!hasUnread || isPending}
            className="text-text-secondary hover:text-lime-300 disabled:text-text-muted flex items-center gap-1 text-xs font-medium transition disabled:cursor-default"
          >
            <Check size={14} weight="bold" />
            Mark all read
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="bg-charcoal-800 text-text-muted flex h-11 w-11 items-center justify-center rounded-full">
                <Bell size={20} weight="bold" />
              </span>
              <p className="text-cream-50 text-sm font-medium">
                No notifications yet
              </p>
              <p className="text-text-muted text-xs">
                We&apos;ll let you know when something happens.
              </p>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => {
                const Icon = typeIcon(n.type);
                const unread = !n.read_at;
                return (
                  <li key={n.id}>
                    <div
                      className={cn(
                        "hover:bg-charcoal-850 border-b-cream-100/5 group flex gap-3 px-4 py-3 transition last:border-b-0",
                        unread && "bg-charcoal-850/60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          unread
                            ? "bg-lime-400/15 text-lime-300"
                            : "bg-charcoal-800 text-text-secondary"
                        )}
                      >
                        <Icon size={17} weight={unread ? "fill" : "bold"} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-cream-50 text-sm font-semibold leading-snug">
                            {n.link ? (
                              <Link href={n.link} className="hover:text-lime-300">
                                {n.title}
                              </Link>
                            ) : (
                              n.title
                            )}
                          </p>
                          <span className="text-text-muted shrink-0 text-[11px]">
                            {relativeTime(n.created_at)}
                          </span>
                        </div>
                        {n.body ? (
                          <p className="text-text-secondary mt-0.5 line-clamp-2 text-xs">
                            {n.body}
                          </p>
                        ) : null}
                      </div>

                      {unread && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          disabled={isPending}
                          className="text-text-muted hover:text-lime-300 mt-0.5 shrink-0 opacity-0 transition group-hover:opacity-100"
                          aria-label="Mark as read"
                        >
                          <Check size={15} weight="bold" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
