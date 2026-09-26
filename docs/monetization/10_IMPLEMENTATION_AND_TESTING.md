# Implementation Status & Testing Guide

Status snapshot of the monetization/referral stack on `feature/billing-promo-ui`
(PR #57 → `develop`). Every entry lists the code path and how to verify it.

---

## 1. Billing providers — Creem is the default

Polar rejected the application ("no AI applications"), so Creem is now the
active provider. Dodo and Polar code remain as rollback paths behind
`PAYMENT_PROVIDER`.

| Provider | Status |
|---|---|
| Creem | **Active default** (`PAYMENT_PROVIDER=creem` or unset) |
| Polar | Legacy rollback (`PAYMENT_PROVIDER=polar`) — rejected account, do not use live |
| Dodo | Legacy rollback (`PAYMENT_PROVIDER=dodo`) |

### Creem implementation files

| File | Purpose |
|---|---|
| `apps/web/lib/billing/creem-client.ts` | Plain-REST client (checkout create, subscription GET, customer billing portal). **Deliberately not the official SDK** — its `serverIdx` mapping sent test keys to production. Environment is derived from the key prefix: `creem_test_*` → `test-api.creem.io`, else `api.creem.io`. Also exports `verifyCreemSignature` (hex HMAC-SHA256 over the raw body, `creem-signature` header). |
| `apps/web/lib/billing/checkout-creem.ts` | `createCreemPlanCheckoutSession` (subscription + one-time plans) and `createCreemExtraCreditsCheckoutSession` (`custom_price` variable top-up, min $10). User identity travels in `metadata.user_id` / `metadata.plan_id`. |
| `apps/web/lib/billing/fulfillment-creem.ts` | All fulfillment: `checkout.completed` (one-time **and** first recurring charge), `subscription.paid` (renewals), lifecycle events, drip init for annual plans. Credit grants are idempotent on `subscription:{subId}:{periodEnd}` / `purchase:order:{orderId}` ledger keys, so `checkout.completed` + `subscription.paid` covering the same first period cannot double-grant. |
| `apps/web/app/api/webhooks/creem/route.ts` | `POST /api/webhooks/creem` — verifies `creem-signature` over the raw body, dispatches all event types, 500 on infra errors (Creem retries 30s → 24h), 200 on ignorable/duplicate events. |
| `apps/web/lib/billing/refunds.ts` | `handleCreemRefund` — mirrors the Polar path: reversal capped at available balance, `unrecovered_credits` recorded for already-spent credits, invoice marked `refunded`, referral reward clawed back via `reverseReferrerShareForRefund`. `dispute.created` runs the same path with `reason: "chargeback"`. |
| `apps/web/lib/billing/customer-portal.ts` | `POST /v1/customers/billing` → `customer_portal_link`. Creem portal handles cancellation/payment methods — no self-serve cancel route needed. |
| `apps/web/lib/billing/payment-provider.ts` | Provider switch. Default `creem`. |
| `apps/web/lib/billing/drip.ts` | `runCreditDrip` now reads `creem_subscription_id` as well as `polar_subscription_id` — annual plans drip correctly under either provider. |
| `apps/web/lib/db/billing.ts` | `getBillingData().billingCustomerId` — provider-agnostic "has billing account" flag (was `dodoCustomerId`, which Polar never populated, so the portal button was dead under Polar too). |
| `apps/web/lib/db/plans.ts` | `checkout_ready` checks `creem_product_id_{test,live}` / `creem_product_id` in `plans.metadata`. |

### Plan → product mapping

Store the Creem product id in `plans.metadata`:

```json
{
  "creem_product_id_test": "prod_xxx",
  "creem_product_id_live": "prod_yyy"
}
```

`resolveCreemProductId` picks the key matching the API-key environment;
`creem_product_id` is the legacy fallback. A plan with no resolvable product id
is shown as "not available for purchase yet" (`checkout_ready = false`).

### Environment variables (`.env.example`)

```bash
PAYMENT_PROVIDER=creem          # default
CREEM_API_KEY=                  # creem_test_* (test) or creem_* (live)
CREEM_WEBHOOK_SECRET=           # Dashboard → Developers → Webhooks
```

### Creem dashboard setup still required (not done in code)

1. Create products in **test mode** for each plan (monthly/annual
   subscription products + one-time products for weekly passes and the
   variable-credit top-up). Copy each `prod_*` id into `plans.metadata`.
2. Create a webhook endpoint: `https://<domain>/api/webhooks/creem`,
   subscribe to `checkout.completed`, `subscription.active`,
   `subscription.trialing`, `subscription.paid`, `subscription.update`,
   `subscription.scheduled_cancel`, `subscription.canceled`,
   `subscription.expired`, `subscription.paused`, `subscription.past_due`,
   `subscription.unpaid`, `refund.created`, `dispute.created`. Copy the
   signing secret into `CREEM_WEBHOOK_SECRET`.
3. Local testing: `creem listen --forward-to http://localhost:3000/api/webhooks/creem`.

### CLI note — verified working

`creem-cli` is installed globally (from the GitHub tarball; the npm package
is unpublished). Its `serverIdx` mapping was inverted — test keys were sent
to production — so the installed client was patched to pass `serverURL`
(`node_modules/creem-cli/dist/lib/api.js`). Config lives at
`~/.creem/config.json` (`environment: "test"`).

Verified: `creem whoami` → authenticated, `test`, `test-api.creem.io`;
`creem products list` → authenticated empty list (no products yet — see
dashboard setup). Plain REST against `test-api.creem.io` with the same key
returns proper validation errors (auth passes).

**Reinstall warning:** `npm i -g` again will wipe the `serverURL` patch —
re-apply it or the CLI will hit production with test keys.

### Compliance requirements (from Creem docs — not yet verified)

- **Account review** (`merchant-of-record/account-reviews`): product live,
  visible pricing, Privacy Policy + Terms of Service, reachable support
  email shown on site and receipts, no fake testimonials. Creem may do a
  **test purchase** with a 100% discount code — expect a zero-value order.
- **AI wrapper compliance**: independent branding (satisfied — 5Pixels has
  no model names in product/marketing), an **Acceptable Use Policy**
  prohibiting NSFW, and the **Creem Moderation API** for prompt-based
  generation. 5Pixels has *no consumer prompt field* (preset-first,
  schema-driven controls only), which likely softens the moderation
  requirement — but expect it to come up in review. Preset-level
  `safety_config.allowed_nsfw` exists in `lib/validation/publish-gates.ts`;
  there is no runtime moderation call today.
- **Prohibited-product risk**: "face-swap, deepfake, and face-manipulation
  tools" are prohibited — review presets for anything that alters identity
  before submitting. Generative AI is a *restricted* category requiring
  prior processor history and chargeback rates.
- **Referral payouts**: merchant-funded cash referral payouts are
  prohibited; our program pays **in-app credits only** — frame it that way
  in the application.
- **Safe metered flow** (`guides/safe-metered-ai-image-video-generator`):
  moderate → debit (idempotent) → generate → auto-reverse on failure.
  Our pipeline already debits idempotently and refunds credits on failed
  generations; the "moderate first" step is the gap to document for review.

---

## 2. GrowSurf referral bridge (campaign `whr2c0`)

| File | Purpose |
|---|---|
| `apps/web/app/layout.tsx` | Universal `<head>` snippet via `next/script` `beforeInteractive`. Campaign id defaults to `whr2c0`; `NEXT_PUBLIC_GROWSURF_CAMPAIGN_ID` overrides, empty string disables. |
| `apps/web/lib/growsurf/client.ts` | REST client (`api.growsurf.com/v2`, Bearer auth, 10 s timeout): `addGrowSurfParticipant`, `triggerGrowSurfReferral` (`delayInDays` 1–90), `cancelGrowSurfDelayedReferral`, `getGrowSurfParticipant`. All no-ops without env vars. |
| `apps/web/lib/growsurf/verify.ts` | `GrowSurf-Signature: ts=...,v=...` — HMAC-SHA256 over `ts.` + raw body, timing-safe, 5-min tolerance. |
| `apps/web/lib/growsurf/sync.ts` | `syncParticipantToGrowSurf` (auth-callback hook: creates participant with `referredBy` + `metadata.spx_user_id`, stores `growsurf_id`); `awardOrHoldReferrerShare` (immediate grant, or `pending_hold` when `GROWSURF_REFERRAL_HOLD_DAYS` is set); `reverseReferrerShareForRefund` (cancels pending holds / claws back granted credits, capped at balance, `unrecovered_credits` for the spent remainder). |
| `apps/web/app/api/webhooks/growsurf/route.ts` | `PARTICIPANT_REACHED_A_GOAL` → settle held shares **or** grant metadata-driven milestone rewards (`data.reward.metadata.spx_credits`, both participant sides via `reward.isReferrer`); `NEW_PARTICIPANT_ADDED` → backfill `growsurf_id`/`referred_by`. HIGH fraud risk → `rejected`. Idempotent on `data.reward.id`. |
| `apps/web/lib/referrals/rewards.ts` | `grantGrowSurfMilestoneReward` + existing 30 %-of-plan payment-share grant. Append-only `credit_ledger` with idempotency keys. |

**Saved GrowSurf setup** (source of truth): referral program, trigger =
signup/lead form, tracking = programmatic REST, participant auth disabled,
auto-approve rewards, share URL `https://www.5pixels.app/`.

**Portal surface (step 4): white-label embedded page** — chosen over the
popup window and hosted portal:

| File | What it does |
|---|---|
| `apps/web/app/(app)/app/referrals/page.tsx` | `/app/referrals` — auth-gated settings page; resolves `display_name` → `first`/`last`, renders the blocks. Falls back to a "not available" card when `NEXT_PUBLIC_GROWSURF_CAMPAIGN_ID` is empty or no email is on file. |
| `apps/web/components/growsurf/blocks.tsx` | The six embedded elements: `data-grsf-block-form` (share link + social), `referral-summary`, `next-milestone`, `referral-status`, `rewards`, `invite`. All carry `data-grsf-email`/`first-name`/`last-name` (participant/auth view) plus dark-theme `*-style` overrides (lime `#82ea3a` buttons, charcoal `#141714` cards). |
| `apps/web/components/growsurf/init.tsx` | Client-side `grsfReady` listener → `growsurf.initElements()` — needed because Next.js client-side navigation mounts blocks after the universal script has loaded. |
| `apps/web/components/consumer/settings-shell.tsx` | "Referrals" nav item (Billing group — rewards are credits). |
| `apps/web/app/(app)/app/account/page.tsx` | "Refer & earn" shortcut card. |

The universal code lives in `app/layout.tsx` (`beforeInteractive`, campaign
`whr2c0` default). Participant creation is implicit — `data-grsf-email`
auto-adds the user to the program on first view.

### Referral reward lifecycle

```
friend signs up        → referee gets free-unlock credit (first-party row)
friend's first payment → referrer's 30% parks in pending_hold
                         (GROWSURF_REFERRAL_HOLD_DAYS) or grants immediately
hold expires           → GrowSurf fires PARTICIPANT_REACHED_A_GOAL → grant
payment refunded       → pending: DELETE /ref (never lands)
                         granted: capped reversal + unrecovered_credits
```

## 3. Anonymous teaser cleanup

`GET /api/cron/teaser-sweep` (`Bearer $CRON_SECRET`, same pattern as
credit-drip): deletes expired+unconsumed `pending_generations`, removes
anon-owned storage objects, soft-deletes asset rows. User-owned sources keep
their retention settings. Idempotent.

## 4. Admin offer-variant preview ("see everything")

Admins are never randomly bucketed for inspection purposes:
`?offer_preview=<campaignSlug>[:<variant>]` on `/app` forces the takeover to
render that flow — no `promo_assignments` row, no `promo_events`, no
tier/balance/cap checks. Verified server-side via `profiles.is_admin` /
`is_owner`; the param is silently ignored for everyone else.

| File | Change |
|---|---|
| `apps/web/lib/offers/engine.ts` | `getTakeoverStateForUser(preview?)` admin branch; `listAdminPreviewOptions()` (all campaigns × variants, any status); `OfferAssignment.isAdminPreview`; `TakeoverState.adminVariants`. |
| `apps/web/components/promo/special-offer-takeover.tsx` | "Admin preview" badge, variant `<select>` switcher (navigates to `?offer_preview=`), "Exit preview" link, all event/opt-out writes suppressed in preview. |
| `apps/web/components/consumer/offer-takeover-gate.tsx` | Forwards `adminVariants`. |
| `apps/web/app/(app)/app/page.tsx` | Reads `searchParams.offer_preview` → engine. |
| `apps/web/app/(admin)/admin/offers/[id]/page.tsx` | "Preview as a user" link per variant. |

Usage: open `/admin/offers/<campaign>`, click a variant chip, or go straight
to `/app?offer_preview=spring-drop:B_short`. Draft campaigns preview fine.

## 5. Database migrations applied

| Migration | Contents |
|---|---|
| `20260926091913_growsurf_bridge` | `pending_hold`/`cancelled` reward statuses, `growsurf_prew_id` unique key, `growsurf_synced_at`. |
| `20260926211902_growsurf_milestone_rewards` | `growsurf_milestone` reward kind + `earner_user_id` on `referral_rewards`. |
| `creem_provider` (applied 2026-09-29) | `profiles.creem_customer_id`, `subscriptions.creem_subscription_id`/`.creem_customer_id`, `invoices.creem_order_id`/`.creem_checkout_id`/`.creem_subscription_id` + partial indexes. |

Local files: `supabase/migrations/20260929000002_growsurf_milestone_rewards.sql`,
`supabase/migrations/20260929000003_creem_provider.sql`.

---

## 6. Tests — how to run and inspect

All from `apps/web` (or repo root with `pnpm --filter web`):

```bash
pnpm test                              # whole suite
pnpm test -- lib/billing/__tests__/webhook-creem.test.ts
pnpm test -- lib/growsurf/webhook-growsurf.test.ts lib/growsurf/verify.test.ts
pnpm test -- lib/offers/admin-preview.test.ts
pnpm test -- lib/billing/__tests__/webhook-polar.test.ts lib/billing/__tests__/polar.test.ts
```

Vitest list/inspect:

```bash
pnpm vitest list lib/billing           # enumerate test names without running
```

| File | Covers |
|---|---|
| `lib/billing/__tests__/webhook-creem.test.ts` (13 tests) | Signature accept/reject/tamper/missing, `checkout.completed` one-time grant + replay dedup, `subscription.paid` grant + invoice + subscription upsert, checkout+paid first-period dedup, refund debit + invoice `refunded`, pending-refund no-op, dispute chargeback reversal, cancel/past_due lifecycle, unknown event → 200. |
| `lib/growsurf/webhook-growsurf.test.ts` (15) | Signature rejection, campaign scoping, milestone grants via `spx_credits` (both participant sides), held-share settle, HIGH-fraud rejection, idempotent redelivery, participant backfill. |
| `lib/growsurf/verify.test.ts` (6) | `ts=,v=` parsing, raw-body HMAC, timestamp window. |
| `components/growsurf/__tests__/blocks.test.tsx` (3) | All six embedded blocks render with participant identity, name attrs omitted when absent, every `*-style` attr stays JSON-parseable. |
| `lib/offers/admin-preview.test.ts` (5) | Forced variant without bucketing, draft-campaign preview, switcher index completeness, unknown slug, non-admin ignores param. |
| `lib/offers/pick-variant.test.ts` | Weighted bucket math. |
| `lib/billing/__tests__/webhook-polar.test.ts`, `polar.test.ts` | Legacy Polar paths (kept green as rollback coverage). |
| `lib/teaser/*` + `app/api/cron/teaser-sweep` tests | Pending-generation sweep. |

Full gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

---

## 7. Env vars pending

| Var | Needed for |
|---|---|
| `CREEM_API_KEY` | Test key supplied is verified working against `test-api.creem.io` — set it in `.env.local`/Vercel to activate checkout. |
| `CREEM_WEBHOOK_SECRET` | Webhook signature verification — from dashboard endpoint creation. |
| `GROWSURF_API_KEY`, `GROWSURF_WEBHOOK_SECRET` | GrowSurf REST + webhook activation. |
| `GROWSURF_REFERRAL_HOLD_DAYS` | Optional 1–90 day referrer-reward hold (signup trigger means it falls back to immediate grant unless the trigger is changed to qualifying-action). |

## 8. Known limitations / open items

- Creem **products are not created yet** — plan checkouts return "not
  available for purchase yet" until `plans.metadata` carries `prod_*` ids.
- Creem account review not submitted — approval claims can't be made until
  it passes.
- GrowSurf embedded blocks render empty until `growsurf.js` loads — blocked
  by aggressive ad-blockers; acceptable degradation (card headers still
  explain the feature).
- Moderation API integration absent — likely review blocker; needs a
  decision on whether preset-internal prompting still requires it.
