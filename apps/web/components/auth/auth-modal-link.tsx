"use client";

import { useState, type ButtonHTMLAttributes } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AuthModal,
  type AuthModalPreset,
} from "@/components/auth/auth-modal";
import { buildAuthNext } from "@/lib/auth/return-path";

interface AuthModalLinkProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which form the modal opens on. */
  tab?: "login" | "signup";
  /**
   * Post-auth destination. Defaults to the current path + query (same rules
   * as `AuthReturnLink`), falling back to "/app" on non-returnable surfaces.
   */
  next?: string;
  /** Preset context banner inside the modal. */
  preset?: AuthModalPreset | null;
  /** Referral attribution — forwarded to the modal's ReferralCapture. */
  referrerId?: string;
}

/**
 * The voluntary auth entry point: opens AuthModal in place instead of
 * navigating to /login or /signup. Forced guards (proxy, server redirects)
 * still land on the dedicated pages — this covers every user-initiated
 * "Log in"/"Sign up" affordance.
 */
export function AuthModalLink({
  tab = "login",
  next,
  preset,
  referrerId,
  children,
  onClick,
  ...buttonProps
}: AuthModalLinkProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const current = search ? `${pathname}?${search}` : pathname;
  const resolvedNext = next ?? buildAuthNext(current) ?? "/app";

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        {...buttonProps}
        onClick={(event) => {
          onClick?.(event);
          setOpen(true);
        }}
      >
        {children}
      </button>
      <AuthModal
        open={open}
        onOpenChange={setOpen}
        next={resolvedNext}
        preset={preset}
        initialTab={tab}
        referrerId={referrerId}
      />
    </>
  );
}
