# 02 — Research: Adjacent Categories

Patterns from outside the AI-image category that solve problems 5Pixels also has. Same seven-part frame
(`00 §0.4`). Screens cited as `App — uuid` → `https://refero.design/screens/<uuid>`.

---

## 1. Commerce & catalog — browsing, quick view, filtering, cart-equivalents

### 1.1 Quick-view bottom sheets instead of full page loads

**Screens** — Asos `e15bfbbd-6f9b-4e43-8675-368984292a92`; Target `54b5c312-29e7-458c-9420-ac59610af604`
and `844bdac0-78db-4253-8c32-e862719cf8a0`; Instagram shopping `0e3ae617-4d8c-4cb0-af3b-17d41d7e63e2`.

**Observed pattern.** Tapping a grid item raises a partial-height sheet over the (still-visible) grid
with: hero image, name, price, one or two decisive attributes, a primary action, and a "View full
details" link. Dismiss returns to the exact scroll position.

**User problem.** Browsing is comparative: users evaluate many items and commit to few. A full page
navigation per candidate destroys the comparison loop and the scroll position.

**Why it works.** It preserves context (the grid is still there behind the scrim), makes evaluation
cheap, and defers the expensive navigation to actual intent. Commerce measures this directly in
conversion.

**Small-screen behaviour.** The sheet uses ~60 % of the viewport; the remaining 40 % showing the grid is
the affordance that says "you did not leave".

**Platform fit.** Both. On mobile web, the sheet must push a history entry so the hardware/browser Back
button closes it rather than leaving the page.

**5Pixels verdict.** **Adopt and extend.** `preset-quick-sheet.tsx` already does this on the mobile
landing feed. It must be used *everywhere* a preset appears on mobile: `/explore`, `/categories`,
`/app` discover rails, related presets, search results. Today `/explore` navigates straight to
`/presets/[slug]`, breaking the browse loop. Add browser-Back integration (`15 §5`). Spec: `06 §3`.

### 1.2 Filters as a full-screen modal with Apply/Reset, not inline controls

**Screens** — Nothing `7b855c59-691f-46f7-9295-a16a7370e3e6`, `5e52ffa8-6b68-45ed-81d9-68cac473789f`;
Zellerfeld `6c86bc4c-aa9a-47e1-90f7-5d6574124760`; DoorDash `a657321b-f43d-4e67-8553-8602805b0076`
(mobile web drawer); GlossGenius `3e1dcc1b-6851-4a7f-9c5d-6d238732e3c8`; fal
`a47cd623-33da-46ba-9c4b-0ff2a0d39bc2`.

**Observed pattern.** A single `Filter` entry point with an active-count badge → full-screen modal with
grouped options → a sticky footer containing `Reset` (ghost) and `Show N results` (primary, live count).

**User problem.** Filtering on mobile has no room for a persistent panel, and users fear losing their
place or applying something irreversible.

**Why it works.** Batching changes behind an explicit Apply makes filtering reversible and predictable;
the live result count converts blind filtering into feedback-driven filtering; the badge makes active
filters visible after the modal closes — the classic "stuck in a filtered state" bug is prevented.

**Small-screen behaviour.** Full-screen is correct here: filter sets are long, and a partial sheet would
leave a cramped scroll area.

**Platform fit.** Both.

**5Pixels verdict.** **Adopt.** `catalog-filters.tsx` on `/explore` currently renders inline chips/selects
that reflow awkwardly at 375 px and apply immediately (each tap = a navigation). Replace on mobile with:
sticky `Filters (2)` + `Sort` buttons → full-screen filter modal, grouped (Type / Category / Sort), with
`Reset` + `Show N looks`. Spec: `06 §4`.

### 1.3 Sticky price/action bar above the fold-out

**Screens** — Target `844bdac0-78db-4253-8c32-e862719cf8a0` (persistent add-to-cart), mobile-web sticky
CTA bars: Miro `b31201f8-4d59-4f30-8db2-827138e870ec`, Figma `64da84ff-668b-4b40-a84d-a5f2143c5af5`,
Perplexity `6a414b5e-15a4-4dee-9c56-1880e9f5ef75`, Suno `8856d033-2894-4ce0-ad94-9bee54bd5549`.

