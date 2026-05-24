# EXECUTION REPORT: M4_SHORT_LINKS_CHANNEL_SPLIT

**Executor:** Claude Code (opticup-executor)
**Date:** 2026-05-24
**Status:** COMPLETE - all acceptance criteria met

---

## Phase A - Demo (8d8cfa7e-ef58-49af-9702-a862d459cccb)

### A1. Re-verify
Demo template refs to old shared codes confirmed: 6 refs matching SPEC exactly.
- CEiBGCWj: event_invite_new_email_he (email), event_registration_open_email_he (email), event_registration_open_sms_he (sms)
- 5CBy1Do4: event_invite_new_sms_he (sms)
- f9Avttrn: event_coupon_delivery_email_he (email), event_coupon_delivery_sms_he (sms)

### A2. Insert 6 demo codes
Collision check: 0 existing rows for proposed codes. All clear.

INSERT returned 6 rows:
| Code | ID |
|---|---|
| ECATd | 2c7d4781-19fe-4681-8a72-f4f1779f9d53 |
| SCATd | 0e026d06-63d3-4c3a-a1b3-e6abeb1092d6 |
| ESTKd | 6af8579b-44fb-46e8-917a-2433c53bb788 |
| SSTKd | 9c942e9e-5980-4cf4-90a7-f98fe1cb8163 |
| ETKNd | 6bf89ed7-c490-4c0a-9db9-4d2dd1927dc2 |
| STKNd | a140e690-e474-4482-8fe1-814ddaa16388 |

### A3. Repoint 6 demo templates
6 UPDATE statements executed. No `updated_at` column exists; body REPLACE only.

### A4. Verify demo
- **Old codes in demo templates:** 0 (query returned empty)
- **New code placement:**
  - ECATd: event_invite_new_email_he (email), event_registration_open_email_he (email)
  - SCATd: event_registration_open_sms_he (sms)
  - SSTKd: event_invite_new_sms_he (sms)
  - ETKNd: event_coupon_delivery_email_he (email)
  - STKNd: event_coupon_delivery_sms_he (sms)
  - ESTKd: not in any template (stock link was never in demo email invite - row exists, ready for future use)
- **Resolve tests (curl -sI -L, all 6):**
  - ECATd -> 302 -> supersalepricescatalog/ -> 200 OK
  - SCATd -> 302 -> supersalepricescatalog/ -> 200 OK
  - ESTKd -> 302 -> supersale-stock/ -> 200 OK
  - SSTKd -> 302 -> supersale-stock/ -> 200 OK
  - ETKNd -> 302 -> supersale-takanon/ -> 200 OK
  - STKNd -> 302 -> supersale-takanon/ -> 200 OK
- **Click counts:** all 6 codes incremented 0 -> 1 after curl test

---

## Phase B - Prizma (6ad0781b-37f0-47a9-92e3-be9ed1477e1c)

### B1. Re-verify
Prizma template refs confirmed: 6 refs matching SPEC.
**Finding:** `event_invite_new_email_he` does NOT contain `5CBy1Do4` (stock code). SPEC assumed it did (7 replacements). The REPLACE for 5CBy1Do4 -> ESTKp was a safe no-op. This means ESTKp (like ESTKd) exists as a row but is not referenced by any template. Not a blocker - codes are ready for future use.

### B2. Insert 6 prizma codes
Collision check: 0 existing rows. All clear.

INSERT returned 6 rows:
| Code | ID |
|---|---|
| ECATp | 506352dd-8a1c-46d9-8293-b40d55d56021 |
| SCATp | 75430ecd-d5e4-4ffa-ab98-cb49669554eb |
| ESTKp | 82f03a42-09e1-4f95-878f-7d3bc5baa741 |
| SSTKp | 3081b626-120c-435f-8e9d-ed2aed094ab4 |
| ETKNp | e1af922c-3484-4f37-9c18-bc8ba29c1b79 |
| STKNp | fd830a4b-e314-4e9c-abf6-92e20b9ae032 |

### B3. Repoint 6 prizma templates
6 UPDATE statements executed. event_invite_new_email_he got REPLACE(REPLACE(body, CEiBGCWj, ECATp), 5CBy1Do4, ESTKp) - first match hit, second was no-op.

### B4. Verify prizma
- **Old codes in prizma templates:** 0
- **New code placement:**
  - ECATp: event_invite_new_email_he (email), event_registration_open_email_he (email)
  - SCATp: event_registration_open_sms_he (sms)
  - SSTKp: event_invite_new_sms_he (sms)
  - ETKNp: event_coupon_delivery_email_he (email)
  - STKNp: event_coupon_delivery_sms_he (sms)
  - ESTKp: not in any template (same as demo - row exists, ready for future use)
- **Resolve tests:** all 6 codes -> 302 -> correct target -> 200 OK
- **Click counts:** all 6 codes incremented 0 -> 1 after curl test

---

## Phase C - Cross-tenant audit

### C1. Global audit
- 0 templates on either tenant still contain CEiBGCWj, 5CBy1Do4, or f9Avttrn
- Old codes preserved in short_links (NOT deleted): CEiBGCWj (106 clicks), 5CBy1Do4 (17), f9Avttrn (6)
- All 12 new codes resolve and increment correctly

### C2. Measurement query
See FINDINGS.md for full results.

---

## Acceptance Criteria Checklist

| # | Criterion | Status |
|---|---|---|
| 1 | 12 new short_links rows (3 purposes x 2 tenants x 2 channels) | PASS |
| 2 | Email templates reference only E-codes | PASS |
| 3 | SMS templates reference only S-codes | PASS |
| 4 | Old shared codes NOT deleted | PASS |
| 5 | No template refs old shared code on wrong channel | PASS |
| 6 | Each new code resolves (302 -> correct target -> 200) | PASS (all 12) |
| 7 | Click increments per-channel row | PASS (all 12, 0->1) |
| 8 | Demo templates no longer reference Prizma codes | PASS |
| 9 | KvSzd3Zz confirmed email-only, no split needed | PASS (verified at SPEC authoring) |
| 10 | Zero new placeholders | PASS |

---

## Observations

1. **ESTKp and ESTKd (stock_page_email) unreferenced:** The stock link (5CBy1Do4) was never present in `event_invite_new_email_he` on either tenant - only in the SMS version. The SPEC assumed it was in the email template too. The E-prefixed stock codes exist in short_links and resolve correctly; they can be wired into an email template in a future SPEC if needed. Not a blocker.

2. **No `updated_at` column:** `crm_message_templates` lacks an `updated_at` column. Template body updates don't track modification time. (The SPEC's REPLACE worked fine without it.)

3. **CEiBGCWj click_count went 105->106:** One additional click accrued on the old prizma code between SPEC authoring and execution. Consistent with the code still resolving (old links remain active per design).
