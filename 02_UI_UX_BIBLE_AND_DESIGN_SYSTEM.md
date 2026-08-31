# 5Pixels — UI/UX Bible and Design System

# 1. Experience objective

5Pixels should feel:
- visual;
- premium;
- immediate;
- lively;
- curated;
- trustworthy;
- modern;
- highly legible.

It should not feel:
- overly technical;
- dashboard-heavy;
- cyberpunk for its own sake;
- overloaded with gradients;
- like a prompt console;
- like a generic SaaS marketing template.

---

# 2. Visual philosophy

## Dark gallery
The primary product background should be near-black/ink so user-generated imagery remains visually dominant.

## Lime as signal
Vivid lime green is the primary brand/action color.

Use lime for:
- primary CTA;
- active filter;
- focus/selected state;
- branded keywords;
- key icons;
- badges;
- small pixel motifs;
- generation progress highlights.

Do not use lime for:
- every paragraph;
- every border;
- every card background;
- every icon;
- all section titles simultaneously.

## Warm typography
Primary text should usually be warm off-white rather than stark blue-white.

## Media carries the color
Preset imagery provides most of the palette variety.

---

# 3. Suggested design tokens

These are starting points and should be calibrated in Figma.

```css
--color-ink-950: #080A08;
--color-ink-900: #0D100E;
--color-charcoal-850: #141714;
--color-charcoal-800: #191D19;
--color-charcoal-700: #242924;

--color-cream-50: #F7F2E8;
--color-cream-100: #EEE7DA;
--color-text-primary: #F7F2E8;
--color-text-secondary: #A6AAA4;
--color-text-muted: #777D77;

--color-lime-500: #82EA3A;
--color-lime-400: #96F04C;
--color-lime-300: #B2F878;
--color-lime-700: #4F9F20;

--color-warning: #F5C84C;
--color-error: #FF5B55;
--color-success: #55D982;
```

The exact Envato-like green should inspire direction but not be copied as a hard dependency.

---

# 4. Five-pixel motif

The brand mark can use five square units.

Applications:
- logo mark;
- active navigation indicator;
- generation animation;
- section eyebrow marker;
- focus flourish;
- empty-state motif;
- loading placeholder detail;
- micro-pattern in hero visuals.

Do not turn the entire product into pixel-art styling.

The motif should be subtle and modular.

---

# 5. Spacing system

A brand-specific spacing system may use 5-based intervals:

```text
5
10
15
20
30
40
60
80
120
```

Recommended usage:
- micro gaps: 5–10;
- control internals: 10–15;
- component gaps: 15–20;
- card/grid gaps: 20–30;
- section separation: 60–120.

---

# 6. Corner radii

Recommended:
- small control: 10px;
- pills: 999px;
- normal card: 15px;
- major media card: 15–20px;
- modal: 20px;
- billboard: 20–30px.

Avoid overly bubbly 30–40px radii on every component.

---

# 7. Typography

Use two roles:

## Display type
For:
- hero headline;
- section billboard copy;
- final CTA.

Desired:
- bold;
- strong silhouette;
- slightly editorial;
- excellent uppercase rendering.

## UI/body type
For:
- nav;
- controls;
- metadata;
- form labels;
- descriptions.

Desired:
- neutral grotesk;
- very readable;
- visually quiet.

Do not use monospaced type as a core identity just because the product is AI-based.

---

# 8. Hierarchy

### H0 / Hero
56–96px desktop depending width.

### H1 / Section title
40–64px.

### H2 / Feature title
28–40px.

### H3 / Card title
18–24px.

### Body
15–18px.

### Metadata
12–14px.

Use responsive clamp values in implementation.

---

# 9. Navigation

Desktop sticky nav:
- logo;
- Explore;
- Categories;
- How it works;
- Pricing;
- Search;
- Log in;
- primary CTA: Try 5Pixels.

Mobile:
- logo;
- search;
- account/avatar;
- menu trigger;
- optional compact CTA.

Avoid giant product-suite navigation in V1.

---

# 10. Buttons

## Primary
Lime fill, dark text.

Use for:
- Try 5Pixels;
- Explore presets;
- Generate;
- Start transformation.

## Secondary
Dark surface + subtle border + warm text.

Use for:
- Upload a photo;
- Adjust options;
- View details.

## Tertiary
Text + arrow.

Use for:
- View all presets;
- See collection;
- Learn more.

## Destructive
Dedicated error/destructive styling, never lime.

---

# 11. Preset card design

Preset cards are media-first.

Card anatomy:
- poster/preview area;
- optional category badge;
- optional state badge: New / Trending / Pro;
- title;
- optional one-line descriptor;
- favorite control;
- optional credit cost on authenticated surfaces.

