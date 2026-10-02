# Phase 3.1 — Segmented Library (Results / Presets / Runs) with URL state

Manual test guide for `/app/library` and the retired standalone routes
(spec `11 §3`, `19 §9` first row). Work item 11.1 only — uniform grid,
in-progress rail polish, filter modal, selection mode, and run day-grouping
land in 3.2–3.4. Requires a signed-in user.

## 1. Segmented control

1. `/app/library` shows a sticky segmented pill under the app header:
   `Results | Presets | Runs` — 44px tall, full width, stays pinned under the
   header while content scrolls beneath it.
2. The default segment is **Results** and the URL stays bare
   (`/app/library`).
3. Tapping a segment swaps the panel instantly — no page reload flash — and
   the URL updates: `?tab=presets`, `?tab=runs`, back to bare for Results.
4. Arrow keys move between tabs when the control is focused (Radix semantics);
   `aria-selected` reflects the active segment.
5. Header subtitle summarizes counts: `N results · N saved looks · N runs`.

## 2. Results segment

1. Completed outputs render in the existing masonry grid with its current
   All / Saved / Downloaded tabs and filters (filter modal redesign is 3.3).
2. When runs are active, the **In progress** rail sits above the grid —
   horizontal snap cards with status chip, tapping opens
   `/app/generations/[id]`. Failed runs show a `Failed` chip.

## 3. Presets segment

1. Saved looks render in the `FavoritesGrid` — tap opens the shared quick
   sheet (not the detail page); unfavorite is optimistic with an Undo toast.
2. The quick sheet's return context is `/app/library?tab=presets` — a
   full-page auth gate or refresh lands back on the right segment.
3. Empty state: ghost-card motif, "Looks you save appear here", `Browse
   looks` → `/explore`, plus a "Start with these" row of up to 3 suggested
   presets that open the quick sheet.

## 4. Runs segment

1. Chronological 72px rows: thumbnail, preset name, status pill
   (Completed lime / Failed or Blocked error / Cancelled muted / In progress
   pulsing), relative time, credit cost, chevron.
2. Completed rows → `/app/results/[id]`; in-progress/failed/cancelled rows →
   `/app/generations/[id]`.
3. Empty: "No transformations yet" + `Browse looks`.

## 5. Deep links + retired routes

1. `/app/favorites` redirects to `/app/library?tab=presets` and lands on the
   Presets segment.
2. `/app/generations` redirects to `/app/library?tab=runs` and lands on Runs.
3. Signed out: `/app/library?tab=presets` → login → returns to the Presets
   segment (`next` param carries the query).
4. `/app` Discover "Your saved looks" rail `See all` → `?tab=presets`.

## 6. Tab bar

1. Slot 5 is now **Account** (person icon) → `/app/account`; Favorites no
   longer has a tab slot (`04 §3`, approved Q1).
2. Library highlights for `/app/library` on every segment.
3. Known gap, deferred: the center Create button still navigates to
   `/explore` — the T2 create sheet (Q2) is separate work.
