"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = undefined;
const RESEND_COOLDOWN = 30;

export function ForgotPasswordForm({ linkExpired }: { linkExpired: boolean }) {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(forgotPassword, initialState);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Sent state: stable confirmation, neutral wording, resend with cooldown.
  if (state?.success) {
    return (
      <div className="mt-6 space-y-5 text-center">
        <div className="bg-charcoal-800 mx-auto flex h-12 w-12 items-center justify-center rounded-xl">
          <EnvelopeSimple size={22} weight="bold" className="text-lime-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-cream-50 text-lg font-semibold">
            Check your email
          </h2>
          <p className="text-text-secondary text-sm">
            If that email can receive a reset, a link is on its way.
          </p>
        </div>
        <form
          action={submitAction}
          onSubmit={() => setCooldown(RESEND_COOLDOWN)}
        >
          <input
            type="hidden"
            name="email"
            value={state.sentTo ?? ""}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={pending || cooldown > 0}
            className="w-full"
          >
            {pending
              ? "Sending…"
              : cooldown > 0
                ? `Resend email (${cooldown}s)`
                : "Resend email"}
          </Button>
        </form>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      action={submitAction}
      onSubmit={() => setCooldown(RESEND_COOLDOWN)}
      className="mt-6 space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        {state?.errors?.email && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.email.join(" ")}
          </p>
        )}
      </div>
      {state?.message && !state.success && (
        <p
          role="alert"
          className="bg-error/10 text-error rounded-lg px-3 py-2 text-sm"
        >
          {state.message}
        </p>
      )}
      <Button type="submit" variant="brand" disabled={pending} className="w-full">
        {pending
          ? "Sending…"
          : linkExpired
            ? "Send a new link"
            : "Send reset link"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">Back to log in</Link>
      </Button>
    </form>
  );
}
