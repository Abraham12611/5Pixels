"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppleLogo, EnvelopeSimple, GoogleLogo, X } from "@phosphor-icons/react";
import { useDialogA11y } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Deferred auth gate — shown when an anonymous studio user taps Generate.
 * The setup (photo + look + controls) is already staged client-side, so the
 * promise "your photo and look stay ready" is literal. Social providers are
 * placeholders until OAuth is configured; Email and Sign in are live.
 */
export function AuthGateModal({
  open,
  onOpenChange,
  nextPath,
  onBeforeLeave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where auth should return — e.g. /app/create/midnight-premiere?draft=1 */
  nextPath: string;
  /** Persist the draft right before navigating to auth. */
  onBeforeLeave: () => void | Promise<void>;
}) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);
  useDialogA11y(open, panelRef);

  if (!open) return null;

  const next = encodeURIComponent(nextPath);

  const go = async (href: string) => {
    await onBeforeLeave();
    router.push(href);
  };

  const soon = (provider: string) =>
    setNote(`${provider} sign-in is coming soon — continue with email for now.`);

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className="bg-ink-950/80 animate-overlay-in fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to 5Pixels"
        tabIndex={-1}
        className="border-cream-100/10 bg-charcoal-850 animate-sheet-in sm:animate-dialog-in relative w-full max-w-md rounded-t-2xl border p-6 pb-8 shadow-xl outline-none sm:rounded-2xl"
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="text-text-secondary hover:text-cream-50 absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-800 transition-colors"
        >
          <X size={16} weight="bold" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="bg-lime-400 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Image
              src="/brand/logo-mark-ink.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11"
            />
          </span>
          <h2 className="text-cream-50 mt-4 text-2xl font-bold tracking-tight">
            Welcome to 5Pixels
          </h2>
          <p className="text-text-secondary mt-2 text-sm leading-relaxed">
            Create your account to generate — your photo and look stay ready.
          </p>
        </div>

        <div className="mt-6 space-y-2.5">
          <ProviderButton
            label="Continue with Google"
            icon={<GoogleLogo size={20} weight="bold" />}
            onClick={() => soon("Google")}
          />
          <ProviderButton
            label="Continue with Apple"
            icon={<AppleLogo size={20} weight="fill" />}
            onClick={() => soon("Apple")}
          />
          <ProviderButton
            label="Continue with Email"
            icon={<EnvelopeSimple size={20} weight="bold" />}
            onClick={() => void go(`/signup?next=${next}`)}
            accent
          />
        </div>

        {note && (
          <p role="status" className="text-lime-400 mt-3 text-center text-xs">
            {note}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3" aria-hidden>
          <span className="bg-charcoal-700 h-px flex-1" />
          <span className="text-text-muted text-[11px] font-medium uppercase tracking-wider">
            or
          </span>
          <span className="bg-charcoal-700 h-px flex-1" />
        </div>

        <button
          type="button"
          onClick={() => void go(`/login?next=${next}`)}
          className="text-text-secondary hover:text-cream-50 mt-4 w-full text-center text-sm transition-colors"
        >
          Already have an account?{" "}
          <span className="text-lime-400 font-semibold">Sign in</span>
        </button>

        <p className="text-text-muted mt-5 text-center text-[11px] leading-relaxed">
          By continuing you agree to our Terms of Use and acknowledge our
          Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function ProviderButton({
  label,
  icon,
  onClick,
  accent,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
        accent
          ? "bg-lime-400 text-ink-950 border-lime-400 hover:bg-lime-300"
          : "border-cream-100/15 bg-charcoal-800 text-cream-50 hover:border-cream-100/30"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
