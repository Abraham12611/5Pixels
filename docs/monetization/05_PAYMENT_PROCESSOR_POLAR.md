# Payment Processor Migration — Dodo → Polar

Status: **Proposal.** On the critical path — nothing monetizes until this works (`00 §6`).

---

## 1. Current Polar state — read this first

Queried live via the Polar API:

| Field | Value |
|---|---|
| Organization | `5Pixels` / slug `5pixels` |
| Organization ID | `c5ba80bb-4f7a-4348-9ead-0ebe7ac28068` |
| Status | `created` |
| `details_submitted_at` | **`null`** |
| `capabilities.api_access` | `true` |
| `capabilities.dashboard_access` | `true` |
| **`capabilities.checkout_payments`** | **`false`** |
| **`capabilities.subscription_renewals`** | **`false`** |
| **`capabilities.refunds`** | **`false`** |
| **`capabilities.payouts`** | **`false`** |
| Default presentment currency | `usd` |
| Default tax behaviour | `location` (merchant-of-record) |
| `subscription_settings.prevent_trial_abuse` | **`false`** |

### The blocker

**You cannot take a single payment today.** `checkout_payments`, `subscription_renewals`, `refunds`, and `payouts` are all `false`, and `details_submitted_at` is `null` — organization details and KYC have not been submitted. API and dashboard access work, so products and webhooks can be built and tested now, but live money requires completing onboarding and Polar enabling those capabilities.

**Action, today, before any code:** complete organization details and KYC in the Polar dashboard, then re-check `capabilities`. Everything else in this document can be built in parallel, but the launch date is gated on Polar's review, and that's outside our control. Do not schedule a launch against an unreviewed account.

### One setting to change while you're there

`prevent_trial_abuse: false` — turn this **on**. The plan includes weekly trials, and our own `canPurchaseTrial()` checks (`entitlements.ts:130-185`) are application-level only; someone with a fresh email bypasses them. Polar's platform-level check is a second layer we get for free.

---

## 2. Dodo → Polar concept mapping

| Dodo (current) | Polar | Notes |
|---|---|---|
| Product + `dodo_product_id` in `plans.metadata` | Product + prices | Polar products hold a `prices[]` array |
| `checkoutSessions.create({ product_cart })` | `checkouts_create` | Similar shape; metadata supported |
| `product_cart[].amount` override for variable top-ups | **Price with `amount_type: "custom"`** | Polar models pay-what-you-want natively — cleaner than Dodo's per-checkout override, with `minimum_amount` / `maximum_amount` / `preset_amount` |
| `dodo_customer_id` on profiles | `polar_customer_id` | Same pattern |
| Webhook `payment.succeeded`, `subscription.*` | `order.*`, `subscription.*`, `refund.*` | Verify exact event names against Polar docs during build |
| Customer portal link | Polar customer portal | Replaces `lib/billing/customer-portal.ts` |
| — | **Benefits / entitlements** | Polar-native entitlement grants. **Don't use them for credits** — see §5 |
| — | **Discounts** (`discounts_create`) | Enables the downsell ladders in `04 §3` |
| — | **Meters / customer meters** | Usage-based billing primitives; not needed now, worth knowing |

Both are merchant-of-record, so VAT/sales-tax handling stays off our plate. `default_tax_behavior: "location"` is already correct.

---

## 3. Products to create in Polar

| Plan | Type | Polar shape |
|---|---|---|
| Weekly trial(s) | recurring | Product, `recurring_interval: week`, fixed price |
| Monthly ($20, $50) | recurring | Product, `recurring_interval: month`, fixed price |
| Extra credits (variable, min $10) | one-time | Product with **`amount_type: "custom"`**, `minimum_amount: 1000` |
| **Annual ×4** (new) | recurring | `recurring_interval: year`, fixed prices — Creator $120, Pro $216, Studio $450, Agency $1,140 per `06 §3`. Credits **drip monthly** (`06 §4`). |

Note the USD minimum is $0.50, so the existing $10 floor for top-ups is fine.

Store ids the same way the Dodo integration does, so the migration is a metadata swap rather than a schema change:

```sql
-- plans.metadata
{ "polar_product_id": "...", "polar_price_id": "...",
  "dodo_product_id": "..." }  -- keep during transition
```

Keeping both ids lets a feature flag choose the processor per checkout, which makes rollback trivial.

---

## 4. Code changes

| File | Change |
|---|---|
| `lib/billing/dodo-client.ts` | → `lib/billing/polar-client.ts` — Polar SDK, `POLAR_ACCESS_TOKEN`, `POLAR_SERVER` (`sandbox`/`production`) |
| `lib/billing/checkout.ts` | Swap `checkoutSessions.create` → Polar `checkouts_create`. **Keep the existing entitlement gates** (`canPurchaseTrial`, `canPurchaseExtraCredits`) and the server-side resolution of price — the client must never send an amount (`04 §4`) |
| `app/api/webhooks/dodo/route.ts` | → `app/api/webhooks/polar/route.ts` — Polar signature verification |
| `lib/billing/fulfillment.ts` | Retarget to Polar payloads. **Preserve the idempotency-key pattern verbatim** (`fulfillment.ts:347-402`) — it's the most valuable thing in that file |
| `lib/billing/customer-portal.ts` | Polar portal session |
| `lib/db/billing.ts` | `dodo_*` → `polar_*` columns |
| `app/checkout/success`, `/cancel` | Confirm Polar's return-URL params |
| `.env.example`, `AGENTS.md` | New env vars |

