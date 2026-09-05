import { NextRequest, NextResponse } from "next/server";
import { createDodoClient } from "@/lib/billing/dodo-client";
import {
  fulfillOneTimePayment,
  fulfillSubscriptionPayment,
  markSubscriptionPastDue,
  upsertSubscription,
} from "@/lib/billing/fulfillment";
import type { Payment, Subscription } from "dodopayments/resources/index";

export async function POST(request: NextRequest) {
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  if (!webhookKey) {
    console.error("[dodo webhook] missing DODO_PAYMENTS_WEBHOOK_KEY");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };

  const client = createDodoClient();

  let event;
  try {
    event = client.webhooks.unwrap(body, { headers, key: webhookKey });
  } catch (error) {
    console.error(
      "[dodo webhook] signature verification failed:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "payment.succeeded": {
        const payment = event.data as Payment & { payload_type: "Payment" };
        if (payment.subscription_id) {
          await fulfillSubscriptionPayment(payment);
        } else {
          await fulfillOneTimePayment(payment);
        }
        break;
      }
      case "payment.failed": {
        const payment = event.data as Payment & { payload_type: "Payment" };
        if (payment.subscription_id) {
          await markSubscriptionPastDue(payment.subscription_id);
        }
        break;
      }
      case "subscription.active":
      case "subscription.renewed":
      case "subscription.updated":
      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.on_hold":
      case "subscription.paused":
      case "subscription.unpaused":
      case "subscription.plan_changed":
      case "subscription.update_payment_method":
      case "subscription.failed": {
        const subscription = event.data as Subscription & {
          payload_type: "Subscription";
        };
        const userId =
          typeof subscription.metadata?.user_id === "string"
            ? subscription.metadata.user_id
            : undefined;
        if (userId && subscription.customer?.customer_id) {
          await upsertSubscription(
            userId,
            subscription,
            subscription.customer.customer_id
          );
        } else {
          console.warn(
            "[dodo webhook] subscription event missing user_id or customer id",
            subscription.subscription_id
          );
        }
        break;
      }
      default:
        console.log("[dodo webhook] ignored event type:", event.type);
    }
  } catch (err) {
    console.error(
      "[dodo webhook] handler error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
