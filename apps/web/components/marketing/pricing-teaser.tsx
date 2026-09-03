import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingTeaser() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Try the product with starter credits and free presets.",
      features: [
        "Free presets",
        "Starter credits",
        "Standard resolution",
        "Community support",
      ],
      cta: "Get started",
      href: "/signup",
      primary: false,
    },
    {
      name: "Creator",
      price: "$12",
      period: "/mo",
      description: "More credits, higher resolution, and premium presets.",
      features: [
        "Monthly credits",
        "Premium presets",
        "Higher resolution",
        "Priority processing",
      ],
      cta: "Start creating",
      href: "/signup",
      primary: true,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/mo",
      description: "For creators and teams who need volume and control.",
      features: [
        "More monthly credits",
        "All premium presets",
        "Poster + cover layouts",
        "Credit rollover",
      ],
      cta: "Go Pro",
      href: "/signup",
      primary: false,
    },
  ];

  return (
    <section id="pricing" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
            Pricing
          </p>
          <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
            Simple, credit-based plans
          </h2>
          <p className="text-text-secondary mt-3 max-w-2xl mx-auto">
            Pay for what you use. Every plan includes free presets and the
            ability to buy more credits when you need them.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`border-cream-100/10 relative flex flex-col rounded-2xl border p-6 ${
                tier.primary
                  ? "bg-lime-500 text-ink-950"
                  : "bg-charcoal-850 text-cream-50"
              }`}
            >
              <h3
                className={`text-xl font-semibold ${
                  tier.primary ? "text-ink-950" : "text-cream-50"
                }`}
              >
                {tier.name}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  tier.primary ? "text-ink-900" : "text-text-secondary"
                }`}
              >
                {tier.description}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className={`text-4xl font-bold ${
                    tier.primary ? "text-ink-950" : "text-cream-50"
                  }`}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    className={`text-sm ${
                      tier.primary ? "text-ink-900" : "text-text-muted"
                    }`}
                  >
                    {tier.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-center gap-2 text-sm ${
                      tier.primary ? "text-ink-900" : "text-text-secondary"
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 ${
                        tier.primary ? "text-ink-950" : "text-lime-400"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`mt-6 w-full ${
                  tier.primary
                    ? "bg-ink-950 text-lime-400 hover:bg-ink-900"
                    : "bg-lime-500 text-ink-950 hover:bg-lime-400"
                }`}
              >
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
