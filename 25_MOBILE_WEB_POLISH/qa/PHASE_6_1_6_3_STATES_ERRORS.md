# QA — Phase 6.1–6.3: offline, degraded mode, skeletons, error boundaries, media failure

Covers `16` §3–§8 / roadmap 6.1–6.3.

## 6.1 — Offline

- [ ] Toggle airplane mode → thin banner appears under the header: "You're offline — some things won't work." Non-dismissible.
- [ ] While offline: Generate CTA disabled with "You're offline — reconnect to generate"; browsing/cached surfaces still render.
- [ ] Tap anything while offline, then reconnect → "Back online" toast fires once. Reconnect without interacting → no toast.
- [ ] With `GENERATION_PAUSED=true` *and* offline, only the offline banner shows (offline wins; degraded suppressed).

## 6.4 (partial) — Degraded copy

- [ ] `GENERATION_PAUSED=true` → banner reads "Transformations are paused right now. Browsing and your Library still work."
- [ ] Generate/Regenerate CTAs disabled with the same reason line; paywall unreachable while paused (returns before the canAfford check).

## 6.2 — Skeletons + boundaries

- [ ] Slow network on `/categories`, `/app/billing`, `/app/account`, `/app/generations` → skeletons mirror the real layout (grid cards / grouped rows / list rows), `charcoal-800` pulse.
- [ ] Throwing in a route under library/billing/account → segment `error.tsx`: warning icon, mapped title, body, `Try again` + segment escape; `role="alert"`.

## 6.3 — Error copy + media failure

- [ ] `lib/copy/errors.ts` holds the §5 class map; route boundaries consume it via `RouteError`.
- [ ] On a result page, let the signed URL expire (or block the request) → the stage shows "We couldn't load this / Try again"; first failure silently re-mints fresh signed URLs via `refreshResultDisplayUrls` and recovers.

## Gates

- `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (462/462) · `pnpm build` ✅
