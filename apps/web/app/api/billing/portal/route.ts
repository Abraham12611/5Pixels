import { NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/billing/customer-portal";

export async function POST(request: Request) {
  const result = await createCustomerPortalSession();

  if (result.error || !result.url) {
    return NextResponse.redirect(
      new URL(
        `/app/billing?error=${encodeURIComponent(result.error ?? "Portal failed")}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(result.url);
}
