# Phase 3.4 — Runs list: day grouping + credit reconciliation

Manual test guide for `/app/library?tab=runs` (spec `11 §6`, `11.8`).
Requires a signed-in user with runs across multiple days and at least one
failed run (or simulate one by cancelling mid-run).

## 1. Day grouping

1. Runs group under sticky day headers: **Today**, **Yesterday**, then
   `Weekday, Mon D` (year appended for older years).
2. Headers pin under the segmented control while their group's rows scroll.
3. Rows stay chronological within each day.

## 2. Rows

1. 72px rows: thumbnail, preset name, status pill, relative time, credit
   cell, chevron — the credit cell is **always present**.
2. Row tap: completed → `/app/results/[id]`; everything else →
   `/app/generations/[id]` (progress page).
3. Failed / blocked / cancelled rows show an inline lime **Try again** →
   `/app/create/[slug]`, independently tappable inside the row.

## 3. Credit reconciliation (11 §6)

1. Completed runs show `N credits` — matching the `debit` rows in
   `/app/billing/history` (the reservation converts to a debit on
   completion).
2. In-progress runs show `N credits` muted — that's the held reservation;
   it debits on completion or releases on failure.
3. Failed / blocked / cancelled runs show **Refunded** — the ledger writes
   a `refund` entry (`fail_generation_refund`), so net spend is 0.
4. Footer: `N credits spent on completed runs · See billing history` —
   the total equals the sum of completed-run debits and links to
   `/app/billing/history` for the full ledger.

## 4. States

- Empty: "No transformations yet" + `Browse looks` → `/explore`.
- In-progress pills pulse; cancelled is muted (not error-red).
- Results/Presets segments and `?tab=` deep links unchanged.
