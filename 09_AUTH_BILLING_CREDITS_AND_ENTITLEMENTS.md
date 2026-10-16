# 5Pixels — Authentication, Billing, Credits, and Entitlements

# 1. Authentication goals

Support:
- email/password or magic link;
- social auth later if useful;
- verified email;
- secure session;
- password recovery;
- account deletion.

---

# 2. Anonymous browsing

Unauthenticated user can:
- browse landing;
- explore;
- preview presets;
- open preset detail;
- inspect pricing.

Authentication required before:
- persistent upload;
- generation;
- library;
- favorites sync;
- purchase.

Optional later:
anonymous upload with sign-in gate before generation.

---

# 3. Credits model

Use credits as internal unit of generation value.

Reasons:
- models have different costs;
- premium presets may cost more;
- subscriptions can package flexible value;
- easier than exposing dollars per generation.

## 3.1 Canonical credit facts (Oct 2026 — post #89/#93/#99/#100/#101)

- Internally, **1 credit = $0.01 of provider-cost capacity**, permanently
  (`pricing_policies.credit_capacity_usd` is pinned to `0.01` by a CHECK
  constraint). This is an accounting denomination only.
- A credit is **not** a cash value, a redeemable-cent balance, or a promise of
  dollar-equivalent value. Customer-facing copy must never frame credits as
  "$0.01 each" or imply cash redemption.
- Plan and top-up economics are encoded by **how many credits are issued at
  purchase** (`plans.credits_grant`). Consumption economics are encoded by
  **which provider route and settings the generation uses** — the old
  `markup_multiplier` consumption model is retired.
- Customer-facing generation UI communicates **estimated / up-to credits**
  before generation. Wholesale provider cost and model/provider routing stay
  internal (product rule: private intelligence).
- Credits never expire while the account is active — see
  `18_BILLING_CREDITS_PLAN.md`, "Canonical credit policy".

## 3.2 Payment providers

- **Bachs** — current default (`PAYMENT_PROVIDER=bachs` or unset). 5Pixels
  remains seller of record; Bachs is a payment processor, not a merchant of
  record.
- **Whop / Creem** — rollback providers behind `PAYMENT_PROVIDER`.
- **Dodo / Polar** — historical integrations; code paths removed or dormant.
  Documents describing them as current are superseded.

---

# 4. Ledger, not mutable balance

Never rely only on:
`users.credit_balance`.

Use:
- ledger entries;
- transaction IDs;
- idempotency;
- reconciliation.

Cached balance may exist for performance.

---

# 5. Generation credit lifecycle

Shipped lifecycle (fail-closed quoting + settlement — #89/#99/#100):

1. server resolves the preset recipe to a provider route and produces a
   bounded quote `{expected, maximum}` USD from a fresh
   `provider_pricing_snapshots` row (6h TTL; no quote → no generation);
2. `create_generation` reserves `ceil(max / $0.01)` credits
   (`generation_quotes.reserve_credits`);
3. start job;
4. on completion, record the **provisional** quote-math charge on the
   generation — the full reservation stays open (still subtracted from
   available balance);
5. settlement:
   - **authoritative**: `reconcile_billing_event` converts the open
     reservation to a `debit` at the provider's billed cost (releasing the
     remainder), or posts an auditable `adjustment` if the generation was
     already settled;
   - **fallback**: if no provider billing event arrives within **72h**
     (`SETTLE_SLA_MS`, `settle_unbilled_generations` cron), the reservation
     settles at the provisional charge, marked `fallback_timeout`. A billing
     event arriving after fallback still reconciles through the adjustment
     path (`provider_late`); late upward differences after fallback are
     absorbed by 5Pixels, never charged to the user;
6. failure/block due to system -> release reservation;
7. user-cancel semantics defined separately.

---

# 6. Insufficient credits

UX:
- explain preset cost;
- current balance;
- upgrade;
- buy credits;
- cancel.

Do not lose configuration.

After purchase, user returns to same create flow.

---

# 7. Plans

Current catalog (live `plans` rows; grants at 1 credit = $0.01 provider-cost
capacity — full economics in `18_BILLING_CREDITS_PLAN.md`):

- **Weekly passes** (`weekly_trial`, one-time, 7-day benefit window):
  Weekly Starter $5 → 113 credits; Weekly Plus $10 → 259 credits.
- **Monthly** (auto-renewing): Creator $20 → 606/mo; Pro $30 → 1,090/mo;
  Studio $50 → 2,500/mo; Agency $100 → 6,417/mo.
- **Annual** (`annual`, 12 monthly credit drips of the same per-month grant):
  Creator $120; Pro $216; Studio $450; Agency $1,140.
- **Credit packs** (`extra_credit`, one-time): $10 → 606; $25 → 1,515;
  $50 → 3,030; $100 → 6,060.