Landing-page curated cards:
- use preview MP4/GIF rather than a draggable before/after slider;
- static poster when idle;
- short loop when user hovers/focuses or card enters viewport under controlled mobile autoplay rules.

Product-library cards may use:
- poster;
- short video preview;
- explicit "Preview" interaction.

Never show provider/model names.

---

# 12. Preview animation behavior

Preferred asset: short muted MP4.

Recommended sequence:
1. 600–900ms original/source;
2. 300–600ms transition;
3. 1.5–2.5s transformed result;
4. optional short hold;
5. loop.

Recommended total:
3–5 seconds.

Avoid:
- continuous chaotic animation;
- playing 12 previews at once;
- auto-audio;
- large GIFs where MP4 is available.

Respect:
- `prefers-reduced-motion`;
- viewport visibility;
- data-saving mode where detectable;
- mobile thermal/performance constraints.

---

# 13. Upload UX

States:
1. empty;
2. drag-over;
3. selecting;
4. uploading;
5. validating;
6. accepted;
7. warning;
8. rejected.

Validation feedback should be human-readable:
- "This preset works best with one clearly visible face."
- "Your image is very small. Results may be softer."
- "We couldn't read that file. Try JPG, PNG, or WebP."

Never expose storage or provider errors.

---

# 14. Preset detail UX

Required sections:
- large preview;
- preset name;
- category;
- short outcome description;
- "Best for" compatibility;
- fidelity expectation;
- examples;
- user controls;
- credit cost;
- CTA.

Optional:
- "What changes";
- "What stays";
- tips.

Do not reveal private instructions.

---

# 15. Generation screen

Should feel focused.

Include:
- source image;
- selected preset;
- selected options;
- generation state;
- progress/status language;
- cancellation only if technically meaningful;
- privacy reassurance if appropriate.

Avoid fake exact percentage progress unless progress can be meaningfully measured.

Preferred state copy:
- Preparing your image
- Applying the look
- Refining details
- Finalizing your result

---

# 16. Result screen

Required:
- result;
- original/result comparison;
- download;
- save;
- favorite;
- regenerate;
- change options;
- try another preset;
- feedback.

Comparison on result page MAY use:
- slider;
- side-by-side;
- tap toggle;
- mobile swipe.

The "no sliders" requirement applies to the landing-page Curated Presets section.

---

# 17. Feedback UX

Fast structured feedback:
- Love it;
- Not quite.

If negative:
- Doesn't look like me
- Wrong style
- Strange details
- Bad text
- Composition issue
- Other

Avoid forcing free text.

---

# 18. Motion

Motion hierarchy:
1. user-triggered preset previews;
2. generation progress;
3. subtle section entrance;
4. hover elevation;
5. brand pixel motif.

Do not:
- animate all cards continuously;
- use glowing particles everywhere;
- use excessive parallax.

---

# 19. Accessibility

Required:
- WCAG-conscious contrast;
- keyboard navigation;
- visible focus;
- semantic controls;
- alt text for meaningful imagery;
- reduced-motion support;
- captions/accessible naming for video previews;
- no critical information communicated by color alone;
- minimum touch targets;
- screen-reader friendly form controls.

---

# 20. Responsive behavior

Desktop:
- broad gallery layouts;
- large hero;
- 3–4 card grids.

Tablet:
- 2–3 card layouts;
- condensed navigation.

Mobile:
- single-column emphasis;
- horizontal preset rails where useful;
- full-width media;
- bottom sheets;
- sticky primary CTA;
- shorter hero copy;
- card preview playback constrained by viewport.

---

# 21. Empty states

Library empty:
"Your transformations will appear here."

Favorites empty:
"Save presets you want to try later."

No search results:
"No matching presets yet. Try Portrait, Cinematic, or Covers."

---

# 22. Toasts and system feedback

Use toast for:
- saved;
- copied;
- download prepared;
- favorite added;
- settings updated.

Do not use toast as the sole location for critical errors.

---

# 23. Modals vs pages

Use modal/drawer for:
- delete confirmation;
- quick share;
- credit explanation;
- report result;
- small settings changes.

Use dedicated page for:
- billing;
- privacy;
- account deletion;
- preset detail;
- generation;
- result.

---

# 24. Brand writing style

Short, confident, visual.

Good:
- Pick the look. We'll handle the rest.
- Still you. Completely different.
- Your next photo has options.
- No prompt required.
- Try this look.

Avoid:
- Revolutionary state-of-the-art AI-powered...
- Harness cutting-edge artificial intelligence...
- Complex technical terminology.

---

# 25. UX north star

A user should never have to wonder:
- what to do next;
- what the preset is supposed to produce;
- whether their photo is suitable;
- whether they were charged for a failed result;
- where their finished result went.
