# QA: Cancel-Subscription Retention Dialog

What changed: `/app/billing/plan` no longer drops "Cancel subscription" straight into the
billing portal. It opens `CancelSubscriptionCard` (`apps/web/components/consumer/
cancel-subscription-card.tsx`) — a lose-list + optional reason + "Stay and get 500 free
credits" offer — before the portal link is ever hit. Accepting grants a one-time
500-credit bonus via `claimRetentionCredits` (`apps/web/lib/billing/retention.ts`),
idempotent per subscription (`credit_ledger.idempotency_key = retention:<sub_id>`,
`entry_type = adjustment`).

## Preconditions

- Signed-in account with an **active monthly or annual** subscription
  (`subscriptions.status = 'active'`, `cancel_at_period_end = false`) and a
  billing customer id.

## Test steps

### Rendering & gating
1. `/app/billing/plan` → "Cancel your subscription" card at the bottom with a
   **Cancel subscription** button (no direct portal link).
2. Same account with `cancel_at_period_end = true` → the cancel card is gone;
   only the amber "your plan ends {date} — Restart plan" banner remains.
3. Weekly-pass holder or free user → no cancel card at all.

### The dialog
4. Click **Cancel subscription** → centered dialog: "Sure you want to cancel?",
   lose-list with ✕ marks ("N credits at every renewal", plan-rate line when
   applicable), the honesty line "Anything already in your balance is yours to
   keep", optional reason chips, the lime retention card, and two buttons.
5. Esc / backdrop click / closing without choosing → closes cleanly, no credits
   granted, no portal navigation.

### Retention accept
6. Click **Keep my plan — get 500 credits** → success state "You're staying —
   500 credits added". Balance increases by 500 (check `/app/billing/credits`
   or the Credits card).
7. Repeat step 6 (reopen the dialog and click again) → success still shows, but
   **balance does not increase a second time** — the ledger idempotency key
   blocks double-grants. Verify in DB: exactly one
   `credit_ledger` row with `idempotency_key = retention:<subscription_id>`,
   `entry_type = 'adjustment'`, `amount = 500`.
8. The subscription is untouched — still active, still renewing.

### Continue to cancel
9. Reopen → pick a reason chip (optional) → **Continue to cancel** → POSTs to
   `/api/billing/portal` → lands in the billing portal where cancellation
   proceeds normally.
10. With no reason selected, **Continue to cancel** still works — the reason is
    never a required gate (no dark-pattern friction).

### Server-side abuse checks
11. Call `claimRetentionCredits` for a **free** user → `{ ok: false }`, no ledger row.
12. Same for a **weekly-pass** user → rejected (recurring plans only).
13. Same for a sub with `cancel_at_period_end = true` → rejected — the offer is
    "stay", so an already-ending plan earns nothing.

## Events

All events land in `promo_events` with `context = 'cancel_flow'` and `meta.plan`:

| Moment | event |
|---|---|
| Dialog opens | `impression` (once per open) |
| Keep my plan succeeds | `accept` (`meta.credits`, `meta.already`) |
| Continue to cancel | `decline` (`meta.reason` when picked) |
| Esc/backdrop close | `dismiss` |

## Automated coverage

`components/consumer/__tests__/cancel-subscription-card.test.tsx` — 6 tests:
rendering, grant accept + success state, grant failure stays on the offer,
portal submission, reason capture, once-per-open impression.
