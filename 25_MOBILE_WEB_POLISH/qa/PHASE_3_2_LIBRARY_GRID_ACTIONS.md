# Phase 3.2 — Uniform Library grid, card metadata, ⋯ action sheet, rail retry

Manual test guide for `/app/library?tab=results` (spec `11 §4`). Work items:
11.2 uniform grid + metadata + status pills, 11.3 in-progress rail retry,
11.5 per-card ⋯ sheet. Mobile is the primary target; desktop keeps pointer
ergonomics. Requires a signed-in user with several results.

## 1. Uniform grid (11.2)

1. Results render as a uniform **2-column, 4:5 grid** with 10px gutters on
   mobile — no more masonry; every card the same shape.
2. Metadata sits **under the media**, always visible: preset name (14px) and
   a relative timestamp (12px muted: "5m", "2h", "3d", then short date).
3. Saved results keep the lime bookmark marker top-left on the media.
4. Grids at `md`/`xl` stay uniform (3 / 4 columns) — never masonry.
5. With >12 results the grid shows 12 + an explicit **Load more results**
   button; after the first tap, scrolling near the bottom auto-appends.
   Changing a filter resets pagination to 12.

## 2. Per-card ⋯ action sheet (11.5)

1. On mobile, every card's `⋯` (top-right, always visible) opens a **T1
   bottom sheet** titled with the preset name, rows in spec order:
   `Download · Share · Save/Unsave · Make again · Delete`.
2. `Download` marks the result downloaded and opens the file.
   `Share` copies a public link (toast). `Make again` → `/app/create/[slug]`.
3. `Delete` swaps the sheet to an inline confirm naming permanence —
   "This permanently removes the result and its files" — with
   `Delete permanently` / `Keep it`.
4. Sheet closes on scrim, Escape, Back, and swipe-down.
5. On desktop (`≥640px` fine pointer), `⋯` opens the compact menu instead,
   with `Open` first and the same action set; delete confirms via the dialog.

## 3. In-progress rail (11.3)

1. While runs are active the rail appears above the Results grid: 4:5 thumb,
   preset name, **pulsing** "In progress" pill, and elapsed time
   ("2m" / "1h").
2. **Failed/blocked/cancelled runs appear in the rail too**, with a lime
   `Retry` chip bottom-left → `/app/create/[slug]`, and a dismiss `✕`
   top-right. Dismissed cards leave for the session; when all cards are
   dismissed the rail hides entirely.
3. Failed cards link to `/app/create/[slug]`; active cards link to
   `/app/generations/[id]` (the progress page).

## 4. Regressions

- Presets + Runs segments unchanged (Phase 3.1).
- `loading.tsx` still matches: header skeleton + segmented pill + grid.
- Save/bookmark toggles stay optimistic and update the Saved filter count.
