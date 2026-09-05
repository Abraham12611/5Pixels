import { NextResponse } from "next/server";
import { createPlanCheckoutSession, createExtraCreditsCheckoutSession } from "@/lib/billing/checkout";

export async function POST(request: Request) {
  const formData = await request.formData();
  const planId = String(formData.get("plan_id") ?? "");
  const rawAmount = String(formData.get("amount") ?? "");

  if (!planId) {
    return NextResponse.redirect(new URL("/app/billing?error=missing-plan", request.url));
  }

  let result;
  if (rawAmount) {
    const cents = Math.round(Number(rawAmount) * 100);
    result = await createExtraCreditsCheckoutSession(cents);
  } else {
    result = await createPlanCheckoutSession(planId);
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
