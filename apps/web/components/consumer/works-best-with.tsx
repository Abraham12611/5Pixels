import { Check, X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const GUIDANCE = [
  { ok: true, caption: "Well-lit" },
  { ok: true, caption: "Centered" },
  { ok: false, caption: "Group shots" },
] as const;

/**
 * "Works best with" — compact do/don't suitability tiles at the point of
 * choice (25_MOBILE_WEB_POLISH/07 §3, adapting Lensa's suitability grid).
 * Honest icon tiles rather than fabricated before/after imagery.
 */
export function WorksBestWith() {
  return (
    <ul className="grid grid-cols-3 gap-3">
      {GUIDANCE.map((item) => (
        <li
          key={item.caption}
          className="bg-charcoal-850 border-cream-100/10 flex flex-col items-center gap-2.5 rounded-xl border py-5"
        >
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              item.ok
                ? "bg-lime-400/15 text-lime-400"
                : "bg-cream-100/10 text-text-muted"
            )}
          >
            {item.ok ? (
              <Check size={20} weight="bold" />
            ) : (
              <X size={20} weight="bold" />
            )}
          </span>
          <span
            className={cn(
              "text-[12px] font-semibold",
              item.ok ? "text-cream-50" : "text-text-muted"
            )}
          >
            {item.caption}
          </span>
        </li>
      ))}
    </ul>
  );
}