Exact price and allowance remain product configuration driven by the `plans`
table, not fixed by docs — the figures above are the current seed state.

## 7.1 Purchase eligibility (shipped — `lib/billing/entitlements.ts`)

- **Weekly pass** (`canPurchaseWeeklyPass`): repurchasable — "Get another
  week" — for any signed-in user who has never held a non-weekly plan.
  Blocked while any subscription is `active`/`past_due` (passes can't stack),
  and permanently once the user has any monthly/annual subscription or any
  non-weekly paid invoice — at that point they're on the plan/top-up ladder.
- **Free trial** (`canPurchaseTrial`): one per user, ever — blocked by any
  active subscription, any paid invoice, or any prior trial subscription.
- **Credit packs** (`canPurchaseExtraCredits`): open to **any signed-in
  user** — subscribers, lapsed users, and free users alike.

Plan may define:
- monthly credits;
- export quality;
- premium preset access;
- early access;
- commercial rights if legal policy supports;
- priority queue if operationally feasible.

---

# 8. Credit packs

Shipped as fixed packs ($10/$25/$50/$100 → 606/1,515/3,030/6,060 credits;
`plans` rows of type `extra_credit`):
- one-time purchase;
- purchasable by any signed-in user (see §7.1);
- do not expire (canonical rule: credits never expire while the account is active — see `18_BILLING_CREDITS_PLAN.md`, "Canonical credit policy");
- distinct from recurring allocation.

The earlier variable "pay-what-you-want" top-up is superseded by fixed packs.

---

# 9. Subscription renewal

On billing webhook (current processor: Bachs):
- verify signature;
- idempotently record;
- allocate credits;
- update entitlement;
- avoid double allocation.

Annual plans bill once per term but drip credits monthly via the drip
scheduler (`subscriptions.next_drip_at` / `drips_granted`), not via billing
events.

---

# 10. Cancellation

User can:
- cancel renewal;
- remain active until period end;
- understand remaining credits policy.

---

# 11. Refunds

Generation failures:
automatic internal credit refund/release (open reservations release; settled
debits reverse as `refund` entries).

Billing refunds:
handled through billing provider and reflected in ledger — reversal capped at
available balance, with `unrecovered_credits` recorded for already-spent
credits; referral payment-share rewards for the refunded payment are clawed
back via the same path.

---

# 12. Locked presets

A preset may require:
- paid plan;
- premium credit cost;
- early-access entitlement.

Locked card should still be previewable where strategically useful.

Click:
- explains unlock path;
- does not dead-end.

---

# 13. Entitlement service

Central function should answer:
- can user use preset?
- can user export at requested quality?
- can user use commercial license?
- can user access early features?
- how many credits?

Avoid duplicating entitlement logic across UI.

---

# 14. Billing pages

## Plan
Current plan, renewal, upgrade/downgrade.

## Credits
Balance, allocation date, buy more.

## History
Subscription invoices and credit transactions.

---

# 15. Fraud and abuse controls

Rate limit:
- signup;
- generation;
- trial usage;
- checkout creation.

Watch:
- repeated account creation;
- stolen payment patterns;
- scripted generation;
- high concurrency.

Do not penalize normal users with overly aggressive friction.

---

# 16. Financial invariants

- credit ledger must reconcile;
- generation cannot finalize debit twice;
- webhook cannot allocate twice;
- refund references original debit;
- admin adjustment is audited;
- balance cannot go below allowed policy without explicit state.

---

# 17. Trial design

Shipped:
- no unconditional signup credit grant — new users start at 0;
- referral bonuses are the funded free path: referrer +25 credits / referee
  +10 credits on signup, plus 30% of the referee's first plan credit grant to
  the referrer after a 14-day hold (`REFERRAL_PAYMENT_SHARE_HOLD_DAYS`),
  capped at 15 rewarded referees and a monthly subsidy budget;
- cancel-retention offer: 500 subsidized credits, one-shot per subscription.

Do not let trial economics encourage unbounded abuse.

---

# 18. Pricing UX

Show:
- what a credit means ("credits are used when you create with AI" — never a
  dollar value);
- typical preset cost as an **estimate** ("≈ up to N transformations",
  "estimated credit cost") — different models, resolutions and quality
  settings consume different amounts;
- whether failures refund;
- monthly allocation;
- top-up options.

Avoid opaque pricing where user only learns cost after upload.

---

# 19. Billing privacy

Do not store full payment card data.

Use billing provider.

Store:
- external IDs;
- status;
- plan;
- invoice metadata.

---

# 20. Billing Definition of Done

- idempotent checkout;
- webhook signature verification;
- credit ledger;
- failure refund;
- entitlement checks;
- billing portal;
- user-visible transaction history;
- admin adjustment audit.
