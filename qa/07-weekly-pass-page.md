# QA: Weekly Pass page (`/pricing/weekly`)

What changed: the weekly pass now has a dedicated public deep-link surface
(District Pass pattern — 06 §3.3) instead of routing through Billing.
`/pricing/weekly` is a marketing page: ✦ WEEKLY PASS ✦ eyebrow, hero price
lockup ("From $X — one-time"), honest "a pass, not a subscription" framing,
benefit rows, and both weekly tiers purchasable in place. `/pricing` hero copy
now links to it.

## Test steps

### Anonymous visitor
1. In a fresh/incognito browser, open `/pricing/weekly` → hero shows
   "One week of creating", "From {Starter price}" with a "one-time" subline,
   and "It never renews" framing.
2. Both tiers render: **Starter week** (dark card) and **Plus week** (lime
   card with a "Most credits" tag). Each shows credits, "≈ up to N
   transformations", and its price with an "one-time" suffix.
3. Benefit list reads: ≈ transformations on the Starter pass, every Filter and
   Poster, HD downloads, "credits land instantly — and the pass never renews".
4. Both "Get a week" buttons are links to `/signup?next=/pricing/weekly`.
   Sign up → you land back on `/pricing/weekly`.
5. Footer: "See monthly plans →" goes to `/pricing`; "All plans" back-link
   at top-left also goes to `/pricing`.
6. No word "trial" appears anywhere on the page.

### Signed-in, never paid
7. Open `/pricing/weekly` → same layout, but "Get a week" buttons are now
   **direct checkout form posts** (`/api/billing/checkout`, `plan_id` hidden
   field) — no Billing detour.
8. Buy the Starter pass end-to-end → webhook credits land → `/pricing/weekly`
   now shows "**Get another week**" as the hero headline (repurchase framing,
   still no "trial" wording).

### Signed-in, weekly-buyer repurchase
9. After step 8, buy again → checkout succeeds (weekly passes are repurchasable
   for non-subscribers; `canPurchaseWeeklyPass` allows weekly-only history).

### Signed-in, subscriber or non-weekly payment history
10. With an active monthly/annual subscription (or any non-weekly paid invoice
    in history), open `/pricing/weekly` → **redirected to `/pricing`** — the
    weekly-suppression rule applies on this surface too, so subscribers and
    graduated users never see weekly offers.
11. Sanity: the redirect is server-side, so the page never flashes.

### Edge cases
12. `checkout_ready = false` for a weekly plan (no provider product id in
    metadata): button renders "Coming soon" disabled — no dead checkout.
13. Zero weekly plans seeded: the page redirects to `/pricing` rather than
    rendering an empty shell.
14. Mobile viewport (~390px): single-column stack, lime Plus card and dark
    Starter card full-width, CTAs remain reachable — nothing overflows.
15. `/pricing` hero copy now has a "weekly passes" inline link → lands on
    `/pricing/weekly`.

## Automated coverage

`app/(marketing)/pricing/weekly/__tests__/weekly-page.test.tsx` — 7 tests:
tier filtering (monthly excluded), anonymous signup links with `next=` return
path, signed-in direct checkout forms + plan_id ordering, ineligible-user
redirect, "Get another week" repurchase framing, one-time/no-trial copy, and
empty-plans redirect.
