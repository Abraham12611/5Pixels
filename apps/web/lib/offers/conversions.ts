import { createServiceClient } from "@/lib/supabase/service";

/**
 * Server-side conversion attribution (09 §2): the payment webhook calls this
 * with checkout metadata; `converted`/`refunded` events can never come from
 * clients. The campaign metadata is stamped at checkout-creation time via
 * CheckoutAttribution.
 */
export async function recordOfferConversion(
  userId: string,
  metadata: Record<string, unknown> | null | undefined,
  orderId: string,
  amountCents: number
): Promise<void> {
  const campaignId = metadata?.campaign_id;
  if (typeof campaignId !== "string" || !campaignId) return;

  const service = createServiceClient();
  const step = Number(metadata?.campaign_step);

  // Idempotent on order id — webhook redeliveries must not double-count.
  const { data: existing } = await service
    .from("promo_events")
    .select("id")
    .eq("event", "converted")
    .filter("meta->>order_id", "eq", orderId)
    .maybeSingle();
  if (existing) return;

  const { error } = await service.from("promo_events").insert({
    user_id: userId,
    campaign_id: campaignId,
    variant:
      typeof metadata?.campaign_variant === "string"
        ? metadata.campaign_variant
        : null,
    step: Number.isFinite(step) ? step : null,
    surface: "checkout",
    event: "converted",
    meta: { order_id: orderId, amount_cents: amountCents },
  });

  if (error) {
    console.error("[recordOfferConversion] insert failed", error.message);
  }
}
