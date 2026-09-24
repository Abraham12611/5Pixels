# 07 — Preset Detail (`/presets/[slug]`) & Quick Sheet

Surfaces: `app/(marketing)/presets/[slug]/page.tsx` (+ `loading.tsx`, `error.tsx`, `not-found.tsx`),
`components/marketing/mobile/preset-quick-sheet.tsx`, `example-gallery.tsx`, `related-presets.tsx`,
`retired-preset-card.tsx`, `favorite-button.tsx`, `product-video-player.tsx`.

These two surfaces answer the same question at two depths: **"what will this do to my photo?"**

---

## 1. The decision the user is making

Research across Lensa's style tiles (`01 §1.1`), commerce quick views (`02 §1.1`) and Hims'
before/after cards (`01 §1.5`) shows a preset decision needs four things, in this order:

1. **Evidence** — examples of real output, ideally on inputs resembling the user's.
2. **Identity** — what the look is called and what category/type it belongs to.
3. **Cost** — credits, before commitment.
4. **Exit** — one obvious way forward, one way back.

Everything else (long descriptions, technique explanations) is secondary and must not displace these.

---

## 2. Quick sheet (T2) — target spec

Current sheet shows thumbnail, title, description, category, type, credit badges, examples, links to
create and to detail, and the deferred-auth line. That is close to right. Target:

```
──────── ▂▂ ────────                    drag handle
[ full-width preview media, 4:5, autoplay muted loop ]
Cyber Punk                              20px/600
Filter · Neon · 5 credits               13px muted chips
"Turns any portrait into a neon-lit    2 lines max, then "More"
 cyberpunk scene."
[ examples: 3 × 1:1 thumbs → ImageViewer ]
──────────────────────────────────────
[ Use this look ]                       docked, lime, full width
View full details                       ghost link, centred
No account needed to preview — sign in only when you generate.
```

Behaviour:
- Height: content-driven, capped at 82 dvh; body scrolls, the action area is pinned.
- Drag handle, swipe-to-dismiss, scrim tap, `Escape`, browser Back all close (`15`).
- Favourite heart in the top-right of the media (44 px hit area); optimistic with undo toast.
- Examples open the shared `ImageViewer` with a counter, not a new page.
- Media: muted `playsinline` loop, poster first, paused when the sheet closes; static poster under
  `prefers-reduced-motion`.
- Retired preset: the sheet shows the retired notice and the primary becomes `Find a similar look`.

---

## 3. Preset detail page — target composition

```
[header, transparent over media]
[ full-bleed preview media 4:5 with a bottom gradient ]
[ title 28px display · favourite ]
[ chips: Filter · Category · 5 credits ]
[ one-paragraph description ]
[ "What you get" — 3 bullets: output size(s), typical time, what changes ]
[ Examples — 3-col grid → ImageViewer ]
[ "Works best with" — 3 do/don't thumbnails with one-word captions ]
[ Adjustments — list of available controls with plain-language names (no schema jargon) ]
[ Related looks — rail → quick sheets ]
[ FAQ — 3 items, accordion ]
[ docked: Use this look · 5 credits ]
```

Notes:
- **No provider/model information anywhere** (`AGENTS.md`), including in "What you get".
- "Works best with" is the adaptation of Lensa's suitability grid (`01 §1.2`) at the point of *choice*;
  a compact version repeats at the point of *upload* (`08 §3`).
- Posters additionally show a "Your text appears here" annotation on the preview so the deterministic
  text layer is understood before the create screen.
- The docked bar replaces the bottom nav on this route (`04 §6`).

---

## 4. Copy rules

- Names and descriptions are visual and outcome-oriented ("Neon-lit night portrait"), never technical.
- Credit cost is always written as `N credits` (or `1 credit`), never as an abstract "cost: 5".
- Typical duration is a range, never a promise ("usually 20–40 seconds").
- Never imply determinism: "Each run is unique — results will differ" appears once, near the CTA
  (Lensa's disclaimer, `01 §1.4`).

---

## 5. States

| State | Behaviour |
| --- | --- |
| Loading | skeleton hero + title + 3 example placeholders (`loading.tsx`) |
| Not found | `preset-not-found.tsx` + 3 suggested looks + `Browse all looks` |
| Retired | `retired-preset-card.tsx` notice, examples still visible, CTA → similar looks |
| Paused (degraded) | CTA disabled with "Generation is paused — browsing still works" |
| Offline | cached page, CTA disabled with an explanation |
| Error | `StateBlock` with retry |

---

## 6. Work items

| # | Item | Files |
| --- | --- | --- |
| 7.1 | Quick sheet: drag handle, swipe dismiss, pinned action, Back integration | `preset-quick-sheet.tsx`, `Sheet` |
| 7.2 | Examples open `ImageViewer` from both sheet and page | `example-gallery.tsx`, new `ImageViewer` |
| 7.3 | Detail page mobile composition + docked CTA | `presets/[slug]/page.tsx`, `DockedActionBar` |
| 7.4 | "Works best with" module | new component + page |
| 7.5 | Plain-language adjustments list | `presets/[slug]/page.tsx`, `generation-controls.tsx` metadata |
| 7.6 | Poster text annotation on preview | `presets/[slug]/page.tsx` |
| 7.7 | Uniqueness disclaimer + duration range copy | both surfaces |
| 7.8 | Related looks rail opens quick sheets | `related-presets.tsx` |

Acceptance criteria: `19 §5`.
