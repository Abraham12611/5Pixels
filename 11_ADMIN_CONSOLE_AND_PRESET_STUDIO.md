# 5Pixels — Admin Console and Preset Studio

# 1. Why admin tooling is essential

5Pixels should not require a code deployment to:
- create a preset;
- update preview media;
- change public copy;
- route to a model;
- change credit cost;
- run QA;
- publish;
- pause;
- rollback.

The Preset Studio is core product infrastructure.

---

# 2. Admin home

Dashboard:
- generations today;
- success rate;
- provider status;
- queue depth;
- failed jobs;
- blocked jobs;
- spend;
- top presets;
- recent publishes.

---

# 3. Preset list

Columns:
- preset;
- category;
- active version;
- state;
- preview;
- credit cost;
- success rate;
- satisfaction;
- last updated.

Filters:
- active;
- draft;
- testing;
- paused;
- retired;
- category;
- owner/editor.

Actions:
- open;
- duplicate;
- pause;
- archive.

---

# 4. Preset editor tabs

## Overview
Name, slug, category, description.

## Public media
Poster, preview MP4, GIF fallback, examples.

## Input requirements
Face count, dimensions, aspect, subject constraints.

## User controls
Schema editor.

## AI recipe
Private instructions.

## References
Internal reference assets.

## Routing
Primary model/provider, fallback.

## Post-processing
Text overlays, crop, resize, export.

## Pricing
Credit cost, plan access.

## Safety
Preset restrictions.

## Testing
Manual source uploads.

## Benchmark
Golden dataset.

## Analytics
Funnel and quality.

## Publishing
Version compare, schedule, rollback.

## Audit
History.

---

# 5. Version workflow

Create new version from:
- blank;
- duplicate current;
- duplicate older.

Diff view:
- instruction changes;
- model change;
- fields;
- references;
- post-process;
- pricing.

---

# 6. Manual test lab

Admin can upload:
- private source test image;
- select preset version;
- run one or more providers;
- compare outputs;
- score.

Should clearly show cost.

---

# 7. Benchmark lab

Select:
- preset version;
- dataset;
- providers;
- models;
- sample count.

Output:
- gallery;
- scores;
- failure;
- cost;
- latency;
- side-by-side.

---

# 8. Publish gates

Cannot publish if:
- missing poster;
- missing preview video where required;
- no primary provider;
- invalid schema;
- no credit cost;
- benchmark gate not met;
- safety config missing.

Allow authorized override with audit only if necessary.

---

# 9. Rollback

One-click rollback to previous production version.

Roll back:
- future traffic only;
- old generation records remain attached to original version.

---

# 10. Generation operations

Generation list:
- generation ID;
- user;
- preset;
- status;
- provider;
- latency;
- credits;
- cost;
- failure reason.

Detail:
- timeline;
- source metadata;
- provider attempts;
- safe thumbnail access if authorized;
- output;
- ledger event;
- logs reference.

---

# 11. Support user view

Search by:
- email;
- user ID;
- generation ID.

Support actions:
- view non-sensitive summary;
- resend verification;
- grant/refund credits;
- see plan;
- see generation failures.

Sensitive asset viewing should require elevated permission.

---

# 12. Safety review

Queue:
- blocked generation;
- flagged source;
- flagged text;
- repeated abuse.

Actions:
- confirm;
- dismiss;
- suspend user;
- note;
- escalate.

---

# 13. Analytics admin

Preset dashboard:
- views;
- preview plays;
- use rate;
- success;
- download;
- feedback;
- cost;
- margin.

Provider dashboard:
- latency;
- errors;
- cost;
- fallback usage.

---

# 14. Experiments

Admin can define:
- target population;
- variants;
- metric;
- start/end;
- sample allocation.

Examples:
- preset thumbnail;
- CTA wording;
- preset version;
- model routing.

---

# 15. Roles

Suggested:
- Super Admin
- Product Admin
- Preset Editor
- QA Reviewer
- Support
- Safety Reviewer
- Analyst

Least privilege.

---

# 16. Audit

Log:
- who;
- what;
- entity;
- before;
- after;
- time;
- reason for high-risk action.

---

# 17. Admin UX principle

Admin console can be dense and operational.

Consumer UX should be simple.

Do not force consumer design constraints into internal tools.
