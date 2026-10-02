# 5Pixels — Global Shell, Navigation, Menus, and Search Visual Prompts


# MASTER AGENT CONTEXT — paste once before running the visual prompts

You are the UI visual-generation agent for **5Pixels**, a premium preset-first AI image transformation product.

## Product truth

5Pixels is not a free-form prompt playground. Users browse curated **Presets / Looks**, choose one, upload one source image, optionally adjust only the small set of controls that preset exposes, then generate a transformation. Private generation instructions and model/provider routing remain hidden in canonical V1.

The experience must feel like a premium visual catalogue transitioning into a focused transformation studio.

## Visual language

Use this system consistently across every image you generate:

- Canvas: near-black / ink `#080A08` or `#0D100E`.
- Elevated surfaces: charcoal `#141714`, `#191D19`, occasionally `#242924`.
- Primary text: warm off-white `#F7F2E8`.
- Secondary text: muted warm grey around `#A6AAA4`.
- Muted metadata: around `#777D77`.
- Brand/action lime: `#82EA3A`; brighter highlight may use `#96F04C`.
- Warning: warm amber; error: restrained red; success: restrained green.
- Media should supply most of the page color. Do not flood the UI with lime.
- Typography: neutral, highly legible grotesk for UI/body; stronger editorial display face only for large marketing/section headings.
- Use a 5-based spacing rhythm: 5, 10, 15, 20, 30, 40, 60, 80, 120.
- Small controls ~10px radius; normal cards 15px; major media/modals 20px-ish. Avoid making every surface excessively pill-shaped.
- Use a subtle **five-square / five-pixel motif** for selected states, generation motion, credit meters, empty-state details, and small brand flourishes. Do not turn the interface into pixel art.

## Higgsfield inspiration rules

Take heavy inspiration from Higgsfield's:
- dense but elegant dark navigation;
- custom mega menus;
- small `NEW`, `TOP`, `TRENDING`, `PRO`-style badges;
- anchored dropdowns/popovers;
- media-first grids;
- floating/anchored action consoles;
- creation rail + large visual stage;
- powerful global Search palette;
- progressive pricing comparison;
- compact credit-aware account popover;
- calm account/billing settings pages.

But **do not copy Higgsfield one-for-one**. 5Pixels should be visually distinct, calmer, more curated, and preset-first.

## Canonical 5Pixels consumer vocabulary

Use:
Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download, Credits.

Avoid:
prompt, system prompt, CFG, seed, inference, checkpoint, LoRA, scheduler, model routing, provider jargon.

## Rendering rules for every generated visual

1. Generate a **straight-on, orthographic high-fidelity web-app UI screenshot**.
2. No browser chrome unless a prompt explicitly asks for it.
3. No laptop/phone hardware mockup unless explicitly requested.
4. No perspective tilt, isometric angle, floating glass cards in 3D space, or decorative device scene.
5. Keep text legible and structured. Use exact UI copy supplied in the prompt where practical.
6. Do not invent new product features, routes, AI terminology, or social-network features unless a prompt is explicitly marked FUTURE/OPTIONAL.
7. Maintain exact visual continuity with all previously approved 5Pixels frames: same nav height, type scale, colors, radii, shadows, icon style, card treatment, and grid rhythm.
8. When a prompt says a page is a continuation of a previous one, preserve the same header/sidebars and continue the vertical content rather than redesigning the page.
9. Desktop default canvas unless otherwise specified: **1440×1024**.
10. Mobile default canvas unless otherwise specified: **390×844**.
11. If the visual is a component sheet, use a neutral dark documentation canvas and clearly separate variants.
12. Do not add fake generated-image content that distracts from the UI. Use tasteful editorial placeholder photography/artwork consistent with the preset category.
13. Show hover/focus/open states only when the prompt asks. Otherwise show the resting/default state.
14. Preserve accessibility: visible focus, enough contrast, touch-friendly controls, no critical state communicated only by color.

## Continuity command

Before generating every next visual, inspect the most recently approved 5Pixels visual(s) and reuse their exact design language. Treat previously approved frames as canonical references. Do not reinterpret the brand on each prompt.

## Sample-data note

Numbers such as `248 credits`, `2 credits`, sample dates, plan names, and preset names in these prompts are **visual-design placeholders** unless the product owner has separately locked them. Use them for composition but do not treat them as final commercial policy.


## V025 — Authenticated desktop app shell

**Surface:** All /app routes  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the default authenticated 5Pixels desktop shell over a dark media-first app canvas.

Top sticky nav:
left — 5Pixels logo, Discover, Explore, Library, Favorites.
right — Search, compact `248 credits`, contextual `Upgrade`, avatar.

Show Discover active with warm text and a subtle lime/five-pixel indicator. Nav is visually thin and premium. Under the nav, show only a faint placeholder content region; the purpose of this visual is the shell itself.

Include no giant product-suite links. Keep the header consistent with the component sheets.

### Continuity / must preserve
- Must use exact colors, radii, button styles, and credit component from V001–V024.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V026 — Explore mega-menu open

**Surface:** Global nav → Explore  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the authenticated desktop shell with the custom **Explore mega-menu open**.

Menu anchors beneath Explore and spans a generous but controlled width. Two main columns:
**Browse**
Trending, New, Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal.

**Featured looks**
6 compact rows with small media thumbnail/icon tile, preset title, one-line descriptor, and occasional `NEW`, `TRENDING`, or `PRO` micro-badge.

