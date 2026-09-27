# Phase 4.4–4.5 — Billing overview/history/plan + Account grouped index

Manual test guide for `13 §8–§10` and `14 §2/§7`. Mobile viewport first.

## 1. `/app/billing` overview (4.4)

1. Balance hero: numeral, `Resets <date>` or the no-expiry line, and a new
   muted `Enough for ~N more transformations` line (median preset cost).
2. Two equal-width buttons: `Add credits` (→ top-up pack picker on
   `/app/billing/credits` for subscribers, `/pricing` for free users) and
   `Manage plan` (→ `/app/billing/plan`; free users get `Compare plans`).
3. `Recent activity` card lists the last few ledger rows (spend muted,
   refunds/purchases lime) with `See all` → `/app/billing/history`.

## 2. `/app/billing/history` (4.4)

1. `Activity` card merges money rows (invoices) and credit-ledger rows into
   one timeline grouped under sticky `MONTH YEAR` headers that pin under the
   app header while scrolling.
2. Invoice rows show status pills for anything not `paid`; paid invoice rows
   have a `Receipt` ghost → billing portal.
3. Credit rows read `−N credits` / `+N credits` and reconcile with the Runs
   segment (`?tab=runs`): same labels, same amounts, refunds visible.
4. Payment methods + billing info cards unchanged below.

## 3. `/app/billing/plan` cancellation (4.4)

1. Subscriber without pending cancellation: a quiet `Cancel subscription`
   row sits below the upgrade cards — tap 1.
2. T1 sheet: states the exact end date (`Active until …`), that remaining
   credits stay, and that results stay in the Library. One alternative link
   (`Or switch to a lower plan instead`) is offered once.
3. `Continue to cancel` → billing portal (the only cancellation backend);
   one more tap there completes it.
4. With `cancel_at_period_end`: the plan card shows `Cancels <date>` and a
   `Resubscribe` primary (portal), and the cancel row is gone.

## 4. `/app/account` grouped index (4.5)

1. Below `lg`: identity row (avatar + name + email → profile), then groups —
   `CREDITS & BILLING` (Balance value row, Plan value row, Payment history),
   `ACCOUNT` (Profile / Security / Notifications / Privacy & data),
   `SUPPORT` (Help & FAQ → `/pricing#faq`) — 56px rows, value + chevron.
2. `Sign out` and a muted-red `Delete account` row, then the version line.
3. Sub-pages show a labelled `← Account` / `← Billing` back link instead of
   the chip rail; `/app/account` and `/app/billing` indexes keep the rail.
4. ≥ `lg`: unchanged two-pane settings shell + card index.
5. `/app/settings`, `/app/profile`, `/app/settings/delete` redirect to
   `/app/account*` (already shipped — regression check).
