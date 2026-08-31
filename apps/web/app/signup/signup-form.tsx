"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = undefined;

export function SignUpForm() {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(signUp, initialState);

  return (
    <form action={submitAction} className="mt-6 space-y-4">
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
          autoComplete="new-password"
          minLength={8}
        />
        {state?.errors?.password && (
          <p className="text-error mt-1 text-sm">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      {state?.message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.success
              ? "bg-lime-500/10 text-lime-400"
              : "bg-error/10 text-error"
          }`}
        >
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
