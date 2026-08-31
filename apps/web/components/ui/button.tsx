import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, Children, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", asChild, children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-lime-500 text-ink-950 hover:bg-lime-400 focus:ring-lime-500",
      secondary:
        "bg-charcoal-800 text-cream-50 border border-cream-100/20 hover:bg-charcoal-700 focus:ring-cream-100/30",
      danger: "bg-error text-cream-50 hover:bg-red-600 focus:ring-error",
      ghost:
        "bg-transparent text-cream-50 hover:bg-cream-100/10 focus:ring-cream-100/30",
    };

    const classes = cn(
      "inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ink-950 disabled:opacity-50",
      variants[variant],
      className
    );

    if (asChild && Children.count(children) === 1) {
      const child = Children.only(children) as React.ReactElement<{
        className?: string;
      }>;
      return (
        <child.type
          {...child.props}
          className={cn(classes, child.props.className)}
        />
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
