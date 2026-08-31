# 5Pixels — Build Phases and Implementation Roadmap

# Principle

Build the smallest complete vertical slice first.

Do not begin by implementing every screen and every admin feature.

---

# Phase 0 — Product and AI feasibility

## 0.1 Lock product constraints
Deliverables:
- no free-form prompts;
- one source image;
- preset-first;
- initial categories;
- privacy posture;
- initial billing concept.

## 0.2 Provider benchmark
Build small script/lab:
- 20–50 source images;
- 3 prototype presets;
- compare models.

## 0.3 Cost model
Estimate:
- average provider cost;
- retry;
- storage;
- post-process;
- target gross margin.

## Exit criteria
At least 3 preset archetypes produce acceptable results:
1. style transformation;
2. identity-sensitive transformation;
3. AI + exact text/layout.

---

# Phase 1 — UX and design foundation

## 1.1 Brand system
- logo;
- lime/black/cream palette;
- type;
- spacing;
- components.

## 1.2 Product wireframes
- landing;
- explore;
- preset detail;
- create;
- generation;
- result;
- library.

## 1.3 Prototype
Clickable design prototype.

## Exit criteria
A test user can explain how product works without being taught prompts.

---

# Phase 2 — Technical foundation

## 2.1 Repo
- monorepo or clear modular structure;
- environment setup;
- CI.

## 2.2 Auth
- signup/login;
- session;
- account.

## 2.3 Database
- users;
- presets;
- versions;
- assets;
- generations.

## 2.4 Storage
- signed upload;
- private media;
- CDN public assets.

## Exit criteria
User can sign in and upload a valid private image.

---

# Phase 3 — Vertical generation slice

## 3.1 Preset catalog hard-coded or minimally database-driven
Only 3 presets.

## 3.2 Create flow
- upload;
- validate;
- options.

## 3.3 Queue + worker
- create generation;
- provider call;
- result.

## 3.4 Result screen
- view;
- download;
- retry.

## Exit criteria
End-to-end:
landing/explore -> preset -> upload -> generate -> result.

---

# Phase 4 — Preset system proper

## 4.1 Preset versions
- draft/active;
- config.

## 4.2 Dynamic fields
Schema-driven form controls.

## 4.3 Reference assets
Internal storage.

## 4.4 Provider routing
Primary/fallback interface.

## 4.5 Post-processing
Exact text renderer.

## Exit criteria
New preset can be configured without application code change.

---

# Phase 5 — Landing and discovery

## 5.1 Production landing
All key sections.

## 5.2 Curated Preset videos
Create MP4 preview pipeline.

## 5.3 Explore
- category;
- filters;
- search.

## 5.4 Preset detail
Public + signed-in states.

## Exit criteria
Marketing funnel is complete and performant.

---

# Phase 6 — Library and retention features

## 6.1 Library
History.

## 6.2 Favorites
Preset saves.

## 6.3 Result feedback
Structured quality feedback.

## 6.4 Asset deletion
User controls.

## Exit criteria
User can return, find work, and manage it.

---

# Phase 7 — Billing and credits

## 7.1 Ledger
Transactions.

## 7.2 Plan metadata
Free/Creator/Pro concept.

## 7.3 Checkout
Subscription.

## 7.4 Credit pack
Optional.

## 7.5 Failed generation refund
Automated.

## Exit criteria
Paid generation is financially and transactionally safe.

---

# Phase 8 — Admin Preset Studio

## 8.1 Preset list/editor
## 8.2 Versioning
## 8.3 Test lab
## 8.4 Publish/pause/rollback
## 8.5 Preview media management

## Exit criteria
Content team can manage catalog independently.

---

# Phase 9 — Safety, privacy, and operational hardening

## 9.1 Moderation
## 9.2 Retention
## 9.3 Account deletion
## 9.4 Admin RBAC
## 9.5 Audit
## 9.6 Rate limiting

## Exit criteria
Launch security/privacy checklist passes.

---

# Phase 10 — Analytics and QA

## 10.1 Event tracking
## 10.2 Preset dashboards
## 10.3 Golden dataset
## 10.4 Benchmark runner
## 10.5 Quality alerts

## Exit criteria
Team can objectively identify failing presets and provider regressions.

---

# Phase 11 — Private beta

Cohort:
small controlled audience.

Goals:
- quality;
- latency;
- understanding;
- pricing;
- catalog interest.

Track:
- negative feedback;
- retries;
- support.

---

# Phase 12 — Public V1

Launch requirements:
- 20–30 tested presets;
- 5–8 categories;
- stable billing;
- deletion/privacy;
- admin controls;
- analytics;
- support process.

---

# Post-V1 candidate phases

## V1.1
- better recommendations;
- more presets;
- mobile polish;
- additional output sizes.

## V1.2
- multi-image references;
- stronger cover/poster editor;
- creator collections.

## V2
Potential:
- native mobile;
- video;
- user-created presets;
- marketplace;
- teams.

---

# Suggested engineering order inside a sprint

For each feature:
1. data contract;
2. backend;
3. frontend states;
4. analytics;
5. error states;
6. tests;
7. documentation.

---

# What not to parallelize too early

Avoid simultaneously building:
- full billing;
- full admin;
- social feed;
- dozens of presets;
- native mobile.

Until the core 3-preset vertical slice works.

---

# Phase-gate question

At the end of every phase ask:

**What uncertainty did this phase eliminate?**

If it eliminates none, it may be premature work.
