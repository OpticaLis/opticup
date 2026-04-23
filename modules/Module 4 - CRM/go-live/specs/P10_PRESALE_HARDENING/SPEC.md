# SPEC — P10_PRESALE_HARDENING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P10_PRESALE_HARDENING/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-23
> **Module:** 4 — CRM
> **Phase:** Go-Live P10
> **Author signature:** Cowork session happy-elegant-edison

---

## 1. Goal

Fix three production-blocking issues discovered during Daniel's QA and the P9
flow test, all of which must land before P7 Prizma cutover:

1. **Duplicate lead prevention** — the CRM allows creating leads with the same
   phone number that already exists in the system, because manual lead creation
   doesn't normalize phones to E.164 format. The DB has a UNIQUE constraint on
   `(tenant_id, phone)` but phone formats differ (`0537889878` vs `+972537889878`),
   so the constraint doesn't catch duplicates. This must be fixed everywhere:
   manual creation, edit, AND the automation engine's recipient resolution.

2. **Unsubscribe completeness** — the automation engine ignores `unsubscribed_at`,
   and the `%unsubscribe_url%` link in every email template leads nowhere. Both
   are legal requirements (Israel privacy law + GDPR).

3. **Message log visibility** — dispatched messages (SMS + email) don't appear
   in the Messaging Hub history or in the per-lead "הודעות" tab. The executor
   must investigate why and fix the root cause.

---

## 2. Background & Motivation

### Duplicate Leads (Daniel's QA finding)

Daniel noticed he could register himself as a new lead in "לידים נכנסים" even
though his phone already exists in "רשומים". Root cause analysis:

- The `lead-intake` Edge Function normalizes phones to E.164 (`0537889878` →
  `+972537889878`) and checks for duplicates BEFORE insert.
- The manual lead creation (`createManualLead` in `crm-lead-actions.js`) does
  NOT normalize — it stores the phone as-is. The DB UNIQUE `(tenant_id, phone)`
  doesn't catch it because `0537889878 ≠ +972537889878`.
- The lead edit modal (`updateLead`) also doesn't normalize on save.
- Result: the same physical phone can exist twice with different formats →
  messages go to one lead ID, Daniel looks at the other, sees empty history.

This is likely the root cause of the "messages not showing in history" issue too.

### Unsubscribe (P9 Findings #1 + #2)

- `crm-automation-engine.js` recipient resolvers don't filter out leads with
  `unsubscribed_at IS NOT NULL` — they still receive messages.
- No `unsubscribe` Edge Function exists to receive clicks on `%unsubscribe_url%`.
- Both are legal requirements for commercial messaging at scale.

### Message Log Visibility

Daniel reports that SMS and emails he received don't appear in the CRM log.
The executor must investigate:
- Are `crm_message_log` rows being written at all? (Check via SQL)
- If rows exist, is the log query filtering them out incorrectly?
- If rows don't exist, is the `send-message` EF failing to write them?
- Is the issue related to duplicate leads (messages logged against a different
  lead ID than the one Daniel is viewing)?

---

## 3. Success Criteria (Measurable)

### Track A — Phone Normalization & Duplicate Prevention

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | `CrmHelpers` exports a `normalizePhone(raw)` function | Returns E.164 format (`+972XXXXXXXXX`) for Israeli phones | `grep 'normalizePhone' modules/crm/crm-helpers.js` → hit |
| 2 | `normalizePhone` handles all common formats | `0537889878` → `+972537889878`, `+972537889878` → `+972537889878`, `972537889878` → `+972537889878`, `053-788-9878` → `+972537889878` | Unit-test in console or code review |
| 3 | `createManualLead` normalizes phone before INSERT | Phone stored in E.164 format | `grep 'normalizePhone' modules/crm/crm-lead-actions.js` → hit in createManualLead |
| 4 | `createManualLead` checks for existing lead with same normalized phone BEFORE INSERT | Pre-insert SELECT or error handling for 23505 | Code review |
| 5 | Duplicate phone shows clear error message | Toast: "ליד עם מספר טלפון זה כבר קיים במערכת" (or similar Hebrew) | Browser QA: try creating lead with phone that already exists |
| 6 | `updateLead` normalizes phone on save | Phone stored in E.164 after edit | Code review |
| 7 | `updateLead` checks for duplicate phone (excluding self) on save | Pre-update SELECT or error handling | Code review |
| 8 | `lead-intake` EF + manual creation store phones in same format | Both use `+972...` → UNIQUE constraint works across sources | SQL: `SELECT phone FROM crm_leads WHERE tenant_id = '8d8cfa7e-...' ORDER BY phone` → all E.164 |
| 9 | Existing demo leads have normalized phones | Any `0...` format phones cleaned to `+972...` | ⚠️ UNVERIFIED — executor must check and normalize existing rows if needed (Level 2 SQL authorized) |

