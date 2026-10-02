# 5Pixels — Discover, Explore, Categories, and Preset Detail

## Universal context that applies to every prompt

5Pixels is a **preset-first AI image transformation product**. The consumer chooses a curated visual look, uploads one source image, optionally adjusts only the controls exposed by that preset, then generates a result. The consumer does **not** write free-form prompts in V1, does not see private generation instructions, and under the canonical product definition does not need to understand provider/model routing. The preset is the product.

The interface must feel **visual, premium, immediate, lively, curated, trustworthy, modern, and highly legible**. It must not feel like an engineering dashboard, generic SaaS template, blank prompt console, node editor, cyberpunk laboratory, or overloaded gradient system.

Visual language:
- near-black/ink page canvas;
- charcoal elevated surfaces;
- warm off-white primary text;
- muted warm-grey secondary text;
- vivid lime as a **signal**, not a blanket color;
- media supplies most of the page color;
- restrained 5-pixel square motif for active states, loading, credit meters, empty-state flourishes, and small brand moments;
- neutral grotesk UI type plus a stronger editorial display face where a large title is warranted;
- 5-based spacing rhythm;
- mostly 10–20px radii, larger only for major media/modal surfaces.

Interaction language:
- progressive disclosure over dense dashboards;
- visual outcomes before technical explanation;
- clear next action at every step;
- small, anchored popovers for compact choices;
- drawers/sheets on mobile;
- short motion, no constant particle/glow animation;
- visible keyboard focus, reduced-motion support, minimum touch targets, semantic controls;
- no critical information communicated by color alone.

Higgsfield is a **reference for interaction grammar and information hierarchy**, not a visual clone. Borrow the dark gallery, rich menu composition, status micro-badges, anchored selectors, media-first discovery, studio/stage layout, credit-aware account surfaces, progressive pricing comparison, and powerful global search. Mutate them into unmistakably 5Pixels patterns and vocabulary.

Canonical consumer vocabulary: **Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download.** Avoid exposing terms such as prompt, CFG, seed, inference, checkpoint, LoRA, scheduler, or model routing.



# P10 — Authenticated Discover home

**Route / surface:** `/app`  
**Status:** V1  
**Goal:** Create the personalized visual home that gets users back into recent work or into a compelling preset quickly.

### Deliver
- desktop default
- returning user
- new-user/empty recents
- mobile

### Designer prompt

Design `/app` as a premium visual discovery home, not a dashboard.

Recommended page order:
1. compact `Continue` / recent work rail for returning users;
2. `Trending now`;
3. `Recommended for you`;
4. `New looks`;
5. small Favorites preview;
6. category shortcuts.

Use wide, image-dominant rails/grids with varied but controlled aspect ratios. Cards should use poster frames by default and short muted transformation previews on hover/focus under performance controls. Keep copy concise.

For a brand-new user, replace Continue with an editorial orientation block such as `Pick a look. We'll handle the rest.` and route directly into compelling presets. Do not fill the home with analytics, onboarding checklists, or AI terminology.

Use lime as the active/CTA signal, while media supplies the visual color.

### Acceptance checklist
- [ ] recent work is useful but not dominant
- [ ] first-time state designed
- [ ] sections do not all autoplay
- [ ] each preset card leads clearly to detail
- [ ] mobile rails are performant

---

# P11 — Full Explore catalog

**Route / surface:** `/app/explore`  
**Status:** V1  
**Goal:** Design the primary long-form preset browsing experience.

### Deliver
- desktop catalog
- filters open
- sort open
- mobile filter sheet
- loading state

### Designer prompt

Design `/app/explore` as a media-first catalog inspired by Higgsfield's Viral Presets masonry energy but with stronger 5Pixels curation and legibility.

Top: title/compact intro, Search shortcut, category chips, and a minimal Sort/Filter control. Primary categories should align with the canonical taxonomy. Use a broad grid that supports 3–4 columns desktop, 2–3 tablet, and one-column or carefully chosen 2-column mobile.

Cards should support different aspect ratios without becoming chaotic. Hover/focus can reveal title, badge, short descriptor, favorite control, and `Try this look` or `View` action. Do not permanently cover imagery with large text.

Filters should be progressive: category, status such as New/Trending, fidelity target if consumer-facing, and maybe credit range only if useful. Do not expose model filters.

Design scroll restoration when returning from Preset Detail.

### Acceptance checklist
- [ ] catalog remains visual rather than control-heavy
- [ ] filters are comprehensible
- [ ] favorite is reachable
- [ ] scroll restoration noted
- [ ] no provider/model filters

---

# P12 — Category-filtered Explore state

