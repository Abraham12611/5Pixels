"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a visibility toggle, per the auth spec. Renders as a
 * plain password input with an anchored eye button — keeps native form and
 * autocomplete behavior intact.
 */
export function PasswordInput({
  id,
  name = "password",
  placeholder = "••••••••",
  autoComplete = "current-password",
  minLength,
  required = true,
  className,
}: {
  id: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
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
    </div>
  );
}
