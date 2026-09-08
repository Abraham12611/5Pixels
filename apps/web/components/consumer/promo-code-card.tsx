"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ticket } from "@phosphor-icons/react";

export function PromoCodeCard() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 0) {
      setMessage("Enter a promo code.");
      return;
    }
    setMessage("Promo codes are coming soon.");
  };

  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <div className="flex items-start gap-3">
        <div className="bg-lime-500/20 text-lime-300 rounded-xl p-2.5">
          <Ticket size={22} weight="fill" />
        </div>
        <div>
          <h2 className="text-cream-100 text-lg font-semibold">Promo code</h2>
          <p className="text-text-secondary mt-1 text-sm">
            Enter a code to claim discount or extra credits.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter promo code"
            className="border-cream-100/10 bg-charcoal-900 text-cream-50 placeholder:text-text-muted w-full rounded-xl border px-4 py-3 text-base transition focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500/50"
          />
        </div>
        <Button type="submit" className="bg-lime-400 text-charcoal-950 hover:bg-lime-300 rounded-xl font-semibold">
          Redeem
        </Button>
      </form>

      {message ? (
        <p className="text-text-muted mt-3 text-sm">{message}</p>
      ) : null}
    </section>
  );
}
