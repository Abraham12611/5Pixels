import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, Children, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "brand"
    | "utility"
    | "secondary"
    | "tertiary"
    | "destructive"
    | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

const variants = {
  brand: "bg-lime-500 text-ink-950 hover:bg-lime-400",
  utility: "bg-cream-50 text-ink-950 hover:bg-cream-100",
  secondary:
    "bg-charcoal-700 text-cream-50 shadow-border hover:bg-charcoal-800 hover:shadow-border-hover",
  tertiary: "bg-transparent text-text-secondary hover:text-cream-50",
  destructive: "bg-error/10 text-error hover:bg-error/20",
  ghost: "bg-transparent text-cream-50 hover:bg-cream-100/10",
} as const;

const sizes = {
  sm: "rounded-md px-4 py-2 text-xs",
  md: "rounded-md px-6 py-2.5 text-sm",
  lg: "rounded-md px-8 py-3 text-base",
  icon: "h-10 w-10 rounded-md p-0",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "brand",
      size = "md",
      asChild,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center font-semibold transition-[transform,background-color,color,box-shadow,opacity] duration-150 ease-out motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-50",
      variants[variant],
      sizes[size],
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
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
