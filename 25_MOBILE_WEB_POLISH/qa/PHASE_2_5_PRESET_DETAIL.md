# Phase 2.5 — Preset detail mobile composition, "Works best with", docked CTA

Manual test guide for `/presets/[slug]` (spec `07 §3–§6`). Work items: 7.3
mobile composition + docked CTA, 7.4 "Works best with", 7.6 poster text
annotation. Mobile is ≤ 767 px (`md:`); desktop is unchanged.

## Setup

- Mobile viewport (≤ 767 px) for the new composition; ≥ 768 px keeps the
  previous layout (verify no regressions).
- Check both anonymous (marketing chrome) and signed-in (app chrome).
- Test URLs: `/presets/studio-standard` (filter), `/presets/cover-star`
  (poster), `/presets/ink-portrait`.

## 1. Mobile composition (7.3)

Expected order: full-bleed 4:5 hero → title + heart → chips → description →
What you get → Examples → Works best with → Adjustments → Related looks rail
→ docked CTA.

1. Hero fills the viewport edge-to-edge, aspect 4:5, with a bottom gradient.
   A circular back button floats top-left → `/explore`.
2. Video hero assets loop muted; under `prefers-reduced-motion` the still
   frame shows instead.
3. Title is 28px display type with the favorite heart beside it — heart is
   optimistic for signed-in, auth-gated for anonymous.
4. Chips row: `Filter/Poster · N credits · fidelity` (category sits under the
   title as a lime link).
5. **What you get** — three bullets: output size names (or "Sized to your
   photo"), "Usually 20–40 seconds", type-specific change line
   ("Your photo restyled — subject stays you" / "Your text, set into the
   design").
6. **Examples** — 3-column square thumbs; tap → shared `ImageViewer` opens
   that image (Escape/scrim/Back closes).
7. **Works best with** — three do/don't tiles: Well-lit ✓, Centered ✓,
   Group shots ✗.
8. **Adjustments** — plain-language control names inside a bordered card
   (only when the preset exposes fields).
9. **Related looks** — horizontal snap rail (same grammar as discover rails);
   cards open the shared quick sheet; `View all` → category explore.

## 2. Docked CTA (7.3)

1. The lime `Use this look` bar is docked at the bottom (safe-area aware),
   info line `N credits · Each run is unique — results will differ`.
2. Anonymous: the button opens the auth modal (preset context preserved);
   signed-in: navigates to `/app/create/<slug>`.
3. The bottom tab bar is **gone** on this route (spec `04 §6`) — signed-in
   users see the docked bar only. Check `/explore` after: the tab bar
   returns.
4. Old floating pill CTA is removed; no double CTAs at any width.
5. `Try this look` in-page CTA still exists on desktop (`md`+).

## 3. Poster annotation (7.6)

1. `/presets/cover-star` (poster) — the hero shows a dashed chip: "Your text
   appears here".
2. Filter presets show no annotation.

## 4. States + regressions

- `loading.tsx` — throttle to Fast 3G, reload: skeleton hero + title + chips
  + bullets + 3 example thumbs (mobile); two-column skeleton (desktop).
- Not found — `/presets/nope` still shows the recovery page with suggested
  looks + `Browse all looks`.
- Desktop layout — back bar, 2-col grid, Examples gallery, related grid all
  unchanged.
- Quick sheet from related rail — opens, Back/scrim/Escape dismiss; heart
  auth-gated when anonymous.
