"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Gift,
  SignOut,
  SpinnerGap,
  User,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  checkUsername,
  completeOnboarding,
  recordOnboardingEvent,
} from "@/lib/onboarding/actions";
import { claimReferralCode } from "@/lib/referrals/actions";
import { normalizeReferralCode } from "@/lib/referrals/codes";
import { signOut } from "@/app/actions/auth";

/**
 * New-user onboarding (08 §3 — ElevenLabs/Duolingo step grammar): one
 * question per screen, single-select auto-advances after a ~300ms
 * selection beat, inputs and multi-select get explicit CTAs. Chrome is
 * dots + Back + Skip; the code step only exists when relevant.
 */

export interface InterestTile {
  slug: string;
  name: string;
  imageUrl: string | null;
}

type StepId =
  | "welcome"
  | "username"
  | "goal"
  | "interests"
  | "source"
  | "code"
  | "done";

const GOALS = [
  { id: "social", label: "Social posts", hint: "Feeds, stories, and profile pics" },
  { id: "gifts", label: "Gifts & prints", hint: "Something to send or frame" },
  { id: "work", label: "Work & brand", hint: "Headshots, promos, products" },
  { id: "exploring", label: "Just exploring", hint: "See what it can do" },
];

const SOURCES = [
  { id: "friend", label: "A friend sent me" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "google", label: "Google" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X / Twitter" },
  { id: "work", label: "From work" },
  { id: "other", label: "Other" },
];

function suggestedUsername(email: string | null): string {
  const local = (email ?? "").split("@")[0].toLowerCase();
  const base = local.replace(/[^a-z0-9_.]/g, "").replace(/^\.+|\.+$/g, "");
  return base.length >= 3 ? base.slice(0, 20) : "";
}

export function OnboardingFlow({
  email,
  interests,
  referredByName,
  next,
}: {
  email: string | null;
  interests: InterestTile[];
  /** Set when the referral was already claimed (e.g. via an /r/ link). */
  referredByName: string | null;
  next: string;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [username, setUsername] = useState(() => suggestedUsername(email));
  const [usernameCheck, setUsernameCheck] = useState<{
    value: string;
    available: boolean;
    error?: string;
  } | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<
    "idle" | "submitting" | "ok" | "invalid" | "applied"
  >(referredByName ? "applied" : "idle");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [claimedBy, setClaimedBy] = useState<string | null>(referredByName);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [doneError, setDoneError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Dynamic list: the code step exists whenever "a friend sent me" is
  // picked. When attribution already came via an /r/ link it renders the
  // "already applied" confirmation instead of the input (08 §3).
  const steps: StepId[] = [
    "welcome",
    "username",
    "goal",
    "interests",
    "source",
    ...(source === "friend" ? (["code"] as StepId[]) : []),
    "done",
  ];
  const step = steps[stepIndex] ?? "welcome";
  const isLast = step === "done";

  useEffect(() => {
    headingRef.current?.focus();
    if (step !== "welcome") {
      recordOnboardingEvent("impression", { step }).catch(() => {});
    }
  }, [step]);

  // Debounced live availability check (Gizmo pattern — inline, not
  // submit). The visible state is derived at render: an empty field is
  // "idle", a value without a matching completed check is "checking".
  // Only the async response writes state — no sync setState in the effect.
  const trimmedUsername = username.trim().toLowerCase();
  const usernameState: "idle" | "checking" | "available" | "unavailable" =
    trimmedUsername.length === 0
      ? "idle"
      : !usernameCheck || usernameCheck.value !== trimmedUsername
        ? "checking"
        : usernameCheck.available
          ? "available"
          : "unavailable";
  const usernameError =
    usernameState === "unavailable"
      ? (usernameCheck?.error ?? "That one's taken.")
      : null;

  useEffect(() => {
    if (step !== "username" || trimmedUsername.length === 0) return;
    const t = setTimeout(() => {
      checkUsername(trimmedUsername)
        .then((r) =>
          setUsernameCheck({ value: trimmedUsername, available: r.available, error: r.error })
        )
        .catch(() => setUsernameCheck({ value: trimmedUsername, available: false }));
    }, 350);
    return () => clearTimeout(t);
  }, [trimmedUsername, step]);

  function go(to: number) {
    setStepIndex(Math.max(0, Math.min(to, steps.length - 1)));
  }

  /** Single-select: selection beat (~300ms) then auto-advance. */
  function pickAndAdvance(value: string, setter: (v: string) => void) {
    setter(value);
    setTimeout(() => go(stepIndex + 1), 300);
  }

  function skip(id: StepId) {
    setSkipped((s) => [...s, id]);
    recordOnboardingEvent("dismiss", { step: id }).catch(() => {});
    go(stepIndex + 1);
  }

  async function submitCode() {
    const normalized = normalizeReferralCode(code);
    if (normalized.length !== 6) {
      setCodeState("invalid");
      setCodeError("Codes are 6 characters — like K7M-2QX.");
      return;
    }
    setCodeState("submitting");
    setCodeError(null);
    const res = await claimReferralCode(normalized);
    if (res.ok) {
      setCodeState("applied");
      setClaimedBy(res.referrerName ?? "Your friend");
      recordOnboardingEvent("accept", {
        step: "code",
        code_valid: true,
      }).catch(() => {});
    } else {
      setCodeState("invalid");
      setCodeError(res.error ?? "That code didn't work — try again.");
      recordOnboardingEvent("decline", {
        step: "code",
        code_valid: false,
      }).catch(() => {});
    }
  }

  async function finish() {
    setBusy(true);
    setDoneError(null);
    const res = await completeOnboarding({
      username,
      goal,
      interests: [...picked],
      source,
      referralCodeUsed: codeState === "applied" ? normalizeReferralCode(code) : null,
      skipped,
    });
    if (!res.ok) {
      setBusy(false);
      setDoneError(res.error ?? "Couldn't save — try again.");
      return;
    }
    recordOnboardingEvent("accept", {
      step: "done",
      duration_s: Math.round((Date.now() - startedAt) / 1000),
      skipped_count: skipped.length,
    }).catch(() => {});
    router.push(next || "/app");
  }

  return (
    <div className="bg-ink-950 flex min-h-dvh flex-col">
      {/* Chrome: logo, dots, sign out */}
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <span className="font-display text-cream-50 text-sm font-bold tracking-tight">
          5Pixels
        </span>
        <div className="flex items-center gap-1.5" aria-hidden>
          {steps.slice(1).map((s, i) => (
            <span
              key={s + i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i < stepIndex
                  ? "bg-lime-400 w-4"
                  : i === stepIndex - 1
                    ? "bg-lime-400/70 w-4"
                    : "bg-cream-100/15 w-1.5"
              )}
            />
          ))}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <SignOut size={13} weight="bold" />
            Sign out
          </button>
        </form>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md" key={step}>
          <div className="animate-[onb-step_280ms_ease-out]">
            {/* Back row */}
            {stepIndex > 0 && !isLast && (
              <button
                type="button"
                onClick={() => go(stepIndex - 1)}
                className="text-text-muted hover:text-cream-100 mb-6 inline-flex items-center gap-1.5 text-xs transition-colors"
              >
                <ArrowLeft size={13} weight="bold" />
                Back
              </button>
            )}

            {step === "welcome" && (
              <div className="text-center">
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-cream-50 text-3xl font-bold leading-tight outline-none sm:text-4xl"
                >
                  Welcome to 5Pixels
                </h1>
                <p className="text-text-secondary mx-auto mt-3 max-w-sm text-sm leading-relaxed">
                  Pick a look, upload a photo, and we handle the rest. Three
                  quick questions to set up your studio.
                </p>
                <Button
                  variant="brand"
                  size="lg"
                  className="mt-8 w-full"
                  onClick={() => go(1)}
                >
                  Let&rsquo;s go
                </Button>
              </div>
            )}

            {step === "username" && (
              <div>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-cream-50 text-center text-2xl font-bold outline-none"
                >
                  What should we call you?
                </h2>
                <p className="text-text-secondary mt-2 text-center text-sm">
                  This is your handle — it goes on shares and gifts.
                </p>
                <div className="mt-8">
                  <div
                    className={cn(
                      "border-cream-100/10 bg-charcoal-850 flex items-center rounded-[14px] border transition-colors",
                      usernameState === "available" &&
                        "border-lime-500/50",
                      usernameState === "unavailable" &&
                        "border-red-500/50"
                    )}
                  >
                    <span className="text-text-muted pl-4">
                      <User size={16} weight="bold" />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="maya.creates"
                      autoFocus
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={20}
                      className="text-cream-50 placeholder:text-text-muted w-full bg-transparent px-3 py-3.5 text-base font-medium outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && usernameState === "available")
                          go(stepIndex + 1);
                      }}
                    />
                    {usernameState === "checking" && (
                      <SpinnerGap
                        size={16}
                        className="text-text-muted mr-4 animate-spin"
                      />
                    )}
                    {usernameState === "available" && (
                      <Check
                        size={16}
                        weight="bold"
                        className="text-lime-400 mr-4"
                      />
                    )}
                  </div>
                  {usernameError && (
                    <p className="mt-2 text-center text-xs text-red-400">
                      {usernameError}
                    </p>
                  )}
                </div>
                <Button
                  variant="brand"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={usernameState !== "available"}
                  onClick={() => go(stepIndex + 1)}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === "goal" && (
              <div>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-cream-50 text-center text-2xl font-bold outline-none"
                >
                  What will you create?
                </h2>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => pickAndAdvance(g.id, setGoal)}
                      className={cn(
                        "border-cream-100/10 bg-charcoal-850 hover:border-cream-100/25 rounded-[14px] border p-4 text-left transition-all",
                        goal === g.id &&
                          "border-lime-500 bg-lime-500/10"
                      )}
                    >
                      <p className="text-cream-50 text-sm font-semibold">
                        {g.label}
                      </p>
                      <p className="text-text-muted mt-0.5 text-xs">
                        {g.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "interests" && (
              <div>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-cream-50 text-center text-2xl font-bold outline-none"
                >
                  Which looks catch your eye?
                </h2>
                <p className="text-text-secondary mt-2 text-center text-sm">
                  Pick a few — we&rsquo;ll put them first on Explore.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {interests.map((tile) => {
                    const active = picked.has(tile.slug);
                    return (
                      <button
                        key={tile.slug}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setPicked((prev) => {
                            const nextSet = new Set(prev);
                            if (nextSet.has(tile.slug)) nextSet.delete(tile.slug);
                            else nextSet.add(tile.slug);
                            return nextSet;
                          })
                        }
                        className={cn(
                          "border-cream-100/10 relative aspect-square overflow-hidden rounded-[14px] border transition-all",
                          active && "border-lime-500 ring-lime-500/40 ring-2"
                        )}
                      >
                        {tile.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small interest tiles don't need next/image optimization
                          <img
                            src={tile.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="bg-charcoal-800 h-full w-full" />
                        )}
                        <span className="from-ink-950/80 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent px-2 pb-1.5 pt-5 text-left">
                          <span className="text-cream-50 text-[11px] font-semibold leading-tight">
                            {tile.name}
                          </span>
                        </span>
                        {active && (
                          <span className="bg-lime-500 text-ink-950 absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                            <Check size={11} weight="bold" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => skip("interests")}
                    className="text-text-muted hover:text-cream-100 text-xs transition-colors"
                  >
                    Show me everything
                  </button>
                  <Button
                    variant="brand"
                    disabled={picked.size === 0}
                    onClick={() => go(stepIndex + 1)}
                  >
                    Continue{picked.size > 0 ? ` · ${picked.size}` : ""}
                  </Button>
                </div>
              </div>
            )}

            {step === "source" && (
              <div>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-cream-50 text-center text-2xl font-bold outline-none"
                >
                  How did you hear about us?
                </h2>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {SOURCES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickAndAdvance(s.id, setSource)}
                      className={cn(
                        "border-cream-100/10 bg-charcoal-850 hover:border-cream-100/25 rounded-[14px] border px-4 py-3.5 text-left transition-all",
                        source === s.id &&
                          "border-lime-500 bg-lime-500/10"
                      )}
                    >
                      <p className="text-cream-50 text-sm font-semibold">
                        {s.label}
                      </p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => skip("source")}
                  className="text-text-muted hover:text-cream-100 mx-auto mt-5 block text-xs transition-colors"
                >
                  Skip
                </button>
              </div>
            )}

            {step === "code" && (
              <div className="text-center">
                <span className="bg-lime-500/10 text-lime-400 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <Gift size={22} weight="fill" />
                </span>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-cream-50 mt-4 text-2xl font-bold outline-none"
                >
                  {codeState === "applied"
                    ? `${claimedBy ?? "Your friend"}'s gift is yours`
                    : "Enter their code"}
                </h2>
                <p className="text-text-secondary mx-auto mt-2 max-w-xs text-sm leading-relaxed">
                  {codeState === "applied"
                    ? "25 credits and a free first transformation — pick any look and it's on them."
                    : "Claim your gift — 25 credits and your first transformation, on them."}
                </p>
                {codeState !== "applied" && (
                  <>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.toUpperCase().slice(0, 7))
                      }
                      placeholder="K7M-2QX"
                      autoFocus
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className={cn(
                        "border-cream-100/10 bg-charcoal-850 text-cream-50 placeholder:text-text-muted mt-8 w-full rounded-[14px] border px-4 py-3.5 text-center font-mono text-lg font-bold tracking-[0.2em] outline-none transition-colors",
                        codeState === "invalid" && "border-red-500/50"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && codeState !== "submitting")
                          submitCode();
                      }}
                    />
                    {codeError && codeState === "invalid" && (
                      <p className="mt-2 text-xs text-red-400">{codeError}</p>
                    )}
                    <Button
                      variant="brand"
                      size="lg"
                      className="mt-5 w-full"
                      disabled={codeState === "submitting" || code.trim().length === 0}
                      onClick={submitCode}
                    >
                      {codeState === "submitting" ? "Checking…" : "Claim gift"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => skip("code")}
                      className="text-text-muted hover:text-cream-100 mx-auto mt-4 block text-xs transition-colors"
                    >
                      No code — continue
                    </button>
                  </>
                )}
                {codeState === "applied" && (
                  <Button
                    variant="brand"
                    size="lg"
                    className="mt-8 w-full"
                    onClick={() => go(stepIndex + 1)}
                  >
                    Continue
                  </Button>
                )}
              </div>
            )}

            {step === "done" && (
              <div className="text-center">
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-cream-50 text-3xl font-bold outline-none"
                >
                  You&rsquo;re set{username ? `, ${username}` : ""}.
                </h2>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {goal && (
                    <span className="border-cream-100/10 bg-charcoal-800 text-text-secondary rounded-full border px-3 py-1.5 text-xs">
                      {GOALS.find((g) => g.id === goal)?.label}
                    </span>
                  )}
                  {picked.size > 0 && (
                    <span className="border-cream-100/10 bg-charcoal-800 text-text-secondary rounded-full border px-3 py-1.5 text-xs">
                      {picked.size}{" "}
                      {picked.size === 1 ? "look" : "looks"} picked
                    </span>
                  )}
                  {codeState === "applied" && (
                    <span className="border-lime-500/30 bg-lime-500/10 text-lime-300 rounded-full border px-3 py-1.5 text-xs font-medium">
                      First transformation free
                    </span>
                  )}
                </div>
                {doneError && (
                  <p className="mt-4 text-xs text-red-400">{doneError}</p>
                )}
                <Button
                  variant="brand"
                  size="lg"
                  className="mt-8 w-full"
                  disabled={busy}
                  onClick={finish}
                >
                  {busy ? "Setting things up…" : "Start creating"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`@keyframes onb-step{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
