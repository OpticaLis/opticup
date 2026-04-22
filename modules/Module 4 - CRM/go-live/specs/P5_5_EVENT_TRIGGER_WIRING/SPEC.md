# SPEC — P5_5_EVENT_TRIGGER_WIRING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase (if applicable):** Go-Live P5.5
> **Author signature:** Cowork session brave-jolly-ride

---

## 1. Goal

Wire CRM client-side triggers (event status changes, attendee registration,
broadcast wizard) to the `send-message` Edge Function so that user actions
in the CRM UI produce real SMS + Email messages through the existing pipeline.

---

## 2. Background & Motivation

P3c+P4 built the messaging pipeline: `send-message` Edge Function + Make
send-only scenario + `CrmMessaging.sendMessage()` client helper. P5 seeded
20 templates (10 SMS + 10 Email) on demo tenant. But today only `lead-intake`
(server-side Edge Function) actually dispatches messages. Every CRM-initiated
action — changing an event status, registering an attendee, sending a broadcast
— writes to the DB but sends zero messages.

P5.5 closes this gap. Without it, P6 (full cycle test) cannot run because
4 of 10 test steps require message dispatch from CRM actions.

Depends on: P5 ✅ (`FOREMAN_REVIEW.md` verdict 🟢 CLOSED, 2026-04-22),
P3c+P4 ✅ (`FOREMAN_REVIEW.md` verdict 🟡 CLOSED WITH FOLLOW-UPS, 2026-04-22).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | `dispatchEventStatusMessages` function exists in crm-event-actions.js | ≥2 occurrences (definition + call) | `grep -c 'dispatchEventStatusMessages' modules/crm/crm-event-actions.js` |
| 2 | `changeEventStatus()` calls dispatch after DB update | Call visible in source | `grep -A5 'upd\.data' modules/crm/crm-event-actions.js` → shows `dispatchEventStatusMessages` |
| 3 | Status→template map covers all 8 event statuses | 8 template slug references | `grep -c "event_will_open_tomorrow\|event_registration_open\|event_invite_new\|event_closed\|event_waiting_list\|event_2_3d_before\|event_day\|event_invite_waiting_list" modules/crm/crm-event-actions.js` → ≥8 |
| 4 | Dual-channel dispatch with `Promise.allSettled` | ≥1 occurrence | `grep -c 'Promise.allSettled' modules/crm/crm-event-actions.js` → ≥1 |
| 5 | Registration dispatches confirmation message | ≥1 `sendMessage` call | `grep -c 'CrmMessaging.sendMessage' modules/crm/crm-event-register.js` → ≥1 |
| 6 | 4 new confirmation templates seeded on demo | 4 rows | `SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND slug LIKE 'event_%confirmation%'` → 4 |
| 7 | Broadcast wizard calls Edge Function instead of direct DB insert | ≥1 `sendMessage` call | `grep -c 'CrmMessaging.sendMessage' modules/crm/crm-messaging-broadcast.js` → ≥1 |
| 8 | Broadcast still creates `crm_broadcasts` history row | INSERT present | `grep 'crm_broadcasts' modules/crm/crm-messaging-broadcast.js` → ≥1 match |
| 9 | All dispatch calls include `eventId` when event context exists | ≥1 `eventId` reference | `grep -c 'eventId' modules/crm/crm-event-actions.js` → ≥1 |
| 10 | File size: crm-event-actions.js ≤350 lines | ≤350 | `wc -l modules/crm/crm-event-actions.js` |
| 11 | File size: crm-event-register.js ≤200 lines | ≤200 | `wc -l modules/crm/crm-event-register.js` |
| 12 | File size: crm-messaging-broadcast.js ≤350 lines | ≤350 | `wc -l modules/crm/crm-messaging-broadcast.js` |
| 13 | All DB queries in new code include `tenant_id` filter | 0 unfiltered queries | Manual code review of every `.from()` call |
| 14 | Zero console errors after loading CRM | 0 | Browser QA on `localhost:3000/crm.html?t=demo` |
| 15 | Message log rows created after event status change on demo | ≥1 new row | `SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > NOW() - interval '5 minutes'` |
| 16 | Toast notification shown to operator after bulk dispatch | "נשלחו X הודעות" visible | Browser QA |
| 17 | Commits produced | 5 commits | `git log origin/develop..HEAD --oneline \| wc -l` → 5 |
| 18 | Branch state after execution | clean, on develop | `git status` → "nothing to commit" |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Edit `modules/crm/crm-event-actions.js` — add dispatch function, modify `changeEventStatus()`
- Edit `modules/crm/crm-event-register.js` — add dispatch call after registration
- Edit `modules/crm/crm-messaging-broadcast.js` — replace direct DB write with EF dispatch loop
- Read any file under `modules/crm/`, `supabase/functions/`, `campaigns/`
- Run `execute_sql` SELECT queries on demo tenant for verification
- Run `execute_sql` INSERT of 4 confirmation templates on demo tenant only (§12.3)
- Run browser QA on `localhost:3000/crm.html?t=demo` via chrome-devtools MCP
- Update `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` and `modules/Module 4 - CRM/go-live/ROADMAP.md`
- Commit and push to `develop`

