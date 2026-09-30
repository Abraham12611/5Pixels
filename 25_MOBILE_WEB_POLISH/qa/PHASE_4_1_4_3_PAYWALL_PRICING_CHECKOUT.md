# Phase 4.1–4.3 — Paywall, /pricing, credit packs, checkout returns

Manual test guide for `13 §4–§7`. Mobile viewport (≤ 639 px) + `sm` desktop.

## 1. Consolidated paywall (4.1)

1. Sign in, drain credits below a preset's cost (or use a high-cost preset),
   `/app/create/[slug]` → upload → tap Generate.
2. **Mobile:** T2 sheet — `[X]`, drag handle. **Desktop (≥sm):** centred
   Dialog with identical content. One component, no forked copy.
3. Context row: preset thumb + name + `You need N credits — you have M.`
4. Option rows: price · cadence · credits · `~$0.0X/image` each; a
   `Best value` badge on the best credits-per-dollar plan (never "popular");
   the weekly trial row is **pre-selected**; one-time pack always listed.
5. `What's included` bullets; `Cancel any time…` line (trial catalogue) or
   "credits never expire" line; secure-checkout footer.
6. CTA label matches selection: `Start free trial — $5` / `Subscribe — $20` /
   `Buy 800 credits — $8`. Submitting posts `plan_id` + `return_path`.
7. Dismiss (X / scrim / Escape / swipe) → create screen untouched.

## 2. `/pricing` (4.2)

1. Weekly | Monthly segmented control above the cards; switching restates
   the grid (Free card stays on Monthly).
2. Each card: name, price + cadence, credits, `~$X/image`, bullets, CTA.
   Recommended monthly shows `Best value`.
3. Comparison matrix + FAQ + plan finder unchanged beneath.
4. Anonymous CTAs → `/signup?next=/pricing`; authed CTAs POST checkout.

## 3. Credit packs (4.2)

1. `/app/billing/credits` as a monthly subscriber: `Add credits` card with
   3 radio rows ($10/$25/$50 → 1,000/2,500/5,000 credits) showing
   `~$/image` and `enough for ~N looks`; docked `Buy N credits · $X`.
2. Non-subscriber sees the upsell card linking to `/pricing`.
3. Purchase → checkout → returns with `?return=/app/billing/credits`.

## 4. Checkout return (4.3)

1. Complete a checkout from the paywall on `/app/create/[slug]` →
   `/checkout/success` shows a ✓ confirmation, `New balance` (or
   "Updating your balance…" while the webhook lands — it polls ~24s then
   falls back gracefully), `Continue your look` primary → the create page.
2. From `/pricing` → primary is `Browse looks`; `/app/billing/credits` →
   `Back to credits`. Secondary `Go to billing` always present.
3. Cancel → "Nothing was charged", balance shown unchanged, `Try again`
   → `/pricing` primary + `Back to your look` → origin when present.
4. No app header / bottom nav on either page.
