"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, GearSix, Sparkle, Wallet, WarningCircle } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsNarrow } from "@/lib/ui/use-media-query";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/db/notifications";
import { cn, groupByDay } from "@/lib/utils";

/** Badge shows the unread count, capped per spec `14 §4.3`. */
export function unreadBadgeLabel(unreadCount: number): string | null {
  if (unreadCount <= 0) return null;
  return unreadCount > 9 ? "9+" : String(unreadCount);
}

const TYPE_ICON = {
  generation: Sparkle,
  billing: Wallet,
  system: WarningCircle,
} as const;

export function NotificationRow({
  n,
  onRead,
}: {
  n: NotificationItem;
  onRead: (id: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const Icon = TYPE_ICON[n.type] ?? WarningCircle;
  const unread = !n.read_at;

  const activate = () => {
    if (unread) {
      onRead(n.id);
      startTransition(() => {
        void markNotificationRead(n.id);
      });
    }
    if (n.link) router.push(n.link);
  };

  return (
    <button
      type="button"
      onClick={activate}
      className={cn(
        "border-cream-100/10 hover:bg-elevated-2 flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0",
        unread && "bg-elevated-2/50"
      )}
      aria-label={
        unread ? `${n.title} — unread` : n.title
      }
    >
      <span className="bg-elevated-3 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Icon size={15} className="text-text-secondary" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "flex items-start justify-between gap-2",
            unread ? "text-cream-50" : "text-text-secondary"
          )}
        >
          <span className="truncate text-sm font-medium">{n.title}</span>
          <span className="text-text-muted mt-0.5 shrink-0 text-xs">
            {new Date(n.created_at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </span>
        {n.body && (
          <span className="text-text-secondary mt-0.5 line-clamp-2 block text-xs leading-relaxed">
            {n.body}
          </span>
        )}
      </span>
      {/* Unread dot — the row itself marks read on activation */}
      <span
        className={cn(
          "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
          unread ? "bg-accent-400" : "bg-transparent"
        )}
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * Inbox rows — Today / Earlier groups plus the empty state. Plain flow: the
 * parent owns scrolling (the Sheet's own body on mobile, a bounded div in the
 * desktop popover). No nested `overflow`/`min-h-0` chain — that collapsed the
 * list to zero height inside the sheet.
 */
export function NotificationInboxList({
  items,
  onRead,
}: {
  items: NotificationItem[];
  onRead: (id: string) => void;
}) {
  const { today, earlier } = groupByDay(items);
  const empty = items.length === 0;

  if (empty) {
    return (
      <p className="text-text-secondary px-4 py-12 text-center text-sm">
        You&apos;re all caught up.
      </p>
    );
  }

  return (
    <>
      {today.length > 0 && (
        <section aria-label="Today">
          <h3 className="text-text-muted border-cream-100/10 bg-charcoal-850 sticky top-0 border-b px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase">
            Today
          </h3>
          {today.map((n) => (
            <NotificationRow key={n.id} n={n} onRead={onRead} />
          ))}
        </section>
      )}
      {earlier.length > 0 && (
        <section aria-label="Earlier">
          <h3 className="text-text-muted border-cream-100/10 bg-charcoal-850 sticky top-0 border-b px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase">
            Earlier
          </h3>
          {earlier.map((n) => (
            <NotificationRow key={n.id} n={n} onRead={onRead} />
          ))}
        </section>
      )}
    </>
  );
}

/** Settings affordance pinned at the foot of the inbox (14 §4.3). */
export function NotificationSettingsRow({ onClose }: { onClose?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-text-secondary justify-start gap-2"
      asChild
    >
      <Link href="/app/account/notifications" onClick={onClose}>
        <GearSix size={14} aria-hidden />
        Notification settings
      </Link>
    </Button>
  );
}

export function NotificationDropdown({
  unreadCount: initialUnread,
  notifications: initialNotifications,
}: {
  unreadCount: number;
  notifications: NotificationItem[];
}) {
  const isNarrow = useIsNarrow();
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  // The app header refetches notifications on every navigation — resync when a
  // fresh payload arrives so the inbox never freezes on a stale snapshot.
  const [prevInitial, setPrevInitial] = useState(initialNotifications);
  if (prevInitial !== initialNotifications) {
    setPrevInitial(initialNotifications);
    setItems(initialNotifications);
    setUnread(initialUnread);
  }
  const [, startTransition] = useTransition();

  const badge = unreadBadgeLabel(unread);

  const markAll = () => {
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? stamp })));
    setUnread(0);
    startTransition(() => {
      void markAllNotificationsRead();
    });
  };

  const markOne = (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.read_at) return;
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    setUnread((c) => Math.max(0, c - 1));
  };

  const trigger = (
    <button
      type="button"
      onClick={isNarrow ? () => setOpen(true) : undefined}
      className="text-text-secondary hover:text-cream-50 hover:bg-elevated-2 relative flex h-10 w-10 items-center justify-center rounded-full transition-colors"
      aria-label={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
    >
      <Bell size={20} />
      {badge && (
        <span className="bg-error text-cream-50 absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-semibold">
          {badge}
        </span>
      )}
    </button>
  );

  const header = (
    <div className="border-cream-100/10 flex items-center justify-between gap-2 border-b px-4 py-3">
      <h2 className="text-cream-50 text-sm font-semibold">Notifications</h2>
      <Button
        variant="ghost"
        size="sm"
        className="text-text-secondary h-8 text-xs"
        onClick={markAll}
        disabled={unread === 0}
      >
        Mark all read
      </Button>
    </div>
  );

  if (isNarrow) {
    return (
      <>
        {trigger}
        {/* T2 inbox — full-height content sheet on mobile (14 §4.3). The
            Sheet's own body scrolls the rows; the footer stays pinned. */}
        <Sheet
          open={open}
          onOpenChange={setOpen}
          tier="content"
          title="Notifications"
          showClose
          bodyClassName="px-0"
          footer={
            <div className="flex items-center justify-between gap-2">
              <NotificationSettingsRow onClose={() => setOpen(false)} />
              <Button
                variant="ghost"
                size="sm"
                className="text-text-secondary h-8 text-xs"
                onClick={markAll}
                disabled={unread === 0}
              >
                Mark all read
              </Button>
            </div>
          }
        >
          <NotificationInboxList items={items} onRead={markOne} />
        </Sheet>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {header}
        <div className="max-h-96 overflow-y-auto">
          <NotificationInboxList items={items} onRead={markOne} />
        </div>
        <div className="border-cream-100/10 border-t p-2">
          <NotificationSettingsRow />
        </div>
      </PopoverContent>
    </Popover>
  );
}
