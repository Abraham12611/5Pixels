# 5Pixels — Discover, Explore, Categories, and Preset Detail Visual Prompts


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


## V037 — Discover home — returning user

**Surface:** /app  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the authenticated Discover home.

Below the persistent nav:
- compact `Continue creating` horizontal rail with 3 recent transformations;
- large `Trending now` section of media-first preset cards;
- partial next section `Recommended for you` visible at the fold.

Use broad gallery composition, dark canvas, and varied but controlled aspect ratios. Cards use minimal permanent text; some titles appear beneath media. Show one small NEW badge and one TRENDING badge. No dashboard metrics.

### Continuity / must preserve
- Use V025 global shell and V004 preset cards.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V038 — Discover home — first-time user

**Surface:** /app new user  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the first-time Discover state.

Replace `Continue creating` with a compact editorial introduction:
`Pick the look. We'll handle the rest.`
small supporting line and `Explore presets`.

Then show `Trending now` and `New looks` visual sections. Avoid onboarding checklists, empty analytics, and giant explanatory blocks.

### Continuity / must preserve
- Same shell and grid rhythm as V037.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V039 — Explore catalog — default

**Surface:** /app/explore  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the full Explore catalog viewport.

Header row:
`Explore`
short one-line descriptor;
category chips: Trending active, New, Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal;
right side Search shortcut, Filter, Sort.

Below: a dense but elegant media grid inspired by Higgsfield Viral Presets, using a disciplined masonry layout with 4 columns. Cards show real imagery and minimal overlays. One hovered card reveals title, short descriptor, heart, and `Try this look`.

### Continuity / must preserve
- Use V025 shell, V004 cards, V006 filter controls.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V040 — Explore catalog — filters open

**Surface:** /app/explore  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the same Explore page with the Filter panel open as a right-side drawer or anchored panel.

Filters:
Category
Status: New / Trending
Fidelity: High / Balanced / Creative
Credit cost range only if visually useful
`Clear all`
`Show results`

Do not include model/provider filters. Keep the media grid visible behind the panel with reduced width or slight dim.

### Continuity / must preserve
- Same page as V039; preserve scroll position and grid content.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V041 — Explore — Portrait category state

**Surface:** /app/explore?category=portrait  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Portrait-filtered Explore state.

Use a restrained category header:
`Portrait`
`Polished looks that keep you recognizably you.`
small editorial mosaic of 3 portrait examples.
Portrait chip active.

Below: large portrait-oriented preset cards, 3–4 columns. Include professional headshot, editorial, cinematic portrait, studio monochrome, and playful stylized examples. Do not show a database-like filter summary.

### Continuity / must preserve
- Same shell and filters as V039.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V042 — Explore — Cinematic category state

**Surface:** /app/explore?category=cinematic  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the Cinematic-filtered Explore state.

Header:
`Cinematic`
`Lighting, atmosphere, and frame-worthy drama.`
small wide visual mosaic.

Below: widescreen/portrait mixed preset cards with filmic lighting. Include one NEW and one TRENDING. Maintain the same structural grid as V041 but let media mood change.

### Continuity / must preserve
- Same layout as V041, only category content changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V043 — Preset Detail — default authenticated state

**Surface:** /app/presets/midnight-premiere  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a premium Preset Detail page for a sample preset `Midnight Premiere`.

Left ~60%: large outcome media / transformation preview with subtle `Original → Result` hint.
Right ~40%: preset name, category `Cinematic`, short description, `Best for`, fidelity `High`, credit cost `2 credits`, Favorite control, primary lime `Try this look`.

Below the fold, let the top of `Examples` be visible.

Include compact expandable rows for `What changes`, `What stays`, and `Tips`. Do not expose private instructions or model names.

### Continuity / must preserve
- Use V025 shell, V004 badge/card language, V002 buttons.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V044 — Preset Detail — examples continuation

**Surface:** /app/presets/midnight-premiere lower  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the continuation viewport of V043, as if the user scrolled down.

Top edge should retain just enough sticky context if designed, then show:
- `Examples` grid of 6 transformations;
- `Best results with` compatibility guidance;
- `What changes`;
- `What stays`;
- small final sticky or repeated `Try this look · 2 credits`.

Keep widths and right/left alignment consistent with V043. This is a continuation, not a redesigned page.

### Continuity / must preserve
- Exact same Preset Detail visual system as V043.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V045 — Preset Detail — Pro/locked preset

**Surface:** /app/presets/[pro-slug]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a plan-gated preset detail.

The user can still see the large preview, examples, compatibility, and description. Add a subtle `PRO` badge beside the preset title and access note:
`Available on Pro`
Primary action: `Upgrade to use this look`
Secondary: `Compare plans`

Do not blur or hide all examples. The page should explain value before upsell.

### Continuity / must preserve
- Same layout as V043. Only access state changes.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V046 — Preset Detail — retired/unavailable state

**Surface:** /app/presets/[retired]  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate a retired preset page.

Show a muted version of the preset hero, title, small `Retired` status, and copy:
`This look is no longer available.`
`Try one of these instead.`

Below: 3 strong alternative preset cards. Primary recovery is choosing an alternative, not a dead-end error page. Keep Favorite disabled/removed appropriately.

### Continuity / must preserve
- Same shell and preset-card system as V043.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V047 — Quick Try drawer — optional — OPTIONAL/FUTURE

**Surface:** Explore card → Quick Try  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate an optional right-side Quick Try drawer over the Explore grid.

Drawer:
preset thumbnail + `Midnight Premiere`;
one-line compatibility note;
source upload area;
`2 credits`;
button `Continue to create`.

Do not show the full preset controls or any prompt field. The underlying Explore grid remains visible and unchanged. The drawer should feel like a high-speed shortcut for repeat users.

### Continuity / must preserve
- Use V039 Explore underneath and V008 upload component.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---
