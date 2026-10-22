# Release safeguard decisions — output screening & `safety_config` (#185)

Decision memo for the two release safeguards. Decision 1 is resolved by the
owner (deferred to P0 #210); Decision 2 remains open. Companion doc:
`docs/security/image-moderation-aup-coverage.md` (what the fal NSFW
classifier does and does not cover — it does not cover the whole AUP).

## Decision 1 — screen generated outputs before serving?

**Owner decision (resolved):** deferred to P0 issue **#210** — output
screening ships as the *first* post-launch fix, after a limited initial
release. This memo documents what that deferral means and the risks it
carries. **Pre-generation (input) moderation remains mandatory and is not
affected by the deferral.**

### Accepted risk during the limited initial release

Until #210 lands, a generated image is linked into `generation_outputs` and
served to the user with **no output-side screening**:

- Whatever the provider returns is shown — including content that violates
  the AUP. fal's platform safety checker is the only barrier, and it runs at
  the mid-permissive default `safety_tolerance: "4"` we never chose
  (Decision 2).
- This is survivable for a limited release *only* because: inputs are
  screened before generation, preset recipes constrain the output space,
  custom prompts and multi-image stay flag-OFF, and the launch audience is
  small. The margin shrinks exactly where those gates open — **#210 must
  land before any flag enabling.**
- The deferral does not retro-cover a moderation incident: if unsafe output
  reaches a user, mitigation is takedown + incident response, not "the
  system caught it."

### The planned #210 implementation (for reference — do not start early)

`apps/web/lib/generation/poll.ts` is the single completion path:

```
provider result → download bytes → postProcess → uploadOutputImage
→ createOutputAsset → complete_generation (links generation_outputs,
marks 'completed', settles the reservation)
```

Screen between `postProcess`/`uploadOutputImage` and `complete_generation`
with the existing `screenUserImage()` classifier — the bytes are already in
hand (data-URI or short-lived signed URL), so no extra fetch is needed.

### Blocked-output behavior (recommended)

- **Never create the `generation_outputs` link and never upload the bytes.**
  Discarding the buffer keeps blocked content out of Storage entirely —
  stronger than quarantining an asset row, which the owner could still read
  via `assets_select`.
- Mark the generation `failed` with a user-safe detail
  ("couldn't be created — try a different preset"), not "your content was
  flagged" — don't leak moderation internals.
- **`fail_generation_refund` releases the full reservation** — that RPC
  already exists and already does exactly this for provider failures. A
  blocked output is indistinguishable to the user from a failed one, and
  charging for content we refuse to serve is a refund complaint anyway.
- Record the classifier score + category metadata on the generation row for
  audit — evidence without retaining the image.
- **Provider cost is absorbed** — the provider still charged us; consistent
  with the existing "late upward differences absorbed by 5Pixels" policy.

### Screen-failure behavior (recommended)

Classifier unavailable/error → **fail closed**: treat as blocked
(do not serve, refund). Same posture as input screening — an unverifiable
output is not shown.

### Why not rely on fal alone

The live smoke run (2026-10-19) showed fal honoring `limit_generations` and
refusing some requests (`no_media_generated`), but its platform safety
checker defaults are not contract-pinned (see Decision 2) and its taxonomy
is not our AUP. Our own output pass is the only check we control end-to-end.

**Alternative considered:** link-first-quarantine-later (serve pending, sweep
async) — rejected; a blocked image can be served between link and sweep.

## Decision 2 — `safety_config` enforcement & fal `safety_tolerance`

### Finding (live evidence)

- `safety_config` (`allowed_nsfw`, `block_public_figures`, `block_minors`)
  is **required by the publish gate** but **consumed by nothing** at
  generation time — it is a declared contract with no enforcement path.
- The live smoke run echoed fal applying `safety_tolerance: "4"` on
  `nano-banana/*` — the mid-permissive band of fal's 1–6 provider-safety
  scale. We inherit a default we never chose.

### Recommendations

1. **Pin `safety_tolerance` explicitly per route** in the adapter /
   route-capability layer — propose `"1"` (strictest) for launch routes;
   revisit only if it produces false-positive `no_media_generated` rates.
   Near-zero cost, immediate improvement.
2. **Resolve the `safety_config` enforcement gap — pick one per field:**
   - `allowed_nsfw` — wire it: `false` → stricter output-screen threshold /
     strict `safety_tolerance`; `true` → requires explicit owner + legal
     sign-off and should stay effectively unused at launch. Until wired,
     stop advertising it in admin-facing copy as an enforced rule.
   - `block_public_figures` / `block_minors` — **no mechanism in the stack
     detects these in images** (fal's NSFW classifier doesn't; OpenAI
     `omni-moderation-latest` is text-only as currently integrated for
     prompts). Honest options: (a) drop these fields from the publish
     contract and soften public/AUP copy to what is enforced, or
     (b) treat them as a roadmap item requiring a vision-capable screen —
     do not ship copy claiming enforcement that doesn't exist.
3. **Do not conflate the text screen with image screening.** #206's OpenAI
   moderation covers the custom-prompt path (text in) — valuable, but it
   does not inspect pixels in or out; it does not close the image-side gaps.

### Suggested release ordering

| Step | Item | Blocking? |
|---|---|---|
| 1 | Pin `safety_tolerance` + `enable_safety_checker` explicitly | cheap, do now — reduces the exposure during the #210 deferral window |
| 2 | Hosted migration chain per `docs/release/preset-studio-2-migration-rollout.md` | yes — unblocks #208 |
| 3 | `safety_config`: wire `allowed_nsfw`; drop or roadmap the other two + align copy | before legal review / flags-on |
| 4 | Output screening before `complete_generation` (+ refund path) — **P0 #210, first post-launch fix** | before any public flag opens |

All public release flags remain OFF regardless of outcome:
`PRESET_MULTI_INPUT_ENABLED=false`, `PRESET_USER_PROMPT_ENABLED=false`.
