# 5Pixels Main App Design Research
## Higgsfield Reference Study — Batch 01

**Status:** Working research document, intended to be extended with later screenshot batches.  
**Scope of this batch:** Higgsfield top navigation / image mega-menu, Image generation studio, model selector, aspect-ratio / quality / resolution / batch controls, and Viral Presets discovery surfaces.  
**5Pixels source material reviewed:** `00_README_MASTER_INDEX(1).md`, `01_PRODUCT_OVERVIEW_AND_PRINCIPLES(1).md`, `02_UI_UX_BIBLE_AND_DESIGN_SYSTEM(1).md`, `03_SITEMAP_INFORMATION_ARCHITECTURE(1).md`.

---

# 0. Executive synthesis

The strongest idea to borrow from Higgsfield is **not any single visual component**. It is the way the product turns a technically complex AI stack into a visually confident, media-first application where the user can browse, choose, configure, and generate without ever feeling that they are inside a conventional enterprise dashboard.

Higgsfield repeatedly uses four tactics that are highly relevant to 5Pixels:

1. **A persistent dark gallery shell** keeps the imagery dominant and turns all controls into supporting chrome.
2. **Contextual mega-menus and popovers** expose complexity only when requested instead of permanently filling the screen with settings.
3. **A large floating action console** centralizes the act of generation while allowing previous/generated media to remain visible behind it.
4. **Discovery feels like entertainment / visual browsing**, especially in the Viral Presets screens: oversized editorial typography, category pills, asymmetric media tiles, hover overlays, and direct “Generate” actions.

For 5Pixels, these patterns fit the existing product thesis extremely well **provided that we do not import Higgsfield’s prompt-centric or model-centric product assumptions**. 5Pixels is preset-first. Its consumer is supposed to select an outcome, upload a source image, adjust only a few exposed controls, and let the system handle the technical stack. The interface therefore should borrow Higgsfield’s *interaction grammar* while replacing the prompt/model emphasis with **preset context, source image, compatibility guidance, controlled options, and a single confident Generate action**.

The most important design tension surfaced by this batch is the proposed model chooser. Higgsfield makes models a prominent consumer-facing concept. The current 5Pixels product definition says the opposite: model/provider names are infrastructure and should be hidden. If 5Pixels later chooses to expose model choice, it should be a deliberate product-policy change, not a casual UI addition.

---

# 1. Canonical 5Pixels constraints that must govern the inspiration work

These constraints are important because they tell us what to translate from Higgsfield versus what to reject.

## 1.1 Preset-first, not prompt-first

5Pixels is a curated image-transformation product. The preset itself is the product. The user should choose a known visual outcome, upload a source image, optionally adjust a controlled set of fields, and generate. A generic free-text prompt field does **not** belong in V1.

### Design implication

The large Higgsfield composer can still inspire 5Pixels, but the text-entry portion must become something else. Candidate replacements:

- source-image drop zone / source thumbnail;
- selected preset summary;
- preset-specific controls;
- a concise “What this look does” descriptor;
- optional user-editable fields explicitly defined by the preset (for example title text on a magazine cover, background intensity, wardrobe tone, crop preference);
- an Advanced settings disclosure if and only if the preset supports it.

The action console should feel like **“Configure this look”**, not “Describe what you want.”

## 1.2 Outcome-first language

Consumer language should be about **Preset, Look, Transformation, Original, Result, Collection, Category, Trending, Save, Try this look, Regenerate, Adjust, Download**. Technical AI terms should be absent from normal consumer surfaces.

### Design implication

Do not mechanically inherit Higgsfield labels such as GPT Image, Seedream, Nano Banana, model vendor names, or AI pipeline language. Even when the underlying engine changes, the user’s mental model should remain stable.

## 1.3 Visual discovery is central

5Pixels should feel closer to a curated fashion/editorial catalog, premium effects shelf, modern photo app, or streaming-style discovery experience than a dashboard.

### Design implication

Higgsfield’s image-led backgrounds, irregular galleries, and category-driven discovery are highly relevant references. Dashboard tropes such as left rails full of admin controls, persistent parameter panels, and dense tables should not dominate the consumer app.

## 1.4 Progressive disclosure

Discovery should stay simple. Details appear after a preset has been selected.

### Design implication

Mega-menus, popovers, sheets, and modal controls are useful because they keep the base surface clean. Use them to reveal secondary settings; never expose all configuration simultaneously.

## 1.5 V1 boundaries that conflict with the Higgsfield reference

Current V1 excludes:

- free-form prompts;
- batch generation;
- unrestricted editing/masking;
- user-created presets;
- video generation.

Therefore, Higgsfield’s prompt field and batch-size control should be treated as **interaction references only**, not direct feature requirements for 5Pixels V1.

---

# 2. Batch 01 screenshot inventory

| Ref | Screenshot | Main surface observed | Primary relevance to 5Pixels |
|---|---|---|---|
| S01 | `10.00.33 AM` | Top nav + Image mega-menu | App shell, navigation, category/model menu, badges |
| S02 | `10.03.15 AM` | Same mega-menu at cleaner crop | Menu spacing, two-column taxonomy, background de-emphasis |
| S03 | `10.07.59 AM` | Image generation studio | Floating generation console over media grid |
| S04 | `10.08.29 AM` | Model selector open | Searchable chooser, selected row, badges, descriptions |
| S05 | `10.08.44 AM` | Aspect ratio popover | Compact parameter chooser, icons, selected state |
| S06 | `10.08.56 AM` | Quality popover | Tiered option descriptions, selection highlight |
| S07 | `10.09.06 AM` | Resolution popover | Clear numeric output choices, secondary metadata |
| S08 | `10.09.21 AM` | Batch-size stepper tooltip | Inline stepper, hover tooltip, compact control grammar |
| S09 | `10.09.59 AM` | Viral Presets landing/header | Editorial title, dense filter chips, discovery gallery |
| S10 | `10.10.16 AM` | Viral Presets hover state | Card hover overlay, direct Generate CTA, masonry browsing |

---

# 3. Screenshot S01 / S02 — Top navigation + Image mega-menu

## 3.1 Overall shell

The application uses an extremely dark background, nearly black, with slightly lighter elevated surfaces. The shell is intentionally recessive. Media and the fluorescent accent color do almost all of the visual work.

The top navigation is a single horizontal strip with:

- compact brand mark at far left;
- a primary discovery link (“Explore”);
- major product-area links (“Image”, “Video”, “Audio”, “Edit”, etc.);
- several specialized product links;
- right-aligned utility / commercial actions including Search, Pricing, Enterprise, Assets, notifications, and profile/account.

A key behavior: the selected navigation item is visually stronger but not dramatically larger. “Image” receives a dark rounded pill while “Explore” is treated with the accent color. This creates **two different semantics**: current context versus strategic/primary destination.

### 5Pixels adaptation

