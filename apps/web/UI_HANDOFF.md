# 16 — Responsive, Accessibility, Component Consistency & QA Handoff

Engineering handoff for the final QA pass. Covers the responsive matrix,
accessibility contract, motion language, the global state matrix, component
inventory, and the decisions that remain open.

---

## 1. Responsive matrix

Breakpoints follow component behavior, not device labels. Tailwind defaults:
`sm` 640, `md` 768, `lg` 1024, `xl` 1280.

| Surface | ≥1280 | 1024 | 768 | ≤430 |
|---|---|---|---|---|
| Explore grid | masonry `columns-4` | `columns-3` | `columns-2` | `columns-2` |
| Filtered explore grid | `max-w-4xl` 2-col | 2-col | 2-col | 1–2 col |
| Discover rails | horizontal snap-scroll at all sizes | same | same | same |
| Library/Favorites grid | 3–4 col | 2–3 col | 2 col | 2 col |
| Preset detail | 2-col (media + info) | 2-col | stacked, sticky CTA bar | stacked, sticky CTA above nav |
| Create Studio | stage + side rail, sticky console in rail | 2-col | vertical workflow, sticky console clears bottom nav | same |
| Account/Billing | left rail + content | left rail + content | rail collapses to horizontal chips | chips |
| Pricing plans | card row | wraps | wraps | stacked |
| Pricing comparison | full grid | full grid | horizontal scroll (`min-w-640` + hint) | horizontal scroll |
| Search | centered dialog (`sm:` breakpoint) | centered | centered | full-screen (`h-dvh`) |
| Auth modal | centered dialog | centered | bottom sheet | bottom sheet |
| Credit/share/delete dialogs | centered `max-w-sm/md` | centered | centered | centered (fits ≤448px) |
| Bottom nav | hidden (`md:hidden`) | hidden | fixed bottom, safe-area padded | fixed bottom |
| Toasts | bottom-center | bottom-center | bottom-center | lifted 5.5rem above nav |

Safe areas: root `viewport.viewportFit = "cover"` enables `env(safe-area-inset-*)`.
Bottom nav pads with `max(env(safe-area-inset-bottom), 4px)`; the Create
sticky console offsets by `4.25rem + safe-area + 0.5rem` below `lg`.

---

## 2. Accessibility contract

- **Landmarks:** every page renders its own `<main>`; header/nav/footer
  landmarks exist in both shells; navs carry `aria-label`.
- **Focus:** global `:focus-visible` lime ring (2px, offset 2px). All dialogs
  and the auth bottom-sheet trap Tab/Shift+Tab, focus the first control (or an
  autofocused field), restore focus to the trigger, and lock body scroll —
  shared `useDialogA11y` hook in `components/ui/dialog.tsx`.
- **Escape:** all dialogs, the auth modal, and the search palette close on Esc.
- **Dialogs:** `role="dialog"` + `aria-modal="true"`; `aria-label`/`aria-labelledby`
  present on custom overlays.
- **Tabs:** library tabs use Radix `Tabs`; search scope chips and result-compare
  modes use `role="tablist"`/`tab` with `aria-selected`.
- **Sliders:** Radix `Slider` (generation controls) and the compare handle use
  `role="slider"` with `aria-valuemin/max/now` and keyboard arrows.
- **Combobox:** search palette is cmdk `Command.Dialog` — combobox/listbox/
  option semantics built in.
- **Touch targets:** primary controls ≥ 40px; compact 32px icon buttons
  (favorite, card overflow, search clear/close) carry an `after:-inset-*`
  hit-area expansion to ≥ 44px.
- **Announcements:** generation-status page wraps the status block in
  `aria-live="polite"`; transient poll errors use `role="status"`; form errors
  use `role="alert"`; toasts announce via sonner.
- **Meters:** `CreditMeter` announces the exact balance
  (`"248 credits"`); `FivePixelMark` progress uses `role="img"` + `aria-label`.
- **Reduced motion:** `prefers-reduced-motion` disables entrance animations and
  hover video previews (`HoverPreviewMedia` stays static).
- **Not color alone:** status states always pair color with icon + copy
  (failed/error/warning/success all carry text).

---

## 3. Motion language

Named curves live in `globals.css`: `--ease-out`, `--ease-in-out`,
`--ease-drawer`. Utilities: `animate-overlay-in`, `animate-dialog-in`,
`media-frame`, `scrollbar-none`.

Observed profile (kept deliberately short):
- `transition-colors` (~150ms) — default interactive feedback
- `duration-200`/`duration-300` — overlays, reveals, meters
- `duration-500/700` — hero/marketing flourishes only
- `animate-pulse` — skeletons and active stage indicators only
- Dialogs/sheets: `animate-overlay-in` + `animate-dialog-in`

No constant glows, no particle loops, no autoplaying card video.
Video previews play on hover/focus intent only; IntersectionObserver gates
touch devices; reduced-motion forces static.

---

## 4. Global state matrix

