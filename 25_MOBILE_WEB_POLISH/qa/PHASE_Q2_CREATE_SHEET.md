# QA — Create tab opens the chooser sheet (04 §3 / 20 Q2)

The center tab-bar button was a duplicate link to `/explore`. It now opens a
T2 chooser sheet per the accepted Q2 recommendation.

## Checks

- [ ] Tap the center ⚡ button on any tab-bar route → T2 sheet "Create" opens (handle, X, scrim, swipe-to-dismiss); the page does not navigate.
- [ ] **Browse all looks** row → `/explore`, sheet closes.
- [ ] After viewing a preset detail page, reopen the sheet → **Recent looks** rail shows it (thumb + name); tapping a recent goes straight to `/app/create/{slug}`.
- [ ] With a saved anonymous draft (start a create setup while signed out), the sheet shows **Resume your last setup** → `/app/create/{slug}?draft=1` and the draft restores (photo, options, size).
- [ ] No recents and no draft → only the Browse-all row renders; no empty section headers.
- [ ] The sheet closes on Escape, scrim tap, swipe-down, and on navigation.
- [ ] Tab bar still hides on docked-bar routes (`/app/create/*`, `/app/results/*`, `/presets/*`).
- [ ] Desktop (`md+`): no tab bar, sheet never mounts visible.

## Gates

- `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (458/458, 4 new) · `pnpm build` ✅
