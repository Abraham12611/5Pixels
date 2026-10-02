"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Required legal-acceptance checkbox for signup (and for sign-in when the
 * legal bundle version has moved past the user's recorded consent).
 * Submits `accept_terms=on` — Radix renders a real hidden input.
 */
export function LegalConsentCheckbox({
  id,
  error,
  onCheckedChange,
}: {
  id: string;
  error?: string;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2.5">
        <Checkbox
          id={id}
          name="accept_terms"
          value="on"
          required
          onCheckedChange={(checked) => onCheckedChange?.(checked === true)}
        />
        <label
          htmlFor={id}
          className={cn(
            "text-text-secondary cursor-pointer text-xs leading-relaxed",
            error && "text-error"
          )}
        >
          I agree to the{" "}
          <Link href="/terms" className="text-lime-400 hover:underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/privacy" className="text-lime-400 hover:underline">
            Privacy Policy
          </Link>
          ,{" "}
          <Link
            href="/acceptable-use"
            className="text-lime-400 hover:underline"
          >
            Acceptable Use Policy
          </Link>
          , and{" "}
          <Link href="/cookies" className="text-lime-400 hover:underline">
            Cookie Notice
          </Link>
          .
        </label>
      </div>
      {error && (
        <p className="text-error text-[13px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
