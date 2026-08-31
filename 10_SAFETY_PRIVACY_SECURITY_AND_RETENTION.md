# 5Pixels — Safety, Privacy, Security, and Retention

# 1. Product risk profile

Users may upload:
- faces;
- children;
- private family photos;
- professional photos;
- copyrighted images;
- sensitive contexts.

Treat image privacy as a core product responsibility.

---

# 2. V1 safety posture

Avoid presets designed for:
- sexualization;
- nudity;
- clothing removal;
- deceptive IDs;
- harmful impersonation;
- explicit abusive manipulation;
- non-consensual intimate content.

Policy details should be formalized before launch.

---

# 3. Safety layers

1. preset-level policy;
2. user text validation;
3. source-image moderation where required;
4. provider policy;
5. output moderation where appropriate;
6. abuse monitoring;
7. human review for escalations.

---

# 4. User text

Preset text fields can still be abused.

Controls:
- length;
- allowed characters;
- moderation;
- literal treatment;
- no hidden prompt semantics.

---

# 5. Image upload security

Never trust:
- filename;
- extension;
- declared MIME.

Process:
1. inspect;
2. decode;
3. enforce size limits;
4. re-encode;
5. strip metadata;
6. assign safe internal name.

---

# 6. EXIF

Strip:
- GPS;
- device details;
- timestamps where not needed;
- orientation after normalization.

Store only metadata required for product.

---

# 7. Storage privacy

Originals and outputs:
- private by default;
- signed URLs;
- short expiration;
- strict authorization.

Public preset marketing assets are separate.

---

# 8. Retention

Define separate policies for:
- original uploads;
- sanitized inputs;
- provider responses;
- final outputs;
- logs;
- safety events;
- billing records.

Suggested product behavior:
- allow user deletion;
- offer auto-delete originals;
- keep final outputs only as long as user chooses, subject to policy.

Exact retention periods must be decided before production.

---

# 9. Delete flow

User can:
- delete individual generation;
- delete original;
- delete result;
- delete account.

Deletion pipeline:
1. mark pending;
2. revoke access;
3. delete media;
4. propagate to backups per policy;
5. keep legally required billing/audit data separately.

---

# 10. Provider privacy review

For every AI provider document:
- retention;
- training policy;
- data usage;
- region;
- DPA;
- deletion;
- sub-processors.

Do not assume API inputs are not retained.

---

# 11. Secrets

Keep in secret manager/environment:
- provider keys;
- billing secrets;
- webhook secrets;
- signing keys;
- storage credentials.

Never in client bundle.

---

# 12. Authorization

All asset operations require:
- authenticated user;
- ownership or explicit grant;
- admin role if administrative.

Use server-side checks on every request.

---

# 13. Admin security

Require:
- stronger auth;
- role-based permissions;
- audit logs;
- least privilege.

Sensitive actions:
- credit adjustment;
- safety override;
- preset private recipe;
- user asset access.

---

# 14. Logging

Never log:
- raw private prompt/instruction by default;
- full signed URLs;
- user images;
- payment data;
- session tokens.

Log IDs and metadata.

---

# 15. Threats

## Prompt extraction
Mitigation:
server-only instructions.

## Asset ID guessing
Mitigation:
unguessable IDs + auth.

## Malicious upload
Mitigation:
decode/re-encode.

## Credit replay
Mitigation:
idempotency.

## Webhook spoof
Mitigation:
signature verification.

## Admin misuse
Mitigation:
RBAC + audit.

## Excessive generation
Mitigation:
rate limits and spend controls.

---

# 16. Safety event UX

If blocked:
- concise explanation;
- no graphic detail;
- no credit loss if policy dictates;
- link to policy/help;
- appeal path later if needed.

---

# 17. Privacy messaging

Product UI should clearly state:
- private by default;
- how long originals remain if auto-deleted;
- how to delete;
- whether images are used for training.

Only make claims confirmed by contracts and implementation.

---

# 18. Pre-launch checklist

- privacy policy reviewed;
- terms reviewed;
- content policy;
- retention configured;
- deletion tested;
- access control penetration testing;
- upload hardening;
- provider DPAs reviewed;
- incident response owner;
- security contact;
- admin audit logs active.