**Observed pattern.** The commit action is docked to the bottom of the viewport, above the safe area,
with the *cost* (price / plan / credits) stated inside or immediately beside the button.

**Why it works.** Long mobile pages separate decision from action; docking the action removes the scroll
tax and keeps price and commitment adjacent, which reduces surprise-cost abandonment.

**5Pixels verdict.** **Adopt** as a global rule: any mobile surface whose purpose is one commitment
(preset detail, create, paywall, checkout) gets a docked bottom action bar carrying the action **and**
its credit cost, e.g. `Generate · 5 credits`. Docked bars must respect `env(safe-area-inset-bottom)` and
must not collide with `mobile-bottom-nav.tsx` (resolution in `04 §6`).

### 1.4 Category chips as the primary taxonomy control

**Screens** — Wabi `83d20ec8-e4e3-4fb4-b46e-22a8edaa0003`, `bccb8166-4d03-446f-a91a-bc0dd70fa486`,
`00299eaf-0c4e-4ade-b896-5dd25ecb9f5c`; District `50a152af-1a88-44f5-be66-592ba2a0d73f`.

**Observed pattern.** A single horizontally scrolling row; the selected chip is a solid high-contrast
fill, unselected chips are outlined/low-contrast; the row never wraps; the first chip is "All".

**Why it works.** One row costs ~44 px of vertical space and communicates both the taxonomy and the
current position in it. Contrast inversion for selection is unambiguous at a glance.

**5Pixels verdict.** **Adopt** as the canonical chip spec (lime fill + ink text for selected, hairline
border + `--color-text-secondary` for unselected) and unify the three divergent implementations
(`mobile-feed.tsx` tabs, `category-chip-wall.tsx`, `/explore` chips). Spec: `03 §3`, `06 §2`.

---

## 2. Social & media feeds — discovery, masonry, refresh, viewers

### 2.1 Masonry vs. uniform grid

**Screens** — Pinterest `aff66662-0a44-4f42-aff8-c78111dc27f0` (iOS) and
`82df0c96-1e04-4945-b6dd-3fa44b600083` (web); Play `130189c2-318d-4fdf-8fa7-a715a7a37148`,
`7b68f4c2-e60e-4ab0-a02e-d35f3d0ed1c1`; Meta AI `d9c452e6-696c-4472-ab9a-e2e79a3020e9`;
Shopify `6b58d27a-b816-4b85-9204-87496157118e`.

**Observed pattern.** Two columns at phone widths, variable heights, ~10–15 px gutters, radius ~16 px,
labels either overlaid at the bottom of the tile or omitted entirely.

**Why it works.** Variable heights preserve each image's native aspect ratio (critical when the image
*is* the product) and create a natural vertical rhythm that encourages scrolling.

**Caveat observed.** Pinterest still pairs masonry with *uniform* tiles in "board" contexts — masonry is
for exploration, uniform grids for collections you own.

**5Pixels verdict.** **Adopt the split.** Masonry for exploration (`/explore`, mobile landing feed —
already the case in `mobile-feed.tsx`); uniform aspect-locked grid for owned collections (`/app/library`,
`/app/favorites`) where scan-for-a-known-item is the task. Spec: `06 §2`, `11 §2`.

### 2.2 Pull-to-refresh on mobile web

**Screens** — Newsadoo `32ef796b-e512-4bcc-b578-b653d6827ff1`; Superlist
`0bf0181e-c813-462b-a37e-e2d62d76972e`; Loowner `84ee4d5c-690c-4654-b939-17f7e2adf69a`.

**Verdict.** **Reject** custom pull-to-refresh on mobile web: iOS Safari owns the overscroll gesture and
a custom implementation fights it. **Adapt** instead with an explicit refresh affordance only where
staleness matters — the in-progress rail in `/app/library` and `/app/generations/[id]` — which already
poll. Recorded in `16 §7`.

### 2.3 Immersive image viewer

