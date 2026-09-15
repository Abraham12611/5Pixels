"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resendVerificationEmail,
  type AuthFormState,
} from "@/app/actions/auth";

const initialState: AuthFormState = undefined;
const RESEND_COOLDOWN = 30;

export function VerifyEmailForm({
  email,
  next,
  linkExpired,
}: {
  email?: string;
  next: string;
  linkExpired: boolean;
}) {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(resendVerificationEmail, initialState);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resendLabel = pending
    ? "Sending…"
    : cooldown > 0
      ? `Resend email (${cooldown}s)`
      : linkExpired
        ? "Send a new verification email"
        : "Resend email";

  return (
    <div className="mt-6 space-y-4">
      <form
        action={submitAction}
        onSubmit={() => setCooldown(RESEND_COOLDOWN)}
        className="space-y-4"
      >
        {/* Expired state asks for the address again — resend needs it. */}
        {linkExpired || !email ? (
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              defaultValue={email}
              required
              autoComplete="email"
            />
          </div>
        ) : (
          <input type="hidden" name="email" value={email} />
        )}
        <input type="hidden" name="next" value={next} />

        {state?.errors?.email && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.email.join(" ")}
          </p>
        )}
        {state?.message && (
          <p
            role={state.success ? "status" : "alert"}
            className={`rounded-lg px-3 py-2 text-sm ${
              state.success
                ? "bg-lime-500/10 text-lime-300"
                : "bg-error/10 text-error"
            }`}
          >
            {state.message}
          </p>
        )}

        <Button
          type="submit"
          variant={linkExpired ? "brand" : "secondary"}
          disabled={pending || cooldown > 0}
          className="w-full"
        >
          {resendLabel}
        </Button>
      </form>
      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">Back to log in</Link>
      </Button>
    </div>
  );
}