5Pixels should not copy Higgsfield’s very wide product-suite navigation. The existing 5Pixels system explicitly says to avoid giant suite navigation in V1. However, the *structural behavior* is strong:

- sticky thin nav;
- one or two high-priority links receive accent treatment;
- active section gets a subtle pill or local background;
- utilities sit at the right edge;
- overlays originate directly from the relevant nav item.

For authenticated 5Pixels, a likely desktop shell is:

**Logo | Discover | Explore | Categories | [Search] … Library | Favorites | Credits | Avatar**

Possible simplification: Categories may live inside Explore rather than permanently in the nav. Keep the nav shorter than Higgsfield.

## 3.2 Mega-menu geometry

The Image menu is unusually large but still reads as a single cohesive overlay.

Observed characteristics:

- anchored directly below the top nav;
- large rounded rectangular container;
- dark charcoal surface slightly lighter than page background;
- roughly two main columns;
- generous internal padding;
- no heavy separator line between columns; spacing performs the grouping;
- headings (“Features”, “Models”) are small, muted, low-contrast metadata;
- each row is large enough to contain icon, title, and subtitle;
- the overlay sits above page content without a full-screen dimmer; instead the surrounding content is visually subordinated by contrast and the menu’s scale;
- bottom content can continue beyond the viewport, implying menu scroll when needed.

This is closer to a **mini app directory** than a conventional dropdown.

### 5Pixels adaptation

A 5Pixels mega-menu should only be used where the content benefits from visual grouping. Strong candidates:

- **Explore** mega-menu with two regions: `Browse` and `Collections / Categories`;
- optional `Create` mega-menu if later there are distinct preset families / workflows;
- account/billing menu should remain much smaller and should not use this treatment.

Potential 5Pixels Explore mega-menu:

**Browse**
- Discover — personalized/home feed
- Trending — popular right now
- New — recently added looks
- Staff Picks — curated by 5Pixels
- Favorites — saved looks

**Categories**
- Portrait
- Cinematic
- Covers
- Illustration
- Professional
- Retro
- Fantasy
- Seasonal

Use one-line descriptors only where they genuinely aid navigation. Do not overfill the menu with 20 categories in V1 unless browsing data justifies it.

## 3.3 Menu row anatomy

Each row uses a consistent three-part structure:

1. square icon tile;
2. primary label;
3. one-line descriptive subtitle.

The icon tile is itself a separate elevated surface. It is not simply a free-floating icon. This adds tactile depth without relying on shadows.

Rows do not appear to be enclosed in cards by default. Instead, the icon tile gives the row enough structure. This keeps the menu dense without creating a noisy grid of boxes.

### 5Pixels adaptation

For category rows, the icon tile could become a tiny preview thumbnail or a minimal line icon. For actual presets, use real imagery rather than generic icons whenever possible.

A more 5Pixels-native hierarchy:

- category items → icon or 1:1 mini image;
- featured collections → miniature visual poster / collage;
- utility destinations → monochrome icon.

## 3.4 “NEW”, “TOP”, “FREE”, “PREMIUM” badge behavior

The badge system is one of the most reusable parts of the reference.

Observed badge traits:

- bright fluorescent fill;
- compact all-caps or short label;
- often italic / energetic typography;
- badge floats partly above / overlaps the icon tile rather than merely sitting at row end;
- different semantic badges use different colors (pink for “TOP” in some views, lime for “NEW”, lime for “FREE/PREMIUM” in model list);
- the badge is visually loud but spatially tiny.

This works because **importance is signaled by concentrated color rather than large components**.

### 5Pixels adaptation

5Pixels already has a badge vocabulary in the design bible: `New`, `Trending`, `Pro` and similar states. Adapt the badge placement but use 5Pixels’s own visual system.

Recommended states:

- **NEW** — lime label on dark or lime chip depending context;
- **TRENDING** — warm/pale yellow accent, not a second neon that competes with lime;
- **PRO** / **PLUS** — premium neutral or pale gold; avoid using lime for every commercial status;
- **STAFF PICK** — off-white/cream or outlined treatment;
- **LIMITED** / seasonal — muted accent, not urgent red;
- **LOCKED** — icon + plan label, never color alone.

Overlapping badges can be used on preview thumbnails, but the same overlap treatment should not appear on every component.

## 3.5 Hierarchy through muted text

Most descriptive copy is medium-to-low contrast gray. White/cream is reserved for labels and selected destinations. The visual hierarchy is achieved by **contrast steps**, not many font sizes.

### 5Pixels adaptation

This aligns with 5Pixels’s warm off-white + muted gray system. Preserve three clear text levels:

- primary warm off-white;
- secondary cool/warm gray;
- muted metadata.

Lime should not become body text.

## 3.6 Selected vs promotional states

The menu differentiates between:

- selected/current item;
- promoted/new/top item;
- ordinary item.

These are separate states. A promoted item gets a badge, while the currently selected item gets background emphasis/check state.

### 5Pixels adaptation

Do not use `New` as a substitute for selected state. For preset/category pickers:

- selected row = tonal surface + lime keyline/check/pixel motif;
- promoted status = small badge;
- hover = slightly brighter surface;
- keyboard focus = explicit focus ring distinct from hover.

---

# 4. Screenshot S03 — Image generation studio

This is the most important structural reference in Batch 01.

## 4.1 Studio composition

The screen is split conceptually into two layers:

**Layer A: persistent media workspace**
- large grid/masonry of previous generations or inspirational examples;
- media continues behind the control surface;
- little-to-no explicit page header is required once inside the tool;
- imagery communicates history, context, and product capability.

**Layer B: floating generation console**
- wide, centered near the bottom;
- large rounded rectangle;
- higher-contrast charcoal than background;
- appears detached from the page while still spanning a substantial width;
- includes primary input across the top row;
- compact configuration chips across the lower left;
- high-contrast Generate button occupies the lower/right region.

The result is a very strong mental model: **the canvas/gallery is the world; the console is the instrument**.

## 4.2 The console is large without feeling like a form

The console avoids conventional form layout. There are no persistent field labels stacked vertically. Instead:

- top row contains the main creative input;
- bottom row uses self-describing chips;
- values themselves function as labels;
- popovers provide secondary explanation;
- CTA is visually isolated and large.

This drastically reduces “settings panel” feeling.

### 5Pixels adaptation: the 5Pixels Transformation Console

5Pixels should strongly consider a bottom-floating **Transformation Console** on desktop for `/app/create/[presetSlug]` and possibly a compact persistent launcher on `/app` / `/app/explore` after the user picks a preset.

However, its anatomy should be 5Pixels-native:

### Proposed top row

Instead of “Describe the scene you imagine”:

**Option A — Source-first**
- source thumbnail or `+ Add photo` at left;
- text: `Add a photo to use Midnight Premiere`;
- once uploaded: source filename / thumbnail + `Replace`;
- compatibility state in-line (`Great fit`, `Face too small`, etc.).

