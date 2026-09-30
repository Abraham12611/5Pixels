# 5Pixels — Create, Generation, and Result Journey

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



# P16 — Create Studio — first-use / upload state

**Route / surface:** `/app/create/[presetSlug]`  
**Status:** V1  
**Goal:** Establish the dedicated transformation workspace with a compact decision rail and large visual stage.

### Deliver
- desktop first-use
- mobile first-use
- drag-over
- file selecting/uploading

### Designer prompt

Design the core Create Studio using the strongest Higgsfield lesson: **decisions on the left, visual outcome on the right**.

Desktop:
- persistent top app shell;
- left configuration rail approximately 320–380px;
- large dark visual stage using the remaining space.

Left rail begins with selected preset card/thumbnail and `Change preset`. Then source section, compatibility hint, only the preset-specific controls allowed by this preset, generation summary, credit cost, and sticky `Generate` area. In the first-use state, controls that require a source may be disabled or deemphasized.

Stage first-use state should make upload visually obvious: large source drop zone, accepted file types, one sentence of guidance, and perhaps a small illustrated 3-step strip. Avoid a generic prompt box.

Mobile becomes a focused vertical workflow: preset summary → upload → stage preview → controls in sheets → sticky Generate.

### Acceptance checklist
- [ ] no prompt input
- [ ] preset stays visibly selected
- [ ] upload is the obvious next action
- [ ] Generate cost area has reserved place
- [ ] stage dominates desktop

---

# P17 — Create Studio — source accepted / configuration state

**Route / surface:** `/app/create/[presetSlug]`  
**Status:** V1  
**Goal:** Let the user make a small number of creative choices while keeping the visual preview central.

### Deliver
- accepted source
- one-control preset
- multi-control preset
- aspect/crop selector
- ready-to-generate

### Designer prompt

Design the source-accepted state.

Left rail:
- preset summary;
- accepted source thumbnail with Replace action;
- human-readable compatibility status;
- preset-specific controls;
- aspect/crop option only if the preset allows it;
- optional output quality control only if it is truly consumer-visible;
- credit summary;
- sticky `Generate · X credits`.

Controls should follow the Higgsfield anchored-card grammar: compact setting cards open dark selectors with visible selected state. Each control has a plain-language label, short explanation only when needed, and no technical AI parameters.

Stage:
- large source preview with crop/fit guides;
- clear aspect frame;
- optional small `Original` label;
- no fake live AI preview unless technically supported.

If the preset has no user-adjustable controls, do not invent them; use a very simple rail and let the user generate quickly.

### Acceptance checklist
- [ ] only exposed preset controls appear
- [ ] credit cost shown before generate
- [ ] crop/aspect state visible
- [ ] no fake generated preview
- [ ] zero-control preset is elegantly simple

---

# P18 — Create Studio — validation warnings and rejected source

**Route / surface:** `/app/create/[presetSlug]`  
**Status:** V1  
**Goal:** Make source suitability feedback human, actionable, and non-technical.

### Deliver
- soft warning
- hard rejection
- too-small image
- wrong file
- multiple-face compatibility warning

### Designer prompt

Design the upload validation state family.

Use three semantic levels:
- **Accepted**: quiet success indication.
- **Warning**: user may continue, but explain likely quality impact.
- **Rejected**: Generate disabled; show exact recovery action.

Example copy:
- `This look works best with one clearly visible face.`
- `Your image is very small. Results may be softer.`
- `We couldn't read that file. Try JPG, PNG, or WebP.`

Warnings should appear in the source area and/or left rail, not only as transient toast. Never expose storage, provider, moderation pipeline, or model errors. If the source is blocked for safety, use clear policy language and a route to help/report where appropriate.

Preserve the user's preset selection and any safe choices when they replace the source.

### Acceptance checklist
- [ ] warning vs rejection is clear without relying on color
- [ ] Generate disabled only when necessary
- [ ] recovery action is obvious
- [ ] private backend errors never leak

---

# P19 — Live Generation status

**Route / surface:** `/app/generations/[generationId]`  
**Status:** V1  
**Goal:** Create a focused, trustworthy asynchronous waiting experience without fake precision.

### Deliver
- queued
- preparing
- applying look
- refining
- finalizing
- longer-than-usual
- cancel only if meaningful

### Designer prompt

Design the live Generation page/state.

Show:
- source image;
- selected preset;
- selected options summary;
- generation state;
- calm brand animation using the five-pixel motif;
- truthful stage copy such as `Preparing your image`, `Applying the look`, `Refining details`, `Finalizing your result`;
- privacy reassurance only where useful.

Do not show an exact percentage unless the system genuinely measures one. Use a staged progress indicator or indeterminate motion. If the job is taking longer, explicitly say so without implying failure.

If cancellation is not technically reliable, do not show a fake Cancel. If technically meaningful, make it secondary and explain credit behavior.

When complete, transition to Result automatically while preserving browser history sensibly.

### Acceptance checklist
- [ ] no fake percentage
- [ ] state copy is human-readable
- [ ] credit/cancel behavior is not misleading
- [ ] reduced-motion variant exists
- [ ] completion transition defined

---

# P20 — Result page — primary success state

