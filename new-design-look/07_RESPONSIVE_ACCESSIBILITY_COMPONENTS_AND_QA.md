# 5Pixels — Responsive, Accessibility, Component System, Motion, and QA

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



# P61 — Responsive behavior master pass

**Route / surface:** `all user-facing routes`  
**Status:** V1  
**Goal:** Ensure the entire app is deliberately designed across desktop, tablet, and mobile rather than merely scaled.

### Deliver
- 1440 desktop
- 1024 tablet
- 768 small tablet
- 430 large phone
- 390 phone

### Designer prompt

Run a dedicated responsive design pass across every completed route.

Rules:
- broad gallery layouts become 3–4 columns desktop, 2–3 tablet, single-column emphasis or selective 2-column mobile;
- preset rails may horizontally scroll on mobile;
- large create studio becomes vertical workflow with bottom-sheet controls and sticky Generate;
- account left rail becomes settings index;
- pricing comparison does not squeeze 4 desktop columns onto a phone;
- Search becomes full-screen on mobile;
- modals wider than the phone become full-screen sheets;
- sticky actions respect bottom safe areas.

Annotate breakpoints based on component behavior, not arbitrary device labels. Identify every component that reflows, collapses, becomes a sheet, or changes interaction model.

### Acceptance checklist
- [ ] all major pages have mobile frames
- [ ] desktop-only hover behaviors have touch equivalents
- [ ] sticky layers do not collide
- [ ] breakpoint behavior annotated

---

# P62 — Accessibility master pass

**Route / surface:** `all user-facing routes`  
**Status:** V1  
**Goal:** Make the visual sophistication usable with keyboard, screen reader, reduced motion, and high-contrast needs.

### Deliver
- keyboard path annotations
- focus states
- reduced-motion frames
- contrast audit
- screen-reader notes

### Designer prompt

Audit every route and component for accessibility.

Required:
- visible focus;
- logical focus order;
- semantic buttons/links/forms;
- labels on all inputs;
- touch targets;
- alt text strategy;
- video preview naming/captions where needed;
- no information communicated by color alone;
- reduced-motion behavior;
- dialog focus containment;
- Search combobox/list semantics;
- popover selected/expanded states;
- comparison slider keyboard controls;
- charts with text summaries;
- credit meters with exact text;
- error messages programmatically associated with fields.

Create an accessibility annotation layer in Figma rather than leaving these decisions implicit.

### Acceptance checklist
- [ ] focus states designed for all interactive components
- [ ] reduced-motion behavior specified
- [ ] dialogs/search semantics annotated
- [ ] contrast reviewed

---

# P63 — Component library and variant system

**Route / surface:** `Figma components`  
**Status:** V1  
**Goal:** Turn all repeated UI into a coherent 5Pixels component system before final visual polish.

### Deliver
- core components
- variants
- properties
- tokens
- documentation page

### Designer prompt

Build the reusable component library.

At minimum:
- AppNav
- NavItem
- ExploreMegaMenu
- CreditsIndicator
- AvatarMenu
- SearchDialog
- SearchScopeChip
- SearchResultRow
- PresetCard (featured/standard/compact)
- StatusBadge
- CategoryChip
- Button roles
- IconButton
- SettingCard
- SelectorCard
- Popover
- BottomSheet
- UploadDropzone
- ValidationMessage
- GenerateCTA
- ProgressStage
- ResultActionBar
- LibraryResultCard
- SettingsRail
- MetricTile
- PricingPlanCard
- ComparisonAccordion
- Modal
- Toast
- EmptyState
- Skeleton/Loading placeholder.

Use component properties for state/size/content rather than duplicate frames. Separate semantic roles from accidental styling.

### Acceptance checklist
- [ ] components have documented variants
- [ ] tokens used consistently
- [ ] no one-off page components where reusable pattern exists

---

# P64 — Motion and micro-interaction specification

**Route / surface:** `all interactive surfaces`  
**Status:** V1  
**Goal:** Define restrained premium motion as a system.