**Option B — Preset-first summary**
- preset thumbnail + preset name;
- concise outcome description;
- `Change preset` tertiary action;
- source upload lives as first control below.

**Preferred:** combine both with a compact preset chip at lower left and give the top row to the source image / preset-specific required field. This retains the “one obvious thing to do next” principle.

### Proposed lower row

Possible controls, only when applicable:

- Selected preset;
- Source / crop;
- Aspect ratio;
- preset-specific fields;
- output quality/size if user-facing;
- optional Advanced / engine preference if product decision allows;
- credit cost;
- Generate CTA.

Controls that do not apply to the current preset must not appear as disabled clutter.

## 4.3 Image grid behind the console

The grid is edge-to-edge and highly visual. It does not make every card identical. Different image widths/heights make the studio feel active and creative.

There are dark empty areas / incomplete cells below some media in the screenshots. Whether this is loading, masonry geometry, or viewport cropping, it has an important visual effect: **the page is not trying to wrap every image in a white-labeled card**. Media can simply exist as media.

### 5Pixels adaptation

For `/app/library`, `/app` recent work, and possibly the create studio background:

- use clean media tiles with minimal chrome;
- keep title/metadata hidden until hover or selection when practical;
- allow varying ratios only if it does not make the library hard to scan;
- keep a consistent row strategy for result history if users need chronological scanning;
- use media as the dominant surface, not card containers.

A create page could show **recent 5Pixels transformations** behind the console so returning users immediately see their own history. For first-time users, replace this with curated example results for the selected preset.

## 4.4 Generate CTA

The Generate button is disproportionately prominent:

- large lime rectangle with generous horizontal/vertical padding;
- dark text;
- rounded corners;
- right anchored;
- includes price/credit iconography inline;
- no secondary CTA competes in the same area.

### 5Pixels adaptation

This directly aligns with 5Pixels’s primary-button system.

Recommended Generate button states:

- ready → lime fill, dark text, credit cost shown quietly;
- missing source → disabled tonal surface; adjacent message states what is missing;
- validating source → spinner/progress motif, no fake percentage;
- insufficient credits → button can remain active but label changes to `Get credits` or triggers the insufficient-credit modal;
- generating → action console should transition into generation state rather than spawn a disconnected page immediately unless route architecture requires it;
- failure → restore Generate/Retry and show refund reassurance in-context.

Credit cost can be displayed as `Generate · 2 credits` rather than decorative unknown symbols.

## 4.5 Console persistence and scroll behavior

The console is positioned like a dock. This suggests it should remain available while the user browses the background grid.

### 5Pixels adaptation

On desktop:

- sticky/fixed console above bottom safe area;
- max-width so it never touches viewport edges;
- background content can scroll beneath it;
- apply bottom padding to the scroll container so final cards are not permanently obscured.

On mobile:

- convert to a bottom sheet / sticky compact CTA;
- do not reproduce the giant horizontal desktop dock;
- primary action must stay reachable with one hand;
- expanded sheet reveals controls.

---

# 5. Screenshot S04 — Searchable model selector

This selector demonstrates excellent handling of a long, heterogeneous option list.

## 5.1 Structure

The popover includes:

- search field at top with large search icon;
- small section heading (`Featured models`);
- scrollable list of models;
- icon tile for each model/provider;
- primary model name;
- one-line descriptive capability statement;
- optional badge (`NEW`, `PREMIUM`);
- selected row using a full-width tonal highlight;
- selected checkmark at far right;
- popover aligned to the triggering control and extending upward into the available space.

The search input is inside the same container with no extra modal chrome.

## 5.2 Selected-row treatment

Selected state combines:

- noticeably lighter row background;
- highlighted icon color;
- checkmark at far right;
- preserved badge if the item is also premium.

The design does not rely on a border alone.

## 5.3 Descriptions make technical choices understandable

Each option has a short capability statement. This is a major UX improvement over displaying model names alone.

### 5Pixels adaptation — IMPORTANT PRODUCT DECISION

The current 5Pixels product doctrine says users should **not** have to select models and should not see provider/model names. Therefore this exact selector should **not** be implemented as shown unless the product strategy changes.

There are three possible adaptation paths:

### Path A — Canonical / recommended

No model selector at all. Preset routes automatically. Advanced users never see vendor/model names. This stays closest to the existing 5Pixels thesis.

### Path B — Abstracted “Rendering Mode” selector

Borrow the UI pattern but expose user-meaningful modes, for example:

- **Recommended** — best balance for this preset;
- **Identity First** — prioritize likeness;
- **Detail First** — higher fidelity, slower;
- **Creative** — more stylized variation.

The server can map these modes to different internal models without exposing infrastructure.

### Path C — Explicit engine/model selector

Only adopt if 5Pixels intentionally changes the consumer promise. If chosen, structure it as:

- `Recommended for this preset` section at top;
- `Other compatible models` below;
- search;
- short human-readable descriptions;
- badges for `Recommended`, `Fast`, `High Fidelity`, `Experimental` rather than marketing every vendor;
- a clear warning that results may vary when overriding the recommended engine.

If explicit vendor names are exposed, document this as a change to the canonical product principles before design implementation.

## 5.4 Search behavior worth borrowing

Even if models remain hidden, this component is reusable for:

- preset selector inside create flow;
- category/collection selector;
- “Try another preset” dialog;
- source asset chooser when recent uploads exist;
- filter picker on mobile.

Search should use instant filtering with keyboard navigation and highlight matching names, not require Enter for every query.

---

# 6. Screenshot S05 — Aspect ratio popover

## 6.1 Geometry and presentation

The aspect selector is a compact vertical popover with:

- title `Aspect ratio`;
- current `Auto` row highlighted at top;
- an icon visually representing automatic/fit framing;
- a list of common ratios;
- each ratio paired with a tiny ratio-shape icon;
- generous row height;
- no radio buttons; the row itself is the control;
- checkmark only on selected value.

Observed ratios include:

- Auto
- 1:1
- 3:2
- 2:3
- 16:9
- 9:16
- 4:3
- 3:4
- 21:9

## 6.2 Why it works

The ratio icon makes the options scannable before reading. `Auto` sits at the top as the low-friction default. This keeps the user from having to understand output geometry unless they care.

### 5Pixels adaptation

Aspect ratio should **not automatically appear for every preset**. The sitemap explicitly says crop/aspect options appear “if allowed.” The preset should declare permitted ratios.

Recommended behavior:

- `Original` or `Best fit` may be a better consumer label than `Auto` depending on routing behavior;
- unsupported ratios are omitted rather than shown disabled when possible;
- social-purpose presets can add semantic hints (`Story 9:16`, `Square 1:1`, `Landscape 16:9`) while keeping the exact ratio visible;
- if a preset has a fixed layout (e.g., magazine cover), do not expose ratio choice at all;
- selected state = tonal row + checkmark + small lime signal;
- opening the popover should not shift the console layout.

## 6.3 Potential preset-aware ordering

