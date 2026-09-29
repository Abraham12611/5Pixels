"use client";

import { useState } from "react";
import { SpecialOfferTakeover } from "@/components/promo/special-offer-takeover";
import type {
  AdminPreviewOption,
  OfferAssignment,
} from "@/lib/offers/engine";
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
  referralCode,
  adminVariants,
}: {
  assignment: OfferAssignment;
  plans: PlanForPurchase[];
  pendingProductName?: string;
  referralCode?: string;
  adminVariants?: AdminPreviewOption[];
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <SpecialOfferTakeover
      assignment={assignment}
      plans={plans}
      pendingProductName={pendingProductName}
      referralCode={referralCode}
      adminVariants={adminVariants}
      onClose={() => setOpen(false)}
    />
  );
}
