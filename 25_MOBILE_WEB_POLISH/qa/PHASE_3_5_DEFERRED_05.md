# Phase 3.5 — Deferred `05` leftovers: show-more feed, continue-rail retry, card normalization

Manual test guide covering the deferred landing/discover items (`05 §6`:
5.5, 5.7, 5.9; 5.8's low-balance credit chip already shipped earlier).
Mobile viewport (≤ 1023 px for landing-mobile).

## 1. Show more looks (5.5)

1. Landing `/` on mobile — the feed shows 18 cards, then a `Show more looks
   (N)` button centred under the grid when the catalogue is bigger.
2. Tapping reveals the next page in place — no navigation; the button
   disappears when the catalogue is exhausted.
3. Switching a category chip collapses back to the first page.
4. Signed-out and signed-in landing both behave the same.

## 2. Continue-rail retry (5.7)

1. `/app` Discover — the Continue rail shows status pills on every card
   (Ready lime / Failed error / In progress neutral).
2. A failed card carries a lime `Retry` chip bottom-left of the thumbnail →
   `/app/create/[slug]`, tappable independently of the card link (stretched
   link pattern — the rest of the card still opens the run detail).
3. Non-failed cards unchanged: tap → result or progress page.

## 3. Card typography normalization (5.9)

1. Landing feed + trending-rail cards now match the app card grammar:
   name 13px semibold title case (no uppercase display), category 11px
   muted — compare against `/explore` cards and the `/app` rails.
2. Radius, media-frame treatment and gradient overlay are unchanged.

## 4. Credit chip (5.8 — already shipped, regression check)

- Header credit chip: default neutral; `≤5` turns warning-amber (not red);
  `0` turns error-red with a `Top up` label → `/app/billing`.
