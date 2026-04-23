# SPEC — P6_FULL_CYCLE_TEST

> **Location:** `modules/Module 4 - CRM/go-live/specs/P6_FULL_CYCLE_TEST/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase:** Go-Live P6
> **Author signature:** Cowork session happy-elegant-edison

---

## 1. Goal

Execute a full end-to-end cycle test of the CRM pipeline on demo tenant — from
lead intake through messaging dispatch through message log verification — proving
that every trigger, template, and channel works in production conditions. Also:
document the `variables.phone/email` contract in `crm-messaging-send.js` JSDoc
(P5.5 Foreman Review followup #2, M4-BUG-P55-03).

---

## 2. Background & Motivation

P1–P5.5 built the entire CRM Go-Live pipeline in pieces: lead intake (P1), lead
management (P2a), event management (P2b), manual lead entry (P3a), messaging
pipeline (P3c+P4), message templates (P5), and trigger wiring (P5.5). Each phase
tested its own scope in isolation. P6 is the first time the **entire pipeline**
runs end-to-end as a single integrated flow on demo tenant — simulating a real
campaign lifecycle from lead signup through event messaging through broadcast.

The Go-Live ROADMAP describes P6 as "מחזור מלא על דמו" — the final QA gate before
P7 (Prizma production migration).

P5.5 Foreman Review (2026-04-22) closed with 8 followups. Followup #2 (document
`variables.phone/email` requirement in JSDoc) is bundled into P6 as a small code
touch.

---

## 3. Success Criteria (Measurable)

### Phase A — Pre-Flight & JSDoc Fix

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Demo tenant leads exist | ≥2 leads with approved phones | `execute_sql: SELECT count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND phone IN ('+972537889878','+972503348349')` → ≥2 |
| 3 | Demo tenant templates exist | ≥24 active templates | `execute_sql: SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true` → ≥24 |
| 4 | Demo tenant message log is clean | 0 rows | `execute_sql: SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` → 0 |
| 5 | JSDoc added to `crm-messaging-send.js` | File contains `variables.phone` and `variables.email` requirement documented in JSDoc comment | `grep -c 'variables.phone' modules/crm/crm-messaging-send.js` → ≥2 (1 in JSDoc + 1 in code or JSDoc) |
| 6 | `crm-messaging-send.js` file size | ≤60 lines (was 39, JSDoc adds ~15-20) | `wc -l modules/crm/crm-messaging-send.js` → ≤60 |

### Phase B — Lead Intake Test (Edge Function)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 7 | New lead via `lead-intake` EF | HTTP 200, `"status":"created"` | `curl` to lead-intake EF with approved phone `+972537889878`, name `P6 Test Lead A` → 200 + status=created OR status=duplicate |
| 8 | Lead appears in `crm_leads` | Row exists with `source='supersale_form'` | `execute_sql: SELECT id, name, phone, status, source FROM crm_leads WHERE tenant_id = '8d8cfa7e-...' AND name = 'P6 Test Lead A'` → 1 row |
| 9 | `lead-intake` dispatched SMS + Email | 2 message_log rows (1 SMS + 1 Email) with template `lead_intake_new` or `lead_intake_duplicate` | `execute_sql: SELECT channel, status, template_id FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' AND lead_id = '<id from #8>' ORDER BY created_at` → 2 rows, both `status='sent'` |

### Phase C — CRM Dashboard & Lead Management

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 10 | CRM loads without errors | 0 console errors | Browser QA on `localhost:3000/crm.html?t=demo` → DevTools console clean |
| 11 | New lead visible in "לידים נכנסים" tab | P6 Test Lead A appears | Browser QA: incoming tab shows the lead |
| 12 | Lead status change works | Status changed + note inserted | Browser QA: change status → verify via `execute_sql: SELECT status FROM crm_leads WHERE name = 'P6 Test Lead A' AND tenant_id = '8d8cfa7e-...'` |
| 13 | Transfer to Tier 2 works | Lead moves to "רשומים" tab | Browser QA: click "אשר ✓" → lead appears in registered tab |

