interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  variant?: "default" | "lime" | "warning" | "danger";
}

const variantClasses = {
  default: "border-cream-100/10 bg-charcoal-850",
  lime: "border-lime-400/20 bg-charcoal-850",
  warning: "border-amber-400/20 bg-charcoal-850",
  danger: "border-rose-400/20 bg-charcoal-850",
};

export function StatCard({
  label,
  value,
  detail,
  variant = "default",
}: StatCardProps) {
  return (
    <div
      className={`border rounded-2xl p-5 transition hover:brightness-110 ${variantClasses[variant]}`}
    >
      <p className="text-text-secondary text-sm font-medium">{label}</p>
      <p className="text-cream-50 mt-2 text-3xl font-bold tracking-tight">
        {value}
      </p>
      {detail && <p className="text-text-muted mt-1 text-xs">{detail}</p>}
    </div>
  );
}
