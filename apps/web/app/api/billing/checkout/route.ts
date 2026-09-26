import { NextResponse } from "next/server";
import { createPlanCheckoutSession, createExtraCreditsCheckoutSession } from "@/lib/billing/checkout";

export async function POST(request: Request) {
  const formData = await request.formData();
  const planId = String(formData.get("plan_id") ?? "");
  const rawAmount = String(formData.get("amount") ?? "");
  const rawReturn = String(formData.get("return_path") ?? "");
  // Only in-app paths may round-trip through checkout — never an absolute URL.
  const returnPath =
    rawReturn.startsWith("/") && !rawReturn.startsWith("//")
      ? rawReturn
      : "/app/billing";

  if (!planId) {
    return NextResponse.redirect(new URL("/app/billing?error=missing-plan", request.url));
  }

  let result;
  if (rawAmount) {
    const cents = Math.round(Number(rawAmount) * 100);
    result = await createExtraCreditsCheckoutSession(cents, returnPath);
  } else {
    result = await createPlanCheckoutSession(planId, returnPath);
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