Include a clear `View all presets` action. Selected/hovered row uses a subtle brighter charcoal, not full lime. The rest of the underlying page is dim but visible.

The menu should feel as bespoke as Higgsfield's Image menu while being unmistakably 5Pixels and preset-centric.

### Continuity / must preserve
- Preserve V025 nav dimensions exactly.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V027 — Avatar account popover — normal paid state

**Surface:** Global nav avatar  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the app shell with the account popover open from the top-right avatar.

Popover content:
- avatar, display name `Imisi`, small plan label `Pro`;
- Credits card: `248 credits left`, `Resets Oct 1`, five-pixel segmented meter;
- utility action `Buy credits` and secondary `Manage plan`;
- rows: Account, Billing, Help;
- optional Language row showing English only if space permits;
- divider;
- Sign out.

Use lime only on the strongest economic action. Keep the menu compact and elegant.

### Continuity / must preserve
- Preserve V025 nav. Use the credit component from V012.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V028 — Avatar account popover — low credits

**Surface:** Global nav avatar  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same account popover as V027 but in a low-credit state:
- `18 credits left`;
- warning icon/text in addition to subtle amber accent;
- primary `Buy credits`;
- secondary `View plans`;
- all normal account rows remain available.

Do not make the warning alarming or animate it.

### Continuity / must preserve
- Same geometry as V027. Only state content changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V029 — Avatar account popover — zero credits

**Surface:** Global nav avatar  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same account popover in a zero-credit state:
- `0 credits left`;
- supporting line `Add credits to generate`;
- empty five-pixel meter;
- lime `Buy credits`;
- secondary `View plans`;
- Account, Billing, Help, Sign out still accessible.

The user should not appear locked out of the whole product.

### Continuity / must preserve
- Same geometry as V027 and V028.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V030 — Global Search — zero-query All

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the large desktop Global Search overlay.

Header:
- large Search input placeholder `Search presets, categories, and your library`;
- separate circular Close button.
Below: scope pills `All`, `Presets`, `Categories`, `Library`; All is active.

Body:
**Recent** — 3 compact rows such as Midnight Premiere, Studio Founder, Analog Summer.
**Trending looks** — exactly 3 rich visual preset cards with one `TRENDING` and one `NEW` badge.
**Popular categories** — Portrait, Cinematic, Covers, Retro, Fantasy as compact visual chips.

Backdrop dims the app shell. Search is the dominant layer but does not touch the viewport edges.

### Continuity / must preserve
- Preserve V025 shell underneath. Use V004, V006, V016 styles.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V031 — Global Search — typed mixed results

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Global Search after the user typed `night`.

Input shows `night` and a small inner clear-X. Outer Close-X remains distinct.

Replace discovery body with grouped results:
**Presets**
Midnight Premiere
Neon Night
Night Editorial

**Categories**
Cinematic

**Library**
Midnight Premiere · Sep 8
Night Editorial · Aug 30

Highlight the second preset row as the current keyboard selection using brighter charcoal + five-pixel leading marker. Show one `PRO` badge. Keep title/description hierarchy crisp.

### Continuity / must preserve
- Same modal geometry as V030. Do not change the shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V032 — Global Search — Presets browser scope

**Surface:** Global Search → Presets  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Presets scope.

Top Search and scopes remain. `Presets` pill is active.

Inside, use a two-column browser:
left rail `Categories` with Portrait selected, plus Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal.
right pane heading `Portrait presets`, then 7 compact visual result rows with thumbnail, title, short descriptor, optional NEW/TRENDING/PRO badges.

Active category uses subtle filled charcoal and tiny lime/five-pixel signal. Right list scroll region is visibly longer than viewport.

### Continuity / must preserve
- Same Search shell as V030–V031.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V033 — Global Search — Categories scope

**Surface:** Global Search → Categories  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Categories scope.

Use a clean 2–3 column grid of category tiles:
Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal.

Each tile has a restrained representative image mosaic or media swatch, category name, one-line descriptor, and optional preset count only if visually useful. Keep scope pills and Search sticky at top.

### Continuity / must preserve
- Same Search shell as V030.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V034 — Global Search — Library scope

**Surface:** Global Search → Library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Library scope inside Search.

Show compact rows for recent generated results:
thumbnail, preset name, date, and subtle Saved/Downloaded marker where applicable.
Add small secondary filters `Recent`, `Saved`, `Downloaded` beneath the scope row.

Keep this fast and compact. Do not turn it into the full Library page.

### Continuity / must preserve
- Same Search shell as V030.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V035 — Global Search — no results

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a no-results Search state for query `cyber accountant`.

Show:
`No matching presets for “cyber accountant”.`
one short line: `Try another search or browse a category.`
Actions:
`Explore all presets`
and compact suggested category chips: Portrait, Professional, Cinematic.

Optionally show two Recent rows lower down. Keep the typed query in the input.

### Continuity / must preserve
- Same Search shell and dimensions as V030–V034.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V036 — Global Search — offline/retry state

**Surface:** Global Search overlay  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Search overlay in a recoverable loading/network error state while query `night` remains in the input.

Body:
small neutral error icon;
`Search isn't available right now.`
`Your query is still here. Try again.`
buttons `Retry` and tertiary `Explore presets`.

Do not use a scary full-page error. Preserve the query and all shell controls.

### Continuity / must preserve
- Same Search shell as V030.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---