Instead of a global static ratio list, order by relevance:

1. preset-recommended ratio;
2. source/original ratio if supported;
3. common social ratios;
4. remaining compatible ratios.

A small `Recommended` badge can appear on the preferred option without making every row more complex.

---

# 7. Screenshot S06 — Quality popover

## 7.1 Structure

The quality control presents three simple tiers:

- Low — “Fastest And Cheapest”
- Medium — “Balanced Visuals”
- High — “Best Visual Fidelity”

Selected state is a darker/lighter full-width row with a checkmark. The control uses plain language rather than numerical parameters.

## 7.2 UX lesson

Users do not need raw technical values when a meaningful semantic tier can represent the tradeoff. This is especially relevant to 5Pixels.

### 5Pixels adaptation

5Pixels can use semantic labels if quality needs to be user-configurable, but there is an important product question: if each preset has a designed quality target, exposing a global quality knob may undermine consistency.

Preferred V1 approaches:

- **Best:** preset defines quality internally; no visible user control.
- **Alternative:** only expose when there is a meaningful speed/credit tradeoff, e.g. `Standard` vs `High Detail`.
- **Avoid:** `Low / Medium / High` if “Low” implies 5Pixels knowingly sells weak results.

Possible 5Pixels wording:

- **Standard** — faster, lower credit cost;
- **High Detail** — slower, best for large downloads;

The credit delta should be explicit before generation.

---

# 8. Screenshot S07 — Resolution popover

## 8.1 Structure

The resolution menu presents:

- title `Select resolution`;
- primary labels `1K`, `2K`, `4K`;
- secondary exact pixel values `1024px`, `2048px`, `4096px`;
- selected row highlight + checkmark.

This is a good example of **progressive technical detail**: common shorthand is primary; exact value is secondary.

### 5Pixels adaptation

Only expose resolution if it affects output value, price, or user need. Possible consumer framing:

- `Standard — up to 2K`
- `Large — up to 4K`

If every paid result is always rendered at a fixed high-quality size, hide the selector and use a predictable product promise instead.

If selectable:

- show additional credits inline;
- only list resolutions genuinely supported by the preset / engine;
- do not claim exact pixel dimensions if the pipeline can return variable dimensions due to crop/aspect rounding;
- surface final dimensions on Result / Download, where they matter most.

---

# 9. Screenshot S08 — Batch size stepper + micro-tooltip

## 9.1 Control anatomy

The bottom control is a compact inline stepper:

- minus button;
- current count (`1/4`);
- plus button;
- shared pill container;
- tooltip appears above on hover: `Batch Size`.

The label is intentionally absent until hover, keeping the action bar compact.

## 9.2 Micro-interaction lessons

- icon-only or compact controls can work when a tooltip supplies clarity;
- controls that form one concept are grouped into one pill;
- disabled minus at minimum appears visually subdued;
- current value is centered and visually stronger than the +/- buttons.

### 5Pixels adaptation

V1 explicitly excludes batch generation, so this exact control should not ship in V1.

The interaction grammar is still useful for:

- zoom +/- on result preview;
- image comparison position controls (if needed for accessibility);
- quantity of download sizes in later workflows;
- crop rotation/zoom;
- admin-only test variation counts.

If multiple result variations are added later, use user language such as `Variations` rather than `Batch size`.

---

# 10. Screenshot S09 — Viral Presets landing surface

This screen is arguably the closest reference to the **5Pixels core discovery experience**.

## 10.1 Editorial header

The page opens with a very large uppercase title, `VIRAL PRESETS`, centered in fluorescent lime against a huge field of black.

Traits:

- title is intentionally oversized;
- there is substantial breathing room above and below;
- no explanatory paragraph competes with the title;
- the title acts as a billboard, not a standard H1;
- strong brand color is concentrated in one moment.

### 5Pixels adaptation

5Pixels can use this approach selectively for collection/category landing pages:

- `TRENDING NOW`
- `PORTRAIT PICKS`
- `CINEMATIC`
- `COVERS`
- `NEW THIS WEEK`

However, the 5Pixels design bible says lime is a signal, not the color of every title. Reserve giant lime typography for high-energy editorial moments. Many category pages can use warm off-white titles with a five-pixel lime eyebrow.

## 10.2 Dense filter-chip cloud

Below the headline is a centered multi-row field of thin rounded chips. There are many of them—dozens.

Observed traits:

- dark/black chip background;
- subtle low-contrast border;
- white/cream uppercase label;
- some chips receive a tiny `new` word in lime appended to the text;
- consistent small height;
- chips wrap naturally into centered rows;
- almost no explanatory copy;
- the full chip field acts like a visual index / taxonomy.

This is a very compact way to communicate catalog breadth.

### 5Pixels adaptation

For 5Pixels, use fewer, more meaningful chips in V1 because the product strategy favors 20–30 excellent presets over a huge weak catalog.

Two strong patterns:

**Category chips**
- Portrait
- Cinematic
- Covers
- Illustration
- Professional
- Retro
- Fantasy
- Seasonal

**Collection/intent chips**
- Trending
- New
- Staff Picks
- Profile Photos
- Social Posts
- Posters
- Editorial
- High Fidelity

Do not mix categories, preset names, and internal model features in a single chip cloud unless the user can understand the taxonomy immediately.

## 10.3 Media grid begins immediately after taxonomy

The media gallery sits close enough below the chips that the page quickly becomes visual. There is no long marketing section in between.

### 5Pixels adaptation

The authenticated app should prioritize useful media over explanatory copy. On `/app/explore`, after a concise title/filter region, users should see the preset grid immediately.

---

# 11. Screenshot S10 — Viral Presets grid + hover overlay

## 11.1 Masonry / editorial grid

The grid uses mixed aspect ratios and heights. It looks more like a creative moodboard than a product catalog.

Characteristics:

- narrow gaps between tiles;
- tall vertical and shorter landscape tiles coexist;
- each tile is almost entirely image/video;
- rounded corners are present but restrained;
- no permanent title/description footer is visible on every card;
- grid density is high.

### 5Pixels adaptation

This style is excellent for **inspiration browsing**, but 5Pixels must preserve preset recognition and scanability. Recommended compromise:

- poster-first tile;
- title and small metadata can appear below or on a very subtle bottom gradient;
- hover/focus expands to a stronger action overlay;
- masonry is appropriate for curated editorial collections;
- standard 3–4 column grid may be better for full catalog / search results so users can compare presets consistently.

Use both layouts for different jobs rather than forcing one grid style everywhere.

## 11.2 Hover/focus treatment

One tile (`SMASH AND GRAB`) shows a full-card hover overlay:

- image darkens substantially;
- centered large white title appears;
- primary `Generate` button appears directly under title;
- button uses the fluorescent accent;
- underlying image remains visible enough to preserve context;
- CTA is only shown at moment of intent, so base grid stays visually clean.

This is excellent progressive disclosure.

### 5Pixels adaptation

