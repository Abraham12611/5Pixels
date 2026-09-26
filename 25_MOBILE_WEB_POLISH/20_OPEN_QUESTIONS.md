# 20 — Open Questions, Decisions & Dependencies

Questions are blocking unless marked otherwise. Each states the recommendation so a decision is a
yes/no, not an essay.

---

## Product & IA decisions

**Q1 — Bottom tab bar composition.** (blocks `04 §3`, `05`, `11`, `14`)
Today: Discover · Explore · Create(→`/explore`) · Library · Favorites, where Create duplicates Explore
and there is no account slot.
*Recommendation:* Discover · Explore · **Create (opens a create sheet)** · Library (with a Favorites
segment) · Account. Fallback: keep the five current slots but point Create at the create sheet.
**Owner decision required.**

**Q2 — Does Create open a sheet or a route?**
*Recommendation:* a T2 sheet ("Recent looks" + "Browse all looks" + resume last draft). A route would
be a third discovery surface.

**Q3 — Route consolidation.** (blocks `14 §7`)
`/app/account`, `/app/settings` and `/app/profile` overlap, and delete exists under both `settings` and
`account`.
*Recommendation:* `/app/account` is canonical; the others redirect; one delete route.
Is `/app/profile` intended to become a *public* profile later? If yes, it keeps its own spec instead.

**Q4 — Post-auth resume behaviour.** (blocks `12 §3`)
After signing in at the Generate gate, do we auto-fire the generation (spending credits without a
second tap) or restore the screen and require one tap?
*Recommendation:* restore + one tap. Auto-spending immediately after an auth redirect is the kind of
surprise charge that produces refunds.

---

## Technical dependencies

**Q5 — Live filter counts.** (blocks `06 §4`)
The filter modal's `Show N looks` needs a cheap count for an arbitrary filter combination. Options:
(a) a lightweight count endpoint / RPC, (b) client-side counting over a fully loaded catalogue (viable
only while the catalogue is small), (c) drop the live count and label the CTA `Apply filters`.
*Recommendation:* (a) if a count RPC is cheap in Supabase; otherwise (b) now and (a) when the catalogue
grows past a few hundred presets.

**Q6 — Can a queued generation be cancelled?** (blocks `09 §4.5`)
Does the pipeline support cancelling before the provider call, and is the credit refunded?
*Recommendation:* expose `Cancel this run` only if cancellation is supported **and** refunds are
automatic; otherwise omit the control entirely.

**Q7 — Multi-output presets.** (affects `09 §4.6`, `10 §9`, `11`)
Do any current or planned presets emit more than one output? The placeholder grid, `Download all` and
the output picker are only worth building if so.

**Q8 — Source-asset reuse.** (blocks `08 §3.2`)
The Adjust flow already reuses a source asset. Are prior source assets retained long enough, and with
RLS allowing listing, to power a "Recent uploads" rail? What is the retention window, and does showing
recents conflict with the retention promise we make at upload?

**Q9 — Image CDN transforms.** (affects `17 §3`)
Several components pass `unoptimized` to `next/image`. Is that a Supabase Storage limitation, a signed
URL constraint, or a deliberate choice? Responsive sources are the single largest performance win
available and depend on the answer.

**Q10 — Web push / notification channels.** (affects `14 §4`)
Are notifications in-app only, or is email/web-push in scope? The preferences UI's channel column
depends on this.

**Q11 — Checkout origin metadata.** (blocks `13 §7`)
Can we round-trip an `origin` (the preset the user was creating) through checkout so the success page
can offer `Continue your look`?

---

## Content, copy & legal

**Q12 — Upload retention statement.** (blocks `08 §7`, `14 §3`)
The exact wording of "your photo is private, used only for this result, deletable any time" must match
the actual retention policy and the privacy policy. Needs the owner's/legal confirmation, including the
real retention window.

**Q13 — Deletion consequences.** (blocks `14 §5`)
On account deletion: are unused credits forfeited, refunded, or transferable? Are results deleted
immediately or after a grace period? What is retained for legal/billing reasons?

**Q14 — Blocked-content copy and guidelines page.** (blocks `09 §4.4`)
Is there a public content-guidelines page to link from the blocked state? If not, one is needed, or the
copy must stand alone.

**Q15 — Trial and pricing specifics.** (blocks `13 §4`, `13 §5`)
Exact prices, cadences, credit grants, trial length, charge date behaviour and rollover/expiry rules,
so the paywall can state them literally rather than generically.

**Q16 — "Each run is unique" disclaimer placement.** (affects `07 §4`)
Confirm the product stance on non-determinism and where it must be disclosed (preset detail, create,
result).

---

## Design system

**Q17 — Elevation ramp and `--size-touch-min`.** (proposed in `00 §0.6`)
Adding a documented elevation ramp for stacked overlays and a `--size-touch-min: 44px` reference token
would make the overlay and touch-target rules enforceable. Approve the token additions?

**Q18 — Muted text contrast.** (blocks `17 §1.4`)
If `--color-text-muted` at 12–13 px fails 4.5:1 on `--color-charcoal-850`, do we lighten the token
(a global visual change) or restrict its usage to ≥19 px and decorative contexts?
*Recommendation:* restrict usage first; change the token only if that proves impractical.

---

## Scope boundaries confirmed (no decision needed)

- No generic prompt box in V1; ChatGPT-style selection editing and masking are explicitly out of scope
  (`01 §3.5`).
- No provider/model exposure anywhere in the consumer UI.
- Preset previews stay MP4/GIF, never draggable sliders (`17 §4`).
- Native iOS implementation is out of scope; this program is mobile **web** only.
- These documents are a plan; no production code is changed by this PR.

---

## Suggested decision order

1. Q1/Q2 (tab bar) — unblocks the most surfaces and is cheap to decide.
2. Q3 (routes) — unblocks the whole account phase.
3. Q5, Q6, Q8, Q11 (technical feasibility) — determine what Phase 1–3 can actually include.
4. Q12–Q15 (copy/legal) — needed before the create, deletion and paywall copy is finalised.
5. Q17/Q18 (tokens) — can land with Phase 0.
