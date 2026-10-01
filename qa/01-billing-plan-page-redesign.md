# QA — `/app/billing/plan` redesign

**Implementation date:** 2026-09-30
**Scope:** Rebuilt the billing Plan page to the Mercury/Krea structure defined in `06_BILLING_PAYWALL_AND_OFFERS_DESIGN_PLAN.md` §3.1. New client component `components/consumer/plan-shop.tsx`; `PlanForPurchase` gained optional `metadata`; weekly-trial suppression by billing history; next-bill rail; lapsed-user restart banner; annual-switch nudge; cancel section limited to recurring plans.

**Files changed:**
- `apps/web/app/(app)/app/billing/plan/page.tsx` — rewritten
- `apps/web/components/consumer/plan-shop.tsx` — new
- `apps/web/lib/db/plans.ts` — `metadata` added to `PlanForPurchase` (optional)
- `apps/web/components/consumer/__tests__/plan-shop.test.tsx` — new (4 tests)

---

## Prerequisites

- Dev server: `pnpm dev` → http://localhost:3000
- Env for real checkout clicks: `PAYMENT_PROVIDER=creem`, `CREEM_API_KEY=creem_test_…` (without it, plan cards render "Coming soon" disabled — still useful for layout QA)
- Test accounts covering the states below (or a Supabase dashboard to hand-edit `subscriptions`/`invoices` rows)

## Page anatomy (what you should see)

Top → bottom:

1. **Status banner** — only when: payment past-due (red), plan canceling (amber), or lapsed subscriber (lime "Welcome back"). Free/active users see no banner.
2. **Your plan** card (left) + right rail: **Next bill/Billing**, **Credits**, and for monthly subscribers a promo **"Switch to annual and save N%"** card.
3. **Start with a week** — only for users who have **never** paid or held any subscription.
4. **Choose a plan** — only when no subscription is active. Monthly/Annual toggle (defaults to **Annual**), 4 tier cards, "Best value" tag, per-card checkout.
5. **Top up credits** — only for active subscribers (any plan type). `$10` minimum, 1 credit/$0.01.
6. **Good to know** — honest FAQ lines + link to `/pricing#faq`.
7. **Cancel your subscription** — only for recurring (monthly/annual) subscribers with a billing customer record.

## Test matrix — one pass per state

| # | State | How to set up | Expected |
|---|-------|---------------|----------|
| 1 | Free, never paid | Fresh signup | No banner. Plan card "Free". "Start with a week" visible with both weekly plans ("one-time" in the price line). "Choose a plan" grid defaults to **Annual** with Save-50/40/25/5% badges. No top-up form, no cancel card. |
| 2 | Active monthly subscriber | Buy `monthly-creator` in test mode | No banner. Plan card: name + "Billed monthly" + "Renews {date}". Next bill shows price + date + "renews automatically". Credits card shows live balance; "Buy credits" jumps to `#top-up`. "Switch to annual and save 50%" card → "Manage plan" posts to `/api/billing/portal`. Top-up form works. No weekly cards, no plan grid. Cancel card at bottom. |
| 3 | Active annual subscriber | Buy `annual-creator` | Same as #2, but cadence chip reads "Billed annually", included-features list says "credits land every month" + "Pay once a year…". No annual-switch card (already annual). |
| 4 | Weekly pass active | Buy `weekly-starter` | Plan card cadence chip "One week — doesn't renew" + "Ends {date}" chip. Billing rail says "One-time … never renews". Top-up form IS present (weekly holders can top up). **No cancel card** (one-time product). No weekly cards, no grid. |
| 5 | Canceling (cancel_at_period_end) | Cancel a monthly sub via the test portal | Amber banner: "Your plan ends {date} — you keep your credits until then." + "Restart plan" → portal. Plan card chip "Cancels {date}". Billing card: "$0 — no further charges". |
| 6 | Past due | Set subscription `status='past_due'` in DB | Red banner "Payment didn't go through" + "Update payment" → portal. |
| 7 | Lapsed subscriber | User with an `expired`/`canceled` subscription row, nothing active | Lime banner "Welcome back — your {plan} plan has ended" + "Restart {plan}" posts `plan_id` to checkout directly. Plan grid visible; **no weekly section** (they have billing history). |
| 8 | Never-paid but zero credits | Fresh account, spend free credits | Same as #1 — page itself doesn't change on balance; only the Credits card shows 0 and "Buy credits" turns lime. |

## Click-path checks

1. **Cadence toggle**: click "Monthly" → 4 monthly cards ($20/$30/$50/$100), footer microcopy switches to "Renews monthly…"; click "Annual" → yearly prices + "$X/mo — billed once a year" sublines.
2. **Checkout**: click "Choose {plan}" → POSTs to `/api/billing/checkout` → redirects to Creem checkout (test mode) or back with `?error=` on failure.
3. **Portal**: "Manage subscription" / "Restart plan" / "Update payment" all POST `/api/billing/portal` → Creem portal.
4. **Anchors**: `/app/billing/plan#top-up` scrolls to the top-up form (subscriber state); "Compare plans" links `#plans`.
5. **Mobile (<1024px)**: right rail stacks under the plan card; plan grid goes single-column; toggle stays centered; nav chips horizontal-scroll.

## Regression checks

- `/app/billing` overview unchanged; its "Buy credits" still links `/app/billing/plan#top-up` for subscribers.
- `/app/billing/credits` unchanged.
- `vitest`: `npx vitest run components/consumer/__tests__/plan-shop.test.tsx` → 4/4 pass.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` all clean.

## Known boundaries (deliberate, per plan doc)

- Weekly plans still render only for never-paid users — the dedicated repurchasable "weekly pass" surface and its `canPurchaseTrial` relaxation are a **separate later task**.
- "Switch to annual" routes through the billing portal (no in-app plan switching yet).
- The cancel button still goes straight to the portal — the retention-offer dialog is a **separate later task**.
- Non-subscribers can't buy top-ups here (server-side `canPurchaseExtraCredits` gate); the dedicated `/app/billing/credits` top-up surface is a **separate later task**.
