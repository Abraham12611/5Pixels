# Credit Chip Visibility by Tier

Status: **Proposal.** Implements the T0–T3 model from `00_MONETIZATION_OVERVIEW.md §2`.

---

## 1. Your instinct is supported

The ask: a brand-new user shouldn't see a red `0 credits` badge, because it feels bad before they've done anything wrong.

This matches the standard UX guidance on zero states. The most-cited formulation of the rule ([UX StackExchange — *Whether to display or hide user Account Balance when it is 0*](https://ux.stackexchange.com/questions/80067/whether-to-display-or-hide-user-account-balance-when-it-is-0)) is:

> **Show the account balance if and only if it has ever been nonzero.** This way you progressively reveal features without hiding information from users who already ought to understand the balance.

That is exactly the rule below. The counter-argument in the same discussion is real and worth respecting: **never hide a balance from someone who has learned to rely on it** — they'll hunt for it, then file a support ticket. Our tier model satisfies both sides because "has ever paid" is monotonic: once the chip appears, it never disappears again.

Two things the research does *not* support, and which we should not claim internally:

- There is **no credible evidence that a zero badge measurably reduces signups.** The argument for hiding it is coherence and tone, not a proven conversion lift. Don't justify this with a made-up number.
- **Red is the wrong colour even for paid users at zero.** Red/`error` reads as *"something is broken / you did something wrong."* Running out of credits is a normal, expected, revenue-positive state. Amber/`warning` with a clear action is the correct treatment; reserve `error` for an actually blocked action.

---

## 2. Rules

| Tier | Chip | Colour | Label | Rationale |
|---|---|---|---|---|
| **T0 Visitor** | Hidden | — | — | No account, no balance concept |
| **T1 Free** | **Hidden** | — | — | Nothing has ever been nonzero; the concept hasn't been introduced |
| **T2 Paid, in credit** | Visible | Neutral (`cream-100`) | `142 credits` | Normal state |
| **T2 Paid, low** | Visible | Amber (`warning`) | `4 credits` | Early warning, existing `lowCreditAt` threshold |
| **T3 Paid, exhausted** | **Visible** | **Amber**, not red | `0 credits · Top up` | Expected state, clear action |
| **Any, generation blocked** | Visible | Red (`error`) | `Out of credits` | Now something *is* blocked — red is earned |

The last row is the key distinction: **the colour escalates on blocked intent, not on balance.** A user with 0 credits idly browsing Discover gets amber. The same user who just pressed Generate gets red, because at that moment the zero is actually in their way.

---

## 3. What replaces the chip for free users

Hiding the chip leaves a gap in the header's right cluster and removes the only route to `/app/billing`. Free users still need a way to discover pricing — hiding the scarcity signal must not also hide the shop.

Recommendation: a **neutral, non-scarcity upgrade affordance** in the same slot.

```
[ Search ]  [ ✦ Upgrade ]  [ 🔔 ]  [ Admin ]  [ avatar ]
```

- Label `Upgrade` or `Plans`, links to `/app/billing/plan`
- Neutral or lime accent — an invitation, not a warning
- No number, no coin icon, no count of anything they don't have
- Mobile: collapses into the user dropdown, which already surfaces plan info (`user-dropdown.tsx`)

Once the user pays, this slot becomes the real `CreditBalanceChip` permanently.

---

## 4. Implementation sketch

**Server** — extend `apps/web/lib/billing/entitlements.ts`:

```ts
export interface CreditDisplay {
  tier: UserTier;
  showChip: boolean;      // false for visitor + free
  balance: number;
  hasEverPaid: boolean;   // monotonic; drives showChip
  severity: "neutral" | "low" | "empty";
}

export async function getCreditDisplay(userId?: string): Promise<CreditDisplay>;
```

`hasEverPaid` = any `invoices.status='paid'` OR any `subscriptions` row for the user (including `cancelled`/`expired` — a lapsed subscriber must keep the chip). This mirrors the existing checks in `canPurchaseTrial()` (`entitlements.ts:156-182`), so consider extracting a shared `hasEverPaid(userId)` helper and using it in both places.

**Header** — `apps/web/components/consumer/app-header.tsx:50-70` already fetches `getUserCreditBalance()` and `getActivePlan()` in its `Promise.all`. Add `getCreditDisplay()` there (or fold the two existing calls into it — it needs the same data, so this can be net-neutral on query count) and pass the object down.

**Client** — `apps/web/components/consumer/credit-balance-chip.tsx`:

- Accept `display: CreditDisplay`; render `null` when `!showChip`
- Swap the `isOut` branch from `error` to `warning` tokens (`chip.tsx:32-34, 43-48`)
- Add an `UpgradeChip` sibling for the free tier
- Add a `blocked` variant (red) used by the generate/paywall surfaces, not the header

**Tests** — extend the existing billing test suite (`lib/billing/__tests__/`):

- free user → `showChip: false`
- free user who becomes paid → `showChip: true`
- **paid user who lapses to 0 and cancels → still `showChip: true`** (the monotonic guarantee; this is the regression that matters)
- paid, low, exhausted severities map correctly

---

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Referral credits granted to a never-paid user | Chip **becomes visible** — they now have a nonzero balance to track. This is the correct read of the "ever been nonzero" rule, and it's a common state in Phase 1, where referrals are the main route to a first generation (`03 §1`). |
| Free user whose referral credits return to 0 | Chip **stays visible** — the balance has been nonzero, so the monotonic rule applies to referral credits exactly as it does to purchased ones. Show the amber "Top up" state, not the red one. |
| Admin/owner accounts | Always show; they need it for Lab testing |
| Signup grant restored later | Chip visible from signup for everyone — this whole doc becomes moot for T1. **Settled: the grant is not returning** (`00 §1`), so T1 stays chip-less. |
| Balance loads slowly / errors | Render nothing rather than `0`. A flash of red zero on every page load is the exact harm we're removing. `getUserCreditBalance()` already returns `0` on error (`entitlements.ts:30-33`) — that fallback must not be rendered as a real zero. |
