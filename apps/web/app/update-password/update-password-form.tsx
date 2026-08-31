"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = undefined;

export function UpdatePasswordForm() {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(updatePassword, initialState);

  return (
    <form action={submitAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="new-password"
          minLength={8}
        />
        {state?.errors?.password && (
          <p className="text-error mt-1 text-sm">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="new-password"
        />
        {state?.errors?.confirmPassword && (
          <p className="text-error mt-1 text-sm">
            {state.errors.confirmPassword.join(" ")}
          </p>
        )}
      </div>
      {state?.message && (
        <p className="bg-error/10 text-error rounded-lg px-3 py-2 text-sm">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
