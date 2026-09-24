# 13 — Credits, Paywall, Pricing, Billing & Checkout

Surfaces: `paywall-sheet.tsx`, `insufficient-credits-dialog.tsx`, `credit-confirm-dialog.tsx`,
`credit-balance-chip.tsx`, `app/(marketing)/pricing/page.tsx`, `app/(app)/app/billing/page.tsx`,
`billing/credits`, `billing/plan`, `billing/history`, `app/checkout/success`, `app/checkout/cancel`.

Money surfaces are where trust is won or lost. Every researched fintech/subscription product converges
on the same rule: **state the exact amount, the exact cadence, and the exact consequence, before the
tap** (`02 §3.4`, `02 §5.2`).

---

## 1. The credit mental model

The user must always be able to answer three questions:

1. How many credits do I have? → the header credit chip, everywhere in `/app/*`.
2. What will this cost? → the cost is inside the Generate label and in the docked bar (`08 §5`).
3. What happens if it fails? → the refund statement on the progress/failure surface (`09 §4.4`).

Wording is fixed across the app: `N credits` / `1 credit`; never "tokens", "units" or bare numbers.

---

## 2. Current state

- `PaywallSheet` is already a full-height mobile sheet with a sticky header and sticky CTA, weekly
  trials first, monthly plans, a one-time credit option, "What's included" and a secure-checkout
  reassurance — a strong base that matches the researched paywall anatomy (`01 §4`, `02 §5.2`).
- `CreditConfirmDialog` handles first-run cost confirmation with a "don't ask again" key.
- `InsufficientCreditsDialog` is the wide-viewport counterpart to the paywall sheet.
- `/app/billing` and three subroutes exist; `/pricing` is public.

---

## 3. Gaps

1. Paywall appears without a **value recap** of the thing the user was about to make (the preset name is
   passed, but the image is not).
2. **No comparison anchor**: cost-per-image is not shown, so plans cannot be compared at a glance.
3. **Trial mechanics** are not spelled out in the researched form (charge date, amount after trial,
   cancel path).
4. **Plan tables** on `/pricing` and `/app/billing/plan` reflow into cramped columns at 375 px.
5. **Billing history** is a table; horizontal scrolling on mobile is the researched anti-pattern
   (`02 §5.4`).
6. **Checkout return pages** do not show the new balance or return the user to the interrupted task.
7. **Cancellation** has no designed mobile flow (access end date, what happens to credits).
8. The low-balance state has no proactive signal before the user hits the wall.

---

## 4. Paywall sheet (T2) — target

```
──── ▂▂ ────                                   [X]
[ preset thumb ]  Cyber Punk
You need 5 credits — you have 2.
──────────────────────────────────────────────
[ Weekly · 3-day free trial            ✓ ]     selected by default
  Then $X.99/week · 50 credits · ~$0.0X/image
[ Monthly                                 ]
  $XX.99/month · 300 credits · ~$0.0X/image     "Best value" badge
[ One-time · 20 credits                   ]
  $X.99 · no subscription
──────────────────────────────────────────────
What's included  · 3 bullets
Cancel any time. We'll remind you before the trial ends.
──────────────────────────────────────────────
[ Start free trial ]                            docked
Secure checkout · card details never touch 5Pixels
```

Rules:
- Keep the interrupted intent visible (thumbnail + preset name + exact shortfall).
- Each option states **price, cadence, credits and cost-per-image**.
- Trial option states the charge date and the post-trial amount inline, not in a footnote
  (Picnic `02 §5.2`, Daylish flow 8005).
- One-time credits must always be visible as an escape from subscriptions.
- The CTA label matches the selected option (`Start free trial` / `Subscribe` / `Buy 20 credits`).
- Dismissal returns to the create screen with everything preserved.

---

## 5. `/pricing` on mobile

Stacked cards, not a table (`02 §5.2`):
- A billing-period segmented control at the top (Weekly / Monthly), which restates the effective price.
- One card per plan: name, price, cadence, credits, cost-per-image, 3–5 bullets, CTA.
- Recommended plan first with a badge; no "most popular" claim unless it is true.
- A comparison accordion beneath for users who want the full matrix, rendered as rows (feature → values)
  rather than a horizontally scrolling grid.
- FAQ accordion covering: credit expiry, rollover, refunds, cancellation, what happens to results.

---

## 6. Credit purchase (`/app/billing/credits`)

