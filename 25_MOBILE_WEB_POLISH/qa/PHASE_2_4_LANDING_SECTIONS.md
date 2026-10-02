# Phase 2.4 — Landing/discover section grammar, skeletons, carousel a11y

Manual test guide for the landing (`/`) and discover (`/app`) rail grammar
(spec `05 §2–§5`). Work items: 5.1 MobileSection/MobileRail adoption,
5.3 carousel a11y, 5.4 sticky chips, 5.6 skeletons.

## Setup

- Mobile viewport (≤ 767 px) is the primary target; check `/app` on desktop
  too since it shares the new section rhythm.
- `/` is anonymous-first; `/app` requires a signed-in user.

## 1. Hero carousel (5.3)

1. `/` mobile — swipe through the featured slides: snap-x centers each slide,
   no auto-advance.
2. Screen reader: the region announces `group / carousel "Featured looks"`;
   each slide announces `slide, "1 of 3"`.
3. Keyboard: Tab to the slide track ("Featured preset slides") — arrow keys
   scroll it; focus ring is visible.
4. Dots under the carousel — 6px pills, lime on the active index
   (`aria-hidden`, decorative).
5. Slides with a `preview_video` asset play a muted loop **only on the active
   slide**; other slides show the poster frame.
6. `prefers-reduced-motion` (DevTools → Rendering): the video is replaced by
   the poster image.
7. `Use this look` → `/app/create/<slug>`; `Preview` ghost → the shared quick
   sheet (same sheet the feed opens).

## 2. Sticky chips + sections (5.4, 5.1)

1. Scroll past the hero — the chips row pins under the 64px header with a
   hairline bottom border and translucent backdrop.
2. Selecting a chip filters the masonry feed in place (no navigation); the
   Trending rail hides while a chip is active.
3. Trending section: 20px gutters, title + `See all →` (30px above, 15px
   below), 156px cards, snap-x mandatory, ~peek of next card, ends with a
   terminal `See all` card → `/explore`.
4. Screen reader: rail is a labelled list ("Trending looks"); each card's
   accessible name is `"<name>, <type>, <N> credits"`.
5. "All looks" section header carries the same grammar + `See all →`.

## 3. Discover `/app` rails (5.1)

1. Continue rail (returning users): snap rail, status pill + relative age on
   each card; `View all` → `/app/library`.
2. Trending now / New looks / Saved looks: max 6 cards then a terminal
   `See all` card → `/explore`, `/explore?sort=newest`, `/app/favorites`.
3. Saved-looks heart state matches favorites (already-saved items show
   filled hearts).
4. Desktop `/app` still works — sections keep the same rhythm at width.

## 4. Skeletons (5.6)

1. `/` — throttle network (DevTools → Fast 3G) and reload: a skeleton hero,
   pill, chips, rail, and masonry appear **before** content streams in (no
   root `loading.tsx` — implemented via Suspense so auth routes are not
   affected).
2. `/app` — reload: three rail skeletons (title bar + horizontal cards).
3. `/presets/<slug>` and `/explore` skeletons remain their own.

## 5. Regressions

- Landing desktop (`lg`+) — editorial sections unchanged.
- Quick sheet opened from hero or feed — same content, Back/scrim/Escape
  dismiss, heart auth-gated for anonymous.
- `/explore` mobile — sticky bar + chips unchanged.