### What REQUIRES stopping and reporting

- Any change to `supabase/functions/send-message/index.ts` (Edge Function is frozen for P5.5)
- Any change to `modules/crm/crm-messaging-send.js` (client helper is frozen)
- Any schema change (no ALTER TABLE, no new tables, no new RPCs, no new views)
- Any change to files outside `modules/crm/` and `modules/Module 4 - CRM/`
- Creating new JS files (all changes go into existing files)
- Any `INSERT`, `UPDATE`, or `DELETE` on non-demo tenant data
- Any change to Make scenarios
- Any step where actual output diverges from §3 expected value

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. Any modified file exceeds 350 lines after edit
2. `CrmMessaging.sendMessage()` returns `{ ok: false }` during browser QA
3. Console errors appear after page load on `localhost:3000/crm.html?t=demo`
4. More than 5 commits needed (signals scope creep — budget is 5 ±1 fix)
5. Recipient query returns 0 leads when demo tenant is known to have Tier 2 leads
6. Template slug lookup fails on demo (indicates P5 seed data is missing or corrupted)

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:

```bash
# Identify P5.5 commits:
git log --oneline -6
# Revert each (newest first):
git revert <commit5> <commit4> <commit3> <commit2> <commit1>
```

- **DB rollback:** Not needed. `crm_message_log` rows are append-only and
  harmless on demo. The 4 confirmation templates can be deleted:
  `DELETE FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND slug LIKE 'event_%confirmation%'`
- **Edge Function:** Not modified — nothing to revert.
- **Make:** Not modified — nothing to revert.
- Notify Foreman; SPEC is marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- `supabase/functions/send-message/index.ts` — frozen, working as-is
- `modules/crm/crm-messaging-send.js` — frozen, working as-is
- `crm-messaging-rules.js` — the automation rules UI is CRUD-only with no
  execution engine; building the engine is SaaS-ification scope, not Go-Live
- Scheduled reminders (2-3 days before event, event day morning) — these need
  a scheduler Edge Function that does not exist yet. Separate SPEC.
- Unsubscribe endpoint — `%unsubscribe_url%` exists in templates but the
  actual Edge Function endpoint is not yet built. Separate SPEC.
- WhatsApp channel — awaiting Meta Business API. Separate SPEC.
- Russian / English template variants — out of Go-Live scope
- Any change to `shared.js` (already at 407 lines per Guardian Alert M5-DEBT-01)
- GLOBAL_MAP.md / GLOBAL_SCHEMA.sql updates — per Guardian Alerts M4-DOC-06 and
  M4-DOC-07, Module 4 is missing from both. This is an Integration Ceremony task,
  not P5.5 scope. Will be addressed in a dedicated doc-fix SPEC.

---

## 8. Expected Final State

### Modified files

| File | Current lines | Expected lines | Change description |
|------|--------------|----------------|-------------------|
| `modules/crm/crm-event-actions.js` | 266 | ~330 (±15) | Add `buildEventVariables()` (~10 lines), `dispatchEventStatusMessages()` (~55 lines), modify `changeEventStatus()` (+3 lines to call dispatch) |
| `modules/crm/crm-event-register.js` | 122 | ~145 (±10) | Add confirmation dispatch after `registerLeadToEvent()` returns in the click handler (~20 lines) |
| `modules/crm/crm-messaging-broadcast.js` | 341 | ~345 (±10) | Replace direct `crm_message_log` INSERT with `CrmMessaging.sendMessage()` loop; keep `crm_broadcasts` row |

