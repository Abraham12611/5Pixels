# Phase 3.3 — Library filters into FilterModal + selection mode + bulk actions

Manual test guide for `/app/library?tab=results` (spec `11 §4.3`, `§4.4`).
Work items 11.4 (filters into FilterModal + Sort sheet) and 11.6 (selection
mode with bulk download/delete). Signed-in user with ~15+ results across a
few presets shows everything.

## 1. Filter row (11 §3)

1. Under the sticky segmented control sits a compact row:
   `Filters` (with a lime count badge when facets are active) · `Sort` ·
   `Select` — the old query field, dropdowns and inner All/Saved/Downloaded
   tabs are gone.
2. Scroll down past the row → it slides away; scroll up → it returns.

## 2. FilterModal (11.4)

1. `Filters` opens the T3 full-screen sheet: **Search** field, **Source**
   radiogroup (All results / Saved / Downloaded — the retired inner tabs),
   **Date** tiles (Any time / 7 / 30 / 90 days), **Preset** rows with
   per-preset result counts.
2. Everything stages locally — the footer reads `Show N results` and counts
   update live as you tap; `Reset` clears facets but keeps the sort.
3. Only `Show N results` applies; X/scrim/Escape/Back discards staging.
4. Applied facets become removable chips under the row (source, date,
   preset, query).
5. Filtered to nothing → "No results match these filters" + `Clear filters`.

## 3. Sort (T1 sheet)

1. `Sort` opens a T1 action sheet: Newest first / Oldest first / By preset,
   active option marked. Applies immediately; the trigger label follows.

## 4. Selection mode (11.6)

1. `Select` button or a ~500ms long-press on a card (touch, haptic tick)
   enters selection: the row swaps to `n selected` + `Cancel`; media taps
   toggle a lime check overlay instead of navigating.
2. Escape exits; `Cancel` exits; the saved bookmark yields to the checkbox.
3. The docked bulk bar floats **above** the tab bar: `Download` + `Delete`,
   disabled at 0 selected.
4. **Bulk download** runs sequentially with a progress toast
   ("Downloading 2 of 5…") and marks each result downloaded.
5. **Delete** confirms naming the count + permanence — T1 sheet on mobile
   ("Delete permanently" / "Keep them"), dialog on desktop — then removes
   cards with a per-item progress label.

## 5. Regressions

- Presets and Runs segments unchanged; `?tab=` deep links intact.
- Per-card `⋯` sheet and single-delete flow from 3.2 still work.
- `Load more results` pagination resets when filters change.