For preset cards on desktop:

Idle:
- poster/preview media;
- minimal title/state badge;
- favorite control may remain persistently available if discoverability requires it.

Hover/focus:
- play short before → transformation → after preview when available;
- apply subtle dark scrim for text legibility;
- show preset name + short descriptor;
- show `Try this look` primary action;
- show secondary `View details` or make card body open detail;
- display credit cost only for authenticated users if useful;
- keyboard focus must trigger equivalent information and action access.

Do **not** make the primary CTA `Generate` directly from a card if the workflow requires source upload/configuration first. `Try this look` is more truthful and consistent with 5Pixels terminology.

## 11.3 Action immediacy

Higgsfield reduces the distance between discovery and creation by putting a generation action directly inside discovery cards.

### 5Pixels adaptation

5Pixels should similarly avoid a feeling that the user is browsing a static gallery. Every preset card should make the next action obvious.

Recommended flow:

`Hover/focus preset → Try this look → preset detail or lightweight create drawer (depending whether the user already knows the preset) → upload/configure → Generate`

For repeat users and known presets, a fast path can bypass the full detail page.

---

# 12. Cross-screen visual grammar extracted from Batch 01

## 12.1 Dark gallery, not “dark dashboard”

The background is almost black, but the experience does not feel like a typical developer tool because:

- imagery occupies large uninterrupted surfaces;
- borders are subtle;
- labels are short;
- settings are hidden until requested;
- there are few table-like structures;
- accent color appears in tightly controlled high-salience areas.

This is exactly the distinction 5Pixels needs to preserve.

## 12.2 Tonal elevation instead of shadows

Panels are distinguished by charcoal value changes more than dramatic drop shadows. Popovers are just light enough to read as elevated.

5Pixels should define a reliable surface stack:

- Page / ink 950;
- Media well / ink 900;
- Console / charcoal 850;
- Hover / charcoal 800;
- Selected row / charcoal 700-ish;
- Focus/keyline / lime.

Shadows can exist but should be soft and secondary.

## 12.3 Rounded rectangles are functional, not bubbly

Everything important has a radius, but surfaces are not excessively pill-shaped. Large panels use moderate rounding; chips use pill rounding.

This aligns with the 5Pixels bible’s 10–20px standard radii.

## 12.4 Concentrated accent color

Lime is used for:

- active nav text;
- labels/badges;
- checkmarks/highlights;
- primary Generate CTA;
- giant editorial headline.

Most surfaces remain monochrome. This makes lime feel meaningful.

For 5Pixels, this validates the “lime as signal” rule already in the design system.

## 12.5 High information density with low perceived complexity

The screens contain many features, models, filters, and settings, but the base view stays relatively calm because detail is compartmentalized into overlays and popovers.

The core principle to bring into 5Pixels:

> Complexity may exist in the system, but it should only become visible at the moment a user needs it.

## 12.6 Icon + label + value pattern

The generation console relies heavily on compact controls that combine:

- a small icon;
- a current value;
- a chevron or implicit click target.

This is ideal for bottom dock controls because it is faster to scan than form labels stacked above selects.

## 12.7 Full-row selection in popovers

Selected options get a tonal row background and a far-right check. This makes state obvious across a wide target area and improves touch/keyboard usability.

## 12.8 Descriptive secondary copy

Where choices are not self-evident, Higgsfield uses a one-line explanation rather than long help text. This is useful for 5Pixels’s compatibility, quality, and preset controls.

## 12.9 Overlays preserve page context

Selectors appear as anchored popovers rather than separate pages. Users can see the media/context behind them and mentally remain in the studio.

## 12.10 Media is allowed to crop

Previews prioritize visual impact and fill their tile. Perfect full-image visibility is less important during browsing than strong composition. Detail/result pages can provide uncropped viewing.

## 12.11 The app shell does not use sidebars in these consumer flows

This matters. Higgsfield keeps the consumer creation experience broad and media-centric. The absence of a permanent left sidebar preserves horizontal space for media.

For 5Pixels consumer app, prefer top nav + contextual overlays over a conventional SaaS sidebar. The separate admin console can use a denser left navigation because its job is different.

---

# 13. Micro-interactions inferred / recommended from the observed UI

The screenshots are static, so some behavior below is inference from the component states. These should be validated against later screenshots/video before treating them as exact Higgsfield behavior.

## 13.1 Navigation

- hover nav item → slight text brightening / subtle pill background;
- active nav item → persistent stronger state;
- open mega-menu → anchored fade/scale (very small motion, 120–180ms); avoid large drop animation;
- moving cursor from trigger into menu should not accidentally close it; include a short close delay or safe hover corridor;
- Escape closes;
- arrow-key navigation within menu is desirable for accessibility.

## 13.2 Menu rows

- hover → row or icon tile brightens;
- badge remains fixed, not animated continuously;
- click selects/navigates immediately;
- selected option is still hoverable but maintains check/highlight.

## 13.3 Console controls

- each pill subtly raises/brightens on hover;
- opening a popover should make the trigger look active;
- value updates in-place without console reflow;
- keyboard focus ring must be visible against dark background;
- tooltip delay around 300–500ms is reasonable for unlabeled micro-controls;
- tooltips should not appear instantly for controls that already have text labels.

## 13.4 Generate CTA

- on hover → slight luminance change / micro-lift, not glow explosion;
- on press → shallow scale/translation feedback;
- on generation start → CTA state changes immediately so double submits are impossible;
- cost is recalculated live when quality/resolution/options change;
- if a setting change increases cost, the updated cost should animate minimally or briefly highlight to draw attention without alarming the user.

## 13.5 Preset cards

- idle preview poster;
- hover/focus → preview starts, overlay fades in;
- moving away → preview can complete current short segment or pause gracefully rather than snapping constantly;
- favorite click should not trigger card navigation;
- `Try this look` should be a distinct interactive element with a sufficiently large hit area;
- on reduced motion → no autoplay; use static before/result frame or explicit Preview button.

---

# 14. Recommended 5Pixels authenticated app shell inspired by this batch

This is not the final design prompt yet; it is the structural direction to carry into later page-by-page work.

## 14.1 Desktop top navigation

**Left zone**
- 5Pixels mark
- Discover
- Explore
- optionally Categories or a compact Explore mega-menu trigger

**Right zone**
- Search
- Library
- Favorites
- Credits indicator
- Avatar/account

Potential commercial action:
- Upgrade may live in credit/account menu rather than permanent nav unless conversion data justifies a visible pill.

Avoid:
- exposing every internal tool as a top-level nav item;
- a permanent sidebar in normal consumer flows;
- excessively long nav labels.

## 14.2 Explore mega-menu

Two-column compact mega-menu, inspired by Higgsfield but shorter.

**Discover**
- Trending
- New
- Staff Picks
- Recommended for you (later/personalized)
- Favorites

**Categories**
- Portrait
- Cinematic
- Covers
- Illustration
- Professional
- Retro
- Fantasy
- Seasonal

