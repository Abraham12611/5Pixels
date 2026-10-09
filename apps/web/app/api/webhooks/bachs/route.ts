import { NextRequest, NextResponse } from "next/server";
import {
  bachsWebhookSecret,
  verifyBachsSignature,
} from "@/lib/billing/bachs-client";
import {
  fulfillBachsCollectionSucceeded,
  fulfillBachsInvoicePaid,
  fulfillBachsSubscriptionEvent,
  markBachsSubscriptionCancelled,
  markBachsSubscriptionPastDue,
  type BachsCollectionObject,
  type BachsInvoiceObject,
  type BachsSubscriptionObject,
} from "@/lib/billing/fulfillment-bachs";
import {
  handleBachsRefund,
  type BachsRefundObject,
} from "@/lib/billing/refunds";

/**
 * Bachs webhook receiver (docs.bachs.io/guides/webhooks).
 *
 * - Signature: `X-Bachs-Signature-V2` = `t={ts},v1={hex}` — HMAC-SHA256
 *   hex of `"{t}.{raw body}"`; any v1= match accepts (rotation-safe).
 *   Legacy `X-Bachs-Signature` + `X-Bachs-Timestamp` also accepted.
 *   Timestamps outside ±300s are rejected as replays.
 * - Retries: Bachs retries non-2xx deliveries; all credit grants are
 *   idempotent on ledger keys (`purchase:charge:{id}`,
 *   `subscription:{sub}:{periodEnd}`), so redelivery is harmless.
 * - Credit flow: collection.succeeded is the authority for one-time
 *   purchases; invoice.paid is the authority for subscription periods
 *   (first period + renewals); subscription.* events sync status only.
 */
export async function POST(request: NextRequest) {
  const secret = bachsWebhookSecret();
  if (!secret) {
    console.error("[bachs webhook] missing BACHS_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await request.text();

  if (
    !verifyBachsSignature({
      rawBody,
      signatureV2: request.headers.get("x-bachs-signature-v2"),
      signature: request.headers.get("x-bachs-signature"),
      timestamp: request.headers.get("x-bachs-timestamp"),
      secret,
    })
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    id?: string;
    type?: string;
    created_at?: string;
    data?: Record<string, unknown>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[bachs webhook] received ${event.type} (${event.id})`);

  const subscriptionIdOf = (data: Record<string, unknown>): string => {
    if (typeof data.subscription_id === "string") return data.subscription_id;
    const s = data.subscription;
    if (typeof s === "string") return s;
    if (s && typeof s === "object") {
      const id = (s as { subscription_id?: unknown }).subscription_id;
      if (typeof id === "string") return id;
    }
    return "";
  };

  try {
    switch (event.type) {
      case "collection.succeeded":
        await fulfillBachsCollectionSucceeded(
          (event.data ?? {}) as BachsCollectionObject
        );
        break;
      case "collection.failed":
      case "collection.underpaid": {
        const collection = (event.data ?? {}) as BachsCollectionObject;
        // No grant — underpaid/failed charges never entitle credits.
        console.warn(
          `[bachs webhook] charge ${collection.charge_id} ${event.type} ` +
            `status=${collection.status} amount=${collection.amount} ${collection.currency}`
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await fulfillBachsSubscriptionEvent(
          (event.data ?? {}) as BachsSubscriptionObject
        );
        break;
      case "customer.subscription.deleted": {
        const subscription = (event.data ?? {}) as BachsSubscriptionObject;
        await markBachsSubscriptionCancelled(
          subscription.subscription_id ?? "",
          subscription.status === "expired" || subscription.status === "completed"
            ? "expired"
            : "cancelled"
        );
        break;
      }
      case "invoice.paid":
        await fulfillBachsInvoicePaid(
          (event.data ?? {}) as BachsInvoiceObject
        );
        break;
      case "invoice.payment_failed": {
        const invoice = (event.data ?? {}) as BachsInvoiceObject;
        const subscriptionId = subscriptionIdOf(
          invoice as Record<string, unknown>
        );
        if (subscriptionId) {
          await markBachsSubscriptionPastDue(subscriptionId);
        }
        break;
      }
      case "invoice.created":
        // invoice.paid is the fulfillment authority; nothing to do beyond
        // acknowledging the invoice exists.
        console.log("[bachs webhook] invoice.created — reconciled by invoice.paid");
        break;
      case "refund.created": {
        const refund = (event.data ?? {}) as BachsRefundObject;
        // processing — wait for refund.paid before reversing credits.
        console.log(
          `[bachs webhook] refund ${refund.refund_id} status ${refund.status}; waiting for paid`
        );
        break;
      }
      case "refund.paid":
        await handleBachsRefund((event.data ?? {}) as BachsRefundObject);
        break;
      case "refund.failed": {
        const refund = (event.data ?? {}) as BachsRefundObject;
        console.warn(
          `[bachs webhook] refund ${refund.refund_id} failed for charge ${refund.charge_id}`
        );
        break;
      }
      case "dispute.created":
      case "dispute.updated": {
        // Chargeback — treat as a refund reversal. The dispute object
        // links the charge the same way a refund does.
        const dispute = (event.data ?? {}) as BachsRefundObject;
        await handleBachsRefund(
          {
            ...dispute,
            refund_id: dispute.dispute_id
              ? `dispute-${dispute.dispute_id}`
              : dispute.refund_id,
          },
          true
        );
        break;
      }
      case "checkout.completed":
      case "checkout.expired":
      default:
        console.log("[bachs webhook] ignored event type:", event.type);
    }
  } catch (err) {
    console.error(
      "[bachs webhook] handler error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