**Screens** — Chance AI `b62481d1-f286-46ca-93e1-4602b7932c8b`; HYPE `c246984d-9483-44a5-8818-028c3fb44e95`;
LEGO Builder `8d33b1a4-246c-4dd8-99a4-6460721a1c63`; CREME `43395895-1508-433d-ad35-d93a14a8b327`.

**Observed pattern.** Black background, pinch-zoom, an index counter (`3/12`), a close X in a consistent
corner, and a thumbnail strip when there are siblings. Chrome auto-hides on interaction.

**5Pixels verdict.** **Adopt** a single shared `ImageViewer` overlay used by result, library item,
preset examples and share page, with: black backdrop, pinch/double-tap zoom, counter when >1, floating
close, swipe-down-to-dismiss, and `Escape`/Back support. Spec: `15 §4`, `10 §5`.

---

## 3. Fintech — progress, verification, destructive confirmation, money clarity

### 3.1 Step/checklist progress for long operations

**Screens** — Coinbase `c49c1528-d44b-4a73-9016-a69d35d42529`; World App
`718c4e1a-6091-49f5-b96b-b3a11c2f6bcc`, `ed49aec9-6a74-4ddd-a2c6-77ea51a4940a`;
Monday.com `f3b9d9fa-5739-40ef-8a00-e0c463a6b7fe`.

**Observed pattern.** A vertical checklist where completed steps collapse into a check, the active step
is highlighted with a spinner and an explanatory sentence, and future steps are dimmed. Time is framed
qualitatively ("usually under a minute").

**Why it works.** Fintech cannot fake progress (legal/trust stakes), so it evolved the honest pattern:
named, ordered, verifiable stages. It makes an opaque backend legible and gives the user something to
read while waiting.

**Small-screen behaviour.** Vertical lists are the natural mobile form; 3–5 steps fit above the fold.

**5Pixels verdict.** **Adopt** wholesale for `/app/generations/[id]`: our four stages (Preparing →
Applying → Refining → Finalizing) become a vertical checklist with per-stage one-line explanations,
rather than an abstract progress motif alone. Keep `GenerationPixelProgress` as the hero motif above the
checklist. Spec: `09 §3`.

### 3.2 Destructive confirmation as an action sheet with the consequence spelled out

**Screens** — Apple Stocks `3a2180f2-9a9b-47f4-8dba-aff6fb8b5841`; Comet
`62c21f60-02a8-464b-8c71-1641cbea621f`, `7afca057-b55b-46a0-bf3d-303483672034` (Delete Account);
Gizmo `d54a72af-633f-41c7-8282-c5e8a008276f`.

**Observed pattern.** Bottom action sheet; a short title naming the object; one line stating what is
irreversibly lost; a red destructive action; a full-width Cancel below it. Account deletion additionally
requires typed confirmation and states the data retention window.

**5Pixels verdict.** **Adopt** for: delete generation, remove favourite (no — see below), sign out of
other sessions, cancel subscription, delete account. Note the contrast: **destructive-but-cheap** actions
(unfavourite, dismiss) get an *undo toast*, never a confirm dialog; **destructive-and-permanent** actions
get a confirm sheet. Spec: `15 §3`, `14 §6`.

### 3.3 Undo toasts

**Screens** — Linear `d2631270-7b4e-4668-8c30-63ca2cd63ed3`; WhatsApp
`6a7b3092-6e03-4841-b778-8230b05f52da`; Drinkit `04a59ce5-ee41-4af6-aff7-ad1c282adfb7`;
Picnic `b5ccc0de-1826-4a3c-8039-b8520d5582cc`.

**Observed pattern.** A compact dark pill anchored above the bottom nav, one line of text, a single
`Undo` action, auto-dismiss ~5 s, never blocking.

**5Pixels verdict.** **Adopt** for unfavourite, remove-from-library, and dismissing an in-progress item.
Critically: toasts are for reversible, low-stakes confirmations **only** — per the design system, a
critical error must never be represented solely by a toast. Spec: `16 §6`.

### 3.4 Money clarity before commitment