### New files

None.

### Deleted files

None.

### DB state

- 4 new rows in `crm_message_templates` (demo tenant only — confirmation templates, see §12.3)
- New rows in `crm_message_log` (demo tenant only, from QA testing — append-only, harmless)
- No schema changes

### Docs updated (MUST include)

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P5.5 CLOSED entry
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P5.5 ✅, update P3c+P4 §3 trigger checklist items
- `MASTER_ROADMAP.md` — NO (P5.5 is a Go-Live sub-phase, not a module milestone)
- `docs/GLOBAL_MAP.md` — NO (Guardian Alert M4-DOC-06 is separate Integration Ceremony)
- `docs/GLOBAL_SCHEMA.sql` — NO (no schema changes)

---

## 9. Commit Plan

| # | Message | Files | Concern |
|---|---------|-------|---------|
| 1 | `feat(crm): wire event status change → message dispatch` | `modules/crm/crm-event-actions.js` | Event status trigger wiring |
| 2 | `feat(crm): wire attendee registration → confirmation message` | `modules/crm/crm-event-register.js` | Registration trigger wiring + 4 template seeds (DB) |
| 3 | `feat(crm): wire broadcast wizard to send-message Edge Function` | `modules/crm/crm-messaging-broadcast.js` | Broadcast trigger wiring |
| 4 | `docs(crm): mark P5.5 CLOSED — all CRM triggers wired` | `SESSION_CONTEXT.md` + `ROADMAP.md` | Documentation |
| 5 | `chore(spec): close P5_5_EVENT_TRIGGER_WIRING with retrospective` | `EXECUTION_REPORT.md` + `FINDINGS.md` | SPEC close (written by executor at end) |

---

## 10. Dependencies / Preconditions

| Dependency | Status | Needed for |
|-----------|--------|------------|
| `send-message` Edge Function deployed and functional | ✅ P3c+P4 | All dispatch calls |
| Make scenario (3-module: Webhook → Router → SMS \| Email) active on demo | ✅ P3c+P4 | Actual SMS/email delivery |
| 20 SuperSale templates seeded on demo tenant | ✅ P5 | Template lookup by slug |
| `CrmMessaging.sendMessage()` client helper available | ✅ P3c+P4 (69 lines) | Client-side dispatch |
| `crm-messaging-send.js` loaded in crm.html `<script>` tag | ✅ B8/P3b | Script available at runtime |
| Tier 2 leads exist on demo tenant | ✅ P1/P2 | Recipient queries return >0 |
| At least 1 event on demo tenant | ✅ P2b | Event status change test |
| `$HOME/.optic-up/credentials.env` present (if large SQL needed) | ✅ Phase 0 | Fallback for template seeds if `execute_sql` fails |

---

## 11. Lessons Already Incorporated

Every proposal from the 3 most recent FOREMAN_REVIEWs was reviewed.

| Source | Proposal | Applied? |
|--------|----------|----------|
| P5 FR §6 Proposal 1 — File collision scan in Cross-Reference Check | ✅ APPLIED in §11.5: `ls` of specs folder for slug uniqueness + grep of all new function names against GLOBAL_SCHEMA, GLOBAL_MAP, DB_TABLES_REFERENCE, FILE_STRUCTURE, MODULE_MAP |
| P5 FR §6 Proposal 2 — Success criteria must cross-check against EF contract | ✅ APPLIED: §3 criterion #15 verifies end-to-end via EF (message log rows after status change) |
| P5 FR §7 Proposal 1 — Document "large-SQL via REST" pattern | NOT APPLICABLE — P5.5 seeds only 4 rows (~2 KB), well within `execute_sql` limits |
| P5 FR §7 Proposal 2 — Pre-flight file-collision hunt in executor Step 1.5 | ✅ APPLIED: §13 Step 1 bullet 7 explicitly assigns the pre-flight grep to executor |
| P3c+P4 FR §6 Proposal 1 — Expected final state must reflect architecture | ✅ APPLIED: §8 line counts based on current git HEAD values, architecture v3 client-side dispatch |
| P3c+P4 FR §6 Proposal 2 — Criterion coherence check | ✅ APPLIED: all §3 criteria reference current file paths, function names, and patterns matching v3 architecture |
| P3c+P4 FR §7 Proposal 1 — Supabase Edge Function cross-EF auth quirk | NOT APPLICABLE — P5.5 does not make cross-EF calls (client → EF only) |
| P3c+P4 FR §7 Proposal 2 — Master-doc update checklist | ✅ APPLIED: §8 "Docs updated" section explicitly lists every doc with YES/NO + reason |
| P3a FR §6 Proposal (exact array positions for status insertions) | NOT APPLICABLE — P5.5 does not modify status arrays |

