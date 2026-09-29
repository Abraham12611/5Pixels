# QA: Special-Offer Card Restyle

What changed: `SpecialOfferTakeover` (`apps/web/components/promo/special-offer-takeover.tsx`)
no longer fills the screen. It renders through the shared `Dialog` primitive as a centered
~500px card over a dimmed backdrop (`max-h-[85dvh]`, scrolls internally on short viewports).
The campaign ladder, variants, frequency caps, attribution, and step bodies are unchanged —
this is a chrome + a11y restyle only.

## What to check

### Shape & a11y
1. Trigger the takeover — easiest path is the admin preview: `/app?offer_preview=<slug>:<variant>`
   (any live campaign slug). Confirm a **centered card** over a dimmed backdrop, not a
   fullscreen page.
2. Card is ~500px wide on desktop; on mobile it fits within the viewport with padding and
   scrolls internally if a step is tall.
3. Focus lands inside the card; Tab cycles within it; Esc closes; backdrop click closes;
   body scroll is locked while open.
4. "Don't show offers again" is a quiet text link in the card's footer divider — not a
   fixed bar at the bottom of the screen.

### Ladder behavior (unchanged)
5. "Not now" advances to the next step *inside the same card* (cross-fade) — never a
   second modal.
6. On the last offer step, the link becomes "No thanks" → closes.
7. The `exit` step ("No pressure" / "Your {preset} will be waiting") has no decline link
   and closes via "Back to the app".
8. Accept on any step POSTs straight to `/api/billing/checkout` with
   `campaign_id`/`campaign_variant`/`campaign_step` attribution — no intermediate billing
   page.
9. Admin preview: the "Previewing" switcher renders inside the card top and writes no
   funnel events.

### Step content (unchanged, resized for the card)
10. Weekly pair — both weekly plans purchasable in place, "one-time" microcopy.
11. Plans/discount — annual-forward `PlanRow` pair + SaveLine + Continue CTA.
12. Referral — referral card + footnote.
13. Top-up — single one-time pack row.

## Events

Same validated enum — `impression`, `step_view`, `accept`, `decline`, `dismiss`,
`opt_out`, `checkout_started` on `surface="takeover"`. Closing via Esc/backdrop/X fires
`dismiss`. Admin preview writes nothing.

## Automated coverage

`components/promo/__tests__/special-offer-takeover.test.tsx` — 5 tests: dialog role +
500px card (not fullscreen), in-card step advance, last-step dismiss, footer opt-out,
accept→checkout POST with attribution.