### Track B — Unsubscribe

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 10 | Automation engine recipient resolvers filter `unsubscribed_at IS NOT NULL` | Leads with `unsubscribed_at` excluded from all 4 recipient types (tier2, tier2_excl_registered, attendees, attendees_waiting) | `grep 'unsubscribed_at' modules/crm/crm-automation-engine.js` → hit in each resolver |
| 11 | `trigger_lead` recipient type also checks `unsubscribed_at` | Single-lead dispatch skips if unsubscribed | Code review |
| 12 | Unsubscribe Edge Function exists | File at `supabase/functions/unsubscribe/index.ts` | `ls supabase/functions/unsubscribe/index.ts` → exists |
| 13 | Unsubscribe EF accepts signed token, sets `unsubscribed_at = now()` | GET/POST with valid token → `unsubscribed_at` set on the lead | Code review + curl test on demo |
| 14 | Unsubscribe EF returns a simple HTML confirmation page | Hebrew page: "הוסרת מרשימת התפוצה בהצלחה" | curl → HTML response |
| 15 | Unsubscribe EF rejects invalid/expired tokens | Returns 400 or 403 with error message | curl with bad token |
| 16 | `send-message` EF generates unsubscribe URL for `%unsubscribe_url%` | Variable substituted with a signed URL pointing to the unsubscribe EF | Code review of `send-message/index.ts` |
| 17 | Signed token includes `lead_id` + `tenant_id` + expiry | Token is HMAC-signed, not guessable | Code review |

### Track C — Message Log Visibility Fix

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 18 | Executor documents the root cause of missing log entries | Root cause identified in EXECUTION_REPORT | File review |
| 19 | Messages dispatched during P10 flow test appear in Messaging Hub history | Log tab shows rows with lead name, phone, template, HH:MM | Browser QA |
| 20 | Messages appear in per-lead "הודעות" tab | Lead detail → הודעות → shows dispatched messages | Browser QA |
| 21 | If root cause was duplicate leads, duplicate leads are merged or cleaned | Only one lead per phone number on demo | SQL: `SELECT phone, count(*) FROM crm_leads WHERE tenant_id='8d8cfa7e-...' GROUP BY phone HAVING count(*) > 1` → 0 rows |

### Track D — End-to-End Verification

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 22 | Full flow test: lead-intake via EF → lead visible → no duplicate | curl with existing phone → 409 duplicate. curl with new phone → 200/201. Manual create with existing phone → error toast. | curl + Browser QA |
| 23 | Full flow test: message dispatch → visible in log + per-lead history | Change event status → messages fire → visible in both places with HH:MM | Browser QA + SQL |
| 24 | Full flow test: unsubscribe → lead excluded from next dispatch | Set `unsubscribed_at` (via EF or SQL) → change event status → unsubscribed lead NOT in recipients | SQL: check message_log, unsubscribed lead has 0 new rows |
| 25 | All test data cleaned | Demo restored to baseline | SQL verification |

### Track E — Documentation & Quality

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 26 | SESSION_CONTEXT.md updated | P10 CLOSED | `grep 'P10' modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md` |
| 27 | Go-Live ROADMAP updated | P10 ✅ | `grep 'P10' modules/Module\ 4\ -\ CRM/go-live/ROADMAP.md` |
| 28 | All CRM JS files ≤ 350 lines | Rule 12 | `wc -l modules/crm/*.js` |
| 29 | CRM page loads with 0 new console errors | Pre-existing only | Browser QA |
| 30 | Commits produced | 5–10 | `git log --oneline` from start hash |

---

## 4. Autonomy Envelope

### MAXIMUM AUTONOMY — designed for unattended run.

The executor has pre-authorization for ALL of the following without stopping:

- Read/modify any file under `modules/crm/`
- Read/modify `crm.html` and `css/crm*.css`
- **CREATE the `unsubscribe` Edge Function** at `supabase/functions/unsubscribe/index.ts`
  (this is the ONE authorized EF creation in this SPEC)
- **MODIFY `supabase/functions/send-message/index.ts`** ONLY to add
  `%unsubscribe_url%` variable substitution (minimal change, no other logic changes)
- Run read-only + write SQL on demo tenant (Level 2) — approved phones only
- Normalize existing demo leads' phone numbers to E.164 via SQL UPDATE
- Merge or delete duplicate leads on demo (carefully — preserve the one with more data)
- Split files for Rule 12
- Commit and push to `develop`
- curl to Edge Functions on demo tenant for testing
- **Deploy the new `unsubscribe` EF** via Supabase MCP if available, or leave
  deployment instructions in EXECUTION_REPORT if MCP can't deploy

### What REQUIRES stopping (ONLY these)

- Modifying `supabase/functions/lead-intake/index.ts` (its normalization already works)
- Schema changes (DDL) — ALTER TABLE, CREATE TABLE
- Any file OUTSIDE `modules/crm/`, `crm.html`, `css/crm*.css`, `supabase/functions/unsubscribe/`, `supabase/functions/send-message/index.ts`, `modules/Module 4 - CRM/`
- Any merge to `main`
- Any test data using phones NOT in `['+972537889878', '+972503348349']`

### DO NOT STOP once past pre-flight.

Same overnight-run design as P9. Fix, log, continue.

---

## 5. Stop-on-Deviation Triggers

1. If any test data uses a phone NOT in the approved list → STOP IMMEDIATELY
2. If any file exceeds 350 lines and cannot be split → STOP
3. If `crm.html` fails to load → STOP
4. If the unsubscribe EF accidentally deletes data (instead of just setting a timestamp) → STOP

---

## 6. Rollback Plan