### Cross-Reference Check (§1.5 compliance)

Completed 2026-04-22 against GLOBAL_SCHEMA (rev 2026-04-11), GLOBAL_MAP (rev 2026-04-11), DB_TABLES_REFERENCE, FILE_STRUCTURE, MODULE_MAP (rev P3c+P4):

**New names introduced by this SPEC:**
- `dispatchEventStatusMessages` (JS function) — 0 hits across all sources ✅
- `buildEventVariables` (JS function) — 0 hits across all sources ✅
- `event_registration_confirmation` (template slug) — 0 hits across all sources ✅
- `event_waiting_list_confirmation` (template slug) — 0 hits across all sources ✅

**File collision scan:** `ls modules/Module 4 - CRM/go-live/specs/` — no `P5_5` or
`TRIGGER` folder existed before this SPEC. Slug `P5_5_EVENT_TRIGGER_WIRING` is unique.

**0 collisions. 0 hits resolved.**

---

## 12. Technical Design

### 12.1 Event Status → Template Slug + Recipient Query

| Event status slug | Template base slug | Recipient type | Query logic |
|-------------------|-------------------|----------------|-------------|
| `will_open_tomorrow` | `event_will_open_tomorrow` | Tier 2 (excl. registered) | `crm_leads` WHERE `status IN (TIER2_STATUSES)` AND `is_deleted = false` AND `unsubscribed_at IS NULL` AND `id NOT IN (SELECT lead_id FROM crm_event_attendees WHERE event_id = X AND is_deleted = false)` |
| `registration_open` | `event_registration_open` | All Tier 2 | `crm_leads` WHERE `status IN (TIER2_STATUSES)` AND `is_deleted = false` AND `unsubscribed_at IS NULL` |
| `invite_new` | `event_invite_new` | Tier 2 (excl. registered) | Same as `will_open_tomorrow` |
| `closed` | `event_closed` | Attendees (registered/confirmed) | `crm_event_attendees` JOIN `crm_leads` WHERE `event_id = X` AND attendee `status IN ('registered','confirmed')` AND `is_deleted = false` |
| `waiting_list` | `event_waiting_list` | Attendees (waiting_list) | `crm_event_attendees` JOIN `crm_leads` WHERE `event_id = X` AND attendee `status = 'waiting_list'` AND `is_deleted = false` |
| `2_3d_before` | `event_2_3d_before` | Attendees (registered/confirmed) | Same as `closed` |
| `event_day` | `event_day` | Attendees (registered/confirmed) | Same as `closed` |
| `invite_waiting_list` | `event_invite_waiting_list` | Attendees (waiting_list) | Same as `waiting_list` |

**Statuses that do NOT trigger messages:** `planning`, `completed`, `cancelled`.

**TIER2_STATUSES:** Defined in `window.TIER2_STATUSES` (populated by `crm-helpers.js`
at line ~26). Expected slugs: `waiting_for_event`, `invited`, `confirmed_attendance`.
If the global is undefined at runtime, fall back to those 3 slugs hardcoded as a safety net.

**All queries MUST include `.eq('tenant_id', tid)` — Rule 22 defense-in-depth.**

### 12.2 Variables Object per Trigger

All event-triggered messages share the same event-level variable set:

```js
function buildEventVariables(event) {
  return {
    event_name:     event.name || '',
    event_date:     CrmHelpers.formatDate(event.event_date) || '',
    event_time:     event.start_time || '',
    event_location: event.location_address || ''
  };
}
```

