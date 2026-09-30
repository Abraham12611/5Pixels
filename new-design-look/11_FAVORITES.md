# 5Pixels — Comprehensive AI Visual Prompts: Favorites

Favorites stores saved presets/looks for future creation; it must not be confused with the Library of generated results.


# MASTER VISUAL CONTEXT — include before every page prompt

You are generating production-grade UI/UX visuals for **5Pixels**, a premium preset-first AI image transformation web application.

5Pixels is not a blank prompt console. The core consumer journey is:
**Discover a look → inspect the preset → upload one source image → make a few controlled choices → generate → inspect result → save/download/regenerate/adjust.**

The preset is the product. Hidden generation instructions, AI-provider routing, technical inference controls, and private recipe logic are not shown to ordinary consumers in canonical V1.

## Visual system

Use the following visual language consistently:
- near-black / ink canvas around `#080A08`–`#0D100E`;
- deep-charcoal raised surfaces such as `#141714`, `#191D19`, restrained `#242924`;
- warm off-white primary text around `#F7F2E8`;
- muted warm-grey secondary text around `#A6AAA4`;
- vivid lime around `#82EA3A` as a signal, not a blanket color;
- imagery supplies most of the page color;
- neutral grotesk UI/body typography, stronger editorial display face only for major headings;
- 5-based spacing rhythm: 5, 10, 15, 20, 30, 40, 60, 80, 120;
- compact controls about 10px radius, normal cards about 15px, major media/dialogs about 20px;
- subtle five-square/five-pixel motif for selected states, credit meters, progress, loading, and empty-state flourishes.

The interface should feel premium, editorial, visual, calm, fast, trustworthy, and modern. Never make it look like a cyberpunk AI laboratory, crypto dashboard, generic enterprise SaaS admin panel, or glossy glassmorphism concept.

## Higgsfield inspiration

Take heavy inspiration from Higgsfield AI's interaction grammar:
- elegant dark application navigation;
- bespoke dropdown and mega-menu composition;
- tiny NEW / TRENDING / PRO badges;
- media-first galleries;
- anchored setting popovers;
- control rail + large visual stage;
- rich global Search palette;
- compact credit-aware account menu;
- progressive pricing comparison;
- calm, spacious billing/settings pages.

Do not copy Higgsfield one-for-one. 5Pixels should be recognizably its own calmer, more curated, preset-first system.

## Canonical vocabulary

Prefer: **Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download, Credits.**

Avoid exposing: **prompt, system prompt, seed, CFG, checkpoint, LoRA, inference, scheduler, provider, model routing, technical generation pipeline.**

## Global authenticated desktop navigation

Use a slim sticky top bar:
5Pixels logo · Discover · Explore · Library · Favorites · Search · exact compact credit balance · contextual Upgrade/Pricing · account avatar.

## Rendering rules

- Straight-on, orthographic, high-fidelity web UI screenshot.
- No browser chrome.
- No device hardware mockup unless explicitly requested.
- No perspective tilt or 3D floating-card composition.
- Use legible real UI copy.
- Maintain strict continuity with previously approved 5Pixels visuals.
- If a page is too long, generate multiple continuation viewports rather than shrinking the page.
- Desktop default: 1440×1024 unless specified otherwise.
- Mobile default: 390×844.
- Do not invent features beyond the prompt.



---

## FV-01 — Favorites — populated

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/favorites` with Favorites active in authenticated navigation.

Header `Favorites`.
Optional compact sort `Recently saved`.

Render a rich grid of saved preset cards using the exact Explore preset-card system. Every card shows an active/fill Favorite heart. On hover/focus, surface `Try this look`.

Include:
one saved preset with `NEW`;
one with `TRENDING`;
one retired/unavailable saved preset rendered in a muted state with `Retired` and `See alternatives`.

Do not mix generated-result cards into this page.

### Must preserve / emphasize

- Saved looks are clearly preset products.
- Unfavorite works without leaving the page.
- Unavailable preset has graceful recovery.


---

## FV-02 — Favorites — empty

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the empty Favorites page.

Keep header visible. Show a restrained arrangement of 3–4 muted ghost preset cards or a small visual mosaic.

Centered:
`Save looks you want to try later.`
one short helper sentence explaining the heart control;
lime `Explore presets`.

Avoid long onboarding instructions.

### Must preserve / emphasize

- CTA returns to discovery.
- State remains visual and aspirational.


---

## FV-03 — Favorites — remove one preset interaction

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the populated Favorites grid immediately after one preset was unfavorited.

The removed card should be gone or animate out conceptually, while a small toast reads:
`Removed from Favorites`
with optional `Undo`.

Keep the rest of the grid stable. This state is intended to define lightweight reversible feedback.

### Must preserve / emphasize

- Removal is clear but not disruptive.
- Undo is optional and compact.

