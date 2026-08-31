# 5Pixels — Decision Log and Open Questions

# Locked / current decisions

## D001 — Preset-first product
Users do not enter arbitrary prompts in V1.

## D002 — Private transformation instructions
Preset intelligence is server-side and inaccessible to consumers.

## D003 — Controlled inputs allowed
Preset-specific fields such as title, color, background, layout, mood, wardrobe are allowed.

## D004 — Provider abstraction
5Pixels will not be architecturally tied to one model vendor.

## D005 — Versioned presets
Generation behavior is versioned and immutable for historical jobs.

## D006 — Web-first
Responsive web first; native mobile later.

## D007 — Brand direction
Primary direction:
- black/charcoal;
- warm off-white;
- vivid lime green signal color;
- subtle five-pixel motif.

The earlier cobalt-heavy brand direction is superseded.

## D008 — Curated Presets landing previews
Do not use draggable before/after sliders.

Use:
- short MP4 preferred;
- GIF fallback;
- controlled hover/viewport playback.

## D009 — Exact text where needed
For title-heavy designs, prefer deterministic post-processing.

## D010 — Credit ledger
Credits use transaction ledger, not only mutable balance.

## D011 — Async generation
Generation runs through background jobs.

## D012 — Admin Preset Studio
Preset management is a required product capability.

---

# Open questions before production

## Product
- exact first 20–30 presets?
- which categories launch?
- whether Free plan requires watermark?
- whether results can be publicly shared by link?
- whether favorites require login only?

## Pricing
- actual plan prices?
- monthly credit allocations?
- cost per preset tier?
- credit expiry?
- top-up pack pricing?

## Privacy
- default original retention?
- output retention?
- exact provider data terms?
- auto-delete default or optional?

## Safety
- final policy on minors?
- political/public figure transformation rules?
- face swaps?
- realistic identity alteration?
- branded/trademarked style requests via presets?

## UX
- whether hero supports direct upload before preset choice?
- whether account signup occurs before or after upload?
- whether mobile preview videos autoplay in viewport by default?

## Engineering
- auth vendor?
- exact queue/worker vendor?
- storage provider?
- analytics provider?
- billing provider?
- polling vs SSE for generation status?

## AI
- primary candidate providers?
- model per archetype?
- output resolutions?
- retry limit?
- fallback policy per preset?

---

# Decisions intentionally deferred

- native mobile;
- video generation;
- user-created presets;
- preset marketplace;
- public social feed;
- teams;
- API;
- batch generation;
- custom prompts.

---

# Decision template

When a new major decision is made, add:

```text
ID:
Date:
Status:
Decision:
Why:
Alternatives considered:
Consequences:
Owner:
Review date:
```

---

# Final product test

Any proposed feature should answer:

1. Does it make it easier to choose or apply a visual outcome?
2. Does it preserve the preset-first advantage?
3. Does it improve result quality, trust, or repeat usage?
4. Is it worth the complexity it adds?

If not, defer it.