### Phase D — Event Lifecycle & Message Dispatch

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 14 | Create event | Event created with auto-number | Browser QA: "יצירת אירוע +" → fills form → event appears in list |
| 15 | Event status change → message dispatch | ≥2 log rows (SMS+Email to at least 1 lead) | Change event status to `registration_open` → `execute_sql: SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' AND event_id = '<new_event_id>'` → ≥2 |
| 16 | All dispatched messages have `status='sent'` | 0 rows with `status='failed'` for this event | `execute_sql: SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' AND event_id = '<new_event_id>' AND status = 'failed'` → 0 |
| 17 | Register lead to event | `register_lead_to_event` RPC returns `registered` or `waiting_list` | Browser QA: "רשום משתתף +" → search for P6 lead → register → toast shows "נרשם" |
| 18 | Registration confirmation dispatched | 2 log rows (SMS+Email) with confirmation template | `execute_sql: SELECT channel, status FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' AND lead_id = '<lead_id>' ORDER BY created_at DESC LIMIT 2` → 2 rows, both `status='sent'`, templates contain `confirmation` |

### Phase E — Broadcast Wizard

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 19 | Broadcast wizard send (template mode) | `crm_broadcasts` row with `status='completed'` | Browser QA: Messaging Hub → שליחה ידנית → select template, select recipients (approved phones only), send → `execute_sql: SELECT status, total_sent, total_failed FROM crm_broadcasts WHERE tenant_id = '8d8cfa7e-...' ORDER BY created_at DESC LIMIT 1` → `status='completed'`, `total_failed=0` |
| 20 | Broadcast wizard send (raw mode) | `crm_broadcasts` row with `status='completed'` | Same as #19 but with free-text body instead of template |
| 21 | Broadcast log rows match recipients | `crm_message_log` rows = `total_sent` from broadcast | `execute_sql: SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' AND lead_id IN (SELECT id FROM crm_leads WHERE tenant_id = '8d8cfa7e-...')` — cross-check with broadcast row |

### Phase F — Error Handling

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 22 | WhatsApp channel blocked | Toast error, no dispatch | Browser QA: attempt broadcast with WhatsApp channel → error toast, 0 new log rows |
| 23 | Template not found → log with `status='failed'` | 1 failed log row | `execute_sql` after calling `send-message` EF with nonexistent template slug → `status='failed'`, `error_message LIKE 'template_not_found%'` |

### Phase G — Cleanup & Documentation

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 24 | All test data cleaned from demo | 0 P6-created log rows, leads restored to pre-P6 state | `execute_sql: SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...'` → 0 (or equals pre-P6 count) |
| 25 | SESSION_CONTEXT.md updated | P6 marked CLOSED | `grep 'P6' modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md` → shows CLOSED |
| 26 | Go-Live ROADMAP updated | P6 ✅ | `grep 'P6' modules/Module\ 4\ -\ CRM/go-live/ROADMAP.md` → shows ✅ |
| 27 | Commits produced | 3 commits (JSDoc fix, docs update, retrospective) | `git log --oneline` count from start hash |
| 28 | `crm-messaging-send.js` JSDoc documents the contract | Comment block includes: `variables.phone` required for SMS, `variables.email` required for email | `grep -A5 'IMPORTANT\|REQUIRED\|Contract' modules/crm/crm-messaging-send.js` shows the requirement |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Run read-only SQL (Level 1 autonomy) on demo tenant for verification
- Run write SQL on demo tenant for test data seeding/cleanup (Level 2 — pre-authorized below)
- Add JSDoc comments to `crm-messaging-send.js` (no behavior change)
- Update `SESSION_CONTEXT.md` and `go-live/ROADMAP.md`
- Commit and push to `develop`
- Run browser QA on `localhost:3000/crm.html?t=demo` via chrome-devtools MCP
- Call `lead-intake` Edge Function via `curl` with approved test data
- Call `send-message` Edge Function via `sb.functions.invoke` from browser console
- Seed/delete test data on demo tenant — **ONLY with approved phones** (`+972537889878`, `+972503348349`)
- Clean up all P6-created test data at the end

### What REQUIRES stopping and reporting

