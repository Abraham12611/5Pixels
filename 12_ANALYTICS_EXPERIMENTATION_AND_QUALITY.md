# 5Pixels — Analytics, Experimentation, and Quality

# 1. Analytics philosophy

Measure the full transformation funnel, not only traffic.

---

# 2. Core funnel

```text
Landing view
-> Preset preview
-> Preset detail
-> Use preset
-> Upload
-> Validation pass
-> Generate
-> Success
-> Result view
-> Save/download
-> Repeat
```

---

# 3. Event taxonomy

## Discovery
- landing_view
- explore_view
- category_view
- preset_card_impression
- preset_preview_play
- preset_preview_complete
- preset_card_click
- preset_detail_view
- preset_favorite

## Create
- upload_started
- upload_completed
- upload_validation_warning
- upload_rejected
- preset_option_changed
- generation_requested

## Generation
- generation_queued
- generation_started
- generation_provider_attempt
- generation_completed
- generation_failed
- generation_blocked
- generation_refunded

## Result
- result_viewed
- result_downloaded
- result_saved
- result_shared
- regenerate_clicked
- change_options_clicked
- result_feedback_submitted

## Billing
- pricing_view
- checkout_started
- checkout_completed
- subscription_started
- subscription_cancelled
- credit_pack_purchased

---

# 4. Event properties

Include:
- user/session;
- preset;
- preset version;
- category;
- source platform;
- plan;
- credits;
- generation ID;
- model/provider only in internal analytics;
- latency;
- experiment variant.

Do not send user image or private instructions.

---

# 5. Main product KPIs

Activation:
- first successful generation.

Value:
- first download/save.

Retention:
- returns and performs generation again.

Quality:
- download per completed generation;
- negative feedback;
- regenerate before download;
- likeness complaint.

Commercial:
- paid conversion;
- gross margin.

---

# 6. Preset scorecard

Each active preset should have:
- detail conversion;
- generation volume;
- completion;
- p50/p95 latency;
- negative feedback;
- download rate;
- retry rate;
- cost;
- gross margin.

---

# 7. Preview media metrics

Landing curated preset previews:
- impression;
- video started;
- played >50%;
- completed;
- clicked after preview.

This tells whether preview video helps conversion.

---

# 8. Quality rubric

Human 1–5 scores:
- fidelity;
- style;
- composition;
- technical quality;
- artifact;
- overall desirability.

Text presets:
- text accuracy.

---

# 9. Golden dataset

Version the dataset.

Never silently change benchmark inputs.

Store:
- source asset;
- intended scenario;
- demographic/visual coverage;
- consent/rights metadata.

---

# 10. Experiment rules

Do not A/B test:
- safety weakening;
- privacy disclosures hiding;
- deceptive pricing.

Appropriate experiments:
- hero copy;
- card layout;
- preview playback;
- preset version;
- CTA;
- category ordering.

---

# 11. Statistical hygiene

Define before launch:
- primary metric;
- minimum sample;
- guardrail metrics;
- stop criteria.

Avoid deciding based on noisy early numbers.

---

# 12. Guardrails

For experiments:
- generation failure cannot materially rise;
- negative feedback cannot materially rise;
- cost cannot exceed allowed budget;
- accessibility/performance cannot regress severely.

---

# 13. Quality incident

If preset suddenly regresses:
1. alert;
2. compare provider behavior;
3. pause or rollback;
4. sample recent outputs;
5. open incident note;
6. publish corrected version.

---

# 14. Performance analytics

Track Web Vitals:
- LCP;
- CLS;
- INP.

For preview videos:
- bytes;
- start delay;
- decode issues;
- mobile playback failures.

---

# 15. Reporting cadence

Daily:
- failures;
- provider health;
- spend.

Weekly:
- preset quality;
- funnel;
- retention.

Monthly:
- catalog performance;
- unit economics;
- roadmap decisions.