| Surface | Loading | Empty | Error | Other |
|---|---|---|---|---|
| Explore | skeleton grid (`loading.tsx`) | "No presets match" + clear-filters | `error.tsx` boundary | — |
| Discover `/app` | app skeleton (`app/loading.tsx`) | new-user orientation state | boundary | active-generation rail |
| Preset detail | skeleton | not-found w/ 4 alternatives | boundary | Retired → `PresetNotFound` |
| Create | inline validate → upload states | dropzone idle/drag/rejected | inline field + toast | `GENERATION_PAUSED` → banner + disabled Generate |
| Generate console | — | — | insufficient-credits dialog | first-gen/high-cost confirm dialog |
| Generation status | pixel progress + stage list | "not found" | poll error inline `role="status"` | queued/active/slow (long-wait line)/failed (+credit note)/complete→redirect |
| Result | app skeleton | not-found → Library | boundary | save/download/save-undo |
| Library | skeleton | first-time ghost cards / "Nothing saved" / "Nothing downloaded" / filtered-empty + clear | boundary | In-progress rail |
| Favorites | skeleton | FV-02 empty + explore CTA | `error.tsx` | retired card → alternatives, remove+Undo toast |
| Search | per-scope loading | zero-query + per-scope no-results + recovery links | catalog-failure inline banner + Retry | full-screen mobile |
| Billing overview | skeleton via shell | free-plan state | boundary | low-credit / zero-credit states |
| Invoices | — | "No invoices yet" | — | real masked payment methods or empty state |
| Auth pages | submit pending states | — | inline `role="alert"` + cooldowns | expired-link recovery states |
| Modals | — | — | inline error text | saving spinner on confirm |

Loading uses skeletons only where content is actually loading; empty states
never use skeletons. Critical errors stay inline or in dedicated dialogs —
never toast-only.

---

## 5. Component inventory (consumer-facing)

- **Shell:** `AppHeader`, `MobileBottomNav` (safe-area), `GlobalSearch` →
  `SearchPalette` (cmdk), `DegradedBanner`, sonner `Toaster` (mobile offset).
- **Cards:** `ProductCard` (stretched-link, hover preview, badges),
  `LibraryResultCard` (hover actions + always-visible overflow on touch),
  `RetiredPresetCard`, `HoverPreviewMedia`, `ProductMedia`.
- **Studio:** `StudioStage` (keyboard-accessible dropzone), `GenerationControls`,
  `AspectRatioMenu`, `CreditConfirmDialog`, `InsufficientCreditsDialog`.
- **Result:** `ResultCompare` (keyboard slider + tabs), `ResultActions`,
  `ShareDialog`.
- **Library:** `LibraryGrid` (tabs/search/filters), `FavoritesGrid`.
- **Settings:** `SettingsShell`, `SettingCard`, `SettingTile`,
  `EditAccountDialog`, `AvatarUploader`, `SignOutOthers`, retention controls.
- **Auth:** `AuthShell`, `AuthModal` (tabs + preset context + bottom sheet),
  `AuthGateButton`, `PasswordInput`.
- **Edge:** `EdgePage` grammar → root/preset/create/generation/result/share
  not-found, `global-error`, `maintenance`, checkout-cancel.
- **Primitives:** `Button`, `Dialog` (+ `useDialogA11y`), `Input`, `Label`,
  Radix `Tabs`/`Slider`/`DropdownMenu`/`AlertDialog`, `FivePixelMark` family,
  `CreditMeter`.

Icon set: Phosphor throughout (`@phosphor-icons/react`, `/dist/ssr` in server
components). Lucide is no longer imported in consumer surfaces.

---

## 6. Copy & terminology

Canonical vocabulary enforced: Preset/Look, Original, Result, Credits, Save,
Download, Regenerate, Adjust, Try this look, Library, Favorites.

Not exposed to consumers: prompt internals, seed, CFG, scheduler, provider,
model routing, checkpoint, LoRA. Marketing may say "no prompts required" —
that is positioning, not a control.

Copy style: short, specific, actionable
("248 credits left", "Preparing your image", "Your transformations will appear here").

---

## 7. Verification

Baseline for this pass: `pnpm typecheck` · `pnpm lint` · `pnpm test` ·
`pnpm build` — all green; `dialog.test.tsx` covers trap/return/Esc/scroll-lock.

Manual spot-check matrix before release: 1440 / 1024 / 768 / 430 / 390 —
Explore, preset detail, Create (upload → generate → result), Library,
Favorites, Billing, Pricing, auth modal, share dialog, 404.

---

## 8. Open product decisions (unresolved)

- **Support channel:** help card currently links to `/pricing#faq`. A real
  support/contact surface needs a backend decision.
- **Top-ups for free users:** "Buy credits" routes free users to `/pricing`
  (top-up products are subscriber-only in Dodo). If free-plan top-ups become
  available, repoint to a purchase dialog.
- **Report/moderation:** no reporting backend exists — no report UI shipped.
- **Plan-gated presets:** no plan gating in the catalog — no upgrade modal
  shipped. If gating is added, revisit P56.
- **Quick Try (P15):** deferred; would need an anonymous-generation pipeline.
