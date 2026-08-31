"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    messageText(message) || state?.message || googleState?.message;
  const statusError = error;

  return (
    <form action={submitAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <div>
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
          <p className="text-error mt-1 text-sm">
            {state.errors.email.join(" ")}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        {state?.errors?.password && (
          <p className="text-error mt-1 text-sm">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      {statusMessage && (
        <p className="rounded-lg bg-lime-500/10 px-3 py-2 text-sm text-lime-400">
          {statusMessage}
        </p>
      )}
      {statusError && (
        <p className="bg-error/10 text-error rounded-lg px-3 py-2 text-sm">
          {statusError === "no-code"
            ? "No authorization code provided. Please try again."
            : statusError}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending || googlePending}
        className="w-full"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
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
