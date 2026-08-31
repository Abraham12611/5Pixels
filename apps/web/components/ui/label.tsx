import { cn } from "@/lib/utils";
import { LabelHTMLAttributes, forwardRef } from "react";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-text-primary",
          className
        )}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";
