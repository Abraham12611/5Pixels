# 5Pixels — Comprehensive AI Visual Prompts: Create Studio

Create is the heart of 5Pixels. Use a Higgsfield-inspired decision rail plus large visual stage, but keep controls far simpler and outcome-oriented.


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

## CR-01 — Create — first-use upload state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate `/app/create/midnight-premiere`.

Use authenticated navigation, but make the work area feel focused.

Desktop structure:
left configuration rail 340–380px wide;
subtle vertical divider;
large stage occupying all remaining width and most remaining height.

Rail top:
preset thumbnail;
`Midnight Premiere`;
small category;
button `Change preset`.

Then:
Source section empty;
compatibility guidance;
preset controls shown disabled/deemphasized if they require a source;
generation summary `2 credits`;
large Generate area disabled.

Stage:
large central upload panel using the five-pixel motif;
`Drop or upload an image`;
`JPG, PNG, or WebP`;
button `Choose image`.

Below upload panel add tiny three-step guidance: Upload · Adjust · Generate.

No prompt field. No model selector. No batch-size control.

### Must preserve / emphasize

- Stage dominates.
- Selected preset remains visible.
- Upload is the obvious first action.
- Rail feels like a focused tool.

### Avoid

- Prompt console.
- Node editor.
- Technical controls.
- Batch generation.


---

## CR-02 — Create — uploading / validating source

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the exact same studio after an image is chosen.

Stage shows a tasteful blurred/soft preview of the selected portrait with a validation overlay. Rail Source card shows thumbnail, shortened filename, state `Checking image…`, and Replace temporarily disabled.

Use a subtle five-pixel loading motif. Generate stays disabled.

If representing upload progress, reserve percentage/bar only for actual file transfer. During image validation switch to an indeterminate staged state rather than fake precision.

### Must preserve / emphasize

- Geometry remains unchanged from CR-01.
- Loading is calm and trustworthy.


---

## CR-03 — Create — source accepted, simple preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate ready-to-generate `Midnight Premiere`.

Rail:
preset thumbnail + Change;
source thumbnail + Replace;
compatibility row with restrained success icon and `Great fit`;
one preset-specific control `Framing`;
Aspect ratio selector showing `4:5`;
generation summary `2 credits`;
large lime `Generate · 2 credits`.

Stage:
uploaded original portrait inside a 4:5 crop frame with subtle reposition/crop affordances. Do not show a fake final transformed preview before generation.

The whole screen should feel nearly effortless: one photo, one or two decisions, one clear Generate action.

### Must preserve / emphasize

- Credit cost visible before generation.
- Source preview large.
- Control count intentionally small.
- Generate strongest action.


---

## CR-04 — Create — richer deterministic cover preset

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the same studio architecture for `Magazine Cover 02`, proving that presets can expose different controlled fields without changing the system.

Rail:
selected cover preset;
source accepted;
compatibility `Good fit`;
Cover title text field;
Subtitle text field;
Layout variant selector with three named visual options;
Framing;
Aspect `4:5`;
cost `3 credits`;
lime `Generate · 3 credits`.

Stage:
original source inside a cover frame with deterministic safe zones and text guides. Do not preview the final AI style before generation. These text/layout controls are composition inputs, not free-form prompting.

### Must preserve / emphasize

- Preset-specific controls remain within the same architecture.
- Text controls are clearly deterministic.


---

## CR-05 — Create — aspect ratio popover open

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate CR-03 with the Aspect Ratio control clicked.

Open an anchored dark popover listing:
1:1
4:5 selected with checkmark
3:4
16:9
9:16

Show one keyboard-focused row. Use a 15px-ish radius, subtle border, generous row height, warm text, and precise alignment to the trigger. The popover must not obscure the entire rail.

### Must preserve / emphasize

- Selected option clear.
- Popover visibly belongs to its trigger.


---

## CR-06 — Create — soft source warning

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate the studio after uploading a two-person image to a portrait preset designed for one visible face.

In the Source area show an amber icon and persistent message:
`This look works best with one clearly visible face.`
`You can still continue.`

Stage visibly contains the two-person source. Generate remains enabled because this is a warning, not rejection.

Do not rely on a toast or color alone; use icon, title, and explanatory copy.

### Must preserve / emphasize

- Warning vs allowed-to-continue is obvious.


---

## CR-07 — Create — rejected source

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate a rejected upload state.

Source area and stage message:
`We couldn't read that file.`
`Try JPG, PNG, or WebP.`
button `Choose another image`.

Generate disabled.
Selected preset and safe preset options preserved.

Use restrained red on icon/border only. This is an inline recovery state, not a giant system error.

### Must preserve / emphasize

- Recovery action immediate.
- Preset context preserved.


---

## CR-08 — Create — low credits ready state

**Canvas:** 1440×1024

### AI visual-generation prompt

Generate CR-03 for a user with only 1 credit while the selected transformation needs 2 credits.

The configuration is otherwise valid. In the generation summary show:
`2 credits required`
`1 credit available`
and replace active Generate with a clear blocked state plus `Buy credits`.

Do not wipe the source or force the user away immediately. The page should visibly preserve all work so purchase/upgrade can return them here.

### Must preserve / emphasize

- Creative setup remains intact.
- Reason Generate is blocked is explicit.
- Economic recovery is clear.

