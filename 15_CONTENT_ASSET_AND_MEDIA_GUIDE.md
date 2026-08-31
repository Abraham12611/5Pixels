# 5Pixels — Content, Asset, and Media Guide

# 1. Why media quality matters

The landing page and preset catalog are visual products.

Weak thumbnails make the product feel weak even if generation quality is strong.

---

# 2. Required preset marketing assets

Per preset:
- poster JPG/WebP/AVIF;
- short preview MP4;
- optional GIF fallback;
- 3–8 output examples;
- source examples;
- detail hero;
- social crop optional.

---

# 3. Curated Presets preview media

Important:
**No before/after slider in the Curated Presets landing section.**

Use:
- short MP4 preferred;
- GIF fallback.

---

# 4. MP4 preview sequence

Recommended 3–5 seconds.

Example:
- 0.0–0.8 sec: original;
- 0.8–1.3 sec: transition;
- 1.3–3.7 sec: result;
- 3.7–4.2 sec: branded subtle reset.

Do not use flashing transitions.

---

# 5. Transition styles

Possible:
- cross-dissolve;
- pixel wipe;
- split reveal;
- soft morph;
- film cut;
- vertical wipe.

Keep transitions secondary to result.

---

# 6. Codec strategy

Preferred web stack:
- MP4/H.264 for broad support;
- optional WebM/AV1 when beneficial.

Generate poster frame.

Avoid huge GIF by default.

---

# 7. GIF fallback

Only:
- very short;
- optimized;
- acceptable dimensions;
- no need for high photographic quality.

GIF can be 5–10x larger than video for similar content.

---

# 8. Playback policy

Desktop:
- poster idle;
- play on hover/focus.

Mobile:
- lazy;
- IntersectionObserver;
- max simultaneous playback;
- pause out of view.

Reduced motion:
- static.

---

# 9. Card framing

Avoid embedding giant UI labels into media.

Use app UI for:
- category;
- title;
- badges.

Media should focus on transformation.

---

# 10. Source/result continuity

For previews, source and result should clearly represent the same subject.

If likeness is expected, obvious changes in identity reduce trust.

---

# 11. Diversity of examples

Across catalog include:
- varied skin tones;
- hair;
- gender presentation;
- age where appropriate;
- lighting;
- clothing;
- face shapes.

Avoid one repeating "AI model face" becoming the whole brand.

---

# 12. Reference assets

Private assets need:
- ownership/license;
- creator/source;
- permitted AI-provider use;
- expiration if licensed;
- internal-only flag.

---

# 13. Public asset naming

Use internal IDs in storage, not descriptive private prompt names.

Metadata can map to preset.

---

# 14. Image optimization

Generate:
- 320;
- 640;
- 960;
- 1440 widths as useful.

Use modern formats and responsive `srcset`.

---

# 15. Video optimization

Create multiple renditions:
- mobile low;
- standard;
- retina/high only if useful.

Keep dimensions close to rendered size.

---

# 16. Hero imagery

Hero should demonstrate product concept, not merely decorative photography.

Best:
original + transformed variations.

---

# 17. Cover/poster examples

Avoid use of third-party magazine marks/brands in production marketing unless licensed.

Prototype mockups may use generic placeholders, but actual brand should create its own magazine/cover identity.

---

# 18. Accessibility

For preview video:
- no audio;
- accessible label;
- poster conveys meaning;
- reduced-motion alternative.

---

# 19. Media QA

Before publish:
- no artifact;
- no brand infringement;
- correct crop;
- acceptable file size;
- no accidental metadata;
- no wrong preset label;
- preview loops cleanly.
