# 5Pixels — Library and Favorites Visual Prompts


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


## V070 — Library — populated desktop

**Surface:** /app/library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the populated Library page.

Header:
`Library`
Search
Filter
Tabs: All active, Saved, Downloaded.

Secondary compact filters: Date, Preset.

Below: 4-column result grid with mixed portrait/landscape outputs. Cards keep metadata minimal at rest. One hovered card reveals Open, Download, Save, More.

Use no preset-card badges unless they refer to the generation's source preset in metadata. Library is about user results, not discovery.

### Continuity / must preserve
- Use V025 shell and V015 Library cards.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V071 — Library — first-time empty

**Surface:** /app/library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the first-time empty Library.

Keep header, tabs, and filters visible. In content area show 4 static dark ghost media cards. Center:
five-pixel empty-state motif;
`Your transformations will appear here.`
`Create something you want to keep.`
lime `Explore presets`.

No shimmer. This is not loading.

### Continuity / must preserve
- Same layout as V070.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V072 — Library — Saved tab empty

**Surface:** /app/library?tab=saved  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Saved tab selected with contextual empty state:
`Nothing saved yet.`
`Save results you want to come back to.`
secondary `View all results`.

Do not show first-time onboarding or large Explore CTA unless the whole Library is empty.

### Continuity / must preserve
- Same Library shell as V070/V071.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V073 — Library — Downloaded tab empty

**Surface:** /app/library?tab=downloaded  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Downloaded tab selected:
`Nothing downloaded yet.`
`Downloads you prepare will be easy to find here.`
button `View all results`.

Keep the layout calm and consistent with V072.

### Continuity / must preserve
- Same Library shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V074 — Library — filtered no results

**Surface:** /app/library filtered  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Library with Date and Preset filters active but no matching assets.

Show active filter chips at top.
Center:
`No results match these filters.`
primary/utility `Clear filters`
tertiary `View all`.

Do not show ghost-card onboarding if the user has an existing Library.

### Continuity / must preserve
- Same V070 shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V075 — Library — result card action menu open

**Surface:** /app/library  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the populated Library with one card's `More` menu open.

Menu:
Share
Try this look again
Delete

Separate Delete below divider and style destructively. Other cards remain visible. The menu anchors to the card without clipping. The card itself remains selected/hovered.

### Continuity / must preserve
- Base on V070.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V076 — Favorites — populated

**Surface:** /app/favorites  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate Favorites as a visual grid of saved presets.

Header:
`Favorites`
optional sort `Recently saved`.

Grid uses shared preset cards with favorite heart filled. Each card makes `Try this look` easy to reach. Include one NEW preset and one retired/unavailable preset with a muted state and `See alternatives`.

No generated-result cards here.

### Continuity / must preserve
- Use V004 preset cards and V025 shell.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---

## V077 — Favorites — empty

**Surface:** /app/favorites  
**Canvas:** 1440×1024

### Prompt to give the visual-generation agent

Generate the empty Favorites page.

Header remains.
Use 3–4 muted ghost preset-card silhouettes or small visual mosaic.
Message:
`Save looks you want to try later.`
Primary `Explore presets`.

Keep one short helper line explaining the favorite/heart behavior.

### Continuity / must preserve
- Same Favorites layout as V076.

### Do not
- Do not invent extra controls, technical AI settings, or decorative clutter.

---
