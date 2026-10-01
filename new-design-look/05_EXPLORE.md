# 5Pixels — Comprehensive AI Visual Prompts: Explore

Explore is the full preset catalogue. It should feel dense, visual, curated, and easy to filter without becoming a technical browser.


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

## EX-01 — Explore — default catalogue top viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/explore` with Explore active in the authenticated global navigation.

Header row:
large but restrained `Explore`;
short descriptor `Find a look, then make it yours.`;
horizontal category chips: Trending active, New, Portrait, Cinematic, Covers, Illustration, Professional, Retro, Fantasy, Seasonal;
right-side Search shortcut, Filter, Sort.

Below, create a sophisticated four-column visual preset catalogue inspired by Higgsfield Viral Presets but more controlled and editorial. Use high-quality placeholder imagery representing distinct outcomes. Mix portrait, square, and landscape cards without visual chaos. Keep gutters consistent and card edges aligned where possible.

At rest, cards carry almost no text over imagery. On one hovered card, reveal a soft bottom gradient, title, short descriptor, Favorite, optional credit cost, and `Try this look`. Add a few tiny NEW/TRENDING/PRO badges, never on every card.

### Must preserve / emphasize

- Imagery dominates.
- Category controls stay compact.
- Hover overlays remain restrained.
- Grid feels curated rather than random.

### Avoid

- Model/provider filters.
- Text-heavy metadata.
- Permanent dark overlays.
- Badge overload.


---

## EX-02 — Explore — filter panel open

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate EX-01 with Filter open as a wide anchored side panel or right drawer.

Filter groups:
Category;
Status: New, Trending;
Fidelity: High, Balanced, Creative;
optional credit-cost range if useful.

Each group should use clear chips, checkboxes, or compact selector rows with the same selected-state language as the rest of 5Pixels. Bottom actions: `Clear all` and stronger `Show results`.

Keep the grid visible behind/alongside the panel. Avoid reducing the media area to tiny thumbnails. The filter experience should feel secondary to visual browsing.

### Must preserve / emphasize

- Selected values are obvious.
- The panel is easy to dismiss.
- Underlying browsing context is preserved.

### Avoid

- Model names.
- Prompt-specific controls.
- Dozens of advanced filters.


---

## EX-03 — Explore — Portrait category

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Explore filtered to Portrait.

Use a restrained category introduction:
`Portrait`
`Polished looks that keep you recognizably you.`

Optionally add a small editorial mosaic of three portrait outcomes beside or beneath the heading. Portrait chip is active.

Below render a more portrait-heavy catalogue with professional headshot, magazine editorial, cinematic portrait, monochrome studio, soft beauty, playful stylized portrait, and vintage portrait looks.

Preserve the exact Explore shell, filters, and grid logic from EX-01.

### Must preserve / emphasize

- Category feels curated, not merely filtered.
- Portrait outcomes visibly differ while remaining recognizable.


---

## EX-04 — Explore — Cinematic category

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Explore filtered to Cinematic.

Category intro:
`Cinematic`
`Lighting, atmosphere, and frame-worthy drama.`

Use a small widescreen/portrait mosaic and a catalogue containing moody neon night, dramatic backlight, thriller still, romantic dusk, stage light, noir, vintage film, and high-contrast street cinema.

Preserve the same layout system as EX-03. Only content mood and category state should change.

### Must preserve / emphasize

- Product shell does not drift between categories.
- Cinematic media carries the visual atmosphere.


---

## EX-05 — Explore — no results after filters

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Explore with several active filter chips visible but no matching preset cards.

Keep all normal page structure and controls. In the catalogue region show a calm empty state:
`No presets match these filters.`
`Try removing a filter or browse all looks.`
utility primary `Clear filters`
tertiary `View all presets`.

Do not show a first-time onboarding message and do not remove the active filters, because the user needs to understand why the grid is empty.

### Must preserve / emphasize

- Filter cause remains visible.
- Clear filters is immediate.
- The page still feels complete.


---

## EX-06 — Explore — loading catalogue

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same Explore page while the preset catalogue is genuinely loading.

Header, category chips, Filter, and Sort are already available. Replace media cards with a disciplined skeleton grid matching the real card shapes. Use low-contrast charcoal skeletons and subtle tonal movement implied by design, not bright shimmer. The skeleton must look clearly different from the static ghost cards used in empty states.

### Must preserve / emphasize

- Page controls remain usable if appropriate.
- Skeletons match eventual card geometry.
- Loading is visually distinct from empty.