Optional visual feature block at right on larger screens:
- one featured preset/collection poster with `Try this look`.

This would make the menu feel visual and unmistakably 5Pixels rather than a textual app directory.

## 14.3 Search

A global search palette should search:

- preset names;
- categories;
- collections;
- recent searches.

It can borrow S04’s searchable list structure and selected-row pattern.

---

# 15. Recommended 5Pixels `/app` — Discover Home direction

The sitemap says the authenticated home includes recent work, trending, recommended, favorites preview, and new presets.

Batch 01 suggests a layout that should feel like a streaming / visual discovery product rather than a dashboard:

## Page opening

- sticky top nav;
- no dense KPI region;
- optional small personalized greeting, not required;
- first major rail or billboard is visual.

## Sections

1. **Continue creating** — recent transformation or recent preset, compact horizontal rail.
2. **Trending now** — media-first preset cards with hover previews.
3. **Made for you** / Recommended — if recommendation data is credible; otherwise Staff Picks.
4. **Your favorites** — short preview rail with View all.
5. **New looks** — newly released presets.

Use a mixture of horizontal rails and 3–4 column grids; avoid one giant uniform list.

A persistent mini Transformation Console is not necessary on the Discover home unless a preset has already been selected. A better pattern is for the console to appear once the user commits to a preset.

---

# 16. Recommended 5Pixels `/app/explore` direction

This is where the Viral Presets reference is most applicable.

## 16.1 Header

- H1 or editorial billboard depending collection;
- small supporting line at most;
- search/filter controls immediately available;
- category chip set directly below.

## 16.2 Filter strategy

Desktop:
- inline chips for high-level categories;
- `Filters` button opens a compact panel/popover for secondary options;
- Sort: Trending / Newest / Staff Picks.

Mobile:
- horizontally scrollable category chips;
- Filter button opens bottom sheet.

## 16.3 Grid

Default full catalog:
- consistent card widths and predictable title placement for scanability.

Editorial collection page:
- optional masonry layout with mixed ratios.

## 16.4 Card behavior

Idle:
- preview poster;
- name;
- optional `New`, `Trending`, `Pro` badge;
- favorite control.

Hover/focus:
- short preview MP4;
- dark scrim;
- name + one-line outcome descriptor;
- `Try this look`;
- `View details` secondary interaction.

Authenticated-only metadata:
- credit cost if it helps decision-making.

Provider/model names must not appear on cards under the current product doctrine.

---

# 17. Recommended 5Pixels `/app/create/[presetSlug]` — Transformation Studio direction

This is the strongest proposed adaptation from the Higgsfield image studio.

## 17.1 Page layer 1 — media/context background

Depending user state:

**First use of preset**
- show 3–6 high-quality example results for this preset, possibly with source/result preview loops;
- examples remain subdued behind the console.

**Returning user**
- show user’s recent results with this preset;
- optionally mix in canonical examples when history is small.

## 17.2 Page layer 2 — Transformation Console

### Console top / main field

State 1: no source uploaded
- large `+ Add your photo` target;
- small compatibility note based on preset (`Best with one clearly visible face`);
- selected preset name shown in the console.

State 2: source uploaded / validating
- source thumbnail;
- filename is secondary;
- state copy: Uploading → Checking your photo;
- inline human-readable warning if needed.

State 3: source accepted
- thumbnail + `Replace`;
- compatibility badge such as `Good fit`;
- preset-specific user fields appear only now if they depend on source.

### Compact control row

Possible order:

1. preset chip (`Midnight Premiere`);
2. crop/aspect, only if preset allows;
3. preset-specific controls;
4. output option, only if meaningfully user-facing;
5. Advanced disclosure, optional;
6. credit summary;
7. Generate CTA.

Do not display 5 generic controls just because the layout has room. The console should remain sparse when a preset is simple.

## 17.3 Recommended model / engine behavior

Under the current 5Pixels doctrine, keep model routing hidden. If the user’s new product direction is to allow model choice, first update the product principles. If it is implemented without raw model names, place a compact `Rendering mode` control under Advanced, defaulting to `Recommended`.

## 17.4 Generation transition

When Generate is pressed:

- console can morph into status mode while route changes to `/app/generations/[id]`;
- selected source + preset remain visible so users never wonder what is being processed;
- use 5Pixels status phrases: Preparing your image → Applying the look → Refining details → Finalizing your result;
- avoid fake exact percentage unless truly measurable;
- credit state can read `2 credits reserved` while generation is running;
- on failure, clearly state that credits were returned/released.

---

# 18. Popover / modal component specification extracted from Batch 01

Create a reusable **Anchored Choice Popover** component.

## Geometry

- dark charcoal elevated surface;
- 16–20px radius;
- subtle 1px border or tonal edge;
- max-height with internal scrolling;
- anchored to triggering chip;
- smart placement: above or below based on viewport room;
- 12–20px internal padding depending density.

## Header variants

- simple title;
- search field + section label;
- title + helper copy when tradeoff needs explanation.

## Option row

- 44–56px minimum height desktop;
- icon or visual shape at left when useful;
- primary label;
- optional secondary description;
- optional status badge;
- checkmark at right when selected;
- entire row clickable;
- tonal selected background;
- separate visible keyboard focus ring.

## Behaviors

- click outside closes;
- Escape closes;
- trigger retains active state while open;
- no nested hover menus inside choice popovers unless unavoidable;
- selected value is automatically scrolled into view on open;
- search receives focus automatically only when user explicitly opens a search-oriented selector (avoid stealing focus on mobile);
- mobile equivalent becomes a bottom sheet when popover width/height would be cramped.

---

# 19. Preset badge system recommendation

Inspired by the compact badge intensity seen in Higgsfield, but adapted to 5Pixels.

| Badge | Meaning | Suggested visual treatment | Where used |
|---|---|---|---|
| NEW | recently published | lime micro-badge | cards, picker rows, collection chips |
| TRENDING | high recent engagement | warm/pale yellow micro-badge | cards, explore sections |
| STAFF PICK | editorial curation | cream/outlined badge | premium editorial surfaces |
| PRO / PLUS | entitlement required | restrained premium neutral/gold | cards, detail page, locked CTA |
| RECOMMENDED | best option for current preset/source | lime outline / five-pixel motif | advanced option picker |
| EXPERIMENTAL | less predictable outcome | warning-neutral, not danger red | advanced only |
| LIMITED | seasonal/time-limited | muted accent | collection/preset detail |

Do not let badges become decoration. Every badge must answer a useful decision question.

---

# 20. 5Pixels five-pixel motif opportunities revealed by this batch

Higgsfield relies on repeated brand marks and fluorescent chips. 5Pixels can achieve similar cohesion through its own five-pixel motif.

Recommended placements:

- active nav indicator: five tiny blocks or one five-unit glyph;
- selected popover row: tiny five-pixel mark next to check or instead of generic check in branded contexts;
- generation transition: five blocks progressing/assembling;
- hover preset card: subtle five-pixel spark near `Try this look`;
- empty gallery cells/loading skeletons: five-pixel watermark;
- credit icon can remain a distinct icon; do not force the motif into every semantic role.

Avoid pixel-art borders or retro-game styling. The motif should remain abstract and modern.

---

# 21. Interaction state matrix to design later

| Component | Idle | Hover | Focus | Active/Open | Selected | Disabled | Loading/Error |
|---|---|---|---|---|---|---|---|
| Top-nav item | muted/primary text | brighter / subtle surface | visible focus ring | pill/background | active nav treatment | n/a | n/a |
| Mega-menu row | icon tile + text | row/icon brightens | strong ring | n/a | optional current-page state | muted | n/a |
| Preset card | poster/static | preview + scrim + CTA | same info as hover | pressed feedback | optional selected source | locked overlay | media skeleton/fallback |
| Console chip | dark pill | raised tonal surface | lime focus ring | active tonal state | current value visible | lower contrast | pending spinner if value fetching |
| Choice row | normal | tonal hover | focus outline | pressed | tonal selected + check | muted | inline failure only when option unavailable |
| Generate CTA | lime | brighter/micro-lift | dark+lime focus contrast | press feedback | n/a | tonal disabled + reason | progress / retry state |
| Favorite | outline icon | brighter | focus ring | press pulse | filled/saved | n/a | optimistic + revert on failure |
| Source upload | dropzone/plus | highlight | focus ring | drag-over | thumbnail accepted | n/a | upload/validation/warning/rejected |

---

# 22. Accessibility notes from the observed patterns

Some of Higgsfield’s low-contrast gray text is visually elegant but 5Pixels should not copy contrast blindly.

Requirements for the 5Pixels interpretation:

- verify contrast for all muted text against ink/charcoal surfaces;
- every hover-only card action must have keyboard-focus equivalent;
- menu/popover rows must be semantic buttons/options, not clickable divs;
- badges cannot be the sole carrier of locked/new/trending meaning if color is the only difference;
- tooltip-only labels are acceptable only for conventional icons; ambiguous controls need accessible names and preferably visible text;
- 44px-ish touch targets on mobile;
- bottom sheet controls need clear drag handle only if the sheet is actually draggable; do not use decorative handles without behavior;
- preview autoplay must respect reduced motion and mobile performance constraints;
- focus should not disappear into the lime-on-black palette; design a consistent high-visibility focus treatment.

---

# 23. Responsive translation

## Desktop

- full top nav;
- anchored mega-menus;
- wide floating transformation console;
- 3–4 column catalog grids;
- masonry for editorial collections;
- hover previews and card overlays.

## Tablet

- condense nav labels;
- move lower-priority destinations into account/more menu;
- console narrows and may wrap controls into two rows;
- popovers remain anchored if enough room.

## Mobile

- top bar: logo, search, credits/avatar, menu;
- category chips scroll horizontally;
- filters/configuration use bottom sheets;
- create console becomes sticky bottom CTA + expandable sheet;
- no hover dependency;
- preset preview starts only when sufficiently visible or user taps Preview;
- card metadata must remain available without hover;
- maintain one-handed primary action.

---

# 24. What 5Pixels should NOT copy from this Higgsfield batch

## 24.1 Do not copy the sprawling product-suite nav

5Pixels V1 is a focused preset transformation product. A huge nav would falsely imply a suite of disconnected tools and make the experience more technical.

## 24.2 Do not copy the free-text prompt composer

This would directly contradict the preset-first product promise.

## 24.3 Do not expose vendor model names by default

Higgsfield treats models as user-facing products. 5Pixels currently treats models as infrastructure. This difference is strategic, not cosmetic.

## 24.4 Do not add batch generation because the control looks good

The UI pattern is elegant, but batch generation is outside current V1 scope.

## 24.5 Do not copy the exact fluorescent hue / badge styling

5Pixels already has its own vivid lime direction. Use the 5Pixels token system, warm off-white typography, and five-pixel motif.

## 24.6 Do not copy every asymmetric grid

Masonry is excellent for inspiration but can hurt fast comparison. Use a more systematic grid where users need to scan preset names, costs, or compatibility.

## 24.7 Do not hide essential metadata only behind hover

Higgsfield can be aggressive about media-only cards. 5Pixels should keep critical preset identification and accessibility intact across touch devices and keyboard navigation.

---

# 25. Product decisions surfaced by this batch

These should be resolved before final high-fidelity create-flow design.

## Decision 1 — Are consumer-visible model choices now part of 5Pixels?

Current docs: no.  
New direction mentioned in this batch: possibly yes, with recommended/default models and other freely selectable models.

**Recommendation:** preserve the current product thesis by default. If user choice is important, expose an abstracted `Rendering mode` under Advanced rather than vendor/model names. If explicit model names are desired, update the canonical product principles first so design/engineering are not working from contradictory assumptions.

## Decision 2 — Should `/app/create/[presetSlug]` be a dedicated page or a persistent overlay/dock over discovery/history?

Current sitemap specifies a dedicated create route. Higgsfield suggests the page can still *look* like a dock over media. These are compatible: keep the dedicated route but use a gallery-backed studio composition.

## Decision 3 — How much output control should consumers get?

Higgsfield exposes aspect, quality, resolution, batch size. 5Pixels’s thesis favors controlled simplicity.

**Recommendation:** preset controls first; expose aspect only when allowed; quality/resolution only when there is a clear user-facing tradeoff; hide everything else.

## Decision 4 — Does “Try this look” open detail or fast-create?

For first-time or compatibility-sensitive presets, detail first is safer. For repeat users, a fast path can open the create console immediately. We should design both entry behaviors and decide based on context.

## Decision 5 — Standard grid vs masonry

Use standard grid for catalog/search; masonry for editorial collections / Trending / seasonal showcase. This preserves both visual excitement and scanability.

---

# 26. Component inventory created from Batch 01

These are components that should eventually receive individual Figma design prompts/specs.

1. Authenticated desktop top navigation.
2. Authenticated compact/mobile navigation.
3. Explore mega-menu.
4. Global search palette.
5. Category chip.
6. Status micro-badge.
7. Preset card — standard grid.
8. Preset card — editorial/masonry.
9. Preset card hover/focus overlay.
10. Transformation Console — empty source state.
11. Transformation Console — validating state.
12. Transformation Console — ready state.
13. Transformation Console — generating state.
14. Transformation Console — failure state.
15. Source upload control.
16. Preset selector popover.
17. Aspect ratio popover.
18. Generic anchored choice popover.
19. Rendering mode / model override popover (only if product decision approves).
20. Output quality picker.
21. Output resolution picker.
22. Credit-cost display inside primary action.
23. Tooltip.
24. Inline stepper pattern (future/admin use; not V1 batch generation).
25. Desktop sticky/floating dock behavior.
26. Mobile bottom-sheet configuration equivalent.
27. Loading/skeleton media tile.
28. Empty media tile / first-use guidance.