Pack cards in a single column: credits, price, cost-per-image, and a `Best value` badge on one option.
Selection is a radio row; the docked CTA reads `Buy 50 credits · $X.99`. After purchase, return to
`/app/billing/credits` with the new balance highlighted and a `Back to your look` action when the
purchase was triggered from a create flow (carry the origin through checkout metadata).

---

## 7. Checkout return

**Success:** confirmation icon, exactly what was purchased, the new balance, and the single most useful
next action — `Continue your look` when an origin exists, otherwise `Browse looks`. No bottom nav; a
docked primary.

**Cancel:** neutral copy ("Nothing was charged"), the balance unchanged, `Try again` primary and
`Back to your look` secondary. Never imply failure or error.

Both pages must tolerate the webhook lag: if the balance has not yet updated, say "Updating your
balance…" with a poll and a fallback message rather than showing a stale number as if final.

---

## 8. `/app/billing` overview

```
Balance
[ 12 credits ]                      36px numeral, lime
Enough for 2 more transformations   13px muted (uses the median preset cost)
[ Add credits ]  [ Manage plan ]    two 50/50 buttons
──────────────────────────────────
Your plan
Monthly · renews 12 Oct · $XX.99    row card → /app/billing/plan
──────────────────────────────────
Recent activity
row · row · row                     → /app/billing/history
```

---

## 9. Billing history (`/app/billing/history`)

Row cards, not a table (`02 §5.4`): date, description (`Cyber Punk · 5 credits` or
`Monthly plan · $XX.99`), amount right-aligned with sign and colour (spend muted, purchase/refund lime),
status pill when not `paid`. Grouped by month with sticky headers. Invoices expose a `Receipt` action
that opens the hosted invoice. Credit-ledger entries must reconcile exactly with the Runs segment
(`11 §6`) — same counts, same costs, refunds visible.

---

## 10. Plan management and cancellation

- `/app/billing/plan`: current plan card (price, cadence, renewal date, included credits), then other
  plans as stacked cards with `Switch to this plan`.
- Cancellation is reachable in ≤2 taps from the plan page, not hidden (Synthesia flow 13762,
  `02 §5.3`). The confirm sheet must state: the exact date access ends, what happens to remaining
  credits, and that results stay in the Library. Offer one alternative (pause or downgrade) only once,
  and never block the cancel path with it.
- After cancelling: a clear "Active until 12 Oct" state on the plan page, with `Resubscribe`.

---

## 11. Low-balance and proactive signals

- Credit chip gets a `Low` treatment when the balance is below the cheapest preset cost (`05 §3.3`).
- The create screen's docked bar shows the shortfall before the tap when the balance is insufficient,
  with the CTA becoming `Get credits · need 3 more` — no dead-end disabled state.
- Trial-ending reminder via notifications (`14 §4`) if the notification system supports it.

---

## 12. States

| State | Behaviour |
| --- | --- |
| Loading balance | skeleton numeral, never `0` |
| Webhook lag after purchase | "Updating your balance…" with poll |
| Payment failed | inline panel with the provider's user-safe reason + `Try another card` |
| Subscription past due | persistent banner in `/app/*` with `Update payment` |
| Offline | purchase CTAs disabled with a reason |
| No history | "No activity yet" + `Browse looks` |

---

## 13. Work items

| # | Item | Files |
| --- | --- | --- |
| 13.1 | Paywall: preset thumbnail, exact shortfall, per-option cadence/charge-date/cost-per-image, CTA mirroring | `paywall-sheet.tsx` |
| 13.2 | Converge the insufficient-credit dialog and the sheet on one `Sheet` with a viewport switch | `insufficient-credits-dialog.tsx`, `paywall-sheet.tsx`, `create-form.tsx` |
| 13.3 | `/pricing` stacked cards + period toggle + comparison accordion + FAQ | `pricing/page.tsx` |
| 13.4 | Credits packs single column + docked CTA with amount | `billing/credits/page.tsx` |
| 13.5 | Checkout success/cancel: balance, origin-aware next action, webhook-lag handling | `checkout/*/page.tsx` |
| 13.6 | Billing overview composition | `billing/page.tsx` |
| 13.7 | History as row cards grouped by month, receipts | `billing/history/page.tsx` |
| 13.8 | Plan page + transparent cancellation sheet | `billing/plan/page.tsx` |
| 13.9 | Low-balance chip + shortfall CTA on create | `credit-balance-chip.tsx`, `create-form.tsx` |
| 13.10 | Past-due banner | app layout |

Acceptance criteria: `19 §11`.