**Route / surface:** `/app/results/[generationId]`  
**Status:** V1  
**Goal:** Make the finished image feel rewarding while keeping download, save, regenerate, and next-look actions obvious.

### Deliver
- desktop result
- mobile result
- portrait output
- landscape output
- text-heavy/poster preset output

### Designer prompt

Design the main Result page.

Media is the hero. Show the result as large as the viewport permits without hiding key actions. Include:
- result image;
- Original/Result comparison entry;
- Download;
- Save;
- Favorite the preset;
- Regenerate;
- Adjust options;
- Try another preset;
- fast feedback.

Use a compact action rail or floating utility bar inspired by Higgsfield's action console, but tailored to finished-work actions rather than prompt creation. Keep primary action hierarchy contextual: for most users `Download` should be very prominent after a successful result, while `Regenerate` and `Adjust` are secondary.

Show preset name, generation date, credit cost, and result status quietly. Do not show provider/model metadata.

On mobile, result media is full width with a sticky action bar/sheet. Ensure actions remain reachable without permanently covering the image.

### Acceptance checklist
- [ ] result dominates visual hierarchy
- [ ] download/save/regenerate are easy to find
- [ ] metadata is consumer-facing
- [ ] mobile sticky actions do not obscure result

---

# P21 — Result comparison modes

**Route / surface:** `Result page sub-state`  
**Status:** V1  
**Goal:** Provide useful Original ↔ Result inspection without violating the no-slider rule on landing/discovery cards.

### Deliver
- side-by-side desktop
- slider desktop
- tap toggle mobile
- swipe mobile

### Designer prompt

Design the Original/Result comparison interaction for the Result page.

Desktop may support:
- side-by-side;
- drag slider;
- click/toggle.

Mobile may support:
- tap `Original` / `Result`;
- swipe between two panes;
- optional slider only if touch handling is excellent.

The landing/discovery preset-card rule against draggable comparison does **not** apply here. Result is the correct place for close inspection.

Provide labels that never disappear entirely. Preserve zoom/pan if added later. Add reduced-motion and keyboard support for any slider. Make the comparison mode easy to close back to the clean result view.

### Acceptance checklist
- [ ] Original and Result are always identifiable
- [ ] keyboard/touch operation documented
- [ ] comparison does not become default clutter

---

# P22 — Result feedback interaction

**Route / surface:** `Result page`  
**Status:** V1  
**Goal:** Collect fast structured quality feedback without turning the success moment into a survey.

### Deliver
- Love it
- Not quite
- negative reasons sheet
- submitted state

### Designer prompt

Design the feedback control directly on Result.

First level:
- `Love it`
- `Not quite`

If `Not quite`, reveal a compact popover/sheet:
- Doesn't look like me
- Wrong style
- Strange details
- Bad text
- Composition issue
- Other

Free text should be optional and secondary, not forced. Submission should be lightweight and not navigate away from the result. After feedback, show a small confirmation and keep all result actions available.

For `Doesn't look like me`, consider offering `Adjust` or `Regenerate` as a recovery action after the feedback is saved.

### Acceptance checklist
- [ ] feedback takes at most one or two taps
- [ ] negative reasons are structured
- [ ] no forced text
- [ ] recovery action offered when useful

---

# P23 — Regenerate, Adjust, and Try Another flow

**Route / surface:** `Result → Create/Explore`  
**Status:** V1  
**Goal:** Design the branching actions after a result so the user understands what will be preserved.

### Deliver
- Regenerate confirmation/context
- Adjust options return
- Try another preset transition

### Designer prompt

Design the three post-result continuation paths.

**Regenerate:** keep source, preset, and current options. Show the new credit cost directly on the action. If a separate confirmation is unnecessary, launch immediately after a lightweight cost acknowledgment according to user preference.

**Adjust options:** return to Create with the same source and preset, preserving existing selections. Visually show the previous result as recent history, not as the editable source.

**Try another preset:** preserve the source where privacy/retention policy permits and route to a source-aware Explore state or allow the user to pick a new preset, then return to Create.

Annotate what data is preserved, what is revalidated, and where credit cost is shown.

### Acceptance checklist
- [ ] preservation rules are explicit
- [ ] actions do not unexpectedly lose source/options
- [ ] credit cost is visible before a new paid generation

---

# P24 — Create/history continuity and returning to active work

**Route / surface:** `Create + Generation`  
**Status:** Recommended enhancement  
**Goal:** Keep recent attempts and active work easy to return to without bloating the core studio.

### Deliver
- recent-history strip/drawer
- active generation return state
- failed previous attempt

### Designer prompt

Design a restrained History access point inside the Create/Generation environment inspired by Higgsfield's `History` affordance.

Do not duplicate the full Library. Instead, provide a compact recent-attempt drawer or strip showing the last few transformations for the current preset/source session:
- thumbnail;
- status;
- time;
- open result / retry.

When an active generation exists and the user navigates away, the global shell or account menu may show `1 transformation in progress`. Returning should restore the live status page.

Keep history secondary; the studio's primary job remains configuring and generating.

### Acceptance checklist
- [ ] History does not replace Library
- [ ] active job can be recovered
- [ ] failed attempt shows correct credit outcome

---
