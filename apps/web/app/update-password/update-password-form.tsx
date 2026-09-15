"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { updatePassword, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = undefined;

export function UpdatePasswordForm() {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(updatePassword, initialState);

  return (
    <form action={submitAction} className="mt-6 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          minLength={8}
        />
        <p className="text-text-muted text-xs">At least 8 characters.</p>
        {state?.errors?.password && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
        />
        {state?.errors?.confirmPassword && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.confirmPassword.join(" ")}
          </p>
        )}
      </div>
      {state?.message && (
        <p
          role="alert"
          className="bg-error/10 text-error rounded-lg px-3 py-2 text-sm"
        >
          {state.message}
        </p>
      )}
      <Button type="submit" variant="brand" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
