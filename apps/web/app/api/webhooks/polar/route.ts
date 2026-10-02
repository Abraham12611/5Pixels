import { NextRequest, NextResponse } from "next/server";
import { validateEvent } from "@polar-sh/sdk/webhooks";
import { polarWebhookSecret } from "@/lib/billing/polar-client";
import {
  fulfillPolarOneTimeOrder,
  fulfillPolarSubscriptionOrder,
  fulfillPolarSubscriptionEvent,
  markPolarSubscriptionCancelled,
  markPolarSubscriptionPastDue,
} from "@/lib/billing/fulfillment-polar";
import { handlePolarRefund } from "@/lib/billing/refunds";

export async function POST(request: NextRequest) {
  const webhookSecret = polarWebhookSecret();
  if (!webhookSecret) {
    console.error("[polar webhook] missing POLAR_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const headers: Record<string, string> = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };

  let event;
  try {
    event = validateEvent(body, headers, webhookSecret);
  } catch (error) {
    console.error(
      "[polar webhook] signature verification failed:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log(`[polar webhook] received ${event.type}`);

  try {
    switch (event.type) {
      case "order.paid": {
        const order = event.data;
        if (order.subscriptionId) {
          await fulfillPolarSubscriptionOrder(order);
        } else {
          await fulfillPolarOneTimeOrder(order);
        }
        break;
      }
      case "order.created":
      case "order.updated": {
        console.log(
          `[polar webhook] received ${event.type} for ${event.data.id}; waiting for order.paid`
        );
        break;
      }
      case "subscription.created":
      case "subscription.active":
      case "subscription.updated":
      case "subscription.uncanceled": {
        await fulfillPolarSubscriptionEvent(event.data);
        break;
      }
      case "subscription.canceled":
      case "subscription.revoked": {
        await markPolarSubscriptionCancelled(event.data.id);
        break;
      }
      case "subscription.past_due": {
        await markPolarSubscriptionPastDue(event.data.id);
        break;
      }
      case "order.refunded": {
        console.log(
          `[polar webhook] order ${event.data.id} refunded; ledger reversal handled on refund.*`
        );
        break;
      }
      case "refund.created":
      case "refund.updated": {
        const refund = event.data;
        if (refund.status === "succeeded") {
          await handlePolarRefund(refund);
        } else {
          console.log(
            `[polar webhook] refund ${refund.id} status ${refund.status}; waiting for succeeded`
          );
        }
        break;
      }
      default:
        console.log("[polar webhook] ignored event type:", event.type);
    }
  } catch (err) {
    console.error(
      "[polar webhook] handler error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
