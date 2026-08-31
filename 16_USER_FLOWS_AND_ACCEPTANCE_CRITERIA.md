# 5Pixels — User Flows and Acceptance Criteria

# Flow 1 — Discover and generate

## Journey
1. user lands;
2. sees hero;
3. previews preset MP4;
4. opens preset;
5. clicks Try this look;
6. signs in if needed;
7. uploads image;
8. passes validation;
9. configures options;
10. sees credit cost;
11. generates;
12. sees status;
13. receives result;
14. downloads.

## Acceptance
- user never sees private prompt;
- card preview is video/GIF, not draggable slider;
- upload validation feedback understandable;
- duplicate click cannot double charge;
- failed job refunds/releases credit;
- result persists to library.

---

# Flow 2 — Incompatible image

User uploads group image into one-person preset.

Expected:
- detect issue;
- show warning or block based on preset;
- explain;
- allow replace image;
- no credit charged before valid generation.

---

# Flow 3 — Insufficient credits

Expected:
- preserve upload and options;
- show credit requirement;
- user upgrades/buys;
- returns to same state;
- generation can continue.

---

# Flow 4 — Generation failure

Expected:
- friendly failure;
- credit restored;
- retry option;
- no raw provider error;
- support reference ID optional.

---

# Flow 5 — Regenerate

Expected:
- creates new generation record;
- old result remains;
- user can compare history;
- credit cost shown.

---

# Flow 6 — Change options

Expected:
- return to create config with previous values;
- new generation on submit;
- old result preserved.

---

# Flow 7 — Favorite preset

Expected:
- instant UI response;
- persists;
- visible in Favorites;
- works across sessions.

---

# Flow 8 — Delete result

Expected:
- confirmation;
- result removed from library;
- signed URLs stop working;
- backend deletion queued;
- audit/legal records remain only where required.

---

# Flow 9 — Curated preview reduced motion

If OS reduced motion:
- no autoplay;
- card uses poster;
- optional preview control;
- product remains understandable.

---

# Flow 10 — Admin publish preset

Expected:
- admin creates version;
- fills required data;
- tests;
- benchmark;
- QA;
- publishes;
- version becomes active;
- previous version remains immutable;
- audit event written.

---

# Flow 11 — Admin rollback

Expected:
- authorized admin selects previous version;
- confirms;
- active version changes;
- new user generations use rollback;
- old generations unchanged.

---

# Flow 12 — Billing renewal

Expected:
- webhook verified;
- event idempotent;
- subscription updated;
- monthly credits allocated once;
- ledger trace exists.

---

# Definition of Done — Preset

A preset is done when:
- public content;
- poster;
- MP4 preview;
- compatibility;
- fields;
- private recipe;
- provider;
- cost;
- benchmark;
- QA;
- safety;
- analytics;
- rollback path.

---

# Definition of Done — Page

A page is done when:
- loading;
- empty;
- error;
- responsive;
- keyboard;
- analytics;
- permissions;
- reduced motion where needed;
- no placeholder fake social proof.

---

# Definition of Done — Generation

Done when:
- source authorized;
- cost reserved;
- queued;
- provider traced;
- output validated;
- post-process done;
- final asset stored;
- ledger finalized/refunded;
- analytics emitted;
- result linked to library.

---

# Definition of Done — Launch

- no exposed private instructions;
- no public user media by default;
- billing reconciles;
- deletion works;
- preview media performant;
- failed generation refund works;
- admin rollback works;
- provider degradation alert exists;
- legal pages live;
- support path exists.
