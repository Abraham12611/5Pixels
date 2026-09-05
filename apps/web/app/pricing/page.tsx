import { PricingTeaser } from "@/components/marketing/pricing-teaser";

export default function PricingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-cream-50 text-3xl font-bold sm:text-4xl">
            Pricing
          </h1>
          <p className="text-text-secondary mx-auto mt-4 max-w-2xl">
            Pick a plan, get credits, and transform your photos. Every plan is
            backed by Dodo Payments for global tax, invoicing, and local payment
            methods.
          </p>
        </div>
      </div>
      <PricingTeaser />
    </main>
  );
}
