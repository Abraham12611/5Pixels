# 5Pixels — Preset System and Content Model

# 1. Preset as product object

A preset is not simply text.

A preset has:
- identity;
- presentation;
- compatibility;
- user input schema;
- private AI recipe;
- model routing;
- optional reference assets;
- post-processing;
- quality rules;
- pricing;
- availability;
- analytics;
- version history.

---

# 2. Public preset entity

Fields:
- id;
- slug;
- name;
- short_description;
- long_description;
- category_id;
- collection_ids;
- status;
- visibility;
- hero_asset_id;
- poster_asset_id;
- preview_video_asset_id;
- preview_gif_asset_id;
- badges;
- tags;
- featured_rank;
- created_at;
- updated_at.

---

# 3. Preset version

A new version is created whenever generation behavior materially changes.

Fields:
- preset_id;
- version_number;
- lifecycle_state;
- private_instruction_template;
- negative_instruction_template if supported;
- provider_strategy;
- model identifier;
- model snapshot/revision if available;
- model parameters;
- reference asset bindings;
- input schema version;
- post-processing config;
- safety policy version;
- evaluation profile;
- credit cost;
- published_at;
- retired_at.

Never mutate an old generation to point to a new version.

---

# 4. Lifecycle states

Recommended:
- draft;
- internal_test;
- benchmark;
- private_beta;
- scheduled;
- active;
- paused;
- retired.

Public preset can remain active while a new version is in testing.

---

# 5. Preset categories

Suggested initial:
- Portrait
- Cinematic
- Illustration
- Covers
- Retro
- Professional
- Fantasy
- Seasonal

Collections are separate from categories.

Examples:
- Trending this week
- Summer
- Best for profiles
- New
- Staff picks

---

# 6. Input compatibility

Each preset can define:
- minimum width;
- minimum height;
- accepted aspect ratios;
- preferred aspect ratio;
- maximum people count;
- minimum face count;
- maximum face count;
- face visibility expectation;
- full-body vs portrait compatibility;
- pet support;
- landscape support;
- text/image-object support;
- low-light tolerance.

Compatibility should produce:
- pass;
- warning;
- block.

---

# 7. User-configurable controls

Supported control types:
- short text;
- long-ish short text with strict limit;
- select;
- radio;
- segmented control;
- toggle;
- color swatch;
- aspect ratio;
- intensity;
- layout;
- background;
- wardrobe;
- era;
- mood.

Controls are schema-driven.

Example:

```json
{
  "id": "background",
  "type": "select",
  "label": "Background",
  "required": true,
  "options": [
    {"value":"gray","label":"Gray"},
    {"value":"office","label":"Office"},
    {"value":"outdoor","label":"Outdoors"}
  ]
}
```

---

# 8. User text fields

Treat values as literal data.

Requirements:
- length limits;
- character validation;
- profanity/safety checks where required;
- no arbitrary prompt semantics;
- explicit quoting/delimiting when inserted into model request;
- preferably deterministic rendering for exact typography.

For text-heavy presets:
AI should create visual composition, while server renderer adds exact text.

---

# 9. Preview content

Every public preset should ideally have:
- static poster;
- landing-card short MP4;
- optional GIF fallback;
- detail hero preview;
- 3–8 example outputs;
- optional source/result pairs.

Landing preview video:
- 3–5 seconds;
- muted;
- compact;
- shows before → after;
- not a draggable slider.

---

# 10. Likeness requirement

Field:
- very_high;
- high;
- medium;
- creative.

Used for:
- model selection;
- QA scoring;
- user-facing explanation;
- evaluation weighting.

---

# 11. Generation strategy

A preset version may route to:
- primary model;
- tested fallback version/model;
- no fallback.

Fallback recipe must be tested separately.

Do not send the exact same instructions blindly to every provider.

---

# 12. Reference assets

Kinds:
- style reference;
- composition reference;
- lighting reference;
- typography/layout reference;
- background reference.

Metadata:
- ownership/license;
- source;
- internal_only;
- provider usage permissions;
- checksum;
- version.

Never rely on an unlicensed third-party image as a private production reference.

---

# 13. Post-processing

Possible stages:
- resize;
- crop;
- color adjustment;
- exact text renderer;
- frame;
- border;
- logo-free output;
- texture overlay;
- format conversion;
- compression;
- metadata stripping.

Each post-process step must be versioned with preset version.

---

# 14. Credit cost

Preset version can define:
- standard credit cost;
- premium cost;
- plan restrictions;
- promotional override.

Credit cost should reflect:
- model cost;
- average retry rate;
- post-processing;
- margin target;
- quality tier.

---

# 15. Preset analytics

Per preset:
- views;
- card preview plays;
- detail opens;
- use rate;
- completion;
- latency;
- failure;
- block rate;
- regenerate rate;
- download;
- save;
- negative feedback;
- cost;
- gross margin.

---

# 16. Preset publishing checklist

Before active:
- public content complete;
- preview assets generated;
- compatible-input rules defined;
- private recipe saved;
- provider configured;
- fallback decision made;
- golden benchmark passed;
- human QA passed;
- safety policy confirmed;
- cost known;
- analytics ready;
- rollback version available.

---

# 17. Retiring presets

Retired presets:
- remain in old generation history;
- should not be selectable;
- may redirect public URL to alternative;
- preserve metadata for analytics/audit;
- must not break result pages.

---

# 18. Preset naming guidelines

Names should feel curated and collectible.

Good:
- Midnight Premiere
- Founder Studio
- Summer '96
- Ink Rush
- Dream Sequence

Weak:
- Cinematic Filter 7
- AI Style 2
- Professional Preset B

---

# 19. Preset copy guidelines

Title: distinctive.
Description: one outcome sentence.
Best for: concise compatibility.
Avoid technical wording.

Example:

**Founder Studio**  
"Clean, editorial studio lighting for a polished professional portrait."

Best for:
- one person;
- shoulders-up;
- clear face;
- medium/high likeness.

---

# 20. Preset schema north star

A designer/content operator should be able to create and publish a new preset without an application code deployment.
