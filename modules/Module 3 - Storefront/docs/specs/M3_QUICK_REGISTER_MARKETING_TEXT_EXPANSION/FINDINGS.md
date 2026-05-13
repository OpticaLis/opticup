# FINDINGS — M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — REC-SITE-021 sub-item (C) Lead-pixel wiring remains DEFERRED (not a finding, but a tracking signal)

- **Code:** `M3-DEBT-21C`
- **Severity:** INFO
- **Discovered during:** SPEC scope review (§8 Out of Scope explicitly preserves (C))
- **Location:** `opticup-storefront/src/pages/quick-register/index.astro` form submit handler + `storefront_config.analytics.pixel_events` JSONB (4 rules targeting `/successfulsupersale/` × 3 langs + `/successfulmulti/`).
- **Description:** With (A) and (B) closed, the SuperSale lead form is now legally compliant (unchecked marketing checkbox with cookie + privacy coverage). However, the Meta Pixel Lead event still never fires for SuperSale signups — the 4 `pixel_events` rules in DB target success-page URLs (`/successfulsupersale/` etc.) that do not exist on this storefront (success is inline on `/quick-register/` via a `.qr-result.success` popup). Result: Daniel is paying for Pixel + storing consent in `tenants.ui_config.cookie_consent` + has correctly-wired Pixel infrastructure, but the SuperSale flow's most valuable conversion event (Lead) is dark.
- **Reproduction:**
  ```
  -- Confirm 4 rules target non-existent success URLs
  SELECT key, jsonb_pretty(value) FROM storefront_config sc, jsonb_each(sc.analytics->'pixel_events')
   WHERE sc.tenant_id = 'prizma-uuid'::uuid AND key LIKE '%successfulsupersale%' OR key LIKE '%successfulmulti%';

  -- Confirm /quick-register/ submit handler does not call fbq('track','Lead')
  grep -n "fbq.*Lead" opticup-storefront/src/pages/quick-register/index.astro
  ```
- **Expected vs Actual:**
  - Expected (for a properly wired marketing-funnel): `fbq('track','Lead')` fires on successful form submit in `/quick-register/` IF `window.__consent.marketing === true`. Without consent: no fire (gated by `consentGate()` per REC-SITE-010).
  - Actual: no fbq Lead call exists in the form submit path; 4 pixel_events DB rules wait for URLs that never load.
- **Suggested next action:** NEW_SPEC (when Daniel chooses to ship sub-item (C)).
- **Rationale for action:** Already tracked as REC-SITE-021 sub-item (C). DEFERRED by Daniel — not a finding for this SPEC to dispose. Listing here as an audit trail signal so the FOREMAN_REVIEW can confirm the partial-closure boundary is intentional. The implementation is straightforward: gate `fbq('track','Lead')` inside `consentGate()` in the form's success branch; optionally include `value` + `currency` + `content_name='SuperSale Lead'` for Ads conversion modeling. ~1-2 hrs.
- **Foreman override (filled by Foreman in review):** { }

---
