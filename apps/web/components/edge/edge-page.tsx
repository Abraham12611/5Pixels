import Link from "next/link";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import { Button } from "@/components/ui/button";

/**
 * P59 — shared edge-state grammar: five-pixel motif, clear title, one calm
 * sentence, a primary recovery action, and an optional secondary route.
 * Never a dead end.
 */
export function EdgePage({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: {
  title: string;
  description: string;
  primaryAction: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  /** Optional slot below the actions (e.g. alternative presets). */
  children?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-14 text-center">
      <FivePixelMark className="text-text-muted" />
      <h1 className="text-cream-50 mt-6 text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-text-secondary mt-2 max-w-sm text-sm leading-relaxed">
        {description}
      </p>
      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild variant="brand">
          <Link href={primaryAction.href}>{primaryAction.label}</Link>
        </Button>
        {secondaryAction && (
          <Button asChild variant="secondary">
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        )}
      </div>
      {children}
    </main>
  );
}
