# 5Pixels — Implementation Spec: Tokens, Motion, Roles

The missing middle layer between the design bible (Batches 01–04 + designer prompt pack P01–P67) and `apps/web` code. Everything here maps to concrete Tailwind v4 `@theme` tokens and named motion constants. Bible hexes are already in `globals.css`; this file locks the gaps the bible leaves open.

## Color tokens (already in globals.css — keep)

```css
--color-ink-950: #080A08;      /* page canvas */
--color-ink-900: #0D100E;      /* stage / deep well */
--color-charcoal-850: #141714; /* major panel / card */
--color-charcoal-800: #191D19; /* grouped module / hover */
--color-charcoal-700: #242924; /* selected row / subtle border */
--color-cream-50: #F7F2E8;     /* primary text */
--color-cream-100: #EEE7DA;    /* near-primary */
--color-text-secondary: #A6AAA4;
--color-text-muted: #777D77;   /* metadata only — never body copy */
--color-lime-500: #82EA3A;     /* brand signal */
--color-lime-400: #96F04C;     /* hover/highlight */
--color-warning: #F5C84C;
--color-error: #FF5B55;
--color-success: #55D982;
```

### New: surface elevation recipe (better-ui, dark mode)

Replace decorative borders on elevated surfaces with a white ring. Keep real borders only for structural dividers.

```css
--shadow-border: 0 0 0 1px oklch(1 0 0 / 0.06);
--shadow-border-hover: 0 0 0 1px oklch(1 0 0 / 0.12);
--shadow-elevated:
  0 0 0 1px oklch(1 0 0 / 0.08),
  0 8px 24px -8px oklch(0 0 0 / 0.5);
```

### Media outline (all images/tiles)

```css
img, video, .media-tile {
  outline: 1px solid oklch(1 0 0 / 0.1);
  outline-offset: -1px;
}
```

## Spacing rhythm (5-based)

```
5, 10, 15, 20, 30, 40, 60, 80, 120
```

Tailwind already supplies close matches: `1.25/2.5/3.75/5/7.5/10/15/20/30` (`p-*` in rem×0.25). Use them; do not invent px one-offs.

## Radius scale

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 10px | chips, small controls, badges |
| `--radius-md` | 12px | buttons, inputs |
| `--radius-lg` | 15px | cards, tiles, panels |
| `--radius-xl` | 20px | modals, media hero, console |

**Concentric rule:** `outerRadius = innerRadius + padding` for nested surfaces with ≤24px padding between layers. Beyond that, surfaces are independent.

## Button roles (bible proposes; this locks it)

| Role | Fill | Text | Use |
|---|---|---|---|
| Brand primary | `lime-500` | `ink-950` | Generate, Try this look, Upgrade, Choose plan |
| Utility primary | `cream-50` | `ink-950` | Save, Confirm neutral edits, Top up, Continue |
| Secondary | `charcoal-700` + `--shadow-border` | `cream-50` | default secondary |
| Tertiary | transparent | `text-secondary` | text + optional arrow |
| Destructive | `error` tint surface | `rose-300` | delete/cancel sub |

All pressables: `transition-transform duration-150 ease-out active:scale-[0.96]` — always `0.96`, never below `0.95`. Add a `static` opt-out prop.

## Badge vocabulary — pruned canonical set

Keep exactly these five; delete the rest from mocks:

| Badge | Style | Use |
|---|---|---|
| NEW | lime micro-chip | recently published |
| TRENDING | warm amber (`--color-warning` at 15% fill) | high engagement |
| PRO | neutral/gold outline | plan-gated |
| STAFF PICK | cream outline | editorial |
| Refunded/Released | `success` tint | system credit outcome |

Micro-badge anatomy: ~`radius-sm`, 10–11px uppercase or compact caps, ≤40px wide. Never decorative.

## Motion system (emil + better-ui merged)

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* UI interactions */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen morph */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* sheets/drawers */
```

| Interaction | Duration | Curve |
|---|---|---|
| press feedback (`:active`) | 100–160ms | `--ease-out` |
| hover color/opacity | ≤150ms | `ease` |
| popover/tooltip | 125–200ms | `--ease-out` |
| dropdown/select | 150–250ms | `--ease-out` |
| modal/sheet | 200–300ms | `--ease-drawer` |
| staged page enter | stagger 80–100ms per group | `--ease-out` |
| exit | shorter than enter (~150ms) | `ease-out` |

Rules:

1. `transition-property` names exact properties — never `transition: all`.
2. CSS transitions for interactive state; keyframes only for one-shot sequences.
3. Enter from `scale(0.95)+opacity:0`, never `scale(0)`.
4. Popovers/dropdowns: `transform-origin` at the trigger (`var(--transform-origin)`); modals stay centered.
5. Icon cross-fades: `scale 0.25→1`, `opacity 0→1`, `blur(4px)→0`, spring `duration: 0.3, bounce: 0`.
6. High-frequency surfaces (hover previews, row hover, keystrokes): instant or ≤150ms opacity/color only. No replayed entrances.
7. `will-change` only for `transform`/`opacity`/`filter`, only on observed first-frame stutter.
8. `prefers-reduced-motion`: keep opacity/color, remove movement. Hover previews → static before/after.
9. No keyboard-initiated action animates (Raycast rule).
10. Every animated state change also has a static cue (color/icon/label).

## Five-pixel motif — functional placements only

- nav active indicator (5 tiny squares or one five-unit glyph)
- selected popover row leading marker
- credit meter: 5 clusters = 20% bands, exact balance always text
- generation progress stages
- empty-state/ghost-card flourish
- `Try this look` hover spark

Never pixel-art borders, never retro-game styling, never as the sole info channel.

## Route surface defaults

- Consumer app: top nav + contextual overlays, **no permanent left sidebar** (Higgsfield rule — keep media wide).
- Account/Billing: stable left settings rail (different job, dense is fine).
- Create (`/app/create/[slug]`): left rail ~340–380px + large stage; mobile → stacked + sticky Generate + bottom sheets.
- Search: command palette, ~880–1100px, sticky header, scopes `All/Presets/Categories/Library`, zero-query = recents + trending cards + categories.
- Toasts: non-critical only; critical errors persist inline/on-page.

## Copy register

Canonical: Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download, Credits.
Banned in consumer UI: prompt, seed, CFG, LoRA, scheduler, model, provider, inference, checkpoint.
