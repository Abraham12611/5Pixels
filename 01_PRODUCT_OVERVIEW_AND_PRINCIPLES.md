# 5Pixels — Product Overview and Principles

# 1. Product definition

5Pixels is a curated AI image-transformation application.

Users select from professionally designed presets. A preset is a productized transformation recipe containing private instructions, optional reference assets, AI model routing, output requirements, user-configurable fields, post-processing rules, quality expectations, and pricing metadata.

The consumer never sees or edits the private generation instructions.

---

# 2. Core user promise

**Pick the look. Upload your photo. 5Pixels handles the rest.**

The interface should remove the burden of:
- prompt writing;
- model selection;
- AI terminology;
- generation parameter tuning;
- reference-image construction;
- post-processing decisions.

The user makes creative choices. 5Pixels handles technical execution.

---

# 3. Why 5Pixels exists

Generic AI image tools assume users want to describe what they want.

5Pixels assumes many users instead want to:
- browse visually;
- discover something attractive;
- choose from a known outcome;
- avoid prompt engineering;
- maintain identity and subject fidelity;
- get repeatable results.

This turns AI image transformation into a retail-like discovery experience.

---

# 4. Product positioning

5Pixels should feel closer to:
- a curated fashion/editorial catalog;
- a premium visual effects shelf;
- a modern photo app;
- a streaming-style discovery product;

and less like:
- a prompt console;
- a node editor;
- an AI laboratory;
- an engineering dashboard;
- a blank creative canvas.

---

# 5. Primary customer jobs

## 5.1 Personal expression
"I want to see myself in a dramatically different visual treatment."

## 5.2 Profile / professional
"I want a high-quality headshot or professional-looking portrait."

## 5.3 Social publishing
"I want something visually interesting enough to post."

## 5.4 Creative packaging
"I want my photo to become a cover, poster, editorial piece, or graphic artwork."

## 5.5 Fast experimentation
"I want to try several styles without learning prompting."

---

# 6. Initial audience hypotheses

The first launch can support several overlapping segments:

### Everyday visual creators
People who want shareable transformations and polished personal imagery.

### Social creators
People who need repeatable, visually distinctive content.

### Professionals
Founders, speakers, freelancers, and job seekers using portrait presets.

### Design-curious consumers
People who are not designers but have strong taste and recognize looks they like.

### Small creative teams
Potential later segment; useful after individual workflows are proven.

---

# 7. Product vocabulary

Consumer-facing terms:
- Preset
- Look
- Transformation
- Original
- Result
- Collection
- Category
- Trending
- Save
- Try this look
- Regenerate
- Adjust
- Download

Avoid or hide:
- prompt
- system prompt
- CFG
- seed
- inference
- checkpoint
- LoRA
- temperature
- token
- scheduler
- model routing

"Prompt" may appear in marketing only in phrases like "No prompt required."

---

# 8. What a preset is

A preset is a versioned transformation product.

It may define:
- public name;
- slug;
- category;
- marketing description;
- static thumbnail;
- preview MP4/GIF;
- detail-page examples;
- compatibility constraints;
- user controls;
- private generation instructions;
- optional reference images;
- provider/model routing;
- fidelity target;
- output aspect ratio;
- quality tier;
- expected latency class;
- post-processing;
- text/layout renderer;
- moderation rules;
- credit cost;
- availability;
- version state;
- experiment state.

---

# 9. Core transformation modes

## AI style transformation
Whole-image visual restyling.

Examples:
- illustrated;
- cinematic;
- vintage;
- fantasy.

## AI semantic edit
Mostly preserve the image but alter context.

Examples:
- studio headshot;
- business attire;
- night scene;
- seasonal environment.

## Reference-guided transformation
User image + private 5Pixels reference images.

Useful for:
- editorial looks;
- controlled art direction;
- poster aesthetics;
- consistent visual language.

## AI + deterministic composition
AI produces the transformed image, then 5Pixels adds exact text/layout with software.

Use for:
- magazine covers;
- posters;
- album artwork;
- event designs;
- title cards.

This is preferred when text must be exact.

---

# 10. Product principles

## P1. Preset-first
Every user journey should begin from a recognizable result or category.

## P2. Images are evidence
Marketing claims should be paired with visible outcomes.

## P3. Quality over catalog size
No preset should launch merely to increase count.

## P4. Fidelity is explicit
A preset declares whether likeness preservation is high, medium, or creative.

## P5. Failure should not cost the user
Failed generation attempts should not permanently consume credits.

## P6. AI provider is infrastructure
The product must not depend conceptually on one model vendor.

## P7. Presets behave like software
They have versions, QA, experiments, rollbacks, and telemetry.

## P8. Progressive disclosure
Discovery pages stay simple. Details appear only after the user chooses a preset.

## P9. Mobile image workflows matter
Upload, crop, generation state, and result comparison must be excellent on phones.

## P10. Privacy is part of perceived quality
Users should understand how their photos are handled.

---

# 11. Success definition

A good session is not "a generation completed."

A good session is:
1. user discovers a preset;
2. user uploads;
3. generation succeeds;
4. user believes the result still meaningfully represents them or their source;
5. user saves/downloads/shares;
6. user tries another preset or returns later.

---

# 12. Core metrics

Primary:
- preset selection rate;
- upload-to-generation conversion;
- generation success rate;
- result download rate;
- result save rate;
- result satisfaction;
- repeat generation rate;
- repeat user rate.

Quality diagnostic:
- average regenerations per successful download;
- "doesn't look like me" feedback rate;
- artifact feedback rate;
- failure rate;
- blocked-generation rate;
- latency;
- cost per successful downloadable output.

Commercial:
- trial-to-paid conversion;
- paid retention;
- credit utilization;
- revenue per successful generation;
- gross margin per preset;
- subscription churn.

---

# 13. V1 scope

V1 should prove:
- people want curated preset-based AI transformations;
- users understand the workflow without prompting;
- the preset catalog can be managed without code deploys;
- model/provider routing can be abstracted;
- generation quality is sufficiently consistent;
- unit economics are viable.

---

# 14. Future expansion options

Not V1 commitments:
- multiple user reference images;
- video presets;
- preset creator marketplace;
- user-created private presets;
- free-form prompts;
- team plans;
- batch workflows;
- social feed;
- creator storefronts;
- API access;
- brand/workspace presets.

Each future feature should preserve the original advantage: **fast outcome selection with minimal configuration**.