Per-lead variables (`name`, `phone`, `email`) are merged in the dispatch
loop from the lead row. The Edge Function's `substituteVariables()` handles
the actual `%var%` replacement at line ~230 of `send-message/index.ts`.

### 12.3 Registration Confirmation — 4 New Templates

The P5 seed has 10 base slugs × 2 channels = 20 templates, all for campaign
flow triggers. Registration confirmation was not in the campaign flow (it's
a CRM-initiated action). P5.5 seeds 4 new templates:

| Slug | Channel | Name (Hebrew) | Body summary |
|------|---------|---------------|-------------|
| `event_registration_confirmation_sms_he` | sms | אישור הרשמה לאירוע (SMS) | "שלום %name%, נרשמת בהצלחה ל%event_name%..." |
| `event_registration_confirmation_email_he` | email | אישור הרשמה לאירוע (Email) | Minimal RTL HTML with event details table |
| `event_waiting_list_confirmation_sms_he` | sms | אישור רשימת המתנה (SMS) | "שלום %name%, נרשמת לרשימת ההמתנה..." |
| `event_waiting_list_confirmation_email_he` | email | אישור רשימת המתנה (Email) | Minimal RTL HTML with "נעדכן כשיתפנה מקום" |

**Seed method:** `execute_sql` INSERT with `ON CONFLICT DO NOTHING` (idempotent).
Total payload ~2 KB — well within MCP limits.

**Trigger mapping:**
- `registerLeadToEvent()` returns `{ success: true, status: 'registered' }` → template base slug `event_registration_confirmation`
- `registerLeadToEvent()` returns `{ success: true, status: 'waiting_list' }` → template base slug `event_waiting_list_confirmation`

### 12.4 Broadcast Wizard Refactor

Current `doWizardSend()` flow (lines ~235–256 of `crm-messaging-broadcast.js`):

1. ✅ KEEP: INSERT into `crm_broadcasts` (history row, lines ~242–248)
2. ✅ KEEP: `buildLeadIds()` to resolve recipient list
3. ❌ REMOVE: Direct INSERT into `crm_message_log` (lines ~249–251)
4. ✅ NEW: Loop over `leadIds`, call `CrmMessaging.sendMessage()` per lead:
   - If `_wizard.templateId` set → need to resolve template slug from the
     cached template list (`window._crmMessagingTemplates()`), extract the
     base slug by stripping the `_{channel}_{language}` suffix, pass as
     `templateSlug` + `channel` + `language`
   - If `_wizard.body` (no template selected) → raw mode with `body` +
     optional `subject`
   - `Promise.allSettled()` for all calls
5. ✅ NEW: After settlement, update `crm_broadcasts` row:
   `sb.from('crm_broadcasts').update({ total_sent: sentCount, total_failed: failedCount, status: 'completed' }).eq('id', broadcastId)`
6. ✅ KEEP: Toast "נשלחו X הודעות" (adjust count from actual results)

The `crm_message_log` entries are now created by the Edge Function (it always
writes a log row per message). No double-write risk.

### 12.5 Fire-and-Forget Pattern

All dispatch calls from CRM UI actions use fire-and-forget:

```js
// Pattern: primary action completes → dispatch runs in background
changeEventStatus(eventId, newStatus).then(function(result) {
  // Update UI immediately
  updateStatusBadge(result.status);
  // Fire-and-forget — don't await, don't block UI
  dispatchEventStatusMessages(eventId, newStatus, eventRow);
});
```

**Rationale:** The primary action (status change, registration) already
succeeded and the UI must reflect that immediately. Message dispatch is
secondary — if it fails, the failure is captured in `crm_message_log`
(status = 'failed') and visible to the operator in the Messaging Log tab.

### 12.6 Error Handling

- Individual `sendMessage` failures are caught per-lead via `Promise.allSettled()`.
  Failed sends do NOT block other recipients.
- The Edge Function writes failure status to `crm_message_log`, so operator
  visibility is maintained without client-side error handling.
- If `CrmMessaging.sendMessage` itself throws (sb not ready, no tenant), catch
  and log to `console.error` but do NOT throw — the primary CRM action already
  succeeded and must not appear to fail.
