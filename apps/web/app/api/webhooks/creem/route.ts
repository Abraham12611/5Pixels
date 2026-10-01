import { NextRequest, NextResponse } from "next/server";
import {
  creemWebhookSecret,
  verifyCreemSignature,
} from "@/lib/billing/creem-client";
import {
  fulfillCreemCheckoutCompleted,
  fulfillCreemSubscriptionEvent,
  fulfillCreemSubscriptionPaid,
  markCreemSubscriptionCancelled,
  markCreemSubscriptionPastDue,
  type CreemCheckoutObject,
  type CreemSubscriptionObject,
} from "@/lib/billing/fulfillment-creem";
import { handleCreemRefund, type CreemRefundObject } from "@/lib/billing/refunds";

/**
 * Creem webhook receiver (docs.creem.io/code/webhooks).
 *
 * - Signature: `creem-signature` = hex HMAC-SHA256 of the RAW body.
 * - Retries: 30s → 5m → 30m → 6h (≤24h). Return 500 on infra errors so
 *   Creem retries; all credit grants are idempotent on ledger keys.
 * - credit flow: checkout.completed (first charge + one-time),
 *   subscription.paid (renewals), lifecycle events sync status only.
 */
export async function POST(request: NextRequest) {
  const secret = creemWebhookSecret();
  if (!secret) {
    console.error("[creem webhook] missing CREEM_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("creem-signature");

  if (!verifyCreemSignature({ rawBody, signature, secret })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    id?: string;
    eventType?: string;
    object?: Record<string, unknown>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[creem webhook] received ${event.eventType}`);

  try {
    switch (event.eventType) {
      case "checkout.completed":
        await fulfillCreemCheckoutCompleted(
          event.object as CreemCheckoutObject
        );
        break;
      case "subscription.paid":
        await fulfillCreemSubscriptionPaid(
          event.object as CreemSubscriptionObject
        );
        break;
      case "subscription.active":
      case "subscription.trialing":
      case "subscription.update":
      case "subscription.scheduled_cancel":
        await fulfillCreemSubscriptionEvent(
          event.object as CreemSubscriptionObject
        );
        break;
      case "subscription.canceled":
        await markCreemSubscriptionCancelled(
          (event.object as CreemSubscriptionObject).id ?? "",
          "cancelled"
        );
        break;
      case "subscription.expired":
      case "subscription.paused":
        await markCreemSubscriptionCancelled(
          (event.object as CreemSubscriptionObject).id ?? "",
          "expired"
        );
        break;
      case "subscription.past_due":
      case "subscription.unpaid":
        await markCreemSubscriptionPastDue(
          (event.object as CreemSubscriptionObject).id ?? ""
        );
        break;
      case "refund.created": {
        const refund = event.object as CreemRefundObject;
        if (refund.status === "succeeded") {
          await handleCreemRefund(refund);
        } else {
          console.log(
            `[creem webhook] refund ${refund.id} status ${refund.status}; waiting for succeeded`
          );
        }
        break;
      }
      case "dispute.created": {
        // Chargeback — treat as a refund reversal. The dispute object links
        // the transaction the same way a refund does.
        const dispute = event.object as CreemRefundObject & {
          transaction?: { id?: string; order?: string; subscription?: string };
        };
        await handleCreemRefund(
          {
            id: dispute.id ? `dispute-${dispute.id}` : undefined,
            status: "succeeded",
            transaction: dispute.transaction,
          },
          true
        );
        break;
      }
      default:
        console.log("[creem webhook] ignored event type:", event.eventType);
    }
  } catch (err) {
    console.error(
      "[creem webhook] handler error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
