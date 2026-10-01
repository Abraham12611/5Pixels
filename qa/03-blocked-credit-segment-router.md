# QA: Blocked-Credit Segment Router

What changed: the generic "Not enough credits" dialog and the mobile paywall sheet are replaced by one
`BlockedCreditSurface` (`apps/web/components/consumer/blocked-credit-surface.tsx`) that is routed by
server-derived user segments (`apps/web/lib/billing/segments.ts`). Weekly passes are now repurchasable
for non-subscribers (`canPurchaseWeeklyPass` in `apps/web/lib/billing/entitlements.ts`), and any
subscription history suppresses weekly-"trial" framing everywhere.

## Segments & expected surfaces

| # | Test account state | Expected |
|---|---|---|
| 1 | Brand-new user, no generations, no billing rows (`new_user`) | Offer variant if an eligible campaign exists, else "Start with a week" — weekly passes + monthlies shown, no terse "not enough credits" text |
| 2 | Free user with ≥1 generation (`free_history`) | "Keep creating without limits" — weekly + monthly options; campaign variant when eligible |
| 3 | Bought a weekly pass before, never a monthly/annual (`weekly_buyer`) | Headline "Get another week" — no "trial" wording anywhere |
| 4 | Active monthly/annual subscriber (`subscriber`) | Top-up content only — credit packs/custom amount, no plan offers, no weekly trial |
| 5 | Subscriber with `cancel_at_period_end = true` (`canceling`) | Top-up plus "Your {plan} plan ends {date}" nudge with a restart link to `/app/billing/plan` |
| 6 | Lapsed subscriber (`lapsed`) | "Welcome back" — last plan preselected for one-click restart, top-up secondary |
| 7 | Signed-in user who arrived via a referral (`referred`) | Contextual surface + "Referred by a friend? Rewards land after signup." footnote |

## Test steps

### Routing
1. Create a fresh account → upload an image in Create → Generate with insufficient credits → expect surface #1.
2. On a free account that has generated before → expect #2.
3. Buy a weekly pass (test checkout) → let it lapse (or set `subscriptions.current_period_end` in the past) → trigger again → expect #3: "Get another week", never "trial".
4. Subscribe monthly → trigger → expect #4: top-up packs only.
5. In `subscriptions`, set `cancel_at_period_end = true` on the active sub → expect #5.
6. Cancel/lapse the sub entirely → expect #6 with the last plan preselected.
7. Visit via `/r/<code>` (or set the referral cookie) before signup → trigger → expect #7 footnote.

### In-place transitions (one overlay only)
8. On any surface with a plan list, click **Get credits** → content swaps to top-up in the same overlay — no navigation, no second modal.
9. Click **Cancel** while an offer campaign is eligible → the same overlay transitions to the offer step (never a stacked modal). With no offer → closes.

### Wording rules
10. Grep every rendered variant: the word "trial" must only appear for `new_user` first-time framing. Weekly buyers see "Get another week"; subscribers/lapsed never see weekly offers.

### Responsive & a11y
11. Desktop ≥1024px → centered dialog (~500px). Mobile <1024px → bottom sheet. Both trap focus, Esc/backdrop close, body scroll locks.
12. Balance honesty: every variant shows "You need {N} credits — your balance is {M}".

### Checkout integrity
13. From the subscriber top-up view, run a $10 test purchase → lands back on `/app/billing/credits`, credits granted.
14. Attempt a weekly-trial checkout as a user with a paid monthly invoice → server must reject (covered by `polar.test.ts`; verify on Creem/Dodo too — same `canPurchaseWeeklyPass` gate).
15. A past weekly buyer checks out the weekly pass again → succeeds ("Get another week").

## Automated coverage
- `components/consumer/__tests__/blocked-credit-surface.test.tsx` — 6 tests: per-segment rendering, weekly-trial suppression, in-place top-up swap, lapsed preselect.
- `lib/billing/__tests__/polar.test.ts` — weekly gate: monthly payment blocks weekly pass; weekly repurchase allowed.

## Events
`blocked_dialog_shown` / `blocked_dialog_dismissed` / `offer_step_shown` / `topup_checkout_started` etc. fire via `recordOfferEvent` with the segment key in meta (campaign_id null when no campaign — schema now allows it). Admin preview mode sends no events.
