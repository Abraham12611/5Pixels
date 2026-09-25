import { NextResponse } from "next/server";
import { createPlanCheckoutSession, createExtraCreditsCheckoutSession } from "@/lib/billing/checkout";

export async function POST(request: Request) {
  const formData = await request.formData();
  const planId = String(formData.get("plan_id") ?? "");
  const rawAmount = String(formData.get("amount") ?? "");

  if (!planId) {
    return NextResponse.redirect(new URL("/app/billing?error=missing-plan", request.url));
  }

  // Promo attribution rides along as hidden fields — stamped into checkout
  // metadata server-side so the webhook can attribute conversions (09 §2).
  const campaignId = String(formData.get("campaign_id") ?? "") || undefined;
  const campaignVariant =
    String(formData.get("campaign_variant") ?? "") || undefined;
  const stepRaw = String(formData.get("campaign_step") ?? "");
  const campaignStep = stepRaw === "" ? undefined : Number(stepRaw);
  const attribution =
    campaignId || campaignVariant || campaignStep !== undefined
      ? { campaignId, campaignVariant, campaignStep }
      : undefined;

  let result;
  if (rawAmount) {
    const cents = Math.round(Number(rawAmount) * 100);
    result = await createExtraCreditsCheckoutSession(cents, "/app/billing", attribution);
  } else {
    result = await createPlanCheckoutSession(planId, "/app/billing", attribution);
  }

  if (result.error || !result.checkoutUrl) {
    return NextResponse.redirect(
      new URL(
        `/app/billing?error=${encodeURIComponent(result.error ?? "Checkout failed")}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(result.checkoutUrl);
}