- Toast after bulk dispatch shows both success and failure counts:
  - All succeeded: `"נשלחו X הודעות ל-Y נמענים"`
  - Some failed: `"נשלחו X הודעות, Y נכשלו"`

---

## 13. Execution Sequence

### Step 1 — Pre-flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read this SPEC in full
3. Read the 3 files to modify:
   - `modules/crm/crm-event-actions.js` (266 lines)
   - `modules/crm/crm-event-register.js` (122 lines)
   - `modules/crm/crm-messaging-broadcast.js` (341 lines)
4. Read the dispatch helper: `modules/crm/crm-messaging-send.js` (69 lines)
5. Reference pattern — how `lead-intake` dispatches:
   `git show HEAD:supabase/functions/lead-intake/index.ts | sed -n '102,157p'`
6. Verify demo tenant readiness:
   - `SELECT count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND status IN ('waiting_for_event','invited','confirmed_attendance') AND is_deleted = false` → ≥1
   - `SELECT id, name, status FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted = false LIMIT 5` → ≥1 event
7. Pre-flight name collision check (P5 FR §7 Proposal 2):
   `grep -rn "dispatchEventStatusMessages\|buildEventVariables\|dispatchRegistrationMessage" modules/crm/` → 0 hits

### Step 2 — Commit 1: Event Status → Message Dispatch

Edit `modules/crm/crm-event-actions.js`:

1. Add `buildEventVariables(event)` helper (after `tid()`, before `createEvent`):
   returns `{ event_name, event_date, event_time, event_location }` from event row.

2. Add `dispatchEventStatusMessages(eventId, newStatus, event)` function:
   - Define `STATUS_TEMPLATE_MAP` object: 8 entries mapping status slug → template base slug (per §12.1)
   - Define `STATUS_RECIPIENT_TYPE` mapping status slug → `'tier2'` | `'tier2_excl_registered'` | `'attendees'` | `'attendees_waiting'`
   - If `newStatus` not in map → return silently (no message for this status)
   - Query recipients based on type:
     - `'tier2'`: `sb.from('crm_leads').select('id, full_name, phone, email')` with `.eq('tenant_id', tid)`, `.eq('is_deleted', false)`, `.is('unsubscribed_at', null)`, `.in('status', tier2Statuses)`
     - `'tier2_excl_registered'`: same as tier2, plus exclude `id IN (attendee lead_ids for this event)`
     - `'attendees'`: `sb.from('crm_event_attendees').select('lead_id, crm_leads(id, full_name, phone, email)')` with `.eq('event_id', eventId)`, `.eq('tenant_id', tid)`, `.in('status', ['registered','confirmed'])`, `.eq('is_deleted', false)`
     - `'attendees_waiting'`: same join, `.eq('status', 'waiting_list')`
   - Build base variables with `buildEventVariables(event)`
   - Loop over leads: for each, merge `{ name: lead.full_name, phone: lead.phone, email: lead.email }` into variables, then:
     - `CrmMessaging.sendMessage({ leadId: lead.id, channel: 'sms', templateSlug, variables, eventId, language: 'he' })`
     - If `lead.email`: also `CrmMessaging.sendMessage({ ...same, channel: 'email' })`
   - Collect all promises, `Promise.allSettled()`
   - Count fulfilled (ok=true) vs rejected/failed, show toast

3. Modify `changeEventStatus()`: after `upd.data` returns, fetch full event row
   (`sb.from('crm_events').select('name, event_date, start_time, location_address').eq('id', eventId).eq('tenant_id', tid).single()`),
   then fire-and-forget call `dispatchEventStatusMessages(eventId, newStatus, eventRow)`.

```bash
git add modules/crm/crm-event-actions.js
git commit -m "feat(crm): wire event status change → message dispatch"
```

Verify: `wc -l modules/crm/crm-event-actions.js` → ≤350

### Step 3 — Commit 2: Registration → Confirmation Message

