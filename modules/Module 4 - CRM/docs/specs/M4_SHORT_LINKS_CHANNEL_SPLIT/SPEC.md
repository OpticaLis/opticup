# SPEC: M4_SHORT_LINKS_CHANNEL_SPLIT

**Status:** Ready for execution
**Author:** Foreman (opticup-strategic)
**Date:** 2026-05-24
**Module:** Module 4 - CRM
**Dependency:** This SPEC is a prerequisite for M4_SHORT_LINKS_CHANNEL_DASHBOARD (data/convention first, dashboard second).
**Brief:** campaigns/supersale/sketches/BRIEF_channel_split_all_short_links.md

---

## 0. Problem Statement

Three `short_links` codes are shared across both email and SMS templates. Because `resolve-link` EF increments `click_count` per code, shared codes make it impossible to measure SMS-vs-email clicks. The locked convention (Daniel, 2026-05-24): code STARTS with channel letter (`S`=SMS, `E`=email). The supersale-launch codes (`SSLpw1`/`ESLpw1`/`SSLpw2`/`ESLpw2`) already follow this. This SPEC applies the convention to the remaining 3 shared codes.

**Secondary finding:** Demo templates currently reference Prizma short-link codes instead of demo-specific codes. This is fixed as part of the channel split — demo gets its own channel-split codes.

---

## 1. Acceptance Criteria

1. Each of the 3 shared logical links has **two** new `short_links` rows per tenant (one `E…` for email, one `S…` for SMS) — 12 new rows total.
2. Every email template body references only its tenant's `E…` code for each link.
3. Every SMS template body references only its tenant's `S…` code for each link.
4. Old shared codes (`CEiBGCWj`, `5CBy1Do4`, `f9Avttrn`) are **NOT deleted** — they remain alive so forwarded/printed old links keep resolving.
5. No template references the old shared code on the "wrong" channel after repoint.
6. Each new code resolves (curl → 200 to the correct target_url).
7. A test click on each new code increments that code's `click_count` (verified by DB query before/after).
8. Demo templates no longer reference any Prizma code (tenant isolation restored).
9. `KvSzd3Zz` (payment link) confirmed email-only — no split needed.
10. Zero new placeholders introduced (Iron Rule 35).

---

## 2. Verified Live State (2026-05-24)

### 2a. Codes to split

| Old code | Purpose | target_url | Prizma clicks | Label |
|---|---|---|---:|---|
| `CEiBGCWj` | Pricing catalog | `https://www.prizma-optic.co.il/supersalepricescatalog/` | 105 | (null) |
| `5CBy1Do4` | Stock page | `https://www.prizma-optic.co.il/supersale-stock/` | 17 | (null) |
| `f9Avttrn` | Takanon (terms) | `https://www.prizma-optic.co.il/supersale-takanon/` | 6 | (null) |

### 2b. Template references (which template bodies contain each code)

**CEiBGCWj (pricing catalog) — 6 refs:**

| Tenant | Template slug | Channel | Repoint to |
|---|---|---|---|
| prizma | event_invite_new_email_he | email | ECATp |
| prizma | event_registration_open_email_he | email | ECATp |
| prizma | event_registration_open_sms_he | sms | SCATp |
| demo | event_invite_new_email_he | email | ECATd |
| demo | event_registration_open_email_he | email | ECATd |
| demo | event_registration_open_sms_he | sms | SCATd |

**5CBy1Do4 (stock page) — 3 refs:**

| Tenant | Template slug | Channel | Repoint to |
|---|---|---|---|
| prizma | event_invite_new_email_he | email | ESTKp |
| prizma | event_invite_new_sms_he | sms | SSTKp |
| demo | event_invite_new_sms_he | sms | SSTKd |

**f9Avttrn (takanon) — 4 refs:**

| Tenant | Template slug | Channel | Repoint to |
|---|---|---|---|
| prizma | event_coupon_delivery_email_he | email | ETKNp |
| prizma | event_coupon_delivery_sms_he | sms | STKNp |
| demo | event_coupon_delivery_email_he | email | ETKNd |
| demo | event_coupon_delivery_sms_he | sms | STKNd |

