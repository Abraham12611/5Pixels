# 19 — Acceptance Criteria & QA Checklist

Every criterion is written so it can be checked on a real 375×812 device in under a minute. A phase is
not done until its criteria pass on iOS Safari **and** Android Chrome.

---

## 1. Global (applies to every surface)

- [ ] No horizontal scroll at 320 px on any route.
- [ ] Every interactive element ≥44×44 px with ≥8 px separation.
- [ ] Exactly one fixed bottom element at a time (`04 §6`).
- [ ] Every overlay closes via scrim, control, `Escape` **and browser Back** (`15 §5`).
- [ ] Focus returns to the trigger after any overlay closes.
- [ ] Every surface has designed loading / empty / error / offline states (`16`).
- [ ] No provider, model, internal status string or private instruction is visible anywhere.
- [ ] All private assets/outputs are served via signed URLs.
- [ ] `prefers-reduced-motion` removes autoplay, pulsing and transitions with no loss of meaning.
- [ ] Text at 200 % scale does not clip or hide content.
- [ ] Every route renders correctly in landscape (812×375).

---

## 2. Cross-surface consistency contract (`04 §8`)

- [ ] Tapping a preset opens the **same quick sheet** on landing, `/app`, `/explore`, `/categories`,
      search results, favourites and related rails.
- [ ] The preset primary action is `Use this look` → `/app/create/[slug]` everywhere.
- [ ] Tapping a generated image opens the **same viewer** from result, library, examples and share.
- [ ] Result actions appear in the same order wherever they appear.
- [ ] Credits are written `N credits` / `1 credit` everywhere, with no bare numerals.

---

## 3. Landing & Discover (`05`)

- [ ] Hero: 3 slides, snap, dots, correct carousel ARIA, poster-only under reduced motion.
- [ ] The search pill opens the palette (not `/explore`).
- [ ] Chips stick under the header after the hero scrolls away and filter in place.
- [ ] Every rail shows a ~15 % peek and has an accessible name.
- [ ] `Show more looks` appends without layout shift.
- [ ] `/app` shows orientation for zero-generation users and a Continue rail otherwise.
- [ ] Credit chip shows a `Low` state below the cheapest preset cost.
- [ ] First paint shows skeletons matching the final composition (CLS ≤ 0.1).

---

## 4. Explore, Search & Categories (`06`)

- [ ] Sticky bar keeps `Filters (n)` and `Sort` reachable at any scroll position.
- [ ] `Filters` opens a full-screen modal; nothing applies until `Show N looks`.
- [ ] The result count is live and announced.
- [ ] `Reset` clears without closing; active filters show a `Clear filters` chip on the grid.
- [ ] `Load more` works without JS observers; the URL stays in sync.
- [ ] Back from a preset restores the exact grid scroll position.
- [ ] Palette idle state shows recents + trending; no-results shows the query and 3 suggestions.
- [ ] Category tiles route to `/explore?category=` (one browsing surface).

---

## 5. Preset detail & quick sheet (`07`)

- [ ] Sheet: handle, swipe dismiss, pinned `Use this look`, scrollable body, ≤82 dvh.
- [ ] Examples open the viewer with a counter; Back closes the viewer, not the sheet.
- [ ] Favourite toggles optimistically with undo.
- [ ] Detail page: media ≥60 % of the first viewport; docked CTA with cost; bottom nav hidden.
- [ ] "Works best with" present; adjustments listed in plain language.
- [ ] Posters show the text-layer annotation.
- [ ] Retired/not-found presets show designed states with a route forward.

---

## 6. Create & upload (`08`)

- [ ] Only one fixed bottom element (the docked Generate bar); the tab bar is hidden.
- [ ] Empty source zone shows two touch tiles (camera / gallery), not a dashed drop rectangle.
- [ ] Recent uploads appear when available and reuse without re-picking.
- [ ] Rejected files show an inline error with the failed rule and a re-pick action (never a toast).
- [ ] Upload progress keeps the photo visible; failures retry the same file.
- [ ] Generate label always carries the cost; disabled states always carry a reason.
- [ ] Controls collapse into an accordion with a count; choices open T1 sheets.
- [ ] The privacy line is visible in the source zone and links to Privacy & data.
- [ ] Anonymous: auth sheet at Generate; after auth the photo and settings are restored.
- [ ] Insufficient credits: paywall sheet with the preset name and exact shortfall.
- [ ] Keyboard never covers the focused field or the docked bar.

---

## 7. Generation progress (`09`)

- [ ] The source photo is the visual anchor; stage title + description + elapsed time visible.
- [ ] Four named stages with check / current / pending states; no percentage.
- [ ] Polling pauses when the tab is hidden and backs off over time.
- [ ] Three consecutive poll failures show a retry panel that states the run continues.
- [ ] `Go to Library` is reachable in the thumb zone.
- [ ] Failure shows the credit-refund statement; blocked shows non-accusatory copy + guidelines.
- [ ] Completion cross-fades into the result with no jarring jump.
- [ ] `aria-live` announces stage transitions only (not every poll).

---

## 8. Result, compare & share (`10`)

- [ ] The image occupies ≥70 % of the first viewport.
- [ ] Segmented Result / Before / Split floats over the media; Split is static (no drag on touch).
- [ ] Vertical page scrolling works over the image (no `touch-none` trap).
- [ ] Tap opens the viewer with pinch-zoom and swipe-dismiss.
- [ ] Download is the only primary; Share/Save are secondary; Regenerate/Adjust are below the fold with
      their cost stated.