**Route / surface:** `/app/explore?category=[slug]`  
**Status:** V1  
**Goal:** Give categories a distinctive curated feel without creating a duplicate product architecture.

### Deliver
- Portrait example
- Cinematic example
- empty category
- mobile

### Designer prompt

Design the filtered category state of Explore.

Keep the global Explore shell and filters, but add a restrained category header with:
- category name;
- one-line promise;
- representative visual mosaic or small editorial hero only where it improves discovery;
- optional sub-filters such as Trending/New.

The category should feel curated, not like a database filter. Use the media cards from the shared preset system. For categories with fewer presets, increase card scale rather than exposing obvious empty grid space.

Design an empty/unavailable category state with recovery to `Explore all presets`. Do not invent separate navigation layers unless the category truly warrants them.

### Acceptance checklist
- [ ] category state is visibly distinct but still Explore
- [ ] small categories do not look broken
- [ ] back/clear-filter path exists

---

# P13 — Authenticated Preset Detail

**Route / surface:** `/app/presets/[slug]`  
**Status:** V1  
**Goal:** Help the user judge the outcome, compatibility, cost, and confidence before entering Create.

### Deliver
- desktop
- mobile sticky CTA
- Pro/locked preset
- unavailable/retired variant pointer

### Designer prompt

Design the authenticated preset detail page as an editorial product page for a transformation.

Required content:
- large outcome preview / short muted transformation preview;
- preset name;
- category;
- concise outcome description;
- `Best for` compatibility;
- fidelity expectation such as High / Balanced / Creative in consumer language;
- examples;
- user-adjustable controls summary, without exposing the private recipe;
- credit cost;
- Favorite;
- primary `Try this look`.

Optional sections:
- `What changes`
- `What stays`
- tips for choosing a good source.

Use progressive disclosure. The primary media and CTA should be visible without reading a wall of text. On mobile, use a sticky bottom `Try this look · X credits` CTA after the user has enough context.

For a plan-gated preset, show the access condition clearly but still let the user inspect examples before asking them to upgrade.

### Acceptance checklist
- [ ] credit cost is clear
- [ ] compatibility is understandable
- [ ] private instructions are absent
- [ ] examples dominate
- [ ] locked state does not dead-end

---

# P14 — Preset card system — all reusable card states

**Route / surface:** `component library`  
**Status:** V1  
**Goal:** Create the media-first card family shared by Discover, Explore, Search, Favorites, and recommendations.

### Deliver
- default
- hover
- keyboard focus
- favorite on/off
- NEW/TRENDING/PRO badges
- loading
- unavailable

### Designer prompt

Design the reusable 5Pixels preset card family.

Card anatomy:
- poster/preview media;
- optional category label;
- optional state badge NEW / TRENDING / PRO;
- title;
- optional one-line descriptor;
- Favorite control;
- optional credit cost on authenticated surfaces;
- optional contextual action revealed on hover/focus.

Behavior:
- static poster at rest;
- on deliberate hover/focus, play a 3–5 second muted source→transition→result preview when asset exists;
- stop/revert when focus leaves;
- viewport-controlled playback on mobile;
- reduced-motion shows static source/result presentation instead.

Create card sizes for featured, standard grid, compact search, and horizontal rail. Keep status badges small and consistent. Avoid permanent dark overlays that make every card look the same.

### Acceptance checklist
- [ ] preview behavior documented
- [ ] reduced motion state exists
- [ ] favorite does not navigate accidentally
- [ ] badges use a small canonical set

---

# P15 — Optional Quick Try drawer from discovery

**Route / surface:** `Discover/Explore → Quick Try`  
**Status:** Recommended enhancement  
**Goal:** Provide a fast path from a preset card into source upload without replacing the canonical Preset Detail/Create routes.

### Deliver
- desktop side drawer
- mobile bottom sheet
- dismiss/continue states

### Designer prompt

This is a recommended enhancement, not a source-locked route. Design a lightweight `Quick Try` drawer opened from a preset card only after the user deliberately chooses that action.

Show:
- selected preset thumbnail/name;
- short compatibility note;
- source upload/drop area;
- credit cost;
- `Continue to create` or `Use this photo`.

Do **not** replicate the full Create configuration here. Its purpose is to reduce friction for confident repeat users. If validation finds a warning, route into full Create where the user has room to understand it.

Desktop may use a right side panel; mobile uses a full-width bottom sheet. Closing returns the user to the exact grid position.

### Acceptance checklist
- [ ] drawer is optional enhancement
- [ ] full configuration remains on Create page
- [ ] scroll position restored
- [ ] validation routes to full workflow

---
