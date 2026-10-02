# 17 — Accessibility, Responsiveness, Performance, Media & Motion

Cross-cutting requirements. Any work item in `05`–`16` that violates this document is not done.

---

## 1. Target: WCAG 2.2 AA on mobile web

### 1.1 Touch and pointer

- Minimum target 44×44 px (2.5.8 enhanced target size is the goal; 24×24 is the floor we never approach).
- 8 px minimum spacing between adjacent targets.
- No hover-only affordances (`hover-preview-media.tsx` must have a touch equivalent — on touch, autoplay
  in-view rather than on hover).
- No path-based or multipoint gesture is the only way to do anything: pinch-zoom in the viewer must be
  accompanied by zoom controls or a tap-to-zoom; swipe-dismiss always has an `X`.
- Dragging movements (compare slider) must have a non-dragging alternative (`10 §4`).

### 1.2 Semantics

- One `<h1>` per route; headings descend without skipping.
- Landmarks: `header`, `nav`, `main`, `footer` present on every route; the bottom tab bar is a `nav`
  with an accessible name.
- `aria-current="page"` on the active tab (`04 §3`).
- Lists of cards are `ul`/`li`; rails are lists with an `aria-label`.
- Icon-only buttons have `aria-label`; decorative icons/motifs are `aria-hidden`.
- Images: meaningful `alt` for content (results: "Cyber Punk result"), empty `alt` for decorative.
- Form fields have visible labels; placeholders are never the label.

### 1.3 Focus

- Visible focus ring on every interactive element: `ring-2 ring-lime-500/50 ring-offset-2
  ring-offset-ink-950` (the existing convention).
- Focus order follows visual order; overlays trap and restore focus (`15 §7`).
- Route changes move focus to the main heading so keyboard/AT users are not stranded at the top of a
  stale document.
- Skip-to-content link on every page, visible on focus.

### 1.4 Contrast

Verify against the tokens: `--color-text-secondary` (#a6aaa4) and `--color-text-muted` (#777d77) on
`--color-ink-950`/`--color-charcoal-850`. Muted text at 12–13 px is the highest-risk combination in the
app; it must reach 4.5:1 or be reserved for ≥19 px or non-essential decoration. Text over media always
sits on a gradient scrim, never directly on the image.

### 1.5 Screen readers

Test with VoiceOver (iOS Safari) and TalkBack (Android Chrome) on: quick sheet, create flow, progress,
result, paywall, auth. These six carry the whole product.

---

## 2. Responsiveness

- Breakpoints in scope: **320** (floor), 360, 375, 390, 414, 430, 480, 600, 767 (upper bound).
- Nothing may overflow horizontally at 320 px; no fixed pixel widths above 280 px in content.
- Text scaling to 200 % must not clip or hide content (test with iOS Dynamic Type / Android font size
  at max).
- Landscape phones (e.g. 812×375) need their own check for the create, progress and result surfaces —
  full-height sheets must remain scrollable and docked bars must not consume half the viewport.
- Safe areas: `env(safe-area-inset-*)` honoured on every fixed element.
- `100dvh` everywhere; `100vh` nowhere.

---

## 3. Performance budgets (mid-range Android, 4G)

| Metric | Budget |
| --- | --- |
| LCP (landing, `/explore`) | ≤ 2.5 s |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| JS transferred (route) | ≤ 200 KB gzip |
| Images above the fold | ≤ 2, ≤ 250 KB each |

Practices:
- Reserve space for every image/video (intrinsic ratios) — CLS is currently at risk in the feeds.
- Lazy-load below-the-fold media; eager-load only the hero and the first two cards.
- Serve responsive sources sized to the actual rendered width; avoid `unoptimized` on catalogue imagery
  where a CDN transform is available (several components currently pass `unoptimized`).
- Code-split overlays: the paywall, filter modal and viewer should not ship in the landing bundle.
- Defer non-critical client components (`recent-preset-recorder`, analytics) with `next/dynamic`.
- Avoid `backdrop-filter` on large surfaces (`15 §8.6`).
- Cap concurrent autoplaying videos at **one** on screen.

---

## 4. Media policy

| Context | Format | Behaviour |
| --- | --- | --- |
| Landing hero / preset previews | short MP4 (H.264) with a poster; GIF only as a fallback | muted, `playsinline`, `loop`, autoplay only when ≥50 % visible |
| Feed cards | poster image; video on view for the single most-visible card | pause off-screen |
| Examples | still images | open in the viewer |
| Results | still images | full resolution only in the viewer |

Rules (from `AGENTS.md` and `02 §2.3`):
- Preset previews are **videos, not draggable sliders**.
- Videos never carry audio; no audio anywhere in the consumer product.
- Save-Data / `connection.saveData` or `effectiveType` ≤ `2g` → posters only, no autoplay.
- Signed URLs for private assets and outputs, always.

---

## 5. Motion

- Durations: 120 ms (micro: colour, opacity), 200 ms (sheet enter, cross-fade), 150 ms (exit).
- Easing: standard ease-out for entrances, ease-in for exits.
- Motion is never the only signal for a state change (`09 §5`).
- `prefers-reduced-motion: reduce` already nukes animations globally in `globals.css` — extend the
  policy in components: no video autoplay, no pulsing stage icon, no carousel auto-advance, instant
  overlay transitions, static skeletons.
- No parallax, no scroll-jacking, no bouncy spring physics on mobile web.

---

## 6. Testing matrix

| Device class | Example | What to check |
| --- | --- | --- |
| Small iOS | iPhone SE (375×667), Safari | safe areas, keyboard covering CTAs, sheet heights, download behaviour |
| Modern iOS | iPhone 15 (393×852), Safari | notch/home indicator, `dvh`, native share |
| Mid Android | Pixel 6a, Chrome | performance budgets, back-button dismissal, file picker/camera |
| Low-end Android | 360×640, Chrome | 320–360 layout, jank, image weight |
| In-app webview | Instagram/TikTok browser | OAuth fallback (`12 §4.2`), download behaviour |
| Landscape | 812×375 | create/progress/result composition |

Automated: Vitest + RTL for state/overlay logic and a11y attributes; axe (or `vitest-axe`) on key
components; Lighthouse mobile in CI for landing, explore and preset detail.

---

## 7. Work items

| # | Item |
| --- | --- |
| 17.1 | Touch-target audit and fixes across cards, chips, media chrome, result actions |
| 17.2 | Landmark/heading/`aria-current`/list-semantics audit per route |
| 17.3 | Focus-on-route-change + skip link |
| 17.4 | Contrast audit of muted text at small sizes; adjust tokens or usage |
| 17.5 | Non-drag alternatives for compare; touch equivalents for hover previews |
| 17.6 | Intrinsic ratios + responsive sources + lazy-loading pass |
| 17.7 | Code-split overlays and defer non-critical client components |
| 17.8 | In-view autoplay controller with a single-video cap and Save-Data handling |
| 17.9 | Reduced-motion extensions in components |
| 17.10 | axe + Lighthouse CI wiring; VoiceOver/TalkBack manual passes on the six core surfaces |

Acceptance criteria: `19 §15`.