**Screens** — Blackbird `db467e37-2f59-4ea7-b305-84c29e9adc28` (purchase flow with explicit totals);
Open `0d32604e-8fdb-4aa4-b19d-e6bd680258b5`; Revolut picker `ed62e921-a02a-42ce-b97f-68d71c8a5091`;
plus flows 8005 / 12256 (paywall → OS purchase sheet → confirmation).

**Observed pattern.** The final commit screen restates: what you get, what you pay, when you are charged,
and what happens if you do nothing. The purchase sheet is a distinct, system-trusted surface.

**5Pixels verdict.** **Adopt** for credits and checkout: the paywall's docked CTA must read the exact
charge (`Start weekly · $X.XX`), trial mechanics must be stated in one plain sentence beside the CTA (not
in a footnote), and the return from the payment provider must land on a confirmation that states the new
balance. Spec: `13 §4`, `13 §7`.

---

## 4. Streaming & entertainment — rails, cards, and "continue"

**Screens** — Netflix/YouTube-style rails observed via YouTube `49bed0a7-724e-4bc1-b37b-f16bd62ba92c`,
`6f66c40e-29b1-4b41-b5c3-3e8b996b59f0`, `16a2b153-392a-48bb-bc83-eac1b472c8d2`; TIDAL and YouTube Music
`3ddaf0fc-7b48-447a-915a-1f54f162a354`; Instagram `a4ae4915-24c5-46e2-a545-8c1d26ece7cd`.

**Observed pattern.** Home is a vertical stack of horizontal rails, each with a short section title, an
optional "See all", partial-card peeking at the right edge to signal scrollability, and a "Continue
watching" rail always placed first when applicable.

**Why it works.** Rails compress a large catalogue into a scannable page; the peek is the cheapest
possible affordance for horizontal scroll; "Continue" first respects that returning users have unfinished
business.

**5Pixels verdict.** **Adopt** the rail grammar for `/app` discover (which already has Continue /
Trending / New / Saved / Categories) and codify: consistent section header type, always a `See all`
link, always ~15 % peek of the next card, snap scrolling, and no more than 6 items per rail before
"See all". The ordering rule "Continue first for returning users, orientation first for new users" is
already implemented and should be preserved. Spec: `05 §4`.

---

## 5. Productivity & SaaS — settings, billing, cancellation, notifications

### 5.1 Settings as grouped lists with disclosure, not tabs

**Screens** — TikTok `795d8c0a-7fd8-41a2-95c4-4452b0e10d96`, `bcf4a873-e9c6-468e-9b37-03fae599bb7e`,
`135f8327-ef78-4bdd-8a5d-86758ba3958c`; Artsy `cc8d4b69-031c-4b38-907f-a393e3bce53f`;
Gizmo `26df3f75-5491-4eb9-aa5c-bfee17d73eec`.

**Observed pattern.** A single scrolling page of grouped rows (`Account`, `Content & Display`,
`Support`), each row = icon + label + chevron + optional value/status on the right. Sub-pages are full
pages with a labelled back.

**Why it works.** Mobile settings are a *directory*, not a workspace: a flat scannable list beats a
horizontal tab rail, which hides options off-screen and has no room for descriptive value text.

**5Pixels verdict.** **Adapt.** `settings-shell.tsx` renders a horizontally scrolling chip rail on
mobile — options are hidden off-screen, and the current section is only discoverable by scrolling. Replace
on mobile with an index page of grouped disclosure rows (`/app/account`), each sub-page a full route with
a labelled back to "Account". Keep the desktop sticky sidebar unchanged. Spec: `14 §2`.

### 5.2 Plan comparison and upgrade

**Screens** — ElevenLabs `4a978810-bdff-4a15-afc5-09613acb12a1`, `78306c7a-9f1c-42f6-9cd8-ec8623ead5b6`,
`c84c6672-73d8-41cd-b5b1-7b456e224bfd`; Showcase `bcf5d801-e306-4c94-bbbf-64e8949d0d01`;
OpenAI pricing (mobile web) `48b87627-bbe6-415d-b314-632c38e40d95`; Fourthwall
`7af066b5-48d3-4a33-af54-8dc075b2d342`; Shuttle `40379d1d-931c-4475-88f6-ae1f2011ca74`;
Teachable `96b7e344-5080-49d7-96f2-cafc763e03d4`.

