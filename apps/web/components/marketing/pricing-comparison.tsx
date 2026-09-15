import {
  Coins,
  Sparkle,
  Images,
  Headset,
  CaretDown,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { PlanForPurchase } from "@/lib/db/plans";

export interface ComparisonColumn {
  key: string;
  label: string;
  sublabel: string;
}

interface ComparisonRow {
  label: string;
  values: (string | boolean)[];
}

interface ComparisonSection {
  title: string;
  icon: Icon;
  rows: ComparisonRow[];
  defaultOpen?: boolean;
}

function creditRateLabel(markup: number): string {
  if (markup >= 3.5) return "Standard";
  if (markup >= 2.5) return "Reduced";
  return "Lowest";
}

function buildSections(monthlyPlans: PlanForPurchase[]): ComparisonSection[] {
  const count = monthlyPlans.length + 1; // + Free
  const all = (v: string | boolean) => Array<string | boolean>(count).fill(v);
  const perPlan = (fn: (p: PlanForPurchase) => string) => [
    "—",
    ...monthlyPlans.map(fn),
  ];

  return [
    {
      title: "Credits & Transformations",
      icon: Coins,
      defaultOpen: true,
      rows: [
        {
          label: "Credits included",
          values: [
            "10 on signup",
            ...monthlyPlans.map(
              (p) => `${p.credits_grant.toLocaleString()} / month`
            ),
          ],
        },
        {
          label: "Credit top-ups",
          values: ["—", ...all(true).slice(1)],
        },
        {
          label: "Credit cost per transformation",
          values: [
            "Standard",
            ...monthlyPlans.map((p) => creditRateLabel(p.markup_multiplier)),
          ],
        },
        {
          label: "Failed transformations release credits",
          values: all(true),
        },
      ],
    },
    {
      title: "Preset Access",
      icon: Sparkle,
      rows: [
        { label: "Full preset catalog", values: all(true) },
        { label: "New & trending drops", values: all(true) },
        { label: "Preset customization controls", values: all(true) },
      ],
    },
    {
      title: "Library & Output",
      icon: Images,
      rows: [
        { label: "Private result library", values: all(true) },
        { label: "Full-resolution downloads", values: all(true) },
        { label: "Share links", values: all(true) },
        { label: "Favorites", values: all(true) },
      ],
    },
    {
      title: "Support",
      icon: Headset,
      rows: [
        { label: "Email support", values: all(true) },
        {
          label: "Billing support",
          values: perPlan(() => "Priority"),
        },
      ],
    },
  ];
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <Check size={16} weight="bold" className="text-lime-400 mx-auto" />
    );
  }
  if (value === false || value === "—") {
    return <span className="text-text-muted">—</span>;
  }
  return <span className="text-cream-100 text-sm">{value}</span>;
}

export function PricingComparison({
  monthlyPlans,
  recommendedSlug,
}: {
  monthlyPlans: PlanForPurchase[];
  recommendedSlug: string;
}) {
  const columns: ComparisonColumn[] = [
    { key: "free", label: "Free", sublabel: "$0" },
    ...monthlyPlans.map((p) => ({
      key: p.slug,
      label: p.name,
      sublabel: `$${(p.price_cents / 100).toFixed(0)}/mo`,
    })),
  ];
  const sections = buildSections(monthlyPlans);
  const colTemplate = `minmax(140px,1.4fr) repeat(${columns.length}, minmax(80px,1fr))`;

  return (
    <div className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-[20px] border">
      {/* Sticky plan header */}
      <div
        className="border-cream-100/10 grid items-end gap-2 border-b px-5 py-4"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div />
        {columns.map((col) => (
          <div key={col.key} className="text-center">
            <p className="text-cream-50 text-sm font-semibold">{col.label}</p>
            <p className="text-text-secondary text-xs">{col.sublabel}</p>
            {col.key === recommendedSlug && (
              <span className="bg-lime-500/10 text-lime-300 mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Recommended
              </span>
            )}
          </div>
        ))}
      </div>

      {sections.map((section) => (
        <details
          key={section.title}
          open={section.defaultOpen}
          className="group border-cream-100/10 border-b last:border-b-0"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <section.icon size={18} className="text-lime-400" weight="regular" />
            <span className="text-cream-50 flex-1 text-sm font-semibold">
              {section.title}
            </span>
            <CaretDown
              size={16}
              className="text-text-secondary transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="px-5 pb-4">
            {section.rows.map((row) => (
              <div
                key={row.label}
                className={cn(
                  "border-cream-100/10 grid items-center gap-2 border-t py-3"
                )}
                style={{ gridTemplateColumns: colTemplate }}
              >
                <p className="text-text-secondary text-sm">{row.label}</p>
                {row.values.map((value, i) => (
                  <div key={columns[i].key} className="text-center">
                    <CellValue value={value} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