- Any `crm_message_log` row with `status='failed'` that is NOT from an intentional error-handling test (Phase F)
- Any console error on `crm.html` that wasn't present before P6
- Any Edge Function returning 5xx (server error, not 4xx which may be intentional)
- Any test data using a phone number NOT on the approved list
- Any file modification beyond `crm-messaging-send.js` JSDoc + doc files
- Any schema change (DDL)
- Any merge to `main`

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. If `lead-intake` EF returns anything other than 200/201 → STOP (pipeline broken)
2. If `send-message` EF returns 5xx on a valid request → STOP (Make webhook or EF error)
3. If any `crm_message_log` row shows `status='failed'` with `error_message` containing `make_call_exception` → STOP (Make scenario down)
4. If CRM page shows >0 new console errors → STOP (regression)
5. If any test data seed uses a phone NOT in `['+972537889878', '+972503348349']` → STOP IMMEDIATELY (M4-OPS-P55-05 recurrence)
6. If demo tenant template count drops below 24 → STOP (accidental deletion)

---

## 6. Rollback Plan

P6 is a test-only SPEC. Rollback = cleanup:

- **Test data:** DELETE all P6-created rows from `crm_message_log`, `crm_broadcasts`, `crm_event_attendees`, `crm_lead_notes` on demo tenant. Restore `crm_leads` to pre-P6 state (2 leads with approved phones).
- **Code:** `git revert <JSDoc commit>` if the JSDoc change is problematic (unlikely — comment-only change).
- **Docs:** `git revert <docs commit>` if premature.
- No DB schema changes to roll back.

---

## 7. Out of Scope (explicit)