**Observed pattern.** On mobile, comparison tables collapse to *stacked plan cards* with the recommended
plan pre-selected and badged, a monthly/annual toggle above the stack, "everything in X, plus…" phrasing
to avoid repeating features, and an FAQ accordion below.

**5Pixels verdict.** **Adopt** for `/pricing` and `/app/billing/plan` on mobile: never render a
comparison table at 375 px; stack cards; pre-select the recommended plan; use incremental feature
phrasing; keep the FAQ as an accordion. `pricing-comparison.tsx` needs a mobile branch. Spec: `13 §5`.

### 5.3 Cancellation and retention (flow 13762, Synthesia, 9 steps)

Billing → plan overflow menu → cancel → retention offer (reminder / pause) → reason survey → pause
options → confirmation stating access continues until a specific date → Billing shows "canceled" with an
expiry rather than a renewal date.

**Why it works.** The user's real fear is losing access immediately; naming the end date removes it. The
reason survey is placed *after* the decision is effectively made, so it doesn't feel like an obstacle.

**5Pixels verdict.** **Adapt** for `/app/billing/plan`: cancel → sheet stating exactly what remains
(credits keep/expire per our rules, access until date) → optional one-tap reason chips → confirmation →
plan card shows "Ends <date>". **Reject** dark-pattern friction (multi-screen mazes, hidden cancel).
Spec: `13 §6`. Open question on credit expiry semantics: `20 Q7`.

### 5.4 Billing history on mobile web

**Screens** — fal `67b50a1f-2c72-4ce8-ba71-8065426d8c19`; ManyChat `db4a3028-d5f7-4506-a2da-95f5a59fc509`;
Kitchen.co `79693666-8b7a-45f2-a22f-209984f660ea`; Rox `e7ee3adb-8767-4428-871b-a48b4a693856`.

**Observed pattern.** Desktop tables become per-row cards: date + amount on the primary line, status
pill, and a download/receipt action; filters collapse to a period selector.

**5Pixels verdict.** **Adopt** for `/app/billing/history` and the credit ledger — no horizontally
scrolling tables on mobile. Spec: `13 §8`.

### 5.5 Notification preferences and inbox

**Screens (preferences)** — TikTok `9e42eb10-702f-4f17-949c-66acd8d15a72`; Coinbase
`e85a0767-4212-46e8-8ce4-cdef2c5b45b7`; Substack `b80350a3-5e9c-4688-aa05-a11758db125a`;
Airbnb `995d112b-158b-45f7-963c-b935bf65353e`.
**Screens (inbox)** — HYPE `48c20b25-2b4d-4742-a1f9-577fc9c104d3`; Artsy
`bf2fb4bf-5ab2-4eaf-90ad-8e7b2cb22169`; Buy Me a Coffee `4eec40bb-55b5-4712-9da9-842370c74ac1`;
Substack `59de3cfa-3ffb-4a31-b239-ab3e6d44c611`.

**Observed patterns.** Preferences: grouped toggle rows with a one-line description under each label and
a master switch per channel. Inbox: full-height list, unread marked by a dot plus a subtly tinted row,
grouped by time ("Today", "This week"), tapping navigates to the object.

**5Pixels verdict.** **Adopt** both. `notification-dropdown.tsx` is a desktop dropdown; on mobile it must
become a full-height sheet (or a route) with time grouping and unread dots, since a dropdown anchored to
a 32 px avatar is unusable at 375 px. Spec: `14 §4`.

---

## 6. Auth & onboarding

