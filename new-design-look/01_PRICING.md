# 5Pixels — Comprehensive AI Visual Prompts: Pricing

Generate the public Pricing experience as a sequence of legible desktop viewports. Never compress the full page into one illegible image.


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

## PR-01 — Pricing — Hero + plan cards

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the upper viewport of the public 5Pixels Pricing page. The page should feel commercially sophisticated but calm, in the same dark premium world as the authenticated application.

Use a slim public top navigation consistent with the app's visual system. The hero should use a large but controlled editorial heading: `Choose the plan that fits your creativity.` Beneath it, one concise sentence explaining that plans provide credits used for transformations. Add a compact Monthly / Annual billing toggle with a restrained savings badge.

Immediately below, present four plan cards in one clean horizontal row: Free, Basic, Pro, and Max as a placeholder highest tier. Make Pro the recommended plan. The recommended card should have a slightly more luminous charcoal/olive-tinted surface, a small `RECOMMENDED` or `BEST VALUE` badge, and the strongest lime CTA, but still feel tasteful.

Every card must show plan name, price, billing cadence, monthly credits, short subtitle, 3–5 decisive benefits, and one CTA. Use benefits such as core preset access, premium collections, monthly credits, high-resolution export, priority generation, or support only when they are consumer-facing. Never mention model vendors.

Let the bottom of the viewport imply more pricing content continues below. Do not squeeze the Plan Finder or detailed comparison into this frame.

### Must preserve / emphasize

- Plan cards are easy to scan side-by-side.
- Pro is emphasized without making other plans look disabled.
- Lime is used sparingly for primary commercial action.
- Pricing language is outcome/credit oriented.

### Avoid

- Model-access comparison.
- Overly glossy gradients.
- Massive neon numbers.
- Dense feature tables above the fold.


---

## PR-02 — Pricing — Plan Finder

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the next vertical viewport of the Pricing page, continuing exactly from PR-01 with identical max-width, navigation, background, type system, and card language.

Create a major section titled `Find the best plan for you`. Build an interactive two-column plan recommender inspired by Higgsfield's plan finder but translated entirely into 5Pixels outcomes.

Left side contains three numbered groups.

1. `What do you mostly create?` with selectable cards: Social images, Professional portraits, Covers & posters, Personal creative looks. Show one or two selected using dark active surfaces, lime checkmarks, and simple icons.

2. `How often do you expect to create?` with a friendly horizontal slider or stepped control measured in transformations per month. Display estimated credit use in plain language.

3. `What matters most?` with selectable chips/cards: More volume, Highest quality, More flexibility.

Right side is a large recommendation card: `We recommend Pro`. Show estimated monthly credit usage, visible headroom, three concise reasons, plan price, and lime `Choose Pro`. Add a tiny explanatory note that estimates can vary by preset cost if relevant.

The whole section should feel transparent and interactive, not like a dark pattern.

### Must preserve / emphasize

- Questions use real user goals.
- Recommendation visibly reacts to selections.
- Estimated usage is understandable.
- The recommendation panel balances the questionnaire visually.

### Avoid

- AI model questions.
- Technical compute language.
- Overly complex calculators.


---

## PR-03 — Pricing — Comparison top + sticky header

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the top viewport of the detailed comparison section.

Use heading `Compare plans` and concise subcopy. Beneath it create a comparison container with a sticky-style plan header spanning Free, Basic, Pro, Max. Each column repeats plan name, price, and compact CTA. Pro remains recommended, but do not flood the entire column with lime.

Show the first expanded category: `Credits & Transformations`. Use spacious rows with subtle horizontal separators instead of heavy cell borders. Example rows: Monthly credits, Top-up credits available, Failed-generation credit protection, Transformation history, and any other confirmed consumer-facing differences.

Under the expanded section show large collapsed accordion rows for `Preset Access`, `Output & Quality`, and `Library & History`.

The visual must communicate progressive disclosure: important information is visible immediately, deeper detail is optional.

### Must preserve / emphasize

- Plan columns align exactly with feature values.
- Sticky-header context is visually believable.
- Comparison is spacious and premium.
- Critical credit behavior is not deeply hidden.

### Avoid

- Excel-like heavy gridlines.
- Raw model names.
- Technical inference metrics.


---

## PR-04 — Pricing — Expanded comparison continuation

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the next viewport of the same comparison area, preserving PR-03's exact plan-column geometry and page width.

Show `Preset Access` expanded. Rows can include Core preset catalog, Premium collections, New preset access, Seasonal/limited collections. Add an inline `View more` control revealing a few tertiary rows if needed.

Below show collapsed category cards for `Output & Quality`, `Library & History`, and `Support & Rights`. Each category header should be a generous rounded dark row with a small icon, title, and chevron. The expanded category becomes a larger card containing its comparison rows.

This must read as a natural scrolled continuation, not a redesigned second page.

### Must preserve / emphasize

- Column alignment from PR-03 is preserved.
- Accordion expansion is visually clear.
- Secondary information is progressively disclosed.


---

## PR-05 — Pricing — FAQ + final CTA + footer

**Canvas:** 1440×1100

### AI visual-generation prompt

Generate the lower Pricing viewport.

Transition from the wide comparison layout into a narrower reading column. Use heading `Frequently asked questions`. Create large rounded dark accordion rows with comfortable vertical padding and right chevrons.

Questions:
How do credits work?
What happens if a generation fails?
Can I buy extra credits?
Do unused credits roll over?
Can I change or cancel my plan?
How are my uploaded photos handled?
Can I use my results commercially?

Show one FAQ open with concise body text if useful. After FAQ, create a restrained final conversion closure: small line `Ready to create?` and lime `Choose your plan`.

Finish with a quiet footer: Help, Privacy, Terms, Cookies, Content policy, License, copyright. Do not turn the footer into another marketing hero.

### Must preserve / emphasize

- FAQ reading width is narrower than comparison.
- Final CTA appears before legal footer.
- Footer remains understated.

### Avoid

- A second giant pricing hero.
- Verbose FAQ walls of text.
- Unverified legal claims.

