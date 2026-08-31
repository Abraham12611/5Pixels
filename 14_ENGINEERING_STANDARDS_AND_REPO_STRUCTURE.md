# 5Pixels — Engineering Standards and Repository Structure

# 1. Objectives

Engineering should optimize for:
- predictable changes;
- typed contracts;
- observability;
- rollback;
- testability;
- provider portability.

---

# 2. Suggested repository

```text
/apps
  /web
  /worker
  /admin

/packages
  /db
  /types
  /ui
  /preset-engine
  /provider-adapters
  /billing
  /analytics
  /media
  /config
```

Admin may live inside web initially if simpler.

---

# 3. TypeScript

Use strict mode.

Avoid:
- implicit any;
- unvalidated JSON from providers;
- duplicated domain types.

Use runtime validation for:
- API;
- provider responses;
- webhooks;
- preset JSON config.

---

# 4. Domain modules

Prefer:
- presets;
- assets;
- generations;
- billing;
- safety;
- users.

Avoid giant "utils" modules.

---

# 5. Database migrations

- migration per change;
- review;
- reversible where reasonable;
- no manual production edits.

---

# 6. Environments

- local;
- preview/staging;
- production.

Separate:
- DB;
- buckets;
- billing test/live;
- provider keys.

Never run production-generation tests accidentally from staging.

---

# 7. Feature flags

Use for risky changes.

All provider/model migrations should be flaggable.

---

# 8. Testing pyramid

Unit:
- preset compiler;
- credit math;
- validation;
- state machine.

Integration:
- DB;
- storage;
- billing webhook;
- provider adapters via mocks.

E2E:
- signup;
- preset selection;
- upload;
- generation mocked/staging;
- download;
- billing.

---

# 9. Provider contract tests

Every adapter must test:
- happy path;
- timeout;
- malformed response;
- rate limit;
- safety block;
- retry.

---

# 10. State machine tests

Ensure invalid transitions fail.

Example:
completed -> generating should be impossible.

---

# 11. Ledger tests

Property/invariant tests:
- idempotent debit;
- refund matches debit;
- no double allocation;
- no negative balance if prohibited.

---

# 12. Logging

Structured logs:
- request ID;
- user ID hash/internal ID;
- generation ID;
- job ID;
- preset version;
- provider run ID.

Never raw secrets or private instructions.

---

# 13. Error reporting

Attach safe context:
- route;
- generation ID;
- preset;
- provider code.

Do not attach user images.

---

# 14. CI

On PR:
- lint;
- typecheck;
- unit tests;
- integration tests;
- migration check;
- build.

On main:
- deploy preview/staging;
- smoke test.

Production:
- controlled deploy;
- rollback available.

---

# 15. Code review rules

High-risk areas require explicit review:
- billing;
- auth;
- storage access;
- preset secrecy;
- admin roles;
- deletion;
- webhooks.

---

# 16. Configuration

Do not hard-code:
- prices;
- credit costs;
- provider model names across UI;
- preset version IDs;
- retention periods.

Central configuration/database.

---

# 17. Media handling

All uploaded media passes through controlled media service.

Do not let arbitrary parts of app write storage directly.

---

# 18. API response rule

Client-facing generation API returns:
- user-safe state;
- display copy;
- output references.

It does not return:
- provider response body;
- private instruction;
- internal moderation classifiers.

---

# 19. Documentation

Any new domain should include:
- overview;
- data;
- routes;
- failure modes;
- metrics.

This repository is the starting point.

---

# 20. Technical debt policy

Debt is acceptable when:
- explicitly tracked;
- does not compromise privacy/billing/safety;
- has clear cleanup trigger.

Never take shortcuts in:
- credit integrity;
- access control;
- media privacy.
