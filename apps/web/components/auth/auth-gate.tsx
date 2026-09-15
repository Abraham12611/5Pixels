"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal, type AuthModalPreset } from "@/components/auth/auth-modal";
import { cn } from "@/lib/utils";

/**
 * Gated-action button for anonymous visitors — opens the contextual auth
 * modal instead of navigating away, preserving the preset/intent.
 */
export function AuthGateButton({
  next,
  preset,
  label = "Try this look",
  costLabel,
  size = "md",
  className,
  ariaLabel,
}: {
  next: string;
  preset?: AuthModalPreset | null;
  label?: string;
  costLabel?: string | null;
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
      >
        {label}
        {costLabel && (
          <span className="text-ink-950/60 text-xs font-medium">
            · {costLabel}
          </span>
        )}
      </Button>
      <AuthModal
        open={open}
        onOpenChange={setOpen}
        next={next}
        preset={preset}
        initialTab="signup"
      />
    </>
  );
}

/** Inline icon variant — same gate for compact affordances (e.g. favorite). */
export function AuthGateIcon({
  next,
  preset,
  children,
  className,
  ariaLabel,
}: {
  next: string;
  preset?: AuthModalPreset | null;
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn(className)}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
      >
        {children}
      </Button>
      <AuthModal
        open={open}
        onOpenChange={setOpen}
        next={next}
        preset={preset}
      />
    </>
  );
}
