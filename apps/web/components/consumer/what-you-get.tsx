import { CheckCircle, Clock, ImageSquare } from "@phosphor-icons/react/dist/ssr";
import type { PublicProductDetail } from "@/types/catalog";

/**
 * "What you get" — the three decision bullets on preset detail
 * (25_MOBILE_WEB_POLISH/07 §3): output size(s), typical time, and what
 * changes. Copy stays plain — no provider/model detail (AGENTS.md).
 */
export function WhatYouGet({ product }: { product: PublicProductDetail }) {
  const sizes = product.output_sizes ?? [];
  const sizeLine = sizes.length
    ? sizes.map((s) => s.name).join(" · ")
    : "Sized to your photo";

  const changeLine =
    product.type === "poster"
      ? "Your text, set into the design"
      : "Your photo restyled — subject stays you";

  const rows = [
    {
      icon: ImageSquare,
      label: "Output",
      value: sizeLine,
    },
    {
      icon: Clock,
      label: "Time",
      value: "Usually 20–40 seconds",
    },
    {
      icon: CheckCircle,
      label: "Result",
      value: changeLine,
    },
  ];

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label} className="flex items-start gap-3">
          <row.icon
            size={20}
            weight="bold"
            className="text-lime-400 mt-0.5 shrink-0"
          />
          <p className="text-text-secondary text-sm">
            <span className="text-cream-50 font-semibold">{row.label}:</span>{" "}
            {row.value}
          </p>
        </li>
      ))}
    </ul>
  );
}