- **Code:** `git revert` in reverse order.
- **EF:** Delete `supabase/functions/unsubscribe/` folder. Revert `send-message` changes.
- **Data:** Phone normalization UPDATEs are non-destructive (new format contains old format's digits). Duplicate merges should be documented with the deleted lead's ID so they can be re-created if needed.
- **No DDL changes.**

---

## 7. Out of Scope

- `lead-intake` EF changes (its normalization already works correctly)
- Schema changes (no ALTER TABLE)
- Prizma tenant operations (P7)
- Scheduled reminders / timed rules
- WhatsApp channel
- MODULE_MAP / GLOBAL_MAP updates (M4-DOC-06, Integration Ceremony)
- `shared.js` split (M5-DEBT-01)
- Storefront repo changes

---

## 8. Expected Final State

### New files
- `supabase/functions/unsubscribe/index.ts` — unsubscribe Edge Function (~80-120 lines)

### Modified files
- `modules/crm/crm-helpers.js` — add `normalizePhone(raw)` function
- `modules/crm/crm-lead-actions.js` — normalize phone in `createManualLead` + `updateLead`, duplicate check before insert/update
- `modules/crm/crm-lead-modals.js` — show duplicate error toast in create + edit forms
- `modules/crm/crm-automation-engine.js` — add `unsubscribed_at IS NULL` filter to all recipient resolvers
- `supabase/functions/send-message/index.ts` — add `%unsubscribe_url%` variable substitution (generate signed token URL)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P10 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P10 ✅

### DB state (demo tenant)
- All lead phones normalized to E.164 format
- Duplicate leads merged (one per phone)
- 0 test data remaining at end

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add normalizePhone helper, enforce E.164 in lead create + edit`
  Files: `crm-helpers.js`, `crm-lead-actions.js`, `crm-lead-modals.js`
- **Commit 2:** `fix(crm): normalize existing demo lead phones, merge duplicates`
  DB: UPDATE + possible DELETE on demo (documented in EXECUTION_REPORT)
- **Commit 3:** `fix(crm): filter unsubscribed leads from automation engine dispatch`
  Files: `crm-automation-engine.js`
- **Commit 4:** `feat(crm): add unsubscribe Edge Function with signed token`
  Files: `supabase/functions/unsubscribe/index.ts` (new)
- **Commit 5:** `feat(crm): wire %unsubscribe_url% in send-message EF`
  Files: `supabase/functions/send-message/index.ts`
- **Commit 6:** `fix(crm): message log visibility — investigate + fix root cause`
  Files: depends on root cause (executor documents)
- **Commit 7:** `test(crm): full flow verification — duplicates blocked, unsubscribe works, logs visible`
  (no-op eligible — merge into adjacent if no code changes needed)
- **Commit 8:** `docs(crm): mark P10 CLOSED`
  Files: SESSION_CONTEXT.md, ROADMAP.md
- **Commit 9:** `chore(spec): close P10_PRESALE_HARDENING with retrospective`
  Files: EXECUTION_REPORT.md, FINDINGS.md

Budget: 5–10 commits (per §9, no-op eligible commits may merge).

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verification |
|-----------|--------|-------------|
| P9 (CRM Hardening) CLOSED | ✅ VERIFIED | FOREMAN_REVIEW.md 🟡 |
| `crm_leads` UNIQUE on `(tenant_id, phone)` | ✅ VERIFIED | Schema `001_crm_schema.sql:120` |
| `crm_leads.unsubscribed_at` column exists | ✅ VERIFIED | Schema `001_crm_schema.sql` |
| `send-message` EF deployed and working | ⚠️ UNVERIFIED | Executor test-curls at pre-flight |
| Supabase can deploy new EF (`unsubscribe`) | ⚠️ UNVERIFIED | Executor attempts via MCP or documents manual steps |
| `%unsubscribe_url%` appears in email templates | ⚠️ UNVERIFIED | `SELECT slug, body FROM crm_message_templates WHERE body LIKE '%unsubscribe_url%'` |

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| P9 FR §6 Proposal 1 — no-op commit labels | Commit 7 marked "no-op eligible" | ✅ APPLIED |
| P9 FR §6 Proposal 2 — legal/compliance scan | This SPEC was born from that scan | ✅ APPLIED |
| P9 FR §7 Proposal 1 — function-name collision grep | Executor should grep `normalizePhone` before writing | ✅ APPLIED (name chosen to match EF pattern) |
| P8 FR — baseline measurements | File sizes not estimated (Cowork can't measure) | ✅ APPLIED |
| P6 FR — column verification for SPEC SQL | Phone normalization UPDATE marked ⚠️ UNVERIFIED | ✅ APPLIED |

**Cross-Reference Check 2026-04-23:** `normalizePhone` — grepped, exists only
in `supabase/functions/lead-intake/index.ts` (EF-side, TypeScript). New JS
version in `crm-helpers.js` is client-side, no collision. `unsubscribe` folder
under `supabase/functions/` — does not exist yet. 0 collisions.

---

## 12. Technical Design

### 12.1 Phone Normalization (`crm-helpers.js`)

Port the `lead-intake` EF's `normalizePhone` logic to a client-side JS version:

```javascript
function normalizePhone(raw) {
  if (!raw) return null;
  var hasPlus = raw.trim().charAt(0) === '+';
  var digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (hasPlus) return '+' + digits;
  if (digits.indexOf('972') === 0) return '+' + digits;
  if (digits.charAt(0) === '0' && digits.length === 10) return '+972' + digits.slice(1);
  return null; // Unknown format
}
```

Export as `CrmHelpers.normalizePhone`.

### 12.2 Duplicate Prevention in Manual Create + Edit

**`crm-lead-actions.js` — `createManualLead`:**

Before INSERT:
```javascript
var normalized = CrmHelpers.normalizePhone(phone);
if (!normalized) throw new Error('invalid phone format');

// Check for existing lead with same normalized phone
var existing = await sb.from('crm_leads')
  .select('id, full_name, status')
  .eq('tenant_id', tenantId)
  .eq('phone', normalized)
  .eq('is_deleted', false)
  .maybeSingle();
if (existing.data) {
  return { duplicate: true, existingLead: existing.data };
}

payload.phone = normalized; // Store in E.164
```

**`crm-lead-modals.js` — create form handler:**
```javascript
if (res.duplicate) {
  Toast.warning('ליד עם מספר טלפון זה כבר קיים במערכת: ' + res.existingLead.full_name);
  return;
}
```

**`crm-lead-actions.js` — `updateLead`:**
Same normalization + duplicate check (excluding self by `id != leadId`).

### 12.3 Existing Data Cleanup

On demo tenant, normalize all existing phones:
```sql
-- ⚠️ UNVERIFIED COLUMNS — executor must verify via information_schema first
UPDATE crm_leads
SET phone = '+972' || substring(phone from 2)
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND phone LIKE '0%'
  AND length(phone) = 10
  AND is_deleted = false;
```

Then check for duplicates that became visible after normalization:
```sql
SELECT phone, array_agg(id), array_agg(full_name), count(*)
FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND is_deleted = false
GROUP BY phone
HAVING count(*) > 1;
```

For each duplicate group: keep the lead with more notes/messages/events, soft-delete
the other (`is_deleted = true`). Document every merge in EXECUTION_REPORT.

### 12.4 Unsubscribe Engine Filter

**`crm-automation-engine.js` — each recipient resolver:**

Add `.is('unsubscribed_at', null)` (or `.eq('unsubscribed_at', null)`) to
every query that selects leads as recipients. The 4 affected queries are:
- `tier2` — all Tier 2 leads
- `tier2_excl_registered` — Tier 2 minus registered
- `attendees` — registered attendees
- `attendees_waiting` — waiting list

Also add for `trigger_lead` — single-lead dispatch should check:
```javascript
if (lead.unsubscribed_at) {
  return { fired: 0, skipped: 1, reason: 'unsubscribed' };
}
```

### 12.5 Unsubscribe Edge Function

**`supabase/functions/unsubscribe/index.ts`:**

Flow:
1. Accept GET `?token=XXXXX` (from email link click)
2. Verify HMAC signature: `token = base64(HMAC-SHA256(secret, lead_id:tenant_id:expiry))`
3. Decode `lead_id`, `tenant_id`, `expiry` from token payload
4. Check expiry (e.g., 30 days from message send)
5. UPDATE `crm_leads SET unsubscribed_at = now() WHERE id = lead_id AND tenant_id = tenant_id`
6. Return simple HTML page: "הוסרת מרשימת התפוצה בהצלחה. ניתן לסגור חלון זה."
7. On invalid token: return 400 HTML page: "קישור לא תקין או שפג תוקפו."

**HMAC secret:** Use `SUPABASE_SERVICE_ROLE_KEY` as the HMAC key (already available
as env var in Edge Functions). This is NOT stored in code — it's an environment
secret. No new secrets needed.

**Token format (executor designs the exact format):** The token must be:
- URL-safe (base64url encoding)
- Include lead_id + tenant_id so the EF knows which lead to unsubscribe
- Include expiry timestamp so old links eventually stop working
- Signed so recipients can't forge tokens for other leads

### 12.6 Wire `%unsubscribe_url%` in send-message EF

**`supabase/functions/send-message/index.ts`:**

In the variable substitution block, add:
```typescript
// Generate unsubscribe token
const unsubToken = generateUnsubscribeToken(leadId, tenantId);
const unsubUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?token=${unsubToken}`;
body = body.replace(/%unsubscribe_url%/g, unsubUrl);
```

The `generateUnsubscribeToken` function uses HMAC-SHA256 with
`SUPABASE_SERVICE_ROLE_KEY` to sign `lead_id:tenant_id:expiry`.

### 12.7 Message Log Investigation

The executor must:
1. Query `crm_message_log` on demo for recent entries — do rows exist?
2. If rows exist: check the log query in `crm-messaging-log.js` and
   `crm-leads-detail.js` — is there a filter that hides them?
3. If rows DON'T exist: check `send-message` EF logs for errors
4. Check if the issue is related to duplicate leads (messages logged against
   lead ID "A" but Daniel views lead ID "B" with same phone)

Document the root cause and fix in EXECUTION_REPORT.

### 12.8 Browser QA Protocol

1. **After Commit 1:** Try creating a lead with existing phone → error toast.
   Edit a lead's phone to existing → error. Phones stored as `+972...`.
2. **After Commit 3:** Set `unsubscribed_at = now()` on a demo lead → dispatch
   → that lead NOT in recipients.
3. **After Commits 4-5:** curl unsubscribe EF with valid token → 200 + HTML.
   curl with bad token → 400. Check `crm_leads.unsubscribed_at` is set.
4. **After Commit 6:** Verify messages appear in log + per-lead history.
5. **Full flow:** Lead intake → dispatch → messages visible → unsubscribe →
   next dispatch skips the lead.
6. **Cleanup:** Revert unsubscribed_at, delete test data, verify baseline.
