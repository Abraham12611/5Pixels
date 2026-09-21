import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-[120px] rounded-xl border border-cream-100/10 bg-charcoal-800 px-4 py-2.5 text-sm text-cream-50 placeholder:text-text-muted focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
