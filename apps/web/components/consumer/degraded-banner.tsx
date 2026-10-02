import { Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * P60 — degraded-service notice. Rendered when GENERATION_PAUSED=true so
 * browsing stays fully usable while new transformations are disabled with an
 * explanation instead of repeated failures. No invented ETAs.
 */
export function DegradedBanner() {
  if (process.env.GENERATION_PAUSED !== "true") return null;

  return (
    <div
      role="status"
      className="border-cream-100/10 bg-charcoal-800 border-b"
    >
      <div className="text-text-secondary mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[13px] sm:px-6">
        <Warning size={14} weight="fill" className="shrink-0 text-lime-400" />
        Transformations are paused right now. Browsing and your Library still
        work.
      </div>
    </div>
  );
}
