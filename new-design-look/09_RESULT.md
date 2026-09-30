# 5Pixels — Comprehensive AI Visual Prompts: Result

Result is the reward moment. The finished image should dominate while comparison, feedback, download, save, regenerate, and continuation actions remain compact.


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

## RS-01 — Result — default desktop success

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/results/[generationId]`.

Use authenticated shell. Present the transformed output as the hero: large, centered-left or centered in a gallery-like black field, preserving its natural aspect ratio with generous negative space.

Create a compact metadata/action region to the right or below:
preset `Midnight Premiere`;
small metadata `Sep 10 · 2 credits`;
small feedback prompt `How did this turn out?`;
buttons `Love it` and `Not quite`.

Add a floating or anchored action bar close to the media with:
Download as the strongest post-success action;
Save;
Compare;
Regenerate;
Adjust;
Try another preset;
More only if required.

Use icon + label selectively. Keep persistent copy minimal. The interface should make the user want to look at the image first, then act.

### Must preserve / emphasize

- Result is visually dominant.
- Download is easy to locate.
- Continuation actions stay available.
- Action bar does not cover key image content.

### Avoid

- Confetti.
- Technical generation metadata.
- Six equally loud giant buttons.


---

## RS-02 — Result — portrait output robustness

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the exact Result system for a tall 4:5 portrait output.

Keep the portrait large and vertically centered with significant breathing room. Adapt metadata/action placement intelligently around the tall image without changing button styles, type scale, or global layout language.

Do not crop the result just to use horizontal space. This frame proves the page works for portrait media.

### Must preserve / emphasize

- Natural aspect ratio preserved.
- Actions remain reachable.


---

## RS-03 — Result — landscape output robustness

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same Result system for a wide 16:9 landscape output.

Let the image become wide and cinematic. Move the metadata/action region below or beside it as required, but keep the same components and hierarchy. Ensure the global nav and floating action bar still feel balanced.

### Must preserve / emphasize

- Layout adapts without redesigning the product.
- Landscape media remains the hero.


---

## RS-04 — Result — Original / Result comparison

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Result in comparison mode.

Turn the main media into a clear Original/Result comparison slider or split view. Labels `Original` and `Result` remain visible. Use a slender handle and subtle divider. Add an `Exit compare` control.

Keep Download/Save accessible but visually quieter during comparison. This is the correct place for close inspection, so the interaction may be more detailed than discovery cards.

### Must preserve / emphasize

- Original and Result are always identifiable.
- Comparison looks usable by keyboard and touch in implementation.
- Exit path is clear.


---

## RS-05 — Result — negative feedback chooser

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the Result page with the `Not quite` feedback popover/sheet open.

Options:
Doesn't look like me
Wrong style
Strange details
Bad text
Composition issue
Other

Use generous selectable rows, subtle icons, and a compact overlay occupying only part of the screen. Preserve the result behind it. Do not turn this into a survey or block other actions.

### Must preserve / emphasize

- Feedback requires only one quick choice.
- Result remains visible.
- Overlay is easy to dismiss.


---

## RS-06 — Result — feedback submitted + recovery

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate after the user selected `Doesn't look like me`.

Show a small non-blocking confirmation:
`Thanks — that helps us improve this preset.`

Offer contextual actions:
`Adjust`
`Regenerate`

Keep Download, Save, and other normal result actions available. The confirmation should feel like a helpful branch, not a modal success ceremony.

### Must preserve / emphasize

- Recovery actions are contextual.
- Feedback does not trap the user.


---

## RS-07 — Result — Share modal

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate Result with a compact Share modal open.

Show a small result thumbnail and preset title. Present only real sharing capabilities:
Download;
Native share if supported;
Copy link only if public share links exist.

If a link exists, include plain privacy text such as `Anyone with the link can view this result` or the accurate policy wording. Do not imply follower feeds or public profiles.

### Must preserve / emphasize

- Sharing visibility is explicit.
- Modal remains compact.
- Unsupported sharing is not invented.


---

## RS-08 — Result — Save success toast

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the default Result page immediately after Save.

Show the Save control active and a small global toast:
`Saved to Library`

The toast should sit away from the result action bar and not obscure the image. It is a lightweight acknowledgement only.

### Must preserve / emphasize

- Toast is non-blocking.
- Saved state is visible even after toast disappears.