### 2c. KvSzd3Zz (payment/registration link)
Email-only (2 refs: `event_registration_confirmation_email_he` on both tenants). **No split needed.**

### 2d. Orphaned demo codes
Demo has codes `c2d22d16` (catalog), `bdf88e3c` (stock), `NCoQWzbd` (takanon) that exist in `short_links` but are not referenced by any template. They will remain untouched (no delete). The new `E…d`/`S…d` codes replace them functionally.

---

## 3. Destructive Operations

**This SPEC is ADDITIVE.** No deletes. No drops. No renames. No main branch.

| Operation | Type | Reversible? |
|---|---|---|
| INSERT 12 new `short_links` rows | Additive | Yes (DELETE by id) |
| UPDATE 12 template bodies (string replace old code → new code) | Mutative | Yes (reverse the string replace) |

If the Executor discovers a need to DELETE any existing `short_links` row — **STOP and escalate**.

---

## 4. New Short-Link Codes (collision-checked 2026-05-24)

All 12 codes verified free against the full `short_links` table.

| Code | Tenant | Channel | Purpose | target_url | label |
|---|---|---|---|---|---|
| `ECATp` | prizma | email | Pricing catalog | `https://www.prizma-optic.co.il/supersalepricescatalog/` | `pricing_catalog_email` |
| `SCATp` | prizma | sms | Pricing catalog | `https://www.prizma-optic.co.il/supersalepricescatalog/` | `pricing_catalog_sms` |
| `ECATd` | demo | email | Pricing catalog | `https://www.prizma-optic.co.il/supersalepricescatalog/` | `pricing_catalog_email` |
| `SCATd` | demo | sms | Pricing catalog | `https://www.prizma-optic.co.il/supersalepricescatalog/` | `pricing_catalog_sms` |
| `ESTKp` | prizma | email | Stock page | `https://www.prizma-optic.co.il/supersale-stock/` | `stock_page_email` |
| `SSTKp` | prizma | sms | Stock page | `https://www.prizma-optic.co.il/supersale-stock/` | `stock_page_sms` |
| `ESTKd` | demo | email | Stock page | `https://www.prizma-optic.co.il/supersale-stock/` | `stock_page_email` |
| `SSTKd` | demo | sms | Stock page | `https://www.prizma-optic.co.il/supersale-stock/` | `stock_page_sms` |
| `ETKNp` | prizma | email | Takanon (terms) | `https://www.prizma-optic.co.il/supersale-takanon/` | `takanon_email` |
| `STKNp` | prizma | sms | Takanon (terms) | `https://www.prizma-optic.co.il/supersale-takanon/` | `takanon_sms` |
| `ETKNd` | demo | email | Takanon (terms) | `https://www.prizma-optic.co.il/supersale-takanon/` | `takanon_email` |
| `STKNd` | demo | sms | Takanon (terms) | `https://www.prizma-optic.co.il/supersale-takanon/` | `takanon_sms` |

All rows: `link_type='template_static'`, `expires_at='2099-12-31'`, `click_count=0`.

---

## 5. Execution Steps

### Phase A — Demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb)

**A1. Re-verify before mutating.** Query `short_links` + template refs to confirm counts match §2. If any count differs — STOP and report.

**A2. Insert 6 demo short_links rows** (ECATd, SCATd, ESTKd, SSTKd, ETKNd, STKNd) per §4. Collision-check each code one final time immediately before insert.

**A3. Repoint 6 demo template bodies:**

| Template slug | Old code → New code |
|---|---|
| event_invite_new_email_he | `CEiBGCWj` → `ECATd` |
| event_registration_open_email_he | `CEiBGCWj` → `ECATd` |
| event_registration_open_sms_he | `CEiBGCWj` → `SCATd` |
| event_invite_new_sms_he | `5CBy1Do4` → `SSTKd` |
| event_coupon_delivery_email_he | `f9Avttrn` → `ETKNd` |
| event_coupon_delivery_sms_he | `f9Avttrn` → `STKNd` |

Use `REPLACE(body, old_code, new_code)` in a single UPDATE per template. Verify each body changes by exactly the expected number of occurrences (1 per code per template).

