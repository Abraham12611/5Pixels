# 5Pixels — Landing Page Specification

# 1. Landing-page job

The homepage must answer within seconds:

1. What is 5Pixels?
2. What can I make?
3. How easy is it?
4. Will the result still feel like my photo?
5. How do I start?

The landing page should sell **transformation outcomes**, not AI infrastructure.

---

# 2. Overall visual language

- black/ink background;
- charcoal cards;
- warm off-white typography;
- vivid lime primary accent;
- optional restrained warm-neutral section surface;
- large visual media;
- varied section rhythm;
- minimal long-form copy.

---

# 3. Header

Desktop:
- 5Pixels mark + wordmark;
- Explore;
- Categories;
- How it works;
- Pricing;
- Search;
- Log in;
- Try 5Pixels.

Behavior:
- sticky;
- initially transparent/dark;
- gains subtle background/blur on scroll;
- CTA remains visible.

Mobile:
- logo;
- search;
- menu;
- Try button optional depending width.

---

# 4. Hero

## Goal
Explain the product visually.

## Recommended headline
**STILL YOU. COMPLETELY DIFFERENT.**

Alternative:
**ONE PHOTO. FIVE NEW WORLDS.**

## Supporting copy
"Pick a preset. Upload your photo. 5Pixels handles the rest."

or:
"One photo. Five transformations. Infinite possibilities."

## Visual
Central original portrait with five transformed outputs around it.

Suggested output labels:
- Studio
- Cinematic
- Retro
- Illustration
- Cover

Use subtle connector lines and five-pixel motifs.

## CTA
Primary:
**Explore presets**

Secondary:
**Upload your photo**

## Trust row
Only use real claims once validated.

Possible placeholders during prototype:
- Privacy first
- Fast workflow
- Curated presets

Do not invent "1M+ creators" before true.

---

# 5. Curated Presets / Looks People Love

This is a major homepage section.

## Headline
**LOOKS PEOPLE LOVE**

Eyebrow:
**CURATED PRESETS**

Subcopy:
"Handpicked transformations designed to work beautifully."

## Category chips
- Trending
- Portrait
- Cinematic
- Covers
- Illustration
- Professional

## Critical implementation rule

**Do not use draggable before/after sliders inside this landing-page section.**

Preset cards use short transformation previews:
- preferred: MP4;
- fallback: GIF.

### Preview concept

Each card demonstrates:
1. source/original;
2. transition;
3. final preset result.

### Desktop behavior
- show poster frame while idle;
- hover or keyboard focus starts preview;
- preview loops while hovered/focused;
- mouse leave returns to poster or final frame.

### Mobile behavior
- only one or a small maximum number of previews may play;
- play when card is meaningfully within viewport;
- pause when outside viewport;
- tap opens preset rather than requiring precise video controls.

### Reduced motion
If `prefers-reduced-motion`:
- no autoplay;
- show static original/result pair or final poster;
- optional "Preview" button.

## Card anatomy
- media;
- category badge;
- optional Trending/New badge;
- title;
- one-line descriptor;
- favorite only if authenticated or if local anonymous favorites are supported later.

Example names:
- Midnight Premiere
- Founder Studio
- Summer '96
- Ink Rush
- Cover Story
- Dream Sequence

## CTA
"View all presets →"

---

# 6. One Photo, Five Directions

## Goal
Reinforce product model.

Layout:
- one original image;
- five outcome tiles;
- short label under each.

Copy:
**ONE PHOTO. FIVE DIRECTIONS.**

Short body:
"Choose the direction. 5Pixels handles the instructions."

This section should feel more like a brand billboard than a form.

---

# 7. No Prompt Required

## Headline
**NO PROMPT REQUIRED**

Supporting:
"Pick the look. We'll handle the rest."

Value points:
- Keeps your likeness
- Controlled creative direction
- Private by default

Do not promise perfect likeness unless backed by actual evaluation.

Visual:
- simplified "preset chosen → transformation" diagram.

---

# 8. How It Works

3 steps.

## Step 1 — Choose a preset
"Pick from curated looks."

## Step 2 — Upload your photo
"Use a clear image that matches the preset guidance."

## Step 3 — Get your transformation
"Generate, adjust, and download."

Use media thumbnails rather than generic SaaS illustrations.

---