**Add these, which Dodo didn't drive:**

| File | Purpose |
|---|---|
| `lib/billing/discounts.ts` | Polar discount creation/lookup for `04 §3` downsells |
| `lib/billing/refunds.ts` | Refund/chargeback handler → referral clawbacks (`03 §4`) |

### Metadata contract

Every checkout must carry, in Polar `metadata`:

```ts
{
  user_id, plan_id,
  credits: string,                 // variable top-ups
  experiment_key, variant_key, ladder_stage,   // 04 §4
  growsurf_participant_id,         // 03 §3
}
```

This metadata is the join key for revenue analysis, referral qualification, and experiment attribution. Anything not stamped here is unrecoverable after the fact — get it right before the first live payment, because backfilling is impossible.

---

## 5. Credits stay in our ledger

Polar's **benefits/entitlements** are tempting for credit grants. Don't use them for that.

Our credit system is a double-entry ledger with dynamic per-generation pricing, idempotency keys, markup multipliers, and referral grants (`credit_ledger`, `get_available_balance`). Polar benefits are boolean-ish entitlement grants attached to a subscription. Mapping our ledger onto them loses the audit trail and splits the source of truth for balances across two systems.

**Rule: Polar owns money and subscription state. Our ledger owns credits.** The webhook is the only bridge, and it writes to the ledger exactly as the Dodo path does today.

Polar **benefits** are still worth using for genuinely binary entitlements — e.g. "is a subscriber," feature flags tied to a plan — where there's no balance to track.

---

## 6. Migration plan

| Step | Action | Gate |
|---|---|---|
| 1 | **Complete Polar org details + KYC** | Blocks everything below |
| 2 | Enable `prevent_trial_abuse` | — |
| 3 | Create products/prices in Polar **sandbox** | — |
| 4 | Build `polar-client`, checkout, webhook, fulfilment behind `PAYMENT_PROVIDER=polar\|dodo` flag | — |
| 5 | End-to-end sandbox test: each plan type, variable top-up, renewal, refund, chargeback | — |
| 6 | Verify `capabilities.checkout_payments === true` | **Polar review — outside our control** |
| 7 | Create live products, flip flag, one real low-value purchase | — |
| 8 | Monitor first 20 payments: fulfilment, credit grants, idempotency under retry | — |
| 9 | Retire Dodo code + columns | Only after a full billing cycle clean |

### Existing Dodo customers

Query for live Dodo subscriptions before planning cutover. If any exist:

- **Do not** attempt to migrate payment methods between processors — that's a card-data problem you don't want.
- Let existing Dodo subscriptions run to period end on the old integration (keep the Dodo webhook alive, read-only), and route **new** purchases to Polar.
- Or, if the count is small, contact them and have them re-subscribe on Polar with a complimentary credit grant to cover the gap. Cheaper and cleaner than dual-running.

Given the product hasn't launched, the count is likely zero or near-zero — **verify before assuming**, because designing for the wrong answer here is expensive either way.

---

## 7. Testing

| Area | Coverage |
|---|---|
| Webhook signature verification | Valid, invalid, replayed |
| **Idempotency** | Same event delivered 3× → exactly one ledger entry |
| Fulfilment | Each plan type → correct `credits_grant` |
| Variable top-up | `amount_type: custom` → credits match cents paid |
| Subscription lifecycle | Renewal, cancel, past-due, expiry |
| Refund/chargeback | Ledger reversal + referral clawback (`03 §4`) |
| Metadata round-trip | `experiment_key`/`variant_key` reach `invoices.metadata` |
| Entitlement gates | Trial abuse, extra-credits-requires-subscription |

The existing billing tests (`lib/billing/__tests__/ledger.test.ts`, `lib/generation/__tests__/credit-math.test.ts`) should survive the swap unchanged — they test our ledger, not the processor. If they break, the abstraction boundary leaked and that's worth fixing rather than patching the tests.

---

## 8. Open questions

1. **Live Dodo subscriptions** — count them before planning cutover (§6).
2. **Polar fee structure** vs. Dodo — feeds directly into `markup_multiplier`, and therefore into the annual discount ceilings in `06 §2`. Get the real rate before finalising annual prices.
3. **Presentment currency** — `usd` only today; multi-currency interacts with the geo-segmentation caveat in `04 §4`.
4. **Annual credit carry-over** — within-term carry vs. monthly expiry (`06 §4`). Needs deciding before the plan descriptions are written.

The reason for the Dodo change is the owner's and doesn't affect this plan; Polar onboarding proceeds on its own merits.
