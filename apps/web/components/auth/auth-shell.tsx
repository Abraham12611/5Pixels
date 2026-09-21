import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

/**
 * Shared quiet canvas for every standalone auth route — login, signup,
 * forgot-password, verify-email, update-password. Near-black page, small
 * brand mark, medium-width card. Marketing chrome stays out.
 */
export function AuthShell({
  title,
  subtitle,
  contextNote,
  children,
  footer,
  maxWidth = "max-w-sm",
}: {
  title: string;
  subtitle?: string;
  /** Calm line shown when a return intent exists, e.g. "You'll return to Midnight Premiere." */
  contextNote?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:py-14">
      <Link
        href="/"
        aria-label="5Pixels home"
        className="mb-6 transition-opacity hover:opacity-80"
      >
        <LogoMark className="h-9 w-9" />
      </Link>
      <div
        className={cn(
          "border-cream-100/10 bg-charcoal-850 w-full rounded-2xl border p-6 shadow-lg sm:p-8",
          maxWidth
        )}
      >
        <h1 className="text-cream-50 text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-text-secondary mt-1.5 text-sm">{subtitle}</p>
        )}
        {contextNote && (
          <p className="text-text-secondary border-cream-100/10 bg-charcoal-800/60 mt-4 rounded-lg border px-3 py-2 text-[13px]">
            {contextNote}
          </p>
        )}
        {children}
        {footer}
      </div>
    </main>
  );
}