- **Reminders scheduler** — timer-based, needs different architecture, separate SPEC
- **Unsubscribe endpoint** — needs new Edge Function, separate SPEC
- **WhatsApp channel** — awaiting Meta API, separate SPEC
- **Demo-tenant phone whitelist in `send-message` EF** — P7 hardening scope
- **CRM UI visual fixes** — existing B7/B8 issues are tracked separately
- **MODULE_MAP.md / GLOBAL_MAP.md updates** — tracked under Guardian Alert M4-DOC-06, Integration Ceremony scope
- **shared.js split** — tracked under Guardian Alert M5-DEBT-01
- **Any code changes beyond JSDoc** — P6 is a TEST, not a BUILD phase
- **Storefront form integration** — testing `lead-intake` EF directly via `curl`, not through the actual storefront form (that's a storefront-repo concern)
- **Performance testing / load testing** — out of scope, single-user sequential test only
- **Prizma tenant** — ALL testing on demo only

---

## 8. Expected Final State

After the executor finishes, the repo should contain:

### New files
None.

### Modified files
- `modules/crm/crm-messaging-send.js` — JSDoc comment block added (~15-20 lines) documenting the `send-message` Edge Function contract:
  - `variables.phone` REQUIRED for SMS channel
  - `variables.email` REQUIRED for Email channel
  - Both modes (template + raw) require these variables
  - Reference to `supabase/functions/send-message/index.ts:170-177`
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P6 marked CLOSED, test results summary
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P6 ⬜ → ✅

### Deleted files
None.

### DB state (demo tenant, post-cleanup)
- `crm_leads`: same 2 rows as pre-P6 (approved phones only). If `lead-intake` test created a new lead or updated the existing one, the original state is restored.
- `crm_message_log`: 0 rows (same as pre-P6) or equal to pre-P6 count
- `crm_broadcasts`: 0 rows (same as pre-P6) or equal to pre-P6 count
- `crm_event_attendees`: 0 rows (same as pre-P6) or equal to pre-P6 count
- `crm_events`: same count as pre-P6 (if a test event was created, it is deleted)
- `crm_lead_notes`: 0 rows (same as pre-P6) or equal to pre-P6 count

### Docs updated
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P6 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P6 ✅

---

## 9. Commit Plan

- **Commit 1:** `docs(crm): add send-message contract JSDoc to crm-messaging-send.js`
  - Files: `modules/crm/crm-messaging-send.js`
  - Pure comment addition, no behavior change
- **Commit 2:** `docs(crm): mark P6 CLOSED — full cycle test passed on demo`
  - Files: `SESSION_CONTEXT.md`, `go-live/ROADMAP.md`
- **Commit 3:** `chore(spec): close P6_FULL_CYCLE_TEST with retrospective`
  - Files: `EXECUTION_REPORT.md`, `FINDINGS.md` (if any)

Budget: 3 commits ± 1 fix = max 4. If the JSDoc commit needs a tweak, squash into Commit 1 rather than adding a fix commit.

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verification |
|-----------|--------|-------------|
| P5.5 (Event Trigger Wiring) CLOSED | ✅ VERIFIED | FOREMAN_REVIEW.md exists, verdict 🟡 CLOSED WITH FOLLOW-UPS |
| Demo tenant has ≥2 leads with approved phones | ⚠️ UNVERIFIED (Cowork cannot access DB) | Executor must verify at pre-flight: `SELECT count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-...' AND phone IN ('+972537889878','+972503348349')` → ≥2 |
| Demo tenant has ≥24 active templates | ⚠️ UNVERIFIED | Executor must verify: `SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-...' AND is_active = true` → ≥24 |
| Demo tenant message tables are clean | ⚠️ UNVERIFIED | Executor must verify: `SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...'` → 0 |
| `crm_statuses` seeded on demo (31 rows) | ✅ VERIFIED | SESSION_CONTEXT.md confirms P2a Commit 0 seeded 31 rows |
| Make scenario 9104395 is active | ⚠️ UNVERIFIED | Executor should verify by sending a test message and checking `status='sent'` in log |
| `localhost:3000` serves ERP (crm.html) | ASSUMED | Executor must start local server if not running |
| Chrome DevTools MCP available | ASSUMED | Required for browser QA steps |

**Pre-flight resolution for ⚠️ UNVERIFIED items:** If any precondition fails:
- **Missing leads:** Seed with approved phones only. Use inline SQL:
  ```sql
  INSERT INTO crm_leads (tenant_id, name, phone, email, status, source, tier, terms_approved, marketing_consent)
  VALUES
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'P6 Daniel Primary', '+972537889878', 'danylis92@gmail.com', 'waiting', 'manual', 2, true, true),
    ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'P6 Daniel Secondary', '+972503348349', 'danylis92@gmail.com', 'waiting', 'manual', 2, true, true);
  ```
- **Missing templates:** Re-run `go-live/seed-templates-demo.sql`
- **Dirty message tables:** `DELETE FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...'` (and same for other tables)
- **Make scenario down:** STOP and report to Daniel

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied in this SPEC? |
|--------|----------|----------------------|
| P5.5 FOREMAN_REVIEW §6 Proposal 1 — constant-value verification | Cross-Reference Check must grep helper files for constant values | ✅ APPLIED — verified TIER1/TIER2_STATUSES against `crm-helpers.js:58-74` in Step 1.5 |
| P5.5 FOREMAN_REVIEW §6 Proposal 2 — precondition verification against live DB | §10 Dependencies must be verified, not assumed | ✅ APPLIED — 4 preconditions marked ⚠️ UNVERIFIED with explicit executor-must-verify instructions and fallback SQL |
| P5.5 FOREMAN_REVIEW §7 Proposal 1 — approved-phone pre-flight check | Executor Step 4.5 must check all seed phones | ✅ APPLIED — §5 Stop-Trigger #5 explicitly blocks non-approved phones; §10 seed SQL uses only approved phones |
| P5.5 FOREMAN_REVIEW §7 Proposal 2 — existing-INSERT audit | Executor must audit NOT NULL columns before modifying write functions | N/A — P6 does not modify any write functions (test-only + JSDoc) |
| P5.5 FOREMAN_REVIEW Followup #2 — document `variables.phone/email` in JSDoc | M4-BUG-P55-03 | ✅ APPLIED — §3 criteria #5/#6/#28 and §12.1 cover JSDoc addition |
| P5.5 FOREMAN_REVIEW Followup #1 — approved-phone rule in CLAUDE.md §9 | M4-OPS-P55-05 | ✅ VERIFIED DONE — already applied to CLAUDE.md §9 QA subsection (2026-04-22) |
| P5.5 EXECUTION_REPORT §5 — `send-message` EF contract should be documented | Pain point: every future caller will hit `variables.phone` wall | ✅ APPLIED — this is the JSDoc fix in Phase A |

**Cross-Reference Check completed 2026-04-22 against SESSION_CONTEXT rev 2026-04-22, `crm-helpers.js`, `send-message/index.ts:170-177`: 0 new names introduced (test-only SPEC). 4 DB preconditions marked UNVERIFIED (Cowork limitation) with executor fallback procedures.**

---

## 12. Test Execution Plan (Technical Design)

This section describes HOW each test phase should be executed. The executor follows
these steps sequentially — each phase depends on the previous one's data.

### 12.1 Phase A — Pre-Flight & JSDoc Fix

**Step 1: Session start protocol (CLAUDE.md §1)**
1. Verify repo (`git remote -v` → `opticalis/opticup`)
2. Verify branch (`git branch` → `develop`)
3. Pull latest (`git pull origin develop`)
4. Clean repo check (`git status` → clean)

**Step 2: Pre-flight data verification**
Run all §10 verification queries. Record baseline counts:
```sql
-- Baseline snapshot (save these numbers for cleanup comparison)
SELECT 'leads' AS tbl, count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'log', count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'broadcasts', count(*) FROM crm_broadcasts WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'attendees', count(*) FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'events', count(*) FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'notes', count(*) FROM crm_lead_notes WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
UNION ALL SELECT 'templates', count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_active = true;
```
If any precondition fails, follow §10 fallback procedures.

**Step 3: Approved-phone pre-flight check (executor Step 4.5)**
Verify that this SPEC's seed SQL (§10) uses ONLY `+972537889878` and `+972503348349`.
Verify that no test step references any other phone number.

**Step 4: Add JSDoc to `crm-messaging-send.js`**
Add a JSDoc comment block above the `sendMessage` function (after the existing
architecture comment, before `async function sendMessage`) documenting:

```javascript
// ─── CALLER CONTRACT ─────────────────────────────────────────────
// The `send-message` Edge Function (supabase/functions/send-message/index.ts)
// requires `variables.phone` for SMS and `variables.email` for Email channel,
// in BOTH template and raw-body modes. The EF extracts the recipient address
// from `variables`, not from a separate field.
//
// Callers MUST populate:
//   opts.variables.phone  — REQUIRED when channel = 'sms'  (E.164 format)
//   opts.variables.email  — REQUIRED when channel = 'email'
//   opts.variables.name   — recommended (used in template substitution)
//
// If these are missing, the EF returns 400:
//   "Missing variables.phone for SMS channel"
//   "Missing variables.email for email channel"
//
// Fetch the full lead row before calling sendMessage to populate variables:
//   const { data: lead } = await sb.from('crm_leads').select('name, phone, email')
//     .eq('id', leadId).eq('tenant_id', getTenantId()).single();
//   const variables = { name: lead.name, phone: lead.phone, email: lead.email };
//
// See: supabase/functions/send-message/index.ts lines 170-177
// See: M4-BUG-P55-03 (P5.5 Finding #3)
// ─────────────────────────────────────────────────────────────────
```

**Commit 1** after JSDoc addition: `docs(crm): add send-message contract JSDoc to crm-messaging-send.js`

### 12.2 Phase B — Lead Intake Test

**Step 5: Test `lead-intake` Edge Function**

Call the Edge Function with approved test data. Use `curl` from the terminal
(the EF has `verify_jwt: false` — public endpoint):

```bash
curl -s -X POST \
  "https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "demo",
    "name": "P6 Test Lead A",
    "phone": "0537889878",
    "email": "danylis92@gmail.com"
  }'
```

Expected: HTTP 200. Response body contains `"status":"created"` (new lead) or
`"status":"duplicate"` (if phone already exists — this is also valid, the EF
dispatches on both paths).

**Step 6: Verify lead in DB**
```sql
SELECT id, name, phone, status, source FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND phone = '+972537889878'
ORDER BY created_at DESC LIMIT 1;
```

**Step 7: Verify dispatch from lead-intake**
```sql
SELECT id, channel, status, error_message, created_at
FROM crm_message_log
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY created_at DESC LIMIT 4;
```
Expected: 2 rows (1 SMS + 1 Email) with `status='sent'`. Template slug should
contain `lead_intake_new` or `lead_intake_duplicate`.

### 12.3 Phase C — CRM Dashboard & Lead Management

**Step 8: Load CRM in browser**
Navigate to `localhost:3000/crm.html?t=demo`. Verify 0 console errors.

**Step 9: Verify lead in incoming tab**
Click "לידים נכנסים" tab. The P6 test lead should appear (if it was created as
`status='new'` by lead-intake). If the lead was a duplicate, it may already be
in a different status — check the "רשומים" tab instead.

**Step 10: Test status change**
Click on the lead → detail modal opens. Change status via the badge dropdown.
Verify:
- Toast confirmation appears
- `crm_leads.status` updated in DB
- `crm_lead_notes` has a new entry "סטטוס שונה מ-X ל-Y"

**Step 11: Test Tier 1 → Tier 2 transfer**
If the lead is still in Tier 1, click "אשר ✓" to transfer. Verify:
- Lead disappears from incoming tab
- Lead appears in registered tab
- Status changed to `waiting`
- Note inserted: "הועבר ל-Tier 2 (אושר)"

### 12.4 Phase D — Event Lifecycle & Message Dispatch

**Step 12: Create a test event**
In Events tab, click "יצירת אירוע +". Fill:
- Campaign: select existing (SuperSale or whichever is on demo)
- Name: "P6 Test Event"
- Date: tomorrow's date
- Location: "אשקלון"
- Capacity: 10

Verify event appears in list with auto-generated number.

**Step 13: Change event status to `registration_open`**
Click on event → detail modal → "שנה סטטוס" → select `registration_open`.

Verify dispatch:
```sql
SELECT channel, status, error_message
FROM crm_message_log
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND event_id = '<new_event_id>'
ORDER BY created_at;
```
Expected: ≥2 rows (SMS+Email for each Tier 2 lead with that status), all
`status='sent'`. 0 rows with `status='failed'`.

**Step 14: Register lead to event**
In event detail → Attendees sub-tab → "רשום משתתף +" → search for P6 lead
→ click to register.

Expected: toast shows "נרשם בהצלחה" (or "רשימת המתנה" if at capacity).

**Step 15: Verify registration confirmation dispatch**
```sql
SELECT channel, status FROM crm_message_log
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND lead_id = '<lead_id>'
ORDER BY created_at DESC LIMIT 2;
```
Expected: 2 new rows (SMS+Email) with confirmation template, `status='sent'`.

### 12.5 Phase E — Broadcast Wizard

**Step 16: Template-mode broadcast**
Messaging Hub → "שליחה ידנית" sub-tab → select a template (e.g., `event_invite_new`)
→ select SMS channel → select recipients (the approved-phone leads) → send.

Verify:
```sql
SELECT status, total_sent, total_failed FROM crm_broadcasts
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY created_at DESC LIMIT 1;
```
Expected: `status='completed'`, `total_failed=0`.

**Step 17: Raw-mode broadcast**
Same wizard, but type free text in body field instead of selecting template.
Channel = email. Subject = "P6 Test Broadcast". Body = "בדיקת שליחה P6".

Verify same as Step 16: `crm_broadcasts` row with `status='completed'`.

### 12.6 Phase F — Error Handling

**Step 18: WhatsApp channel guard**
In broadcast wizard, attempt to select WhatsApp channel (if UI allows).
Expected: toast error "ערוץ WhatsApp עדיין לא נתמך" (or similar guard).
No new `crm_message_log` rows created.

**Step 19: Template-not-found error**
Call `send-message` EF from browser console with a nonexistent template slug:
```javascript
await sb.functions.invoke('send-message', { body: {
  tenant_id: getTenantId(),
  lead_id: '<lead_id>',
  channel: 'sms',
  template_slug: 'nonexistent_template_that_does_not_exist',
  language: 'he',
  variables: { name: 'test', phone: '+972537889878', email: 'test@test.com' }
}});
```
Expected: response contains `"error":"template_not_found"`. Check log:
```sql
SELECT status, error_message FROM crm_message_log
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY created_at DESC LIMIT 1;
```
Expected: `status='failed'`, `error_message LIKE 'template_not_found%'`.

### 12.7 Phase G — Cleanup & Documentation

**Step 20: Clean up ALL P6 test data**

Execute cleanup in dependency order (foreign keys):
```sql
-- 1. Message log (references leads, events, templates)
DELETE FROM crm_message_log
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- 2. Broadcasts
DELETE FROM crm_broadcasts
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

-- 3. Event attendees (references events + leads)
DELETE FROM crm_event_attendees
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND event_id IN (SELECT id FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND name = 'P6 Test Event');

-- 4. Lead notes created during P6
DELETE FROM crm_lead_notes
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at > '<P6_start_timestamp>';

-- 5. Test event
DELETE FROM crm_events
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND name = 'P6 Test Event';

-- 6. Test leads (only if NEW leads were created by lead-intake)
-- Do NOT delete the 2 pre-existing approved-phone leads.
-- If lead-intake created a new row (status=created), delete it.
-- If lead-intake returned duplicate, nothing to delete.
DELETE FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND name = 'P6 Test Lead A'
  AND source = 'supersale_form';
```

**Step 21: Verify cleanup — compare to pre-flight baseline**
Re-run the baseline query from Step 2 and compare counts. All counts should
match the pre-flight snapshot (± the pre-existing 2 leads).

**Step 22: Update docs**
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`: update "Current phase" to
  show P6 CLOSED, add P6 row to Phase History table
- `modules/Module 4 - CRM/go-live/ROADMAP.md`: P6 line → ✅

**Commit 2:** `docs(crm): mark P6 CLOSED — full cycle test passed on demo`

**Step 23: Write retrospective**
Create `EXECUTION_REPORT.md` (and `FINDINGS.md` if any findings) in this SPEC folder.

**Commit 3:** `chore(spec): close P6_FULL_CYCLE_TEST with retrospective`

---

## 13. Test Results Template

The executor should fill this table during execution and include it in the
EXECUTION_REPORT. Each row maps to a §3 criterion.

| # | Criterion | Pass/Fail | Actual value | Notes |
|---|-----------|-----------|-------------|-------|
| 1 | Branch state | | | |
| 2 | Demo leads exist | | | |
| 3 | Demo templates exist | | | |
| 4 | Message log clean | | | |
| 5 | JSDoc added | | | |
| 6 | File size | | | |
| 7 | Lead intake EF | | | |
| 8 | Lead in DB | | | |
| 9 | Lead-intake dispatch | | | |
| 10 | CRM loads clean | | | |
| 11 | Lead visible in UI | | | |
| 12 | Status change works | | | |
| 13 | Tier transfer works | | | |
| 14 | Event created | | | |
| 15 | Event status → dispatch | | | |
| 16 | All dispatches sent | | | |
| 17 | Registration works | | | |
| 18 | Registration confirmation | | | |
| 19 | Broadcast template mode | | | |
| 20 | Broadcast raw mode | | | |
| 21 | Broadcast log count | | | |
| 22 | WhatsApp blocked | | | |
| 23 | Template not found error | | | |
| 24 | Test data cleaned | | | |
| 25 | SESSION_CONTEXT updated | | | |
| 26 | ROADMAP updated | | | |
| 27 | Commit count | | | |
| 28 | JSDoc contract documented | | | |

---

## 14. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Real SMS sent to non-approved phones | LOW (rules now in CLAUDE.md + executor skill) | §5 Stop-Trigger #5 is absolute. All seed SQL uses only approved phones. |
| Make scenario offline/broken | MEDIUM | Pre-flight Step 2 implicitly tests this via lead-intake dispatch. If scenario is down, STOP per §5 #3. |
| Demo tenant data corrupted by P6 | LOW | Cleanup SQL in §12.7 is comprehensive. Baseline snapshot enables diff comparison. |
| `lead-intake` creates a 3rd lead (not duplicate) | MEDIUM | Depends on whether phone `+972537889878` already exists. Both outcomes (created/duplicate) are valid test paths. Cleanup handles both. |
| Browser QA blocked (localhost not running) | MEDIUM | Executor must start local server. If chrome-devtools MCP unavailable, STOP — browser QA is not optional. |
