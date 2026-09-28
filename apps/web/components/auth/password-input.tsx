"use client";

import { useState } from "react";
import { CheckCircle, Circle, Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Live password rules (12 §4): length + letter/number variety. */
export const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
  { id: "len", label: "At least 8 characters", test: (v) => v.length >= 8 },
  {
    id: "mixed",
    label: "Letters and numbers",
    test: (v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v),
  },
];

/**
 * Password field with a visibility toggle, per the auth spec. Renders as a
 * plain password input with an anchored eye button — keeps native form and
 * autocomplete behavior intact. `showChecklist` reveals the live rules list
 * (12.6) on signup/update surfaces.
 */
export function PasswordInput({
  id,
  name = "password",
  placeholder = "••••••••",
  autoComplete = "current-password",
  enterKeyHint,
  minLength,
  required = true,
  className,
  showChecklist = false,
}: {
  id: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  minLength?: number;
  required?: boolean;
  className?: string;
  showChecklist?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        minLength={minLength}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-describedby={showChecklist ? `${id}-rules` : undefined}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="text-text-muted hover:text-cream-50 focus-visible:ring-lime-500 absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md transition focus-visible:ring-2 focus-visible:outline-none"
      >
        {visible ? (
          <EyeSlash size={18} weight="bold" />
        ) : (
          <Eye size={18} weight="bold" />
        )}
      </button>
      {showChecklist && (
        <ul id={`${id}-rules`} className="mt-2 space-y-1" aria-live="polite">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value);
            return (
              <li
                key={rule.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  ok ? "text-lime-300" : "text-text-muted"
                )}
              >
                {ok ? (
                  <CheckCircle size={14} weight="fill" aria-hidden />
                ) : (
                  <Circle size={14} aria-hidden />
                )}
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