**A4. Verify demo:**
- Query: 0 demo templates still contain `CEiBGCWj`, `5CBy1Do4`, or `f9Avttrn`.
- Query: each new demo code appears in exactly the expected template(s).
- Resolve test: `curl -sI https://prizma-optic.co.il/r/ECATd` (etc.) → 302 to correct target_url. Do all 6.
- Click test: query `click_count` for `ECATd` before and after the curl — must increment by 1. Do for at least 2 codes.

### Phase B — Prizma tenant (6ad0781b-37f0-47a9-92e3-be9ed1477e1c)

**B1. Re-verify before mutating** (same as A1, for prizma).

**B2. Insert 6 prizma short_links rows** (ECATp, SCATp, ESTKp, SSTKp, ETKNp, STKNp) per §4.

**B3. Repoint 7 prizma template body edits** (event_invite_new_email_he has 2 replacements):

| Template slug | Old code → New code |
|---|---|
| event_invite_new_email_he | `CEiBGCWj` → `ECATp` AND `5CBy1Do4` → `ESTKp` |
| event_invite_new_sms_he | `5CBy1Do4` → `SSTKp` |
| event_registration_open_email_he | `CEiBGCWj` → `ECATp` |
| event_registration_open_sms_he | `CEiBGCWj` → `SCATp` |
| event_coupon_delivery_email_he | `f9Avttrn` → `ETKNp` |
| event_coupon_delivery_sms_he | `f9Avttrn` → `STKNp` |

**B4. Verify prizma** (same checks as A4, using prizma codes).

### Phase C — Cross-tenant parity + measurement query

**C1. Global audit:**
- Query: 0 templates on either tenant still contain any of the 3 old shared codes.
- Query: every new channel-split code appears in exactly the expected template(s) on its tenant.
- Old codes (`CEiBGCWj`, `5CBy1Do4`, `f9Avttrn`) still exist in `short_links` (NOT deleted).

**C2. Measurement query** (the payoff — provide this in FINDINGS.md):
```sql
SELECT
  label,
  CASE WHEN code LIKE 'E%' THEN 'email' WHEN code LIKE 'S%' THEN 'sms' END AS channel,
  click_count
FROM short_links
WHERE code IN ('ECATp','SCATp','ESTKp','SSTKp','ETKNp','STKNp')
ORDER BY label, channel;
```

---

## 6. Verification Evidence Required (Iron Rule 34)

For each of the 12 new codes:
1. `curl -sI https://prizma-optic.co.il/r/{code}` → HTTP 302, `Location:` header matches the expected `target_url`.
2. DB query showing `click_count` incremented for at least 2 codes per tenant (before/after the curl).

For template bodies:
3. DB query: `SELECT slug, channel FROM crm_message_templates WHERE body LIKE '%CEiBGCWj%' OR body LIKE '%5CBy1Do4%' OR body LIKE '%f9Avttrn%'` → empty result set (0 rows) on both tenants.
4. DB query: for each new code, `SELECT slug, channel FROM crm_message_templates WHERE tenant_id=X AND body LIKE '%{code}%'` matches the expected template(s).

---

## 7. Rollback Plan

If any step fails:
1. Revert template body changes by replacing the new code back to the old code (`REPLACE(body, new_code, old_code)`).
2. Delete the new `short_links` rows by `code IN (...)`.
3. Verify templates resolve to the original state.

Old codes are never deleted, so the original links continue to work throughout.

---

## 8. Files Modified

No repo files are modified by this SPEC. All changes are DB-only (`short_links` inserts + `crm_message_templates` body updates). The Executor writes EXECUTION_REPORT.md + FINDINGS.md to the SPEC folder.

---

## 9. Self-Improvement Proposals (harvested from recent reviews)

1. **For SPECs with per-tenant code uniqueness constraints** (like this one), the SPEC MUST include an explicit collision-check step *immediately before* each INSERT, not just at authoring time. Codes can be created between SPEC authoring and execution. Codify this as a standard pattern for short_links work.

2. **For SPECs that fix cross-tenant reference leaks** (demo templates pointing to prizma codes), the acceptance criteria MUST include a tenant-isolation assertion: "0 templates on tenant X reference a short_links code owned by tenant Y." This is a category-level invariant, not just a per-SPEC fix. Codify alongside the existing tenant_id-on-every-query rule.
