interface GenerationStatusBadgeProps {
  status: string;
}

const statusClasses: Record<string, string> = {
  completed: "bg-lime-400/10 text-lime-400",
  created: "bg-charcoal-700 text-text-secondary",
  uploaded: "bg-charcoal-700 text-text-secondary",
  validating: "bg-amber-400/10 text-amber-400",
  queued: "bg-amber-400/10 text-amber-400",
  generating: "bg-amber-400/10 text-amber-400",
  post_processing: "bg-amber-400/10 text-amber-400",
  failed: "bg-rose-400/10 text-rose-400",
  blocked: "bg-rose-400/10 text-rose-400",
  cancelled: "bg-charcoal-700 text-text-muted",
};

export function GenerationStatusBadge({ status }: GenerationStatusBadgeProps) {
  const label = status.replace(/_/g, " ");
  const className =
    statusClasses[status] ?? "bg-charcoal-700 text-text-secondary";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${className}`}
    >
      {label}
    </span>
  );
}