1. Edit `modules/crm/crm-event-register.js`, in the click handler inside
   `openRegisterLeadModal` (line ~91–101), after `toastResponse(resp)` and
   before `modal.close()`:
   - If `resp && resp.success && (resp.status === 'registered' || resp.status === 'waiting_list')`:
     - Map status → template: `'registered'` → `'event_registration_confirmation'`, `'waiting_list'` → `'event_waiting_list_confirmation'`
     - Fetch event row for variables: `sb.from('crm_events').select('name, event_date, start_time, location_address').eq('id', eventId).eq('tenant_id', tid()).single()`
     - Get lead data from the clicked button's row context (full_name, phone, email from the rendered lead row)
     - Fire-and-forget: call `CrmMessaging.sendMessage()` for SMS, + email if lead has email
   - Do NOT block modal close or toast on dispatch result

2. Seed 4 confirmation templates via `execute_sql`:
   ```sql
   INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active)
   VALUES
     ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'event_registration_confirmation_sms_he',
      'אישור הרשמה לאירוע (SMS)', 'sms', 'he', NULL,
      'שלום %name%, נרשמת בהצלחה לאירוע %event_name% בתאריך %event_date%. נשמח לראותך! לביטול: %unsubscribe_url%',
      true),
     ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'event_registration_confirmation_email_he',
      'אישור הרשמה לאירוע (Email)', 'email', 'he', 'אישור הרשמה — %event_name%',
      '<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;direction:rtl;text-align:right;padding:20px;"><h2>שלום %name%,</h2><p>נרשמת בהצלחה לאירוע <strong>%event_name%</strong>.</p><p>תאריך: %event_date%<br>שעה: %event_time%<br>מיקום: %event_location%</p><p>נשמח לראותך!</p><hr><p style="font-size:12px;color:#999;"><a href="%unsubscribe_url%">להסרה מרשימת התפוצה</a></p></body></html>',
      true),
     ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'event_waiting_list_confirmation_sms_he',
      'אישור רשימת המתנה (SMS)', 'sms', 'he', NULL,
      'שלום %name%, נרשמת לרשימת ההמתנה לאירוע %event_name%. נעדכן אותך ברגע שיתפנה מקום! לביטול: %unsubscribe_url%',
      true),
     ('8d8cfa7e-ef58-49af-9702-a862d459cccb', 'event_waiting_list_confirmation_email_he',
      'אישור רשימת המתנה (Email)', 'email', 'he', 'רשימת המתנה — %event_name%',
      '<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;direction:rtl;text-align:right;padding:20px;"><h2>שלום %name%,</h2><p>נרשמת לרשימת ההמתנה לאירוע <strong>%event_name%</strong>.</p><p>נעדכן אותך ברגע שיתפנה מקום.</p><p>תאריך: %event_date%<br>שעה: %event_time%<br>מיקום: %event_location%</p><hr><p style="font-size:12px;color:#999;"><a href="%unsubscribe_url%">להסרה מרשימת התפוצה</a></p></body></html>',
      true)
   ON CONFLICT DO NOTHING;
   ```

   Verify: `SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND slug LIKE 'event_%confirmation%'` → 4

```bash
git add modules/crm/crm-event-register.js
git commit -m "feat(crm): wire attendee registration → confirmation message"
```

Verify: `wc -l modules/crm/crm-event-register.js` → ≤200

### Step 4 — Commit 3: Broadcast Wizard → Edge Function

Edit `modules/crm/crm-messaging-broadcast.js`:

1. In `doWizardSend()` (line ~235):
   - Keep: `crm_broadcasts` INSERT (lines ~242–248) — get `broadcastId` from response
   - Remove: direct `crm_message_log` INSERT (lines ~249–251)
   - Replace with: loop over `leadIds`:
     - If `_wizard.templateId`: get template from `window._crmMessagingTemplates()`, derive base slug by stripping `_{channel}_{language}` suffix, call `CrmMessaging.sendMessage({ leadId, channel: _wizard.channel, templateSlug: baseSlug, variables: {}, language: 'he' })`
     - If `_wizard.body` only: call `CrmMessaging.sendMessage({ leadId, channel: _wizard.channel, body: _wizard.body, subject: _wizard.name || '', language: 'he' })`
   - `Promise.allSettled()` for all dispatch calls
   - After settlement: count successes/failures, update `crm_broadcasts` row:
     `sb.from('crm_broadcasts').update({ total_sent: sentCount, total_failed: failedCount, status: failedCount === 0 ? 'completed' : 'partial' }).eq('id', broadcastId).eq('tenant_id', tid)`
   - Toast: `"נשלחו " + sentCount + " הודעות"` (or include failure count)