---

# 27. Page/sub-page mapping from Batch 01 into the existing 5Pixels sitemap

| 5Pixels route/surface | Higgsfield pattern from this batch | Adaptation |
|---|---|---|
| `/app` | media-led home / gallery philosophy | rails for recent, trending, recommended, favorites, new |
| `/app/explore` | Viral Presets | category chips + media-first catalog + hover Try this look |
| `/app/presets/[slug]` | not directly shown in batch | card/preview grammar carries forward; wait for later references |
| `/app/create/[presetSlug]` | Image generation studio | gallery-backed dedicated route + floating Transformation Console |
| `/app/generations/[id]` | generation CTA/state concept | morph console into truthful stage-based status |
| `/app/results/[id]` | background media/history hints only | needs later reference batch before full spec |
| `/app/library` | generation grid | media-first history grid with filters |
| `/app/favorites` | discovery cards | same preset card system, saved-state emphasis |
| global search overlay | searchable model picker | search presets/categories/collections instead of models |
| filter/control drawers | aspect/quality/resolution popovers | generic anchored popover desktop; bottom sheet mobile |

---

# 28. Early design direction for visual tokens

These are not new canonical tokens; they are batch-derived refinements to test in Figma against the existing 5Pixels system.

## Surfaces

- use true/near black only for deepest canvas;
- console should be visibly lifted via charcoal, not by glow;
- selected rows may be one tonal step brighter;
- thin borders should be low contrast and disappear behind strong imagery.

## Accent

- keep 5Pixels lime `#82EA3A` / calibrated variant as the main action signal;
- warm off-white remains primary text;
- consider pale yellow only for secondary semantic state such as Trending;
- destructive red remains isolated from brand accent.

## Typography

- UI labels should remain neutral grotesk and quiet;
- large editorial category titles can use the display face in uppercase selectively;
- badges can use a more energetic compact style but must remain readable.

## Spacing

Higgsfield demonstrates that dense interfaces can still feel premium when groups have generous *outer* padding even if row spacing is compact. For 5Pixels:

- large overlays: 20–30px outer padding;
- option rows: 10–15px internal vertical rhythm;
- console: 20–30px external inset from viewport and 20px-ish internal gap;
- gallery gaps: 10–20px depending layout density;
- giant editorial headers: 60–120px breathing room.

---

# 29. Proposed 5Pixels-specific interaction concept: “Recommended by the Preset”

This is a direct response to the model-selector idea while protecting the preset-first principle.

Instead of a raw model chooser in the normal action console:

- the console shows a compact chip: `Recommended` with a small five-pixel icon;
- this chip is optional and may be hidden completely for normal users;
- if opened, the popover heading reads `Rendering mode` rather than `Model`;
- top section: `Recommended for Midnight Premiere`;
- lower section: `Other compatible modes`;
- each mode has a one-line outcome description and speed/credit indicator;
- raw vendor/model names remain in admin/debug surfaces only.

This borrows Higgsfield’s excellent chooser UX without turning 5Pixels into an AI model marketplace.

---

# 30. Proposed create-console content hierarchy

A polished 5Pixels console should answer these questions left-to-right / top-to-bottom:

1. **What look am I applying?** — preset thumbnail/name.
2. **What image am I applying it to?** — source thumbnail/upload.
3. **Is my image suitable?** — compatibility state.
4. **What can I safely change?** — only preset-exposed controls.
5. **What will I get / what will it cost?** — output/credit summary.
6. **What do I do next?** — dominant Generate button.

Nothing else should compete with these six questions.

This is the clearest 5Pixels interpretation of Higgsfield’s action console.

---

# 31. Recommended first-use vs returning-use studio behavior

## First use

Background:
- canonical preset examples.

Console:
- strong source upload prompt;
- compatibility tip;
- no advanced settings expanded;
- Generate disabled until accepted source.

## Returning use

Background:
- recent personal results for this preset or related presets.

Console:
- last source can optionally be offered as a recent choice, but do not silently reuse without clear confirmation;
- prior compatible settings may be remembered if privacy/product policy allows;
- user can quickly Replace source and Regenerate.

This makes the same studio feel educational to a new user and fast to a repeat user.

---

# 32. Notes for future Figma prompts

When we eventually produce page-by-page designer prompts, each prompt should include:

- route / page objective;
- user state(s);
- exact information hierarchy;
- desktop composition;
- mobile composition;
- components required;
- interaction states;
- modal/popover dependencies;
- empty/loading/error states;
- copy examples;
- 5Pixels token guidance;
- which Higgsfield references inform the behavior;
- explicit “do not copy” constraints;
- accessibility requirements;
- acceptance checklist.

This will prevent the design process from becoming a series of disconnected attractive screens.

---

# 33. Batch 01 takeaways to preserve when reviewing later screenshots

- The app should remain **visual first** even when sophisticated configuration exists.
- The most complex controls should appear in **anchored overlays**, not persistent settings panels.
- A **large docked/floating creation console** is a strong candidate for 5Pixels’s create experience.
- Media history/examples can remain visible behind generation controls and make the product feel alive.
- Badges are best when tiny, concentrated, and semantic.
- Searchable choosers should show short explanatory descriptions and strong selected states.
- Category discovery can be editorial, energetic, and high density without becoming a dashboard.
- Hover/focus overlays can turn browsing into immediate action without cluttering idle cards.
- The 5Pixels version must replace Higgsfield’s prompt/model orientation with preset/source/compatibility orientation.
- Model choice and batch generation are not currently canonical V1 features; do not smuggle them in through visual imitation.

---

# 34. What I want to inspect in the next screenshot batch

To complete the main-app plan, later batches will be especially useful if they contain any of the following Higgsfield surfaces:

- preset/detail pages;
- actual generation/loading states;
- completed result detail / compare/download actions;
- library/history/asset management;
- favorites/saved flows;
- account/profile menu;
- pricing/credits/upgrade modals;
- image upload flows;
- search UI;
- mobile layouts or responsive states;
- error/empty states;
- notifications/toasts;
- share/download dialogs;
- any preset-specific configuration workflows;
- any onboarding/auth transitions into the app.

The next batch can be appended to this same research structure before producing the final page-by-page 5Pixels design prompts.

---

# 35. Source-of-truth caution

This research deliberately distinguishes **Higgsfield inspiration** from **5Pixels canonical requirements**.

Where the Higgsfield reference conflicts with 5Pixels’s current documentation, the 5Pixels documentation wins until the product decision is explicitly changed. The two clearest conflicts in Batch 01 are:

- Higgsfield exposes free-text prompting; 5Pixels V1 does not.
- Higgsfield exposes model selection and batch size; 5Pixels currently hides model routing and excludes batch generation.

That distinction should remain explicit throughout the design process so that visual inspiration does not accidentally rewrite the product strategy.

