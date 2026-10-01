# 5Pixels — Main App UI/UX Designer Prompt Pack

This pack turns the 5Pixels product definition, UI/UX bible, sitemap, and the four-batch Higgsfield reference study into an **ordered set of copy-paste prompts for product designers**.

The prompts are intentionally split into several files so a designer can work through the application in a controlled sequence rather than receiving one enormous ambiguous brief.

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


## Source-locked product rules

These are treated as constraints unless the product owner explicitly changes the canonical product documents:

1. The core V1 is responsive web.
2. The product is preset-first; users choose a known visual outcome rather than authoring prompts.
3. The consumer-facing app hides private recipe instructions and model/provider routing.
4. One source image is used per generation in V1.
5. V1 includes curated discovery, preset detail, image upload, asynchronous generation, result history, favorites, before/after presentation, credits, subscriptions, moderation, and admin tooling.
6. V1 excludes free-form prompting, public creator marketplace, public social network, video generation, user-created presets, collaborative workspaces, advanced Photoshop-like editing, unrestricted masking, and batch generation.
7. Failed system-side generation should not permanently consume the user's credits.
8. Discovery pages stay simple; complexity appears only after the user has chosen a preset.
9. Mobile photo workflows are first-class.
10. Preset/provider intelligence remains private infrastructure.

## Key product-design thesis synthesized from the screenshots

**Gallery is the world; the transformation console is the instrument.**

The app should feel like a premium visual catalogue until the user chooses a look. After choice, the interface becomes a focused transformation studio with a compact control rail and large visual stage. Account, billing, and settings intentionally become calmer and more utility-oriented.

## Recommended global navigation

Authenticated desktop:
- 5Pixels logo
- Discover
- Explore
- Library
- Favorites
- Search
- compact credits indicator
- contextual Pricing / Upgrade action
- account avatar

Do not copy Higgsfield's giant product-suite navigation. 5Pixels has a narrower V1 scope.

## Prompt files and design order

### Phase A — Foundation and global shell
`01_FOUNDATION_GLOBAL_SHELL_AND_SEARCH.md`
- P01 Desktop authenticated shell
- P02 Mobile authenticated shell
- P03 Explore mega-menu
- P04 Credits indicator + avatar account popover
- P05 Global Search — zero query
- P06 Global Search — typed query
- P07 Global Search — Presets browser
- P08 Global Search — Categories + Library + no-results states
- P09 Global overlays / popover primitive kit

### Phase B — Discovery and preset evaluation
`02_DISCOVERY_EXPLORE_AND_PRESET_DETAIL.md`
- P10 Discover home
- P11 Explore catalog
- P12 Category-filtered Explore
- P13 Authenticated preset detail
- P14 Preset card system and all card states
- P15 Optional Quick Try drawer

### Phase C — Core transformation journey
`03_CREATE_GENERATION_AND_RESULTS.md`
- P16 Create — first-use/upload
- P17 Create — source accepted/configuration
- P18 Create — source warning/rejection/validation
- P19 Live generation
- P20 Result page
- P21 Result comparison modes
- P22 Result feedback flow
- P23 Regenerate / adjust / try-another flow
- P24 Create/history continuity states

### Phase D — Personal content
`04_LIBRARY_AND_FAVORITES.md`
- P25 Library populated
- P26 Library empty
- P27 Library filtered/no-results
- P28 Library card/action menu
- P29 Favorites populated
- P30 Favorites empty

### Phase E — Account, billing, and pricing
`05_ACCOUNT_BILLING_AND_PRICING.md`
- P31 Account overview
- P32 Profile
- P33 Security
- P34 Privacy
- P35 Notifications
- P36 Billing overview
- P37 Billing — Plan
- P38 Billing — Credits / Usage
- P39 Billing — History / invoices / payment methods
- P40 Public Pricing — plan cards
- P41 Pricing — Plan Finder
- P42 Pricing — comparison + FAQ
- P43 Optional promo-code flow

### Phase F — Auth, modals, overlays, edge states
`06_AUTH_MODALS_OVERLAYS_AND_EDGE_STATES.md`
- P44 Authentication modal
- P45 Login
- P46 Signup
- P47 Forgot password
- P48 Verify email
- P49 Upload source chooser
- P50 Credit-cost confirmation
- P51 Insufficient credits
- P52 Generation failure
- P53 Share result
- P54 Delete asset
- P55 Report result
- P56 Billing upgrade modal
- P57 Quick Edit Profile modal
- P58 Toasts and lightweight system feedback
- P59 Edge/error page family
- P60 Maintenance/degraded service

### Phase G — System completion and handoff
`07_RESPONSIVE_ACCESSIBILITY_COMPONENTS_AND_QA.md`
- P61 Responsive behavior master pass
- P62 Accessibility master pass
- P63 Component library / variants
- P64 Motion and micro-interactions
- P65 Loading / empty / disabled / error state matrix
- P66 Content and UX-writing pass
- P67 Final prototype and engineering handoff

### Appendix — deliberately non-V1 experiments
`08_OPTIONAL_FUTURE_EXPERIMENTS.md`
- X01 Advanced model-choice experiment
- X02 Batch-generation future variant
- X03 Public profile/social future variant
- X04 Gifts future variant

## Figma file structure recommendation

```text
00 Cover + Principles
01 Foundations
02 Components
03 Global Shell
04 Search
05 Discover
06 Explore
07 Preset Detail
08 Create
09 Generation
10 Result
11 Library
12 Favorites
13 Account
14 Billing
15 Pricing
16 Auth
17 Modals + Overlays
18 Edge States
19 Responsive
20 Prototype Flows
21 Engineering Handoff
```

## Required prototype flows

At minimum, prototype these end-to-end flows:

1. Discover → Preset Detail → Create → Upload → Configure → Generate → Result → Download.
2. Explore → Search/filter → Preset Detail → Favorite → Favorites → Create.
3. Create → insufficient credits → Buy/Upgrade → return to Create.
4. Generate → failure → credit release/refund explanation → Retry.
5. Result → Adjust → Regenerate.
6. Result → Try another preset.
7. Global Search → Preset → Preset Detail.
8. Avatar menu → Billing → Credits → Usage history.
9. Account → Privacy → Account deletion flow.
10. New user → empty Library → Explore presets.

## Handoff philosophy

For every page, designers should hand off:
- desktop default;
- mobile default;
- important hover/focus/pressed/selected states;
- empty/loading/error states;
- any relevant modal/drawer;
- keyboard behavior;
- motion note;
- component names and variants;
- spacing/token references;
- concise annotations describing what is fixed, sticky, scrollable, or responsive.

## Important unresolved product decision: model selection

The original product docs say model/provider selection is hidden from consumers, while an earlier product-owner note expressed interest in allowing model choice. This pack follows the **canonical V1 rule: no consumer model picker**. A carefully separated optional experiment is included in `08_OPTIONAL_FUTURE_EXPERIMENTS.md`. Do not quietly insert model choice into the main V1 files.

## Important unresolved product decision: batch generation

The canonical V1 excludes batch generation. Higgsfield's quantity/batch control remains useful interaction inspiration, but it is not part of the V1 prompts. A future experiment is included in the appendix.

## Completion definition

The design work is complete when a new user can always answer:
- What should I do next?
- What will this preset produce?
- Is my photo suitable?
- What will it cost?
- What is happening while it generates?
- Was I charged if it failed?
- Where did my result go?