**Screens** — Comet `d43b7ad3-4a53-4f25-8e0c-0cde2eb6f25c`, `82e189f1-b157-486d-998b-e06bece9685b`;
IFTTT `2e6489c7-89a1-40ab-aad1-84e030b9c591`; Atoms `66a77ac8-5469-4883-a1f7-56abf63fd640`;
mobile-web signup: Handshake `b04ae4e3-6258-4f0f-acd6-7e7e70c21be0`, VSCO
`85d74158-1e73-4661-b333-3a6b506157f3`, Promova `3c86aa40-bfbc-4d52-8858-9520749f3b1a`.
**Onboarding carousels** — Introspect `5ce94a2a-65ef-4597-b2f4-62e1a11ca9a7`; District
`78fa0f3f-1543-4490-acee-871711278c6d`; Linear `28aa44ab-6722-4928-af07-814b7c84f0fc`;
Train Fitness `c8534d4c-2b69-4b78-bc38-8f4b4e854421`.

**Observed patterns.** (a) Sign-in is a *sheet* raised over the context that triggered it, with providers
first and email as a secondary path. (b) Mobile-web signup forms are single-column, one field per row,
large inputs, correct `inputmode`/`autocomplete`, and the CTA immediately after the last field. (c) Value
carousels precede signup in consumer apps but are increasingly skippable/skipped.

**5Pixels verdict.** **Adopt** (a) — `auth-modal.tsx` already raises a bottom sheet with the preset
thumbnail, which is exactly right; extend it so every gated action on mobile opens this sheet rather than
navigating to `/login`. **Adopt** (b) for `/login` `/signup` `/forgot-password` `/update-password`.
**Reject** (c): 5Pixels' landing feed *is* the value demonstration; an interstitial carousel would delay
it. Spec: `12`.

---

## 7. Sharing and public pages

**Screens** — Artsy `f569aa37-6439-42f5-a0ad-e6e5c1adb703`; VSCO `e82bdcd9-2c32-4cec-9056-d66f7b786a40`;
Podimo `4d5f79e0-29a3-4303-8625-597829d865ed`; ElevenLabs `94a4d9e9-9d03-4a55-9689-f033d607e999`;
web share dialogs: Epidemic Sound `c743c833-525e-4ded-a048-bb5a892eba30`,
`7941ea3b-5273-43b7-8d15-15cc833bd194`; Google Bard `00d03210-177c-4cdc-bdec-bb6044ff5cfd`; Make
`f5156534-ef99-46a0-9957-cd65fe0ce57b`.

**Observed patterns.** Native share sheets on mobile with a drag handle, a preview of what is being
shared, and a `Copy link` row that produces an immediate toast. Web products additionally show an explicit
**"create a public link"** toggle with a plain statement of who can see it, plus the link preview.

**5Pixels verdict.** **Adopt** `navigator.share()` as the primary mobile path with a
copy-link + preview fallback; **adopt** the explicit visibility statement in `share-dialog.tsx` ("Anyone
with this link can view this image") because we mint a public `/s/[shareId]`. The share page itself must
be a designed mobile landing with the image, the preset name, and a "Make your own" CTA — it is our
highest-intent acquisition surface. Spec: `10 §7`.

---

## 8. Cross-category synthesis

| Problem | Adjacent-category answer | 5Pixels application |
| --- | --- | --- |
| Evaluate many, commit to few | Quick-view sheet over the grid | Preset quick sheet everywhere (`06`) |
| Too many filters, no room | Full-screen filter modal + Apply/Reset + live count | `/explore` filters (`06 §4`) |
| Long page, one decision | Docked bottom action bar with cost | Preset detail, create, paywall (`04 §6`) |
| Opaque waiting | Named vertical stage checklist | Generation progress (`09`) |
| Reversible mistake | Undo toast | Favourites, library (`16 §6`) |
| Irreversible action | Action sheet naming the loss | Delete account/generation (`15 §3`) |
| Choosing a plan | Stacked cards, pre-selected, incremental features | `/pricing`, billing plan (`13 §5`) |
| Leaving | Honest cancellation with an end date | Billing plan (`13 §6`) |
| Settings on a small screen | Grouped disclosure list | Account index (`14 §2`) |
| Notifications | Full-height list, time-grouped, unread dot | Notifications sheet (`14 §4`) |
| Signing in mid-task | Contextual auth sheet, return to task | Auth modal everywhere (`12`) |
| Sharing | OS share sheet + explicit visibility statement | Share dialog, `/s/[shareId]` (`10 §7`) |