### Deliver
- motion table
- prototype examples
- reduced-motion mapping

### Designer prompt

Create a motion specification.

Priority order:
1. user-triggered preset previews;
2. generation progress;
3. modal/popover transitions;
4. subtle section entrance;
5. hover elevation;
6. five-pixel brand flourishes.

Suggested timing:
- hover/focus surface: 80–140ms;
- popover: 120–180ms;
- modal/sheet: 160–240ms;
- accordion: 180–240ms;
- page-level transitions only when useful.

No continuous card animation, excessive parallax, glowing particles, or springy playful motion in billing/settings. Document reduced-motion alternatives.

### Acceptance checklist
- [ ] timing/easing documented
- [ ] motion differs by context
- [ ] reduced-motion alternatives listed

---

# P65 — Global state matrix: loading, empty, disabled, error, success

**Route / surface:** `all routes`  
**Status:** V1  
**Goal:** Ensure no route is designed only for ideal data.

### Deliver
- state matrix table
- component states
- page states

### Designer prompt

Create a master state matrix covering every major surface.

Include:
- preset grid loading;
- preset unavailable;
- upload empty/drag/select/upload/validate/accepted/warning/rejected;
- Generate disabled/ready/running;
- generation queued/active/slow/failure/success;
- result available/deleted/not found;
- Library empty/filtered empty/loading;
- Favorites empty;
- Search zero/query/loading/no-results/offline;
- billing balance normal/low/zero;
- invoices empty;
- payment method empty;
- auth loading/error;
- modal saving/error.

Use skeletons only for actual loading. Decorative ghost cards must look different. Critical errors persist inline or on page; do not rely solely on toasts.

### Acceptance checklist
- [ ] every core flow has non-ideal states
- [ ] loading vs empty is visually distinct
- [ ] critical errors persistent

---

# P66 — Content and UX-writing pass

**Route / surface:** `all routes`  
**Status:** V1  
**Goal:** Unify copy so the app stays visual, confident, and non-technical.

### Deliver
- copy deck
- button labels
- empty-state copy
- error copy

### Designer prompt

Audit all UI copy.

Voice:
short, confident, visual, specific.

Preferred patterns:
- `Pick the look. We'll handle the rest.`
- `Try this look`
- `Preparing your image`
- `248 credits left`
- `Your transformations will appear here.`

Avoid:
- inflated AI marketing;
- jargon;
- vague errors;
- repeated `Learn more`;
- provider/model terminology in consumer surfaces.

Ensure the same concept uses the same word everywhere: Preset/Look, Original, Result, Credits, Save, Download, Regenerate, Adjust.

Create a concise copy deck for engineering.

### Acceptance checklist
- [ ] terminology consistent
- [ ] errors actionable
- [ ] CTAs use verbs
- [ ] no AI jargon leaks

---

# P67 — Final interactive prototype + engineering handoff

**Route / surface:** `whole application`  
**Status:** V1  
**Goal:** Turn static screens into a testable, buildable system.

### Deliver
- clickable core flows
- redline/annotation pass
- component inventory
- responsive matrix
- handoff notes

### Designer prompt

Prepare the final Figma handoff.

Prototype at least the ten master flows listed in the Master Index. For every route, annotate:
- fixed/sticky/scroll areas;
- component names;
- responsive behavior;
- validation logic;
- modal ownership;
- empty/loading/error states;
- motion;
- accessibility notes;
- data/content dependencies;
- product questions still unresolved.

Create a `Decisions Needed` page separating confirmed design from assumptions. Do not hide unresolved billing, retention, model-choice, or sharing policy decisions inside visual mockups.

Engineering handoff should include route map, component map, state machine links for Create/Generation, and acceptance checklist per critical user journey.

### Acceptance checklist
- [ ] prototype covers core journeys
- [ ] assumptions are explicitly labelled
- [ ] state and responsive annotations complete
- [ ] component/route maps included

---
