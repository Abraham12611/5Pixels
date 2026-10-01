# QA — Phase 6.4–6.6: Accessibility, Performance, Media & Motion

Spec: `17_ACCESSIBILITY_PERFORMANCE_MOTION.md` · Target: WCAG 2.2 AA on mobile web.

## What shipped

### Accessibility (6.4)

- **Contrast** — `--color-text-muted` `#777d77` → `#828a82` (was ~4.29:1 on `ink-900`, now ~5.08:1, AA for small text). `app/globals.css`.
- **Skip link** — `components/ui/skip-link.tsx` mounted in the root layout; visually hidden until focus, jumps to `#main-content`.
- **Route focus** — route changes move focus to the page `<h1>` (fallback: `#main-content`) so screen readers announce the new screen.
- **Tab state** — mobile bottom nav sets `aria-current="page"` on the active destination (`mobile-bottom-nav.tsx`).
- **Touch targets** — password visibility toggle 36px → 44px (`password-input.tsx`).
- **Semantics verified in code/tests** — bottom nav is a named `<nav>`; sheet/dialog overlays trap and restore focus; icon-only controls carry `aria-label`; decorative icons `aria-hidden`.
- **Real fix found by axe** — `RouteError` had `role="alert"` on `<main>` (not an allowed role); moved to an inner element.

### Performance (6.5)

- **Code-splitting** — heavy overlays lazy-load via `next/dynamic`: `ImageViewer`, filter modals (explore + library), paywall-adjacent viewer surfaces.
- **Media hygiene** — intrinsic aspect boxes already reserve space; below-the-fold imagery lazy-loads; hero/first cards eager.
- **`unoptimized` audit** — retained deliberately on signed/private Supabase URLs: `next.config` only whitelists `/storage/v1/object/public/**`, so signed URLs (`/object/sign/…`) cannot go through `/_next/image` and must stay unoptimized. Follow-up candidate: a Supabase-storage image loader for public catalogue media.
- **Viewport units** — sheets/overlays use `100dvh` + safe-area insets.

### Media & motion (6.5)

- **`AutoplayVideo`** (`components/consumer/autoplay-video.tsx`) — shared controller for all preview video:
  - IntersectionObserver: plays only when ≥50% visible, pauses offscreen.
  - **Single-video cap**: one playing at a time globally.
  - **Save-Data / `effectiveType ≤ 2g`**: no autoplay — poster shown.
  - **`prefers-reduced-motion`**: no autoplay, poster only.
  - Muted, `playsInline`, loop; poster attribute required.
- Adopted at every former unconditional `autoPlay` site: marketing hero, quick sheet, product media, preset detail hero. No `autoPlay` attribute remains in the codebase.

### Test & CI tooling (6.6)

- **axe** — `vitest-axe` + suite `components/__tests__/a11y-axe.test.tsx` covering auth sheet, route error, and bottom nav. (Note: `vitest-axe@0.1.0`'s typings/`extend-expect` entry are broken; the suite calls the matcher function directly — see comment in the file.)
- **Lighthouse** — `apps/web/lighthouserc.json` + `pnpm lighthouse` script. Runs `@lhci/cli autorun` against a local production build on mobile emulation for `/` and `/explore`. Requires `lhci` available (`pnpm dlx @lhci/cli autorun --config=apps/web/lighthouserc.json` from a build) — not yet a blocking CI job; assertions are warn-level (a11y ≥0.9, LCP warn at 4s pending real-device calibration, CLS ≤0.1). Preset detail is DB-seeded, so pass a real URL when running manually: add it to `collect.url`.

## Manual QA matrix (device lab required)

| Surface | iOS Safari + VoiceOver | Android Chrome + TalkBack |
|---|---|---|
| Bottom nav (aria-current announced) | ☐ | ☐ |
| Create sheet (T2) | ☐ | ☐ |
| Create flow → generation progress | ☐ | ☐ |
| Result + compare (non-drag alt) | ☐ | ☐ |
| Paywall | ☐ | ☐ |
| Auth sheet + pages | ☐ | ☐ |
| Notification inbox sheet | ☐ | ☐ |

### Viewport sweep

- Widths: 320, 360, 375, 390, 414, 430, 480, 600, 767 — no horizontal scroll; check card grids and rails.
- Landscape phone 812×375: sheets scroll, docked bars don't consume >½ viewport.
- Text scaling to 200% (iOS: Larger Text; Android: font size max): no clipped/overlapping text in nav, sheets, forms.
- iPhone SE (small) + Pixel 6a-class device; in-app browser (Instagram/TikTok webview) on auth.

### Media & motion checks

- Two visible preview videos → only one plays.
- DevTools network → "Save-Data" on / 2g throttle → posters only, no autoplay.
- OS reduced motion on → no autoplay, no pulsing/skeleton animation beyond opacity fades.
- Tab away → all video pauses.

## Gates run

`pnpm -r lint` · `pnpm -r typecheck` · `pnpm -r test` (465) · `pnpm -r build` — all green at PR time.
