# 5Pixels — Comprehensive AI Visual Prompts: Preset Detail

Preset Detail is a product-evaluation page for one transformation. Outcome, suitability, examples, and credit cost should be obvious before Create.


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

## PD-01 — Preset Detail — hero viewport

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/presets/midnight-premiere` using authenticated navigation.

Create an asymmetric hero. Left 60–65%: a large cinematic transformation media panel, preferably a portrait with moody night lighting. Add only a subtle Original→Result cue; do not default to a draggable slider.

Right 35–40% information stack:
small category `Cinematic`;
large title `Midnight Premiere`;
one concise outcome description;
Favorite heart;
optional tiny NEW/TRENDING badge if relevant;
`Best for` with icon and one-line source guidance;
`Fidelity` value `High`;
`Cost` `2 credits`;
strong lime `Try this look`;
secondary text action `View examples`.

Below, include compact disclosure rows:
`What changes`
`What stays`
`Tips for your photo`.

Let the top of the Examples section peek into the bottom of the viewport.

### Must preserve / emphasize

- Outcome and credit cost are obvious above the fold.
- Media is dominant.
- Primary CTA is unmistakable.
- Private recipe logic is absent.

### Avoid

- Model names.
- Prompt text.
- Long technical specifications.
- Dense tables.


---

## PD-02 — Preset Detail — examples continuation

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the next scrolled viewport of the exact same Preset Detail page.

Show heading `Examples` and a 2×3 grid of transformation examples. Use different source people, poses, and environments while maintaining a recognizably consistent `Midnight Premiere` outcome. This visual consistency should build trust in the preset.

Below or beside examples show:
`Best results with`
three concise guidance items such as clear face, decent light, minimal occlusion.

Then display `What changes` and `What stays` content in compact editorial blocks. At the bottom include another compact `Try this look · 2 credits` action or a sticky CTA treatment.

Preserve width, typography, spacing, and navigation exactly from PD-01.

### Must preserve / emphasize

- Examples demonstrate consistency.
- Guidance is practical.
- CTA remains reachable.


---

## PD-03 — Preset Detail — Pro/locked preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same page for a plan-gated preset.

Keep the full media hero, examples preview, compatibility, and explanatory content visible. Add a small `PRO` badge beside the title and an access card:
`Available on Pro`
short benefit line;
lime `Upgrade to use this look`;
secondary `Compare plans`.

Do not blur all imagery or cover every example with lock icons. Let users understand the value before asking them to upgrade.

### Must preserve / emphasize

- Value remains evaluable.
- Access state is clear but not hostile.


---

## PD-04 — Preset Detail — retired/unavailable preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a retired preset state.

Keep a muted hero preview and title. Add `Retired` status.
Copy:
`This look is no longer available.`
`Try one of these instead.`

Directly below, show three strong alternative preset cards with thumbnail, title, category, and `Try this look`.

Favorite and normal create CTA for the retired preset should not appear active.

### Must preserve / emphasize

- Page provides a graceful alternative path.
- Retired state is informative rather than alarming.


---

## PD-05 — Preset Detail — favorite saved state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate PD-01 after the user saved the preset to Favorites.

Heart control is filled/active. Show a tiny non-blocking toast such as `Saved to Favorites` in the global toast style. Keep the page otherwise unchanged, proving that favorite behavior is lightweight and does not interrupt evaluation.

### Must preserve / emphasize

- Toast is secondary.
- Active Favorite state is obvious without excessive lime.

