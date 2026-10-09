import { NextRequest, NextResponse } from "next/server";
import {
  whopWebhookSecret,
  verifyWhopSignature,
} from "@/lib/billing/whop-client";
import {
  fulfillWhopMembershipEvent,
  fulfillWhopPaymentSucceeded,
  markWhopMembershipCancelled,
  markWhopMembershipPastDue,
  type WhopMembershipObject,
  type WhopPaymentObject,
} from "@/lib/billing/fulfillment-whop";
import { handleWhopRefund, type WhopRefundObject } from "@/lib/billing/refunds";

/**
 * Whop webhook receiver (Standard Webhooks — docs.whop.com).
 *
 * - Signature: `webhook-signature` = `v1,<base64>` HMAC-SHA256 of
 *   `{webhook-id}.{webhook-timestamp}.{raw body}` keyed by the `ws_…`
 *   secret. Timestamps outside ±5 min are rejected as replays.
 * - Retries: Whop retries non-2xx deliveries; all credit grants are
 *   idempotent on ledger keys (`purchase:payment:{id}`,
 *   `subscription:{membership}:{periodEnd}`), so redelivery is harmless.
 * - Credit flow: payment.succeeded (first charge + renewals + one-time
 *   packs), membership.* events sync status only.
 */
export async function POST(request: NextRequest) {
  const secret = whopWebhookSecret();
  if (!secret) {
    console.error("[whop webhook] missing WHOP_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await request.text();

  if (
    !verifyWhopSignature({
      rawBody,
      webhookId: request.headers.get("webhook-id"),
      webhookTimestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
      secret,
    })
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    id?: string;
    type?: string;
    timestamp?: string;
    data?: Record<string, unknown>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[whop webhook] received ${event.type} (${event.id})`);

  const membershipIdOf = (data: Record<string, unknown>): string => {
    const m = data.membership;
    if (m && typeof m === "object") {
      const id = (m as { id?: unknown }).id;
      if (typeof id === "string") return id;
    }
    if (typeof data.membership_id === "string") return data.membership_id;
    return "";
  };

  try {
    switch (event.type) {
      case "payment.succeeded":
        await fulfillWhopPaymentSucceeded(
          (event.data ?? {}) as WhopPaymentObject
        );
        break;
      case "payment.failed":
      case "payment.requires_action": {
        const payment = (event.data ?? {}) as WhopPaymentObject;
        // Renewal authentication/authorization failures carry a
        // recovery_url for the buyer — surface it in logs so support can
        // share it, and mark the membership past_due.
        const membershipId = membershipIdOf(payment as Record<string, unknown>);
        if (membershipId) await markWhopMembershipPastDue(membershipId);
        console.warn(
          `[whop webhook] payment ${payment.id} ${event.type}` +
            (payment.recovery_url
              ? ` recovery_url=${payment.recovery_url}`
              : "") +
            (payment.failure_message
              ? ` reason=${payment.failure_message}`
              : "")
        );
        break;
      }
      case "membership.activated":
      case "membership.updated":
      case "membership.trial_ending_soon":
      case "membership.cancel_at_period_end_changed":
        await fulfillWhopMembershipEvent(
          (event.data ?? {}) as WhopMembershipObject
        );
        break;
      case "membership.deactivated": {
        const membership = (event.data ?? {}) as WhopMembershipObject;
        await markWhopMembershipCancelled(
          membership.id ?? "",
          membership.status === "expired" || membership.status === "completed"
            ? "expired"
            : "cancelled"
        );
        break;
      }
      case "invoice.paid":
        // payment.succeeded is the fulfillment authority; nothing to do
        // beyond acknowledging the invoice settled.
        console.log("[whop webhook] invoice.paid — reconciled by payment.succeeded");
        break;
      case "invoice.past_due": {
        const invoice = event.data ?? {};
        const membershipId = membershipIdOf(invoice);
        if (membershipId) await markWhopMembershipPastDue(membershipId);
        break;
      }
      case "refund.created":
      case "refund.updated": {
        const refund = (event.data ?? {}) as WhopRefundObject;
        if (refund.status === "succeeded") {
          await handleWhopRefund(refund);
        } else {
          console.log(
            `[whop webhook] refund ${refund.id} status ${refund.status}; waiting for succeeded`
          );
        }
        break;
      }
      case "dispute.created":
      case "dispute.updated":
      case "dispute_alert.created": {
        // Chargeback — treat as a refund reversal. The dispute object links
        // the payment the same way a refund does.
        const dispute = (event.data ?? {}) as WhopRefundObject;
        await handleWhopRefund(
          { ...dispute, id: dispute.id ? `dispute-${dispute.id}` : undefined },
          true
        );
        break;
      }
      case "payment.pending":
      case "payment.canceled":
      default:
        console.log("[whop webhook] ignored event type:", event.type);
    }
  } catch (err) {
    console.error(
      "[whop webhook] handler error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
