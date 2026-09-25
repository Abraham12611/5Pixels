# Manual Testing Guide — Phase 1.8: Result Download & Share

Scope: PR #47 (`feature/mobile-result-share-p18`), spec `10_RESULT_COMPARE_SHARE` §5–6.

This branch is **stacked** on the earlier Phase 1 PRs, so the result page you test also includes the immersive layout (#45) and compare/viewer (#46). The cases below cover only what 1.8 changed; file bugs against earlier behavior on their own PRs.

## What changed

| Area | Before | After |
|---|---|---|
| Download | Plain `<a download>` on the signed URL | Probes the URL, **re-mints it once** if expired, honest success/failure toast, saved as `5pixels-<preset>-<id8>.<ext>` |
| iOS Safari | File silently opened in a new tab | One-time hint sheet explains *Share → Save Image*, then hands off |
| Multi-output | Only first output downloadable | `Download all N images` with `Saving 2 of 3…` progress |
| Share | Desktop `Dialog` on all screens | **T2 bottom sheet** on mobile, dialog kept on desktop; native share prefers the image **file**; single explicit **Public link** toggle; `Download instead` escape |

## Prerequisites

1. `cp .env.example .env.local` and fill in Supabase vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`).
2. `pnpm install && pnpm dev` → http://localhost:3000.
3. Sign in with a test account that has **≥1 credit**, and produce **at least one completed generation**: Discover → pick a preset → upload a photo → Generate → wait for the result page (`/app/results/<id>`).
4. Test on **two viewports**:
   - **Mobile:** Chrome DevTools device toolbar at 390×844 (iPhone 14) *and ideally a real iPhone + real Android*.
   - **Desktop:** any width ≥1024px.
5. Keep DevTools open on the Network tab for the expired-URL case, and on Application → Local Storage for the iOS-hint reset.

> **Note on multi-output:** V1 generates a single output, so `Download all` will not appear on real generations. To exercise it, add a second row to the generation's `outputs` JSONB in Supabase Table Editor (`bucket` + `storage_key` pointing at any image in the output bucket), then reload the result page.

---

## 1. Download — desktop / Android Chrome

1. Open a completed result at desktop width (≥768px) and at mobile width (<768px).
2. Tap/click **Download**.
   - ✅ A toast appears naming the file: `Downloading 5pixels-<preset>-<id8>.jpg` (or `.png`/`.webp`).
   - ✅ The file lands in Downloads with that name — not a random hash.
   - ✅ On mobile the file saves via the browser's download flow.
3. Open the **Library** tab → the result tile should reflect the downloaded state if the UI surfaces it (the `downloaded_at` timestamp is written — verify in Supabase `generations.downloaded_at` if not visible).

## 2. Expired signed URL (re-mint)

Signed URLs live for **10 minutes (600s)**.

1. Open a result page, then **wait >10 minutes** without reloading (leave the tab open).
2. Tap **Download**.
   - ✅ No error — the download still succeeds. Behind the scenes the page detects the dead URL and re-mints via `getResultDownloadUrls`.
   - ✅ Toast still names the file.
3. Simulate failure: block `storage.googleapis.com` (or the Supabase storage host) in DevTools Network → tap Download.
   - ✅ Error toast: *"Couldn't download this image. Try again in a moment."* — no silent failure, no crash.
   - ✅ The Download button stays usable for a retry.

## 3. iOS Safari hint (needs a real iPhone or the Xcode simulator)

1. On iPhone Safari, open a result → tap **Download**.
   - ✅ A bottom **sheet** (not a dialog) appears: *"Saving on iOS — The image opens in a new tab — tap the Share icon, then Save Image to keep it in Photos."*
   - ✅ The sheet can be dismissed by swiping down / tapping the scrim.
2. Tap **Open image** → a new tab opens with the image.
   - ✅ Long-press / Share → Save Image works as described.
3. Go back and tap **Download** again.
   - ✅ **No sheet this time** — the hint is remembered (`localStorage` key `sp_ios_download_hint_seen`).
   - ✅ The image opens in a new tab directly.
4. Reset: DevTools → Application → Local Storage → delete `sp_ios_download_hint_seen` → the hint shows once more on next tap.
5. iOS **Chrome** (CriOS) should behave like Android — no hint sheet (hint is Safari-specific).

## 4. Download all (multi-output — see prerequisite note)

1. On a generation whose `outputs` has ≥2 rows, open the result page.
2. Mobile: the docked action bar shows **Download all N images** below Share/Save. Desktop: it appears under Download in the action card.
3. Tap it.
   - ✅ The label counts up: `Saving 1 of N…` → `Saving 2 of N…` …
   - ✅ Files are numbered: `…-1.jpg`, `…-2.jpg`.
   - ✅ Final toast: `Saved all N images` (or `Saved X of N images` if some failed).
   - ✅ Button is disabled while saving — no double-tap storms.

## 5. Share sheet — mobile

1. At mobile width, tap **Share** in the docked bar.
   - ✅ A **bottom sheet** slides up (T2), not a centered dialog. It has the standard sheet chrome: title *"Share your result"*, drag handle, scrim.
   - ✅ Privacy line visible: *"Anyone with the link can view this result. Your account and other creations stay private."*
2. Dismissal paths — each should work:
   - ✅ Tap scrim / swipe down / press browser **Back** → sheet closes, page scroll is restored, focus returns to the Share button.
3. Contents (top→bottom):
   - ✅ Preview card: result thumbnail + preset name + *"Made with 5Pixels"*.
   - ✅ **Share…** button (on devices with `navigator.share` — real phones, not desktop).
   - ✅ **Public link** toggle row: *"Anyone with this link can view this image."*
   - ✅ **Download instead** link at the bottom.

### 5a. Public link — create

4. Toggle **Public link** on.
   - ✅ Toast: `Share link created`. A read-only URL field and a **Copy link** button appear.
   - ✅ The toggle row adds: *"Turning it off breaks existing links."*
5. Tap **Copy link** → toast `Link copied`, button briefly reads `Copied` with a ✓.
6. Paste into an **incognito window** (signed out).
   - ✅ The public share page (`/s/<id>`) renders the result — no login wall.
   - ✅ It shows **only** the result — no account data, no other generations.

### 5b. Public link — revoke

7. Toggle **Public link** off → toast `Share link disabled`; URL field + Copy link disappear.
8. Reload the incognito tab.
   - ✅ The link is dead (not-found / unavailable), not the image.
   - ✅ Back in the session, your Library still has the result — revoking the link never deletes the generation.

### 5c. Native share

9. On a real iPhone/Android: toggle the public link on, then tap **Share…**.
   - ✅ The OS share sheet opens. Where `canShare({files})` is supported it should offer the **image itself** (attachable to Messages/WhatsApp), not just a URL.
   - ✅ Dismissing the OS sheet produces no error toast (cancel is not a failure).
10. Block image fetch (offline toggle) → Share… falls back to sharing the **URL** instead of failing.

### 5d. Download instead

11. Tap **Download instead**.
   - ✅ The share sheet closes and the normal download flow runs (including the iOS hint on Safari).

## 6. Share dialog — desktop

1. At ≥768px, click **Share**.
   - ✅ A **centered dialog** (not a bottom sheet) with the same content: title, privacy description, preview card, Public link toggle.
   - ✅ `Share…` is hidden if `navigator.share` is unavailable (most desktop browsers).
   - ✅ Escape and the scrim close it; focus returns to the Share button.
2. The toggle, URL field, Copy link, and incognito behavior are identical to mobile — spot-check one.

## 7. Accessibility & polish pass

- ✅ Every button/control in the sheet and docked bar is ≥44px tall.
- ✅ The Public link toggle has an accessible name and announces its state (VoiceOver: "Public link, switch, on/off").
- ✅ Sheet traps focus while open — Tab cycles within the sheet, not to the page behind.
- ✅ `prefers-reduced-motion: reduce` (DevTools Rendering tab) — sheet open/close has no slide animation.
- ✅ Zoom to 200% — sheet content still fits and scrolls internally.

## Regression spots (unchanged behavior worth one tap)

- ✅ **Save** toggles Saved state; **Regenerate (N credit)** and **Adjust** still work from the docked bar / action card.
- ✅ Result / Original / Compare switch and hold-to-compare still work above the docked bar.
- ✅ The result stays private — nothing is shared or made public until the toggle is flipped.

## Known limitations

- `Download all` cannot be exercised without seeding a second output row (V1 emits one output).
- The iOS hint is one-time per browser (`localStorage`); clearing site data resets it — intended.
- Signed-URL probing uses a HEAD fetch; on networks that strip HEAD it falls back gracefully and re-mints rather than failing.
