import { cn } from "@/lib/utils";

interface SettingCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Spacious full-width settings card — the core grammar for Account/Billing
 * surfaces per the design bible (calm charcoal, generous padding).
 */
export function SettingCard({
  title,
  description,
  action,
  children,
  className,
}: SettingCardProps) {
  return (
    <section
      className={cn(
        "border-cream-100/10 bg-charcoal-850 rounded-[15px] border p-6",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-cream-50 text-base font-semibold">{title}</h2>
            )}
            {description && (
              <p className="text-text-secondary mt-1 text-sm leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

interface SettingRowProps {
  label: string;
  value?: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Label/value row inside a SettingCard, separated by hairlines. */
export function SettingRow({
  label,
  value,
  hint,
  action,
  className,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        "border-cream-100/10 flex items-center justify-between gap-4 border-t py-4 first:border-t-0 first:pt-0 last:pb-0",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
          {label}
        </p>
        {value && (
          <p className="text-cream-50 mt-0.5 truncate text-sm font-medium">
            {value}
          </p>
        )}
        {hint && <p className="text-text-muted mt-0.5 text-xs">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