- [ ] iOS Safari shows the save-image hint once.
- [ ] Expired signed URLs re-mint silently before erroring.
- [ ] Share sheet: native share where available, copy fallback with inline confirmation, public-link
      toggle with a plain consequence statement.
- [ ] `/s/[shareId]`: image-first, `Make your own` → create, complete OG metadata, designed revoked
      state.

---

## 9. Library, favorites & history (`11`)

- [ ] One Library with Results / Presets / Runs segments; `?tab=` in the URL; old routes deep-link in.
- [ ] Uniform grid with preset name and date under each card.
- [ ] In-progress rail appears while runs are active and offers retry on failure.
- [ ] `⋯` sheet offers Download, Share, Save/Unsave, Make again, Delete.
- [ ] Long-press enters selection; bulk delete confirms with a count and a permanence statement.
- [ ] Unfavouriting is optimistic with undo that restores position.
- [ ] Runs list groups by day, shows credits, and reconciles with billing history.

---

## 10. Auth (`12`)

- [ ] A single auth sheet component; contextual variant shows the preset and a reason line.
- [ ] Sign in / Create account switch inside the sheet without navigation.
- [ ] After auth the user lands back on the task with state intact (no auto-spend).
- [ ] Full-page routes: single column, 16 px inputs, correct keyboard attributes, CTA under the last
      field, `next` preserved through every hop.
- [ ] Verify-email: address echoed, resend with a 60 s countdown, change-address link, next-step copy.
- [ ] In-app webviews get an email-first path and a copy-link action.
- [ ] Session expiry mid-task reopens the sheet without losing the draft.
- [ ] Error copy matches the per-case map; credentials errors never reveal which field was wrong.

---

## 11. Credits, paywall & billing (`13`)

- [ ] Paywall shows the preset thumbnail, the exact shortfall, and per-option price/cadence/credits/
      cost-per-image.
- [ ] Trial options state the charge date and post-trial amount inline.
- [ ] The CTA label matches the selected option.
- [ ] One-time credits are always visible.
- [ ] `/pricing` is stacked cards with a period toggle; no horizontally scrolling table.
- [ ] Checkout success shows what was bought, the new balance, and an origin-aware next action;
      webhook lag shows "Updating your balance…" rather than a stale figure.
- [ ] Checkout cancel states clearly that nothing was charged.
- [ ] History renders as row cards grouped by month with receipts.
- [ ] Cancellation is ≤2 taps from the plan page and states the access end date and credit outcome.
- [ ] Low balance surfaces before the wall (chip + shortfall CTA).

---

## 12. Account, settings & notifications (`14`)

- [ ] Mobile account navigation is a grouped list; the chip rail is gone below `lg`.
- [ ] Every row drills into a full page with a labelled back.
- [ ] `/app/settings` and `/app/profile` no longer duplicate `/app/account`.
- [ ] Notification preferences state when each notification fires.
- [ ] The notification inbox is a full-height sheet with unread state and `Mark all read`.
- [ ] Deletion is staged, lists exactly what is removed, blocks silently deleting a paying account, and
      offers data export first.

---

## 13. Overlays (`15`)

- [ ] All overlays use the shared `Sheet`; no bespoke overlay markup remains.
- [ ] Tier assignment matches `15 §3`.
- [ ] Maximum two layers; the lower layer is inert and `aria-hidden`.
- [ ] Scroll lock is reference-counted (closing a nested overlay does not unlock the page).
- [ ] Sheet heights use `dvh`; pinned areas clear the keyboard and the safe area.
- [ ] `overscroll-behavior: contain` on sheet bodies.

---

## 14. States (`16`)

- [ ] `StateBlock` used for every empty/error/offline state; no ad-hoc copy-only states remain.
- [ ] Skeletons match the real composition and respect the 200 ms/400 ms rules.
- [ ] Offline: banner shown, committing CTAs disabled with reasons, drafts preserved, polling paused.
- [ ] Degraded: standard copy, Generate disabled, paywall unreachable.
- [ ] Requests >10 s show "Still working…"; >30 s offer cancel where safe.
- [ ] Optimistic actions revert visibly on failure.

---

## 15. Accessibility, performance & motion (`17`)

- [ ] axe reports no critical/serious violations on the six core surfaces.
- [ ] VoiceOver and TalkBack can complete: choose preset → upload → generate → download.
- [ ] Focus moves to the main heading on route change; skip link present.
- [ ] Contrast verified for muted text at 12–13 px.
- [ ] Lighthouse mobile: LCP ≤2.5 s, CLS ≤0.1, INP ≤200 ms on landing, explore and preset detail.
- [ ] At most one autoplaying video on screen; none under Save-Data or reduced motion.
- [ ] No `100vh`, no hover-only affordances, no drag-only interactions.

---

## 16. Regression gates (every PR)

- [ ] `pnpm lint` clean.
- [ ] `pnpm typecheck` clean.
- [ ] `pnpm test` green, with new tests for new logic (overlay dismissal, state machines, credit math).
- [ ] `pnpm build` succeeds.
- [ ] Before/after mobile screenshots at 375 px attached.
- [ ] The touched surface's state matrix re-verified.
