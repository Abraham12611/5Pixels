"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  CreditCard,
  Gear,
  SignOut,
  Crown,
} from "@phosphor-icons/react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";

interface UserDropdownProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserDropdown({ name, email, avatarUrl }: UserDropdownProps) {
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-charcoal-800">
                <Avatar className="h-8 w-8 border border-cream-100/10">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={name} />
                  ) : null}
                  <AvatarFallback className="bg-charcoal-700 text-cream-50 text-xs font-semibold">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        className="w-64 border-cream-100/10 bg-charcoal-850 text-cream-50"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 p-3 font-normal">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-text-muted text-xs">{email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-cream-100/10" />

        <DropdownMenuItem asChild>
          <Link
            href="/app/profile"
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-charcoal-800"
          >
            <User size={16} weight="bold" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/app/billing"
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-charcoal-800"
          >
            <CreditCard size={16} weight="bold" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/app/settings"
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-charcoal-800"
          >
            <Gear size={16} weight="bold" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/explore"
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-charcoal-800"
          >
            <Crown size={16} weight="bold" className="text-lime-400" />
            Explore presets
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-cream-100/10" />

        <DropdownMenuItem asChild>
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-400 hover:bg-charcoal-800"
            >
              <SignOut size={16} weight="bold" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
