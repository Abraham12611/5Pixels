"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { GoogleLogo } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { InAppBrowserNotice } from "@/components/auth/in-app-browser-notice";
import {
  signIn,
  signUp,
  signInWithGoogle,
  type AuthFormState,
} from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const initialState: AuthFormState = undefined;

export interface AuthModalPreset {
  name: string;
  thumbUrl?: string | null;
}

/**
 * The single contextual auth sheet (12 §3) — T2 bottom sheet on mobile via the
 * shared `Sheet`, centered on desktop. Preserves the preset intent: successful
 * login redirects to `next`, signup routes through verify-email carrying the
 * same intent. Tab switching stays inside the sheet so the interrupted task
 * is never lost.
 */
export function AuthModal({
  open,
  onOpenChange,
  next,
  preset,
  initialTab = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next: string;
  preset?: AuthModalPreset | null;
  initialTab?: "login" | "signup";
}) {
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [prevOpen, setPrevOpen] = useState(open);
  // Reset to the caller's default tab each time the sheet opens — render-phase
  // adjust, no effect.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setTab(initialTab);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      tier="content"
      title={tab === "login" ? "Sign in to generate" : "Create your account"}
      showClose
      bodyClassName="px-5 pb-2"
    >
      {/* Preset context + the reason line (12 §2.3) */}
      {preset && (
        <div className="border-cream-100/10 mb-4 flex items-center gap-3 border-b pb-4">
          {preset.thumbUrl && (
            <Image
              src={preset.thumbUrl}
              alt=""
              width={40}
              height={50}
              className="h-12 w-10 shrink-0 rounded-md object-cover"
              unoptimized
            />
          )}
          <div className="min-w-0">
            <p className="text-cream-50 truncate text-sm font-semibold">
              Continue to {preset.name}
            </p>
            <p className="text-text-secondary mt-0.5 text-xs leading-relaxed">
              We keep your results in your Library and your credits with your
              account.
            </p>
          </div>
        </div>
      )}
      {!preset && (
        <p className="text-text-secondary mb-4 text-sm leading-relaxed">
          We keep your results in your Library and your credits with your
          account.
        </p>
      )}

      <InAppBrowserNotice />

      {/* Google first — fewest taps on mobile (12 §3) */}
      <GoogleForm next={next} />

      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className="bg-cream-100/10 h-px flex-1" />
        <span className="text-text-muted text-xs">or</span>
        <span className="bg-cream-100/10 h-px flex-1" />
      </div>

      {tab === "login" ? (
        <ModalLoginForm next={next} onSwitch={() => setTab("signup")} />
      ) : (
        <ModalSignupForm next={next} onSwitch={() => setTab("login")} />
      )}
    </Sheet>
  );
}

const googleAction = async (formData: FormData) => {
  await signInWithGoogle(undefined, formData);
};

function GoogleForm({ next }: { next: string }) {
  return (
    <form action={googleAction}>
      <input type="hidden" name="next" value={next} />
      <Button
        type="submit"
        variant="secondary"
        className="h-12 w-full gap-2"
      >
        <GoogleLogo size={18} weight="bold" aria-hidden />
        Continue with Google
      </Button>
    </form>
  );
}

function FormAlert({ state }: { state: AuthFormState }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.success ? "status" : "alert"}
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        state.success
          ? "bg-lime-500/10 text-lime-300"
          : "bg-error/10 text-error"
      )}
    >
      {state.message}
    </p>
  );
}

function ModalLoginForm({
  next,
  onSwitch,
}: {
  next: string;
  onSwitch: () => void;
}) {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(signIn, initialState);

  return (
    <form action={submitAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="modal-email">Email</Label>
        <Input
          id="modal-email"
          name="email"
          type="email"
          inputMode="email"
          enterKeyHint="next"
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
          <Label htmlFor="modal-password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-text-muted hover:text-cream-50 text-xs font-medium transition"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="modal-password"
          autoComplete="current-password"
          enterKeyHint="go"
        />
        {state?.errors?.password && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      <FormAlert state={state} />
      <Button type="submit" variant="brand" disabled={pending} className="h-12 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-text-secondary text-center text-sm">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-lime-400 hover:underline"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}

function ModalSignupForm({
  next,
  onSwitch,
}: {
  next: string;
  onSwitch: () => void;
}) {
  const [state, submitAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(signUp, initialState);

  return (
    <form action={submitAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="modal-su-email">Email</Label>
        <Input
          id="modal-su-email"
          name="email"
          type="email"
          inputMode="email"
          enterKeyHint="next"
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
        <Label htmlFor="modal-su-password">Password</Label>
        <PasswordInput
          id="modal-su-password"
          autoComplete="new-password"
          enterKeyHint="go"
          minLength={8}
          showChecklist
        />
        {state?.errors?.password && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      <FormAlert state={state} />
      <Button type="submit" variant="brand" disabled={pending} className="h-12 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-text-muted text-center text-xs leading-relaxed">
        By creating an account you agree to 5Pixels&apos; terms and privacy
        practices.
      </p>
      <p className="text-text-secondary text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-lime-400 hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
