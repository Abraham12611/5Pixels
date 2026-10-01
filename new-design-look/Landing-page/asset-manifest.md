# Landing Page — Section Map & Asset Manifest

Source: `new-design-look/Landing-page/*.png` (11 mockups, 9 unique sections)
Project: `prj_ns7117phc6k2mszyp3k5dpph4x8eg1z2` (5Pixels Landing Assets)
Model: `t2i-gpt-image-2-5-sunburst` — 62 credits ≈ $0.055 per image

## Section order (assembled landing page)

| # | Section | Source mockup | Replaces |
|---|---------|---------------|----------|
| 1 | Hero "Pick the look. Make it yours." + 3 preset cards + 5 category tiles | Creative Direction (1) | LandingHero, HeroCarousel, CategoryTagCloud |
| 2 | Preset gallery "Find your next look." + chips + 6-card grid | Creative Direction (3) | CuratedPresets |
| 3 | Cinematic collection "Give your photo a leading role." | Creative Direction (2) | CollectionSpotlight (cinematic) |
| 4 | Professional "Your next first impression." hero + 4 cards | Visual Identity Design | CollectionSpotlight (portraits) |
| 5 | Covers "Put your photo on the cover." 4 cards | Creative Direction Overview | CollectionSpotlight (covers) |
| 6 | Preset preview "See the look on different people." picker + 3 before/after pairs | Creative Direction (5) + Design Concept Proposal | OnePhotoFiveDirections |
| 7 | Feature "One photo. Extraordinary directions." + rail + How-it-works | Creative Direction (4) | NoPromptRequired, HowItWorks, WhatWouldYouCreate |
| 8 | Categories + FAQ "Find your look. Know what to expect." | Creative Direction Brief (+ Guidelines) | CategoryTagCloud grid, FAQSection |
| 9 | Light section "You choose the look. We handle the rest." | Creative Design Brief | SignUpCTA / light break |

Keep: PromoCountdownBar, MarketingHeader, MarketingFooter.
Retire: TrustSection, PricingTeaser, FinalCTA, BrandBillboard (not in mockups).

## Technique: diptych generation for before/after pairs

Mockup pairs show the SAME person in Original/Result. Separate gens can't hold
identity — generate ONE image "diptych, two side-by-side halves of the same
person, left = original, right = styled result" then split at 50% locally.

## Asset manifest (~51 generations, ≈3,160 credits ≈ $2.80)

### S1 Hero (14)
- preset results: midnight-premiere, studio-standard, paper-persona (3, 3:4)
- originals: woman-natural, man-grey-tee, man-curly (3, 1:1)
- category tiles (shared w/ S8): portraits, cinematic, covers, illustration,
  professional, retro, fantasy, seasonal (8, 1:1)

### S2 Cinematic (4): 3 cinematic portrait tiles (3:4) + 1 original card (1:1)

### S3 Professional (5): hero diptych (3:2→split) + 4 card diptychs
(founder, editorial-profile, modern-professional, creative-headshot)

### S4 Covers (6): 4 covers w/ baked typography (3:4) — cover-story "MODERN",
debut-album, culture-poster, sunday-edition + 2 original thumbs (1:1)

### S5 Gallery (3 new): softbox-portrait, analog-weekend, painted-light (3:4)
(reuses midnight-premiere, paper-persona, cover-story)

### S6 Feature + HIW (6): hero diptych (3:2), rail thumbs golden-hour/urban-film/
crisp-nature/retro-print/monochrome (5, 1:1); step1 reuses 3 presets,
step2 reuses an original, step3 reuses midnight-premiere

### S7 Preset preview (8): 3 diptychs (3:2) + 5 picker thumbs
(cinematic-film, clean-portrait, golden-hour, black-white, moody-cool; 4:3)

### S8 Categories: reuses the 8 tiles from S1

### S9 Light section (5): 3 diptychs (golden-hour, mediterranean, vivid-pets; 3:2)
+ monstera leaf + palm frond decor (2, 1:1, isolated on white)

## Total: ~51 images ≈ 3,162 credits ≈ $2.82
