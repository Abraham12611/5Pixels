# 5Pixels — Master Build Context

## Purpose

This repository is the canonical product, design, engineering, data, AI, operations, and implementation context for **5Pixels**.

5Pixels is a **preset-first AI image transformation product**. Users do not write prompts. They choose a curated preset, upload an image, optionally configure a small number of controlled fields, and 5Pixels performs the transformation using private server-side instructions, model configuration, optional reference assets, and post-processing.

The product should feel like a **premium visual discovery experience**, not an AI playground or prompt editor.

---

# Product thesis

**The preset is the product, not the prompt.**

Core user loop:

1. Discover a visual treatment.
2. Open the preset.
3. Upload a compatible image.
4. Adjust only the controls exposed by that preset.
5. Generate.
6. Review the result.
7. Regenerate, adjust, save, download, or try another preset.

No generic prompt box exists in the initial product.

---

# Canonical UX principles

1. **Outcome-first**
   - Users choose "Midnight Premiere", not "Model X + prompt parameters".
   - Model/provider names are hidden from consumers.

2. **Show, do not explain**
   - Visual examples dominate.
   - Marketing copy is short.
   - Before/after transformation is the core storytelling grammar.

3. **Curated over infinite**
   - 20–30 excellent presets are better than hundreds of weak presets.

4. **Private intelligence**
   - Preset instructions, reference assets, routing logic, and internal scoring remain server-side.

5. **Mobile-respectful**
   - Even if V1 launches as responsive web, the product should feel natural for phone-photo workflows.

6. **Version everything**
   - Presets, prompts/instructions, reference assets, post-processing, model routing, and evaluation criteria must be versioned.

---

# Current visual direction

The current brand direction replaces the earlier cobalt-heavy concept with a more lively system:

- **Ink / Black:** primary page canvas
- **Charcoal:** cards and elevated surfaces
- **Warm Off-White:** primary typography and occasional light surfaces
- **Vivid Lime Green:** primary brand/accent/action color
- Optional small warm neutral / pale yellow accents may be explored sparingly

The lime should be used as a **signal**, not as the color of every element.

---

# Important landing-page rule: Curated Presets

The **Curated Presets** / **Looks People Love** section must NOT use a drag slider for before/after.

Each preset card should instead use:

- a short looping **MP4** as the preferred implementation, or
- an animated GIF only when required for compatibility or delivery constraints.

Recommended behavior:

- Static poster frame by default.
- On hover/focus: play a short before → transformation → after loop.
- On mobile: autoplay only when card is sufficiently in viewport, muted, with strict performance controls.
- Respect `prefers-reduced-motion`.
- Use poster images and lazy loading.
- Do not autoplay every card simultaneously.

See:
- `04_LANDING_PAGE_SPEC.md`
- `05_PRESET_SYSTEM_AND_CONTENT_MODEL.md`
- `15_CONTENT_ASSET_AND_MEDIA_GUIDE.md`

---

# Repository files

| File | Purpose |
|---|---|
| `00_README_MASTER_INDEX.md` | Canonical index and product definition |
| `01_PRODUCT_OVERVIEW_AND_PRINCIPLES.md` | Product vision, audience, value proposition, scope, terminology |
| `02_UI_UX_BIBLE_AND_DESIGN_SYSTEM.md` | Complete interaction, visual, component, motion, accessibility guidance |
| `03_SITEMAP_INFORMATION_ARCHITECTURE.md` | Pages, sub-pages, modals, flows, consoles, and relationships |
| `04_LANDING_PAGE_SPEC.md` | Landing page section-by-section specification |
| `05_PRESET_SYSTEM_AND_CONTENT_MODEL.md` | Preset taxonomy, versioning, fields, compatibility, publishing |
| `06_DATA_SCHEMA_AND_DATABASE_MODEL.md` | Relational data model and entity contracts |
| `07_BACKEND_API_AND_SYSTEM_ARCHITECTURE.md` | Services, API domains, queues, storage, state machines |
| `08_AI_GENERATION_PIPELINE_AND_MODEL_ROUTING.md` | AI orchestration, private instructions, reference inputs, fallbacks |
| `09_AUTH_BILLING_CREDITS_AND_ENTITLEMENTS.md` | Accounts, plans, credit ledger, subscriptions, access rules |
| `10_SAFETY_PRIVACY_SECURITY_AND_RETENTION.md` | Moderation, privacy, storage, threat model, deletion |
| `11_ADMIN_CONSOLE_AND_PRESET_STUDIO.md` | Internal tools for managing presets, tests, users, generations |
| `12_ANALYTICS_EXPERIMENTATION_AND_QUALITY.md` | Events, funnels, KPIs, evaluation, QA, experiments |
| `13_BUILD_PHASES_AND_IMPLEMENTATION_ROADMAP.md` | Phases and sub-phases for design and engineering |
| `14_ENGINEERING_STANDARDS_AND_REPO_STRUCTURE.md` | Code organization, conventions, CI/CD, environment strategy |
| `15_CONTENT_ASSET_AND_MEDIA_GUIDE.md` | Preview media, MP4/GIF rules, thumbnails, reference assets |
| `16_USER_FLOWS_AND_ACCEPTANCE_CRITERIA.md` | Critical journeys and Definition of Done |
| `17_DECISION_LOG_AND_OPEN_QUESTIONS.md` | Locked decisions, deferred questions, future options |

---

# Recommended reading order

For product/design:
1. `01_PRODUCT_OVERVIEW_AND_PRINCIPLES.md`
2. `02_UI_UX_BIBLE_AND_DESIGN_SYSTEM.md`
3. `03_SITEMAP_INFORMATION_ARCHITECTURE.md`
4. `04_LANDING_PAGE_SPEC.md`
5. `05_PRESET_SYSTEM_AND_CONTENT_MODEL.md`

For engineering:
1. `01_PRODUCT_OVERVIEW_AND_PRINCIPLES.md`
2. `05_PRESET_SYSTEM_AND_CONTENT_MODEL.md`
3. `06_DATA_SCHEMA_AND_DATABASE_MODEL.md`
4. `07_BACKEND_API_AND_SYSTEM_ARCHITECTURE.md`
5. `08_AI_GENERATION_PIPELINE_AND_MODEL_ROUTING.md`
6. `09_AUTH_BILLING_CREDITS_AND_ENTITLEMENTS.md`
7. `10_SAFETY_PRIVACY_SECURITY_AND_RETENTION.md`
8. `14_ENGINEERING_STANDARDS_AND_REPO_STRUCTURE.md`

For execution:
1. `13_BUILD_PHASES_AND_IMPLEMENTATION_ROADMAP.md`
2. `16_USER_FLOWS_AND_ACCEPTANCE_CRITERIA.md`
3. `17_DECISION_LOG_AND_OPEN_QUESTIONS.md`

---

# Initial V1 boundaries

Included:
- responsive web application;
- curated preset discovery;
- one source image per generation;
- controlled per-preset user fields;
- preset detail pages;
- image upload;
- asynchronous generation;
- result history;
- favorites;
- before/after presentation;
- MP4/GIF transformation previews on landing/preset discovery;
- credits;
- subscriptions;
- admin Preset Studio;
- analytics;
- moderation;
- provider abstraction.

Explicitly excluded from initial V1:
- free-form user prompts;
- user-created presets;
- public preset marketplace;
- public social network;
- video generation;
- collaborative workspaces;
- developer API;
- LoRA/model-training marketplace;
- advanced Photoshop-like editing;
- unrestricted manual masking;
- batch generation.

---

# One-line north star

**A user should be able to see a look they love, apply it to their own image with minimal thought, and get a result worth saving.**
