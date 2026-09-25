"use client";

import { useState } from "react";
import { SpecialOfferTakeover } from "@/components/promo/special-offer-takeover";
import type { OfferAssignment } from "@/lib/offers/engine";
import type { PlanForPurchase } from "@/lib/db/plans";

/**
 * Mount-point for the S7 takeover: the server page renders this only when
 * getTakeoverStateForUser() says eligible; close state lives here so the
 * server tree stays prop-serializable.
 */
export function OfferTakeoverGate({
  assignment,
  plans,
  pendingProductName,
  referralUserId,
}: {
  assignment: OfferAssignment;
  plans: PlanForPurchase[];
  pendingProductName?: string;
  referralUserId?: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <SpecialOfferTakeover
      assignment={assignment}
      plans={plans}
      pendingProductName={pendingProductName}
      referralUserId={referralUserId}
      onClose={() => setOpen(false)}
    />
  );
}
