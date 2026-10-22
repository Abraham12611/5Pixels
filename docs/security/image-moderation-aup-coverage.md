# Image moderation vs. Acceptable Use Policy — coverage assessment (#185)

Status: release-checklist artifact · Written: 2026-10-19 · Updated:
2026-10-19 (text screen swapped to OpenAI in #206; staging validation
evidence in `apps/web/lib/generation/__tests__/actions-moderation-staging.test.ts`)
· Scope: input screening shipped in #193, text screening via OpenAI,
generated-output path.

## Mechanism inventory

| Layer | Mechanism | Covers |
|---|---|---|
| User text (options, prompt) | `lib/moderation/openai.ts` — OpenAI `omni-moderation-latest` when `OPENAI_API_KEY` is configured; `lib/moderation/creem.ts` flag-gated fallback when it isn't | Text policy violations; `flagged` or any true category blocks; missing key/timeout/non-OK/malformed fail closed |
| User input images | `lib/moderation/image.ts` — fal `fal-ai/imageutils/nsfw`, `nsfw_probability >= 0.5` blocks | **Sexual/explicit image content only** |
| Durable verdict | `assets.moderation_status` + `moderation_object_version` | Version-bound approval; Storage trigger makes approved bytes immutable; `create_generation` re-verifies |
| Prompt gate | DB `release_gates('preset_user_prompt')` + app flag + per-version `prompt_override_enabled` | Custom prompts fully disabled by default |
| Preset recipes | Server-side private instructions | Constrains the transformation *space* — the strongest current defense for most AUP categories |
| Generated output | **Nothing** | No screening or quarantine after provider return |
| `safety_config` on versions | `allowed_nsfw`/`block_public_figures`/`block_minors` — publish-gate declared | **Declared but never consumed at generation time** |

## AUP prohibited-content → coverage map

| AUP category | Input gate | Output gate | Verdict |
|---|---|---|---|
| Sexual/NSFW | fal nsfw classifier (0.5) + recipe constraints | provider default safety_checker (unverified) | **Covered, partially verified** |
| Minors | None (classifier has no age class) | provider-side only | **Not covered — needs CSAM-class tooling** |
| Non-consensual intimate imagery | NSFW subset only | none | **Partially — consent undetectable; policy/reporting path** |
| Deepfakes / identity manipulation | None | none | **Not covered — preset-first design is the main mitigant** |
| Deceptive/fraudulent (fake IDs, docs) | None | none | **Not covered — narrow recipe space limits scope** |
| Sensitive data / doxxing | Text via OpenAI; images none | none | **Partially** |
| Biometric identification | n/a (conduct) | n/a | **N/A — product can't do it** |
| Harassment / hate | Text via OpenAI; images none | none | **Not covered for image inputs** |
| Extremist content | Text via OpenAI; images none | none | **Not covered for image inputs** |
| Illegal content | NSFW subset only | none | **Partially** |
| IP infringement (likeness, characters) | None | recipe-only | **Not covered — preset-first mitigant** |
| Graphic violence / self-harm | None | none | **Not covered** |

## Assessment

**The NSFW classifier alone covers 1 of 12 AUP categories fully and ~3
partially.** It is sufficient *only* because the product is preset-first:
transformations are bound to curated recipes, so the output space is
narrow and the highest-volume abuse vector (arbitrary image synthesis
from a hostile input) is structurally small for single-photo presets.

That margin shrinks exactly where the release adds risk:

- **Multi-image inputs** widen composition space (subject+reference
  combinations → identity/deepfake-adjacent outcomes the classifier
  cannot see).
- **Custom prompts** (still gated) let users steer semantics — the
  OpenAI text screen covers the text side, but prompt+image combinations
  can produce outputs neither gate predicts.
- **The AUP page itself claims** "safety rules that block NSFW output,
  harmful depictions of minors, and unauthorized use of public figures"
  in presets. `safety_config` encodes those three booleans but **no code
  path enforces them at generation time** — the public claim currently
  outruns the implementation.

## Output moderation / quarantine — recommendation

**Recommend: implement output quarantine before any public flag flip.**

Concrete design (small, reuses existing machinery — output files are
already `assets` rows, so `moderation_status`, the verdict-write
allowlist, and approved-content immutability all apply):

1. Screen each output when the provider result is fetched/persisted,
   *before* the `generation_outputs` link is written by the settle RPC
   — same classifier, same threshold, same fail-closed policy.
2. Persist outputs as `moderation_status='pending'`; stamp `approved` on
   pass, `flagged` on block. Serving currently reads by ownership only —
   add an app-level `moderation_status='approved'` gate on result
   delivery (signed-result + library + share paths).
3. A blocked output keeps the generation row but serves nothing —
   display "under review" + release the reservation via the existing
   refund path. Zero-cost retry is not offered (re-running would
   re-generate similar content).
4. Separately, verify fal's per-route `enable_safety_checker` default on
   the pinned endpoints and set it **explicitly true** in the adapter —
   provider-side output checking at zero engineering cost.
5. **Pin `safety_tolerance`.** The live smoke test (2026-10-19) observed
   fal echoing `safety_tolerance: "4"` on `nano-banana/*` — the
   mid-permissive band of fal's 1–6 provider-safety scale, not the
   strictest. If the AUP's stated rules should bind, send an explicit
   lower value (e.g. `"1"`/`"2"`) in `model_config`/the adapter rather
   than inheriting the default.

Why now rather than post-launch: the input gate attests content *going
in*; nothing attests what the model *produced*. Image-to-image models
occasionally produce policy-violating output from clean inputs (bias,
adversarial composition), and the liability asymmetry is bad — the
output is what users see and share. Cost: one extra classifier call per
generation (~$0.001-class) plus a status column that already exists.

## Residual risk — owner sign-off needed

1. **Minors/CSAM:** no technical control on input side beyond NSFW
   class; rely on recipe constraints + report-to-authorities policy.
   PhotoDNA-class hashing is the standard control if scale/merchant
   requires it.
2. **Deepfakes/identity:** preset-first constrains but does not
   eliminate; multi-image raises this specifically. Consider an explicit
   "no real-person identity transfer" instruction in affected recipes.
3. **Threshold:** 0.5 is the model default; borderline 0.3–0.5 passes.
   Merchant (#173)/legal (#172) may require stricter.
4. **`safety_config` enforcement gap:** either wire the three booleans
   into recipe construction/generation checks, or soften the public
   claim. Publish gate already requires declaring them.
5. **Admin trust boundary:** admin-finalized assets are auto-approved;
   compromised admin account bypasses screening.
