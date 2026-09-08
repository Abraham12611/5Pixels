"use client";

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
import { Bell, Check } from "@phosphor-icons/react";

interface NotificationDropdownProps {
  unread: boolean;
}

export function NotificationDropdown({ unread }: NotificationDropdownProps) {
  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="relative rounded-full p-1.5 transition hover:bg-charcoal-800"
                aria-label="Notifications"
              >
                {unread ? (
                  <Bell size={22} weight="fill" className="text-lime-400" />
                ) : (
                  <Bell size={22} weight="bold" />
                )}
                {unread && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lime-400" />
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className="w-80 border-cream-100/10 bg-charcoal-850 p-4 text-cream-50"
        align="end"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <span className="text-text-muted text-xs">All caught up</span>
        </div>
        <div className="rounded-xl bg-charcoal-800 p-4 text-center">
          <Bell
            size={32}
            className="text-text-muted mx-auto mb-3"
            weight="bold"
          />
          <p className="text-cream-50 text-sm font-medium">No notifications yet</p>
          <p className="text-text-secondary mt-1 text-xs">
            We&apos;ll let you know when something happens.
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button className="text-text-secondary hover:text-cream-50 flex items-center gap-1 text-xs transition">
            <Check size={14} weight="bold" />
            Mark all as read
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