```bash
git add modules/crm/crm-messaging-broadcast.js
git commit -m "feat(crm): wire broadcast wizard to send-message Edge Function"
```

Verify: `wc -l modules/crm/crm-messaging-broadcast.js` → ≤350

### Step 5 — Browser QA

On `localhost:3000/crm.html?t=demo`:

1. **Event status change:** Events tab → pick a demo event → change status to
   `registration_open` → expect toast "נשלחו X הודעות" → check Messaging Log
   tab for new entries with timestamp in last 5 minutes.
2. **Attendee registration:** Event detail → register a Tier 2 lead → expect
   registration toast ("נרשם בהצלחה") → check Messaging Log for confirmation
   message entries.
3. **Broadcast wizard:** Messaging Hub → Broadcast → "+ שליחה חדשה" → pick
   recipients (1–2 leads), channel, template or custom body → send → expect
   toast with count → check log.
4. **Zero console errors** throughout all 3 test flows.
5. Verify DB: `SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > NOW() - interval '10 minutes'` → ≥3 rows

### Step 6 — Commit 4: Documentation

Update:
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — add P5.5 CLOSED row with trigger count and template count
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — add P5.5 section with ✅, update P3c+P4 §3 trigger checklist (mark the 3 wired triggers ✅)

```bash
git add "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md" "modules/Module 4 - CRM/go-live/ROADMAP.md"
git commit -m "docs(crm): mark P5.5 CLOSED — all CRM triggers wired"
```

### Step 7 — Commit 5: Retrospective

Write `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) in this SPEC's folder.

```bash
git add "modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/"
git commit -m "chore(spec): close P5_5_EVENT_TRIGGER_WIRING with retrospective"
git push origin develop
```

---

## 14. Open Questions (resolved at author time)

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should dispatch block the UI (await) or fire-and-forget? | **Fire-and-forget.** Primary action already succeeded. Dispatch is background. Toast appears when done. Failures visible in crm_message_log. See §12.5. |
| 2 | Should broadcast wizard use template mode or raw mode when a template is selected? | **Template mode** — pass `templateSlug` to EF. Ensures edits to templates are immediately reflected. Raw mode only for custom text. See §12.4. |
| 3 | Do the confirmation templates need full-branded HTML email versions? | **No** — minimal RTL HTML is sufficient for Go-Live. Full Prizma branding can be added in SaaS-ification when all email templates get a configurable header/footer. |
| 4 | Should `invite_new` and `will_open_tomorrow` exclude already-registered leads? | **Yes** — no point sending "registration is open" to someone already registered. Query excludes `lead_id IN (SELECT lead_id FROM crm_event_attendees WHERE event_id = X)`. See §12.1 "tier2_excl_registered" type. |
| 5 | Should P5.5 build the automation rules execution engine? | **No** — `crm-messaging-rules.js` is CRUD-only UI with no execution engine. Building one is SaaS-ification scope. P5.5 hardcodes trigger→template mapping in `dispatchEventStatusMessages`, which is correct for Go-Live (single campaign, known flow). |

---

## 15. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bulk send slow on demo | LOW | LOW | Demo has <20 Tier 2 leads. `Promise.allSettled` non-blocking. |
| Operator accidentally triggers mass send | MEDIUM | MEDIUM | Status change is already intentional UI action. Toast confirms count. P7 safeguard: add confirmation modal for bulk >10. |
| Template slug mismatch (status maps to wrong template) | LOW | HIGH | §12.1 mapping explicit. §3 criterion #3 verifies all 8. Browser QA criterion #15 verifies end-to-end. |
| `crm-event-actions.js` exceeds 350 lines | MEDIUM | LOW | Budget ~330 lines. Stop-trigger #1 catches this. If exceeded, extract `dispatchEventStatusMessages` to new file (requires stopping per §4). |
| Broadcast double-write to crm_message_log | LOW | MEDIUM | §12.4 explicitly removes the direct INSERT. EF owns all log writes. §3 criterion #7 + #8 verify the swap. |