# 9. Collection spotlight: Portraits

Purpose:
show depth.

Headline examples:
- **FOR YOUR PROFILE**
- **PORTRAITS, RE-DIRECTED**

Show 4–6 portrait presets.

CTA:
"Explore portraits →"

---

# 10. Collection spotlight: Cinematic

Headline:
**MAKE IT A MOVIE**

Show:
- night city;
- soft cinema;
- action poster;
- noir;
- dream sequence.

May use more dynamic preview media.

---

# 11. Cover / Poster spotlight

Headline:
**MAKE THE COVER**

Explain exact-text control if supported:
"Choose the look, then customize the title."

Show:
- magazine;
- album;
- film poster;
- event poster.

This section is ideal for demonstrating controlled text fields.

---

# 12. Brand billboard

A dramatic full-width visual break.

Suggested copy:
**YOUR PHOTO DOESN'T HAVE TO STAY ONE THING.**

or:
**YOUR NEXT PHOTO HAS OPTIONS.**

Visual:
- lime brand field or dark scene with lime pixel field;
- large transformed portrait;
- very little copy.

CTA:
Try 5Pixels.

---

# 13. Quality / trust section

Do not use fabricated social proof.

Early-stage alternatives:
- "Preset-specific quality testing"
- "Private source-image handling"
- "Failed generations are refunded"
- "Designed for likeness-aware transformations"

Later, once true:
- creator count;
- rating;
- generation count;
- press quotes.

---

# 14. Pricing teaser

Homepage may include full pricing or simplified summary.

If full pricing:
- Free
- Creator
- Pro

But exact pricing should remain configuration-driven and not hard-coded into marketing source.

Explain:
- monthly credits;
- additional credits;
- premium preset costs;
- failed generation refund logic.

Avoid "unlimited" unless business economics and abuse controls support it.

---

# 15. FAQ

Recommended questions:
- What is a preset?
- Do I need to write prompts?
- Will it keep my face?
- What photos work best?
- How long does a transformation take?
- What happens to my uploaded image?
- Can I delete my images?
- What happens if a generation fails?
- Do credits expire?
- Can I use results commercially?

Only answer legal/commercial license claims after final policy is set.

---

# 16. Final CTA

Headline:
**YOUR NEXT PHOTO HAS OPTIONS.**

Buttons:
- Try 5Pixels
- Explore presets

Avoid generic:
"Get started today."

---

# 17. Footer

Recommended dramatic contrast.

Option A:
dark footer with lime rule and lime headings.

Option B:
bold lime footer with dark text.

Option C:
warm cream footer with dark text + lime accents.

Footer columns:
- Explore
- Categories
- Company
- Legal

Also:
- social;
- support;
- copyright;
- privacy;
- terms;
- cookie settings if needed.

---

# 18. Landing performance rules

Critical because of preview media.

- Use MP4/WebM where supported.
- Generate lightweight poster images.
- Lazy load offscreen videos.
- Use IntersectionObserver to pause playback.
- Never preload all previews.
- Cap simultaneous playing videos.
- Serve responsive media sizes.
- Use CDN.
- Prefer 3–5 second loops.
- Keep audio absent.
- Use `playsinline`, `muted`, and cautious autoplay behavior.
- Respect Save-Data where possible.

---

# 19. SEO

Public preset pages are strong SEO surfaces.

Homepage metadata should center:
- AI photo presets;
- photo transformation;
- preset-based AI image editing;
- no-prompt AI image transformations.

Do not stuff technical model names unless intentionally targeting comparison pages.

---

# 20. Analytics events

Required homepage events:
- homepage_view;
- hero_primary_cta_click;
- hero_upload_click;
- curated_section_view;
- preset_preview_play;
- preset_preview_complete;
- preset_card_click;
- category_chip_click;
- view_all_presets_click;
- how_it_works_view;
- pricing_view;
- pricing_cta_click;
- final_cta_click.

---

# 21. Landing-page Definition of Done

- clear product explanation above the fold;
- visual original → transformation concept;
- curated presets preview media working;
- no before/after drag sliders in Curated Presets;
- responsive;
- reduced-motion compatible;
- strong Lighthouse/performance targets;
- all CTAs route correctly;
- analytics instrumented;
- no fake metrics/social proof;
- no exposed model/provider details;
- no exposed private instructions.
