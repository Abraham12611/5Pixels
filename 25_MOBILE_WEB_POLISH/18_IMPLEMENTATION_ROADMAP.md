# 18 — Implementation Roadmap

Sequenced so that shared primitives land before the surfaces that depend on them, and so that the
highest-impact user-facing change (the create → result loop) ships early.

Sizing is in **Devin-sessions** (one focused working session), not calendar time. Ranges assume the
existing test suite must stay green (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`).

---

## Phase 0 — Foundations (blocking)

| # | Work | From | Size |
| --- | --- | --- | --- |
| 0.1 | `Sheet` (T1/T2/T3) with the full dismissal contract, history integration, safe areas, keyboard awareness | `15.1`, `15.5` | 1 |
| 0.2 | Reference-counted scroll lock + z-index ladder | `15.2`, `15.4` | 0.5 |
| 0.3 | `StateBlock` | `16.1` | 0.5 |
| 0.4 | `DockedActionBar` + `MobilePageBottomSpacer` + fixed-chrome collision rules | `03 §9`, `04 §6` | 0.5 |
| 0.5 | `MobileSection` + `MobileRail` | `05.1` | 0.5 |
| 0.6 | `ImageViewer` | `10.4` | 1 |

Exit criteria: all six components exist, are unit-tested, and are documented in Storybook-equivalent
examples or tests. No surface work starts before 0.1–0.4 land.

---

## Phase 1 — The create → result loop (highest impact)

| # | Work | From | Size |
| --- | --- | --- | --- |
| 1.1 | Create: mobile composition, single docked bar, cost-in-CTA, reason lines | `8.1`, `8.8` | 1 |
| 1.2 | Create: touch-first source chooser, privacy line, upload error classes, non-blocking submit | `8.2`, `8.7`, `8.9`, `8.10` | 1 |
| 1.3 | Controls accordion + T1 choice sheets + output size | `8.6` | 1 |
| 1.4 | Progress: full-width source stage, stage descriptions, elapsed time, thumb-zone actions | `9.1`, `9.2` | 0.5 |
| 1.5 | Progress: visibility-aware polling, failure panel, completion handoff | `9.3`, `9.4`, `9.5` | 0.5 |
| 1.6 | Result: immersive layout, docked actions, demoted regenerate/adjust | `10.1`, `10.3` | 1 |
| 1.7 | Result: static split + hold-to-compare, viewer integration | `10.2` | 0.5 |
| 1.8 | Result: download semantics (iOS hint, re-mint, download all), share sheet | `10.5`, `10.6` | 1 |

Exit criteria: a phone user can go preset → photo → generate → result → download/share without
encountering a desktop-shaped control, a hidden CTA, or an undismissible overlay.

---

## Phase 2 — Discovery consistency

| # | Work | From | Size |
| --- | --- | --- | --- |
| 2.1 | Quick sheet everywhere + history-aware dismissal + scroll restoration | `6.1`, `7.1`, `6.8` | 1 |
| 2.2 | `FilterModal` + sticky search/filter/sort bar + progressive loading on `/explore` | `6.2`, `6.3`, `6.4` | 1 |
| 2.3 | Unified chips + search palette behind all entry points + recents/trending idle state | `6.5`, `6.6`, `5.2` | 1 |
| 2.4 | Landing/discover section grammar, skeletons, carousel a11y | `5.1`, `5.3`, `5.4`, `5.6` | 1 |
| 2.5 | Preset detail mobile composition, "Works best with", docked CTA | `7.3`, `7.4`, `7.6` | 1 |

---

## Phase 3 — Own loop

| # | Work | From | Size |
| --- | --- | --- | --- |
| 3.1 | Segmented Library (Results / Presets / Runs) with URL state and deep links | `11.1` | 1 |
| 3.2 | Uniform grid, card metadata, per-card action sheet, in-progress rail | `11.2`, `11.3`, `11.5` | 1 |
| 3.3 | Library filters into `FilterModal`, selection mode with bulk actions | `11.4`, `11.6` | 1 |
| 3.4 | Runs list with day grouping and credit reconciliation | `11.8` | 0.5 |

---

## Phase 4 — Money and account

| # | Work | From | Size |
| --- | --- | --- | --- |
| 4.1 | Paywall consolidation + trial/cost-per-image clarity + preset context | `13.1`, `13.2` | 1 |
| 4.2 | `/pricing` + credits packs mobile composition | `13.3`, `13.4` | 1 |
| 4.3 | Checkout return pages with balance, origin-aware next action, webhook lag | `13.5` | 0.5 |
| 4.4 | Billing overview, history row cards, plan page + cancellation sheet | `13.6`, `13.7`, `13.8` | 1 |
| 4.5 | Account grouped index + sub-pages + route consolidation | `14.1`, `14.2`, `14.3` | 1 |
| 4.6 | Notifications: preferences copy + inbox sheet; user dropdown → sheet | `14.4`, `14.5`, `14.6` | 1 |
| 4.7 | Staged account deletion | `14.8` | 0.5 |

---

## Phase 5 — Auth polish

| # | Work | From | Size |
| --- | --- | --- | --- |
| 5.1 | Merge auth modals, reason line, restore-and-one-tap resume | `12.1`, `12.2`, `12.3` | 1 |
| 5.2 | Mobile-first auth routes, field/keyboard audit, password checklist | `12.4`, `12.6` | 0.5 |
| 5.3 | Verify-email active surface, in-app-webview fallback, session-expiry recovery | `12.5`, `12.7`, `12.8` | 1 |

---

## Phase 6 — Cross-cutting hardening

| # | Work | From | Size |
| --- | --- | --- | --- |
| 6.1 | Offline detection/banner/CTA disabling + degraded-mode standardisation | `16.3`, `16.4` | 0.5 |
| 6.2 | Missing skeletons and route-level error boundaries | `16.2`, `16.8` | 0.5 |
| 6.3 | Error copy map + image-load failure + signed-URL re-mint | `16.5`, `16.6` | 0.5 |
| 6.4 | A11y audit fixes (targets, semantics, focus, contrast) | `17.1`–`17.5` | 1.5 |
| 6.5 | Performance pass (ratios, responsive sources, code-splitting, autoplay controller) | `17.6`–`17.8` | 1 |
| 6.6 | axe + Lighthouse CI, device matrix manual pass | `17.10` | 1 |

---

## Dependency graph (condensed)

```
0.1 Sheet ──┬─ 1.2 source sheets ── 1.3 controls
            ├─ 1.8 share sheet
            ├─ 2.1 quick sheet ── 2.2 filter modal ── 3.3 library filters
            ├─ 4.1 paywall ── 4.2 pricing
            ├─ 4.6 notifications / user sheet
            └─ 5.1 auth merge
0.3 StateBlock ── 6.2 / 6.3 / every surface's empty+error state
0.4 DockedActionBar ── 1.1 / 1.6 / 2.5 / 4.2 / 4.3
0.5 Section+Rail ── 2.4 ── 2.5
0.6 ImageViewer ── 1.7 ── 2.5 ── 3.2
```

---

## PR strategy

- One PR per numbered work item, or per coherent pair; never one mega-PR.
- Every PR targets `develop`, from a `feature/*` or `update/*` branch, with conventional commits
  (`AGENTS.md`).
- Each PR must include: before/after mobile screenshots at 375 px, the state matrix for any surface it
  touches, and tests for new logic.
- Phase 0 PRs must not change any user-visible surface — they add primitives only, which keeps the
  review surface small and makes later PRs mostly deletions.

---

## Total

Roughly **26–30 sessions** of implementation, of which Phase 0 + Phase 1 (~9) deliver the majority of
the perceived quality change. Phases 2–5 can be parallelised across contributors once Phase 0 lands,
because they touch disjoint route groups.

External dependencies that could extend the timeline are listed in `20`: the tab-bar decision, the
route-consolidation decision, cancellation support, the filter-count endpoint, and copy/legal review of
the privacy and deletion language.
