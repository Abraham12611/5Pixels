"use client";

import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "border-cream-100/30 data-[state=checked]:border-lime-400 data-[state=checked]:bg-lime-500 data-[state=checked]:text-ink-950 peer mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition outline-none focus-visible:ring-2 focus-visible:ring-lime-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check size={14} weight="bold" aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
