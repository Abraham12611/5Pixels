"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
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
 * P44 — contextual auth modal for gated actions. Preserves the preset intent:
 * successful login redirects to `next` (usually /app/create/<slug>), signup
 * routes through verify-email carrying the same intent. Bottom sheet on
 * mobile, centered dialog on desktop.
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
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  // Lock body scroll while open (bottom sheet on mobile scrolls internally).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  // Remounts on every open, so the tab resets without an effect.
  return (
    <AuthModalBody
      overlayRef={overlayRef}
      onOpenChange={onOpenChange}
      next={next}
      preset={preset}
      initialTab={initialTab}
    />
  );
}

function AuthModalBody({
  overlayRef,
  onOpenChange,
  next,
  preset,
  initialTab,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  onOpenChange: (open: boolean) => void;
  next: string;
  preset?: AuthModalPreset | null;
  initialTab: "login" | "signup";
}) {
  const [tab, setTab] = useState<"login" | "signup">(initialTab);

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className="bg-ink-950/80 fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tab === "login" ? "Log in" : "Create account"}
        className="border-cream-100/10 bg-charcoal-850 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border sm:max-w-sm sm:rounded-2xl"
      >
        {/* Sticky header: context + close */}
        <div className="border-cream-100/10 flex items-center gap-3 border-b px-5 py-4">
          {preset?.thumbUrl && (
            <Image
              src={preset.thumbUrl}
              alt=""
              width={40}
              height={50}
              className="h-10 w-8 shrink-0 rounded-md object-cover"
              unoptimized
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-cream-50 truncate text-sm font-semibold">
              {preset?.name ?? "Welcome to 5Pixels"}
            </p>
            <p className="text-text-muted text-xs">
              {preset
                ? tab === "login"
                  ? "You'll return to this look after signing in."
                  : "Create an account to try this look."
                : "Sign in to keep creating."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="text-text-muted hover:text-cream-50 focus-visible:ring-lime-500 flex h-9 w-9 items-center justify-center rounded-md transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-4">
          <div
            role="tablist"
            aria-label="Authentication"
            className="bg-charcoal-800 grid grid-cols-2 rounded-lg p-1"
          >
            {(
              [
                { id: "login", label: "Log in" },
                { id: "signup", label: "Create account" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-8 rounded-md text-sm font-medium transition",
                  tab === t.id
                    ? "bg-charcoal-600 text-cream-50"
                    : "text-text-muted hover:text-cream-100"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-5 pt-4 pb-6">
          {tab === "login" ? (
            <ModalLoginForm next={next} onSwitch={() => setTab("signup")} />
          ) : (
            <ModalSignupForm next={next} onSwitch={() => setTab("login")} />
          )}
        </div>
      </div>
    </div>
  );
}

const googleAction = async (formData: FormData) => {
  await signInWithGoogle(undefined, formData);
};

function GoogleButton({ disabled }: { disabled: boolean }) {
  return (
    <>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="bg-cream-100/10 h-px flex-1" />
        <span className="text-text-muted text-xs">or</span>
        <span className="bg-cream-100/10 h-px flex-1" />
      </div>
      <Button
        type="submit"
        formAction={googleAction}
        variant="secondary"
        disabled={disabled}
        className="w-full"
      >
        Continue with Google
      </Button>
    </>
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
          placeholder="you@example.com"
          required
          autoComplete="email"
          autoFocus
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
        <PasswordInput id="modal-password" autoComplete="current-password" />
        {state?.errors?.password && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      <FormAlert state={state} />
      <Button type="submit" variant="brand" disabled={pending} className="w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <GoogleButton disabled={pending} />
      <p className="text-text-secondary text-center text-sm">
        New to 5Pixels?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-lime-400 hover:underline"
        >
          Sign up
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
          placeholder="you@example.com"
          required
          autoComplete="email"
          autoFocus
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
          minLength={8}
        />
        <p className="text-text-muted text-xs">At least 8 characters.</p>
        {state?.errors?.password && (
          <p className="text-error text-[13px]" role="alert">
            {state.errors.password.join(" ")}
          </p>
        )}
      </div>
      <FormAlert state={state} />
      <Button type="submit" variant="brand" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-text-muted text-center text-xs leading-relaxed">
        By creating an account you agree to 5Pixels&apos; terms and privacy
        practices.
      </p>
      <GoogleButton disabled={pending} />
      <p className="text-text-secondary text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-lime-400 hover:underline"
        >
          Log in
        </button>
      </p>
    </form>
  );
}
