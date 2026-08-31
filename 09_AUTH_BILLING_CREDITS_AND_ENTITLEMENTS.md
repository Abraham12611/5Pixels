# 5Pixels — Authentication, Billing, Credits, and Entitlements

# 1. Authentication goals

Support:
- email/password or magic link;
- social auth later if useful;
- verified email;
- secure session;
- password recovery;
- account deletion.

---

# 2. Anonymous browsing

Unauthenticated user can:
- browse landing;
- explore;
- preview presets;
- open preset detail;
- inspect pricing.

Authentication required before:
- persistent upload;
- generation;
- library;
- favorites sync;
- purchase.

Optional later:
anonymous upload with sign-in gate before generation.

---

# 3. Credits model

Use credits as internal unit of generation value.

Reasons:
- models have different costs;
- premium presets may cost more;
- subscriptions can package flexible value;
- easier than exposing dollars per generation.

---

# 4. Ledger, not mutable balance

Never rely only on:
`users.credit_balance`.

Use:
- ledger entries;
- transaction IDs;
- idempotency;
- reconciliation.

Cached balance may exist for performance.

---

# 5. Generation credit lifecycle

Preferred:

1. calculate cost;
2. reserve credits;
3. start job;
4. success -> finalize debit;
5. failure/block due to system -> release/refund;
6. user-cancel semantics defined separately.

---

# 6. Insufficient credits

UX:
- explain preset cost;
- current balance;
- upgrade;
- buy credits;
- cancel.

Do not lose configuration.

After purchase, user returns to same create flow.

---

# 7. Plans

Possible conceptual tiers:
- Free
- Creator
- Pro

Exact price and allowance are product configuration, not fixed by docs.

Plan may define:
- monthly credits;
- export quality;
- premium preset access;
- early access;
- commercial rights if legal policy supports;
- priority queue if operationally feasible.

---

# 8. Credit packs

Optional:
- one-time purchase;
- do not expire or define expiry clearly;
- distinct from recurring allocation.

---

# 9. Subscription renewal

On billing webhook:
- verify;
- idempotently record;
- allocate credits;
- update entitlement;
- avoid double allocation.

---

# 10. Cancellation

User can:
- cancel renewal;
- remain active until period end;
- understand remaining credits policy.

---

# 11. Refunds

Generation failures:
automatic internal credit refund/release.

Billing refunds:
handled through billing provider and reflected in ledger.

---

# 12. Locked presets

A preset may require:
- paid plan;
- premium credit cost;
- early-access entitlement.

Locked card should still be previewable where strategically useful.

Click:
- explains unlock path;
- does not dead-end.

---

# 13. Entitlement service

Central function should answer:
- can user use preset?
- can user export at requested quality?
- can user use commercial license?
- can user access early features?
- how many credits?

Avoid duplicating entitlement logic across UI.

---

# 14. Billing pages

## Plan
Current plan, renewal, upgrade/downgrade.

## Credits
Balance, allocation date, buy more.

## History
Subscription invoices and credit transactions.

---

# 15. Fraud and abuse controls

Rate limit:
- signup;
- generation;
- trial usage;
- checkout creation.

Watch:
- repeated account creation;
- stolen payment patterns;
- scripted generation;
- high concurrency.

Do not penalize normal users with overly aggressive friction.

---

# 16. Financial invariants

- credit ledger must reconcile;
- generation cannot finalize debit twice;
- webhook cannot allocate twice;
- refund references original debit;
- admin adjustment is audited;
- balance cannot go below allowed policy without explicit state.

---

# 17. Trial design

Potential:
- small signup credit grant;
- watermarked or lower-quality free exports optional;
- limited preset set.

Do not let trial economics encourage unbounded abuse.

---

# 18. Pricing UX

Show:
- what a credit means;
- typical preset cost;
- whether failures refund;
- monthly allocation;
- top-up options.

Avoid opaque pricing where user only learns cost after upload.

---

# 19. Billing privacy

Do not store full payment card data.

Use billing provider.

Store:
- external IDs;
- status;
- plan;
- invoice metadata.

---

# 20. Billing Definition of Done

- idempotent checkout;
- webhook signature verification;
- credit ledger;
- failure refund;
- entitlement checks;
- billing portal;
- user-visible transaction history;
- admin adjustment audit.
