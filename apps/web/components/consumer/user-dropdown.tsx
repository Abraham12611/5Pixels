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
  Lightning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import {
  CreditMeter,
  type CreditMeterTone,
} from "@/components/consumer/five-pixel";
import { Button } from "@/components/ui/button";

interface UserDropdownProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  credits: number;
  /** Plan credit grant used as the meter's capacity. Null/absent for free or top-up-only balances. */
  creditsGrant?: number | null;
  /** Active plan name; null means the user is on the free tier. */
  planName?: string | null;
  /** ISO date the plan renews, when applicable. */
  planRenewsAt?: string | null;
  /** Number of generations currently processing. */
  inProgressCount?: number;
  /** Balance at or below this counts as "low" — typically the cheapest preset cost. */
  lowCreditAt?: number;
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm";

export function UserDropdown({
  name,
  email,
  avatarUrl,
  credits,
  creditsGrant,
  planName,
  planRenewsAt,
  inProgressCount = 0,
  lowCreditAt = 5,
}: UserDropdownProps) {
  const isOut = credits <= 0;
  const isLow = !isOut && credits <= lowCreditAt;

  const meterTone: CreditMeterTone = isOut
    ? "error"
    : isLow
      ? "warning"
      : "default";

  const creditHint = isOut
    ? "You're out of credits — top up to keep creating."
    : isLow
      ? "Running low — top up before your next look."
      : null;

  const action = isOut || isLow
    ? { label: "Buy credits", href: "/app/billing" }
    : planName
      ? { label: "Manage plan", href: "/app/billing" }
      : { label: "Upgrade to a plan", href: "/pricing" };

  const renewsLabel = planRenewsAt
    ? `Renews ${new Date(planRenewsAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`
    : null;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className="hover:bg-charcoal-800 focus-visible:ring-lime-500/50 flex items-center gap-2 rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2"
                aria-label={`Account — ${name}`}
              >
                <Avatar className="border-cream-100/10 h-8 w-8 border">
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
        className="border-cream-100/10 bg-charcoal-850 text-cream-50 w-72 p-2"
        align="end"
        sideOffset={8}
      >
        {/* Identity + plan */}
        <div className="flex items-center gap-3 px-2 pb-1 pt-1">
          <Avatar className="border-cream-100/10 h-10 w-10 border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-charcoal-700 text-cream-50 text-sm font-semibold">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-text-muted truncate text-xs">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 pb-2 pt-0.5">
          <Crown
            size={13}
            weight="fill"
            className={planName ? "text-lime-400" : "text-text-muted"}
          />
          <p className="text-text-secondary flex-1 truncate text-xs">
            {planName ? `${planName} plan` : "Free plan"}
          </p>
          {renewsLabel && (
            <p className="text-text-muted shrink-0 text-[11px]">{renewsLabel}</p>
          )}
        </div>

        {/* Credits */}
        <div className="bg-charcoal-800 media-frame rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">
              Credits
            </p>
            <CreditMeter
              balance={credits}
              max={creditsGrant}
              tone={meterTone}
            />
          </div>
          <p
            className={cn(
              "mt-1 font-mono text-2xl font-semibold leading-tight",
              isOut ? "text-error" : isLow ? "text-warning" : "text-cream-50"
            )}
          >
            {credits}
          </p>
          {creditHint && (
            <p
              className={cn(
                "mt-1 text-xs",
                isOut ? "text-error" : "text-warning"
              )}
            >
              {creditHint}
            </p>
          )}
        </div>

        {/* Economic action */}
        <Button
          asChild
          variant={planName && !isOut && !isLow ? "secondary" : "brand"}
          size="sm"
          className="mt-2 w-full"
        >
          <Link href={action.href}>{action.label}</Link>
        </Button>

        {inProgressCount > 0 && (
          <>
            <DropdownMenuSeparator className="bg-cream-100/10 my-2" />
            <DropdownMenuItem asChild>
              <Link href="/app/generations" className={ITEM_CLASS}>
                <Lightning size={16} weight="fill" className="text-lime-400" />
                <span className="flex-1">
                  {inProgressCount} transformation
                  {inProgressCount === 1 ? "" : "s"} in progress
                </span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-cream-100/10 my-2" />

        <DropdownMenuItem asChild>
          <Link href="/app/profile" className={ITEM_CLASS}>
            <User size={16} weight="bold" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/billing" className={ITEM_CLASS}>
            <CreditCard size={16} weight="bold" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings" className={ITEM_CLASS}>
            <Gear size={16} weight="bold" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-cream-100/10 my-2" />

        <DropdownMenuItem asChild variant="destructive">
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className={cn(ITEM_CLASS, "w-full")}
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
