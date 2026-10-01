# 5Pixels — Comprehensive AI Visual Prompts: Generation / Processing

Generation should feel focused, truthful, and calm. Never fake technical precision or expose backend mechanics.


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

## GN-01 — Generation — queued

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/generations/[generationId]` in a Queued state.

Use the authenticated shell but visually reduce surrounding distractions.

Create a large centered generation surface with substantial negative space. Show:
source thumbnail;
selected preset thumbnail and `Midnight Premiere`;
compact option summary;
five-pixel progress motif;
headline `Getting things ready`;
state label `Queued`;
small ledger note `2 credits reserved`.

The page should make it obvious that one specific transformation is waiting to start. Do not show an output preview yet.

### Must preserve / emphasize

- No fake percentage.
- Source and preset context remain visible.
- Reserved-credit state is transparent.

### Avoid

- Technical queue identifiers.
- Provider names.
- Bright full-screen loaders.


---

## GN-02 — Generation — Applying the look

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same page during active generation.

Headline: `Applying the look`
Small line: `This usually takes a moment.`

Advance the five-pixel progress motif to a later stage. Keep source, preset, selected options, and reserved-credit note in the same positions. Use only subtle local motion cues implied by the motif.

Do not add a countdown, progress percentage, or partial result image unless the product truly knows those values.

### Must preserve / emphasize

- State progression is visible without fake precision.
- Geometry stays stable from GN-01.


---

## GN-03 — Generation — Refining details

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the exact same page in a later stage:
`Refining details`

Advance the five-pixel stage indicator again. Keep all other elements identical. The result is still unavailable; do not hallucinate a halfway-transformed image.

The state should communicate that the job is nearing completion through stage semantics and subtle motif progression only.

### Must preserve / emphasize

- No fake partial result.
- Stage hierarchy is clear.


---

## GN-04 — Generation — Finalizing result

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same page at its final pre-result stage:
`Finalizing your result`

The five-pixel motif reaches its final active state. Add one calm line such as `Almost there.` but no exact remaining seconds.

Preserve source/preset context and credit state until the transition completes.

### Must preserve / emphasize

- Final state feels close to completion without making a timing promise.


---

## GN-05 — Generation — taking longer than usual

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a slow-job state.

Headline:
`Still working on it`
Copy:
`This transformation is taking longer than usual. You can leave this page and come back.`

Small credit note:
`Your credits are still reserved.`

If supported, show secondary actions `Go to Library` and `Keep waiting`. Do not imply failure and do not invent an ETA.

### Must preserve / emphasize

- Long wait is clearly not failure.
- User knows leaving the page is safe.
- Credit state remains transparent.


---

## GN-06 — Generation — technical/system failure

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a system-side failure using the same generation-page shell.

Headline:
`This transformation didn't finish.`
Support:
`Your 2 reserved credits were released.`

Primary lime/utility action `Try again`
Secondary `Adjust`
Tertiary `Explore presets`

Keep source and preset visible. Use restrained error iconography. Never show backend/provider errors, stack traces, request IDs, or internal jargon.

### Must preserve / emphasize

- Credit outcome is explicit.
- Retry path is clear.
- Internal error details stay hidden.


---

## GN-07 — Generation — source-related failure

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a source-specific failure state.

Headline:
`Try a different photo`
Copy:
`We couldn't get a reliable result from this image.`

Primary `Replace image`
Secondary `View tips`
Credit note `No credits charged` or the accurate released-credit wording.

Keep the problematic source thumbnail and selected preset visible so the user understands the failure context.

### Must preserve / emphasize

- Recovery action matches the problem.
- Credit behavior remains clear.


---

## GN-08 — Generation — successful handoff moment

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the very brief completion state immediately before navigation to Result.

Use the same shell, with the progress motif resolved into a success/five-pixel mark and headline:
`Your result is ready.`

Show a small transformed-result thumbnail fading in or appearing only now, plus primary `View result`. If the product auto-navigates, treat this as a visual transition specification rather than a long-lived page.

Do not use confetti or exaggerated celebration.

### Must preserve / emphasize

- Result preview appears only once the result actually exists.
- Transition remains premium and restrained.

