"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import {
  signIn,
  signInWithGoogle,
  type AuthFormState,
} from "@/app/actions/auth";

const initialState: AuthFormState = undefined;

function messageText(message?: string) {
  if (message === "check-email") {
    return "Account created. Check your email to confirm before signing in.";
  }
  if (message === "password-updated") {
    return "Password updated. Please sign in again.";
  }
  return message;
}

function errorText(error?: string) {
  if (!error) return undefined;
  if (error === "no-code") {
    return "That sign-in link didn't include a code. Please try again.";
  }
  if (error === "link-expired") {
    return "That link has expired or was already used.";
  }
  return error;
}

export function LoginForm({
  message,
  error,
  next,
}: {
  message?: string;
  error?: string;
  next?: string;
}) {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(signIn, initialState);
  const [googleState, googleAction, googlePending] = useActionState<
    AuthFormState,
    FormData
  >(signInWithGoogle, initialState);

  const statusMessage =
    messageText(message) ||
    (state?.success ? state.message : undefined) ||
    (googleState?.success ? googleState.message : undefined);
  const formError =
    state?.success === false
      ? state.message
      : googleState?.success === false
        ? googleState.message
        : undefined;
  const linkError = errorText(error);

  return (
    <form action={submitAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
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
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-text-muted hover:text-cream-50 text-xs font-medium transition"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" autoComplete="current-password" />
        {state?.errors?.password && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      {statusMessage && (
        <p className="rounded-lg bg-lime-500/10 px-3 py-2 text-sm text-lime-300">
          {statusMessage}
        </p>
      )}
      {(formError || linkError) && (
        <div
          role="alert"
          className="bg-error/10 text-error space-y-1.5 rounded-lg px-3 py-2 text-sm"
        >
          <p>{formError ?? linkError}</p>
          {linkError === "That link has expired or was already used." && (
            <p className="text-text-secondary text-xs">
              Need a new link?{" "}
              <Link href="/forgot-password" className="underline underline-offset-2">
                Reset your password
              </Link>{" "}
              or{" "}
              <Link href="/verify-email" className="underline underline-offset-2">
                resend verification
              </Link>
              .
            </p>
          )}
        </div>
      )}
      <Button
        type="submit"
        variant="brand"
        disabled={pending || googlePending}
        className="w-full"
      >
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="bg-cream-100/10 h-px flex-1" />
        <span className="text-text-muted text-xs">or</span>
        <span className="bg-cream-100/10 h-px flex-1" />
      </div>
      <Button
        type="submit"
        formAction={googleAction}
        variant="secondary"
        disabled={pending || googlePending}
        className="w-full"
      >
        {googlePending ? "Connecting…" : "Continue with Google"}
      </Button>
    </form>
  );
}
