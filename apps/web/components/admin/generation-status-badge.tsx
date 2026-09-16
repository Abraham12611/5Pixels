interface GenerationStatusBadgeProps {
  status: string;
}

const statusClasses: Record<string, string> = {
  completed: "bg-lime-400/10 text-lime-400",
  created: "bg-charcoal-700 text-text-secondary",
  uploaded: "bg-charcoal-700 text-text-secondary",
  validating: "bg-warning/10 text-warning",
  queued: "bg-warning/10 text-warning",
  generating: "bg-warning/10 text-warning",
  post_processing: "bg-warning/10 text-warning",
  failed: "bg-error/10 text-error",
  blocked: "bg-error/10 text-error",
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
