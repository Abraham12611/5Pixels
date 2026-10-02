# QA — Credit Top-Up Surface + Annual Price Hierarchy

Covers two changes on `feature/billing-promo-ui`:

1. **Annual plan price hierarchy flip** on `/app/billing/plan` — the effective
   monthly figure is now the large primary number; the total annual price is the
   smaller supporting line underneath.
2. **Dedicated credit top-up surface** at `/app/billing/credits` — any signed-in
   user can buy free-range credits (custom amount or packs), and all "Get
   credits / Buy credits" links route directly there instead of detouring
   through the Billing overview.

---

## Prerequisites

- `pnpm dev` running, `PAYMENT_PROVIDER=creem`, `CREEM_API_KEY=creem_test_*`.
- `supabase/migrations/20260929000004_creem_product_ids.sql` applied so the
  `extra-credits` plan row has `checkout_ready = true` (its
  `metadata.creem_product_id_test` is set).
- Creem webhook listener running if you want the end-to-end grant:
  `creem listen --forward-to http://localhost:3000/api/webhooks/creem`.
- Test accounts covering: (a) an active subscriber, (b) a free user with no
  subscription, (c) a brand-new user with no billing history.

---

## Part 1 — Annual price hierarchy (`/app/billing/plan`)

1. Sign in as a user with **no active subscription** so the plan grid renders
   (the grid is hidden while a subscription is active).
2. Confirm the shop defaults to the **Annual** cadence (annual anchored first).
3. On each annual card, verify the visual hierarchy:
   - **Large figure** (`text-3xl` display): the effective monthly price —
     Creator `$10`, Pro `$18`, Studio `$37.50`, Agency `$95` — with a `/month`
     suffix.
   - **Small muted line underneath**: the full annual price —
     `$120/year — billed once a year`, etc.
   - The promo `Save N%` chip sits top-right.
4. Toggle to **Monthly** — cards show `price/month` as before, no annual line.
5. Toggle back to **Annual** — confirm the flip persists.

Expected: at a glance, the annual cards read as "$X/mo" — the yearly total is
secondary context, never the headline number.

## Part 2 — Dedicated top-up surface (`/app/billing/credits`)

### Layout

1. Sign in as **any** user (subscriber or not) and open `/app/billing/credits`.
2. Confirm the page order: header → balance hero (meter + Buy credits anchor
   button) → **Buy credits** card → metric tiles → credit activity ledger.
3. The Buy credits card states: `1 credit for every $0.01`, `Top-up credits
   never expire`, and failed transformations releasing credits.

### Custom amount

4. In "Any amount (USD)", type `25` — the line updates live to
   `2,500 credits` and `≈ up to N transformations` (N = credits ÷ cheapest
   active `credit_cost`; e.g. 500 transformations at cost 5).
5. Type `5` — the line shows `Minimum $10` and the **Buy credits** button is
   disabled.
6. Type a large amount (e.g. `500`) — translation scales correctly.

### Packs

7. Four pack cards render: **1,000 / 2,500 / 5,000 / 10,000 credits** at
   $10 / $25 / $50 / $100. The $50 pack carries the `POPULAR` chip and lime
   accent border.
8. Each pack shows its own `≈ up to N transformations` line.

### End-to-end purchase (test mode)

9. From a **free** account (no subscription), click **Buy for $10**.
   - Expect redirect to Creem test checkout — not an error page.
   - Complete the test payment.
   - Return lands on `/checkout/success`; after the webhook fires, the balance
     hero on `/app/billing/credits` shows +1,000 credits and the ledger shows a
     `Purchase` row.
10. Repeat with a custom amount (e.g. `$30` → 3,000 credits).

### Direct-entry points (no intermediate Billing click)

11. **Insufficient-credits dialog:** trigger a transformation with 0 credits —
    "Get credits" navigates straight to `/app/billing/credits`.
12. **User dropdown** (avatar menu) when balance is 0/low: "Buy credits" goes to
    `/app/billing/credits`.
13. **Billing overview** (`/app/billing`): the credits card CTA goes to
    `/app/billing/credits`.
14. **Plan page** (`/app/billing/plan`): the Credits card "Buy credits" goes to
    `/app/billing/credits` for non-subscribers; active subscribers get the
    inline `#top-up` section on the same page (same `CreditTopUp` component).

### Auth / edge states

15. Signed out: `/app/billing/credits` redirects to
    `/login?next=/app/billing/credits`.
16. Signed-out POST to `/api/billing/checkout` with an `amount` returns an
    error redirect (sign-in required) — the gate is server-side; the amount is
    never trusted from the client beyond the cents→credits 1:1 mapping.
17. If `checkout_ready` is false (no `creem_product_id_*` in plan metadata):
    all buy buttons render disabled as "Coming soon"/disabled — no dead-end
    checkout.

### Mobile

18. At ~375px width: the custom-amount row stacks (input, translation line,
    button), pack grid collapses to 1 column, `POPULAR` chip stays anchored.

---

## Checkout return paths

- Top-up checkouts return to `/app/billing/credits`; plan checkouts return to
  `/app/billing/plan` (changed in `app/api/billing/checkout/route.ts`).
- Checkout failure still redirects to `/app/billing?error=…`.

## Verification commands run

- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm test` (Vitest) — all pass, including
  `components/consumer/__tests__/credit-top-up.test.tsx` (4 tests) and the
  updated Polar checkout gate test
- `pnpm build` — see results in the PR

## Notes / known limitations

- The "≈ up to N transformations" line uses the **cheapest** active
  transformation's credit cost — it's a ceiling estimate, phrased as "up to".
- Free users can now purchase top-ups (intentional product change); this is
  enforced by `canPurchaseExtraCredits` in `lib/billing/entitlements.ts`,
  shared by all three provider checkouts.
