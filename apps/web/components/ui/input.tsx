import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-cream-100/10 bg-charcoal-800 px-4 py-2.5 text-sm text-cream-50 placeholder:text-text-muted focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
