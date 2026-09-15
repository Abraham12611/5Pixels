import { CaretDown } from "@phosphor-icons/react/dist/ssr";

const FAQ_ITEMS = [
  {
    q: "How do credits work?",
    a: "Every preset shows an exact credit cost before you generate. You spend that many credits per transformation — no hidden usage.",
  },
  {
    q: "What happens if a generation fails?",
    a: "If a transformation can't complete, the credits it used are released back to your balance automatically. You're never charged for a failed result.",
  },
  {
    q: "Can I buy extra credits?",
    a: "Yes. Monthly subscribers can top up anytime from Billing → Plan. Credits land instantly and are used after your monthly grant.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Credits you don't use stay in your balance while your account is active — including across billing cycles.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Anytime, from Billing → Plan. Cancellations keep your plan active until the end of the current period; unused credits remain yours.",
  },
  {
    q: "How are my uploaded photos handled?",
    a: "Photos you upload are stored privately, used only to create your transformations, and can auto-delete on a schedule you choose in Privacy settings.",
  },
  {
    q: "Can I use my results commercially?",
    a: "Yes — the results you generate are yours to keep and use.",
  },
];

export function PricingFaq() {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-cream-50 text-2xl font-semibold sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-8 space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <details
            key={item.q}
            open={i === 0}
            className="group border-cream-100/10 bg-charcoal-850 rounded-[15px] border"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="text-cream-50 text-sm font-medium">
                {item.q}
              </span>
              <CaretDown
                size={16}
                className="text-text-secondary shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="text-text-secondary px-5 pb-4 text-sm leading-relaxed">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
