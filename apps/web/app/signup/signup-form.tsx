"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { LegalConsentCheckbox } from "@/components/auth/legal-consent-checkbox";
import {
  signUp,
  signInWithGoogle,
  type AuthFormState,
} from "@/app/actions/auth";

const initialState: AuthFormState = undefined;

export function SignUpForm({ next }: { next?: string }) {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(signUp, initialState);
  const [googleState, googleAction, googlePending] = useActionState<
    AuthFormState,
    FormData
  >(signInWithGoogle, initialState);

  const formError =
    state?.success === false
      ? state.message
      : googleState?.success === false
        ? googleState.message
        : undefined;

  return (
    <form action={submitAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Button
        type="submit"
        formAction={googleAction}
        formNoValidate
        variant="secondary"
        disabled={pending || googlePending}
        className="w-full"
      >
        {googlePending ? "Connecting…" : "Continue with Google"}
      </Button>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="bg-cream-100/10 h-px flex-1" />
        <span className="text-text-muted text-xs">or</span>
        <span className="bg-cream-100/10 h-px flex-1" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
        />
        {state?.errors?.email && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.email.join(" ")}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          minLength={8}
          enterKeyHint="go"
          showChecklist
        />
        {state?.errors?.password && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      <LegalConsentCheckbox id="signup-consent" />
      {formError && (
        <p
          role="alert"
          className="bg-error/10 text-error rounded-lg px-3 py-2 text-sm"
        >
          {formError}
        </p>
      )}
      <Button
        type="submit"
        variant="brand"
        disabled={pending || googlePending}
        className="w-full"
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
