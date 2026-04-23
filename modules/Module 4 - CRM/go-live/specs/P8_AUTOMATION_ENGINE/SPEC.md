# SPEC — P8_AUTOMATION_ENGINE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P8_AUTOMATION_ENGINE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-22
> **Module:** 4 — CRM
> **Phase:** Go-Live P8
> **Author signature:** Cowork session happy-elegant-edison

---

## 1. Goal

Build a Level 1 automation engine for the CRM so Daniel can create, edit, and
toggle "when [trigger] + [condition] → send message" rules from the CRM UI
without developer involvement. Replace all hardcoded dispatch logic from P5.5
(event status change, registration confirmation) and P1 (lead-intake) with
rule-evaluated dispatch. Also: upgrade the message log (Messaging Hub history
tab + lead detail messages tab) to show lead name, phone, message content
preview, and click-to-expand detail.

---

## 2. Background & Motivation

P1–P5.5 built the messaging pipeline with hardcoded dispatch: `crm-event-actions.js`
has an 8-entry `EVENT_STATUS_DISPATCH` map, `crm-event-register.js` has
`dispatchRegistrationConfirmation`, and `lead-intake` EF has inline calls to
`send-message`. This works but is rigid — Daniel cannot change which templates
fire for which triggers, cannot add new trigger→template mappings, and cannot
disable a dispatch without a code deploy.

P8 converts these hardcoded dispatches into rows in `crm_automation_rules` — a
table that **already exists** (created in Phase A, CRUD UI built in B5 under
`crm-messaging-rules.js`). The B5 UI even shows a banner: "כללי אוטומטיה
נשמרים אך עדיין לא פועלים אוטומטית" — rules are stored but never evaluated.
P8 adds the evaluation engine and wires it into the existing trigger points.

Daniel also requested message log improvements: the current history tab shows
only date/channel/status/content-snippet — missing lead name, phone, template
name, and click-to-expand. The lead detail modal has a "הודעות" tab that shows
"בקרוב". Both need to be functional before Prizma cutover (P7).

Execution order: ~~P6~~ ✅ → **P8** → P7 (Prizma cutover).

---

## 3. Success Criteria (Measurable)

### Part A — Rule Evaluation Engine

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | New file `crm-automation-engine.js` exists | File at `modules/crm/crm-automation-engine.js` | `ls modules/crm/crm-automation-engine.js` → exists |
| 2 | Engine file size | ≤300 lines | ⚠️ UNVERIFIED — executor must `wc -l` after writing |
| 3 | Engine exports `CrmAutomation.evaluate(triggerType, triggerData)` | Function callable from console | Browser QA: `typeof CrmAutomation.evaluate === 'function'` → true |
| 4 | Engine queries `crm_automation_rules` filtered by trigger type + is_active | SELECT in code includes `.eq('is_active', true)` and trigger filter | `grep 'is_active' modules/crm/crm-automation-engine.js` → hit |
| 5 | Engine evaluates conditions: `always`, `status_equals`, `count_threshold`, `source_equals` | 4 condition evaluators in code | `grep -c 'always\|status_equals\|count_threshold\|source_equals' modules/crm/crm-automation-engine.js` → ≥4 |
| 6 | Engine calls `CrmMessaging.sendMessage` for matching rules | `CrmMessaging.sendMessage` referenced in engine | `grep 'CrmMessaging.sendMessage' modules/crm/crm-automation-engine.js` → hit |
| 7 | Engine handles errors per-rule (one rule failing doesn't block others) | `Promise.allSettled` or try/catch per rule | Code review |

### Part B — Hardcoded Dispatch Refactored to Rule Evaluation

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 8 | `crm-event-actions.js`: `EVENT_STATUS_DISPATCH` map removed or deprecated | Map no longer drives dispatch directly | `grep 'EVENT_STATUS_DISPATCH' modules/crm/crm-event-actions.js` → either removed or wrapped in fallback comment |
| 9 | `crm-event-actions.js`: `dispatchEventStatusMessages` calls `CrmAutomation.evaluate` | Engine call in dispatch function | `grep 'CrmAutomation.evaluate' modules/crm/crm-event-actions.js` → hit |
| 10 | `crm-event-actions.js` file size | ≤350 lines (Rule 12 hard max). ⚠️ Currently ~236 lines per Cowork mount — executor must verify actual size | ⚠️ UNVERIFIED — executor must `wc -l` |
| 11 | `crm-event-register.js`: `dispatchRegistrationConfirmation` calls `CrmAutomation.evaluate` | Engine call in registration function | `grep 'CrmAutomation.evaluate' modules/crm/crm-event-register.js` → hit |
| 12 | `crm-event-register.js` file size | ≤200 lines | ⚠️ UNVERIFIED — executor must `wc -l` |

### Part C — Default Rules Seeded on Demo

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 13 | Demo tenant has ≥10 default automation rules | ≥10 active rules | `execute_sql: SELECT count(*) FROM crm_automation_rules WHERE tenant_id = '8d8cfa7e-...' AND is_active = true` → ≥10 |
| 14 | Rules cover all 8 event status dispatch mappings | 8 rules with `trigger_event='status_change'` and distinct status conditions | `execute_sql: SELECT name, trigger_condition FROM crm_automation_rules WHERE tenant_id = '8d8cfa7e-...' AND trigger_entity = 'event' AND trigger_event = 'status_change'` → 8 rows |
| 15 | Rules cover registration confirmation (2 outcomes) | 2 rules: registered + waiting_list | `execute_sql: SELECT name FROM crm_automation_rules WHERE tenant_id = '8d8cfa7e-...' AND trigger_entity = 'attendee' AND trigger_event = 'created'` → 2 rows |
| 16 | Seed SQL artifact exists | File at `go-live/seed-automation-rules-demo.sql` | `ls modules/Module\ 4\ -\ CRM/go-live/seed-automation-rules-demo.sql` → exists |

### Part D — UI Improvements: Rules Management

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 17 | B5 banner "עדיין לא פועלים אוטומטית" removed | No amber warning banner | Browser QA: `crm.html?t=demo` → Messaging Hub → כללי אוטומטיה sub-tab → no amber banner |
| 18 | Rule creation wizard shows trigger types matching the 4 supported types | Dropdown includes: `lead_intake`, `event_status_change`, `event_registration`, `lead_status_change` | Browser QA: click "+ כלל חדש" → dropdown shows these options |
| 19 | Rule creation wizard shows condition types | Dropdown/section shows: `always`, `status_equals`, `count_threshold`, `source_equals` | Browser QA |
| 20 | `crm-messaging-rules.js` file size | ≤350 lines (Rule 12) | ⚠️ UNVERIFIED — executor must `wc -l`. Currently 234 per Cowork mount |

### Part E — Message Log Improvements

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 21 | Message log table shows lead name column | Column header "ליד" or "שם" visible | Browser QA: Messaging Hub → היסטוריה sub-tab → table has name column |
| 22 | Message log table shows phone number | Phone visible per row | Browser QA |
| 23 | Message log table shows template name (if from template) | Template name or slug visible | Browser QA |
| 24 | Message log row click-to-expand shows full content | Click on row → expanded section with full message body, status, error_message (if failed), timestamps | Browser QA |
| 25 | Message log SELECT JOINs leads and templates | Query includes `crm_leads(full_name, phone)` and/or `crm_message_templates(name)` | `grep 'full_name\|crm_leads' modules/crm/crm-messaging-broadcast.js` → hit in log query |
| 26 | `crm-messaging-broadcast.js` file size | ≤350 lines (Rule 12). ⚠️ Currently 318 per Cowork mount | ⚠️ UNVERIFIED — executor must `wc -l` |

### Part F — Per-Lead Message History in Detail Modal

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 27 | Lead detail "הודעות" tab shows actual message history | List of sent/failed messages for that lead, not "בקרוב" placeholder | Browser QA: click lead → detail modal → "הודעות" tab → shows message rows |
| 28 | Per-lead messages show: date, channel, status, content preview | All 4 fields visible per row | Browser QA |
| 29 | Per-lead messages query filters by `lead_id` | Query includes `.eq('lead_id', ...)` | `grep 'lead_id' modules/crm/crm-leads-detail.js` → hit in messages section |
| 30 | `crm-leads-detail.js` file size | ≤350 lines. ⚠️ Currently 216 per Cowork mount | ⚠️ UNVERIFIED — executor must `wc -l` |

### Part G — Documentation & Cleanup

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 31 | SESSION_CONTEXT.md updated | P8 marked CLOSED | `grep 'P8' modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md` → CLOSED |
| 32 | Go-Live ROADMAP updated | P8 ✅ | `grep 'P8' modules/Module\ 4\ -\ CRM/go-live/ROADMAP.md` → ✅ |
| 33 | CRM page loads with 0 new console errors | 0 app-functional errors | Browser QA: `crm.html?t=demo` → DevTools console clean |
| 34 | Commits produced | 6–8 commits | `git log --oneline` from start hash |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Run read-only SQL (Level 1) on demo tenant for verification
- Run write SQL on demo tenant for seed data (Level 2 — pre-authorized: seed automation rules with approved phones only)
- Create new file `modules/crm/crm-automation-engine.js`
- Modify existing files: `crm-event-actions.js`, `crm-event-register.js`, `crm-messaging-rules.js`, `crm-messaging-broadcast.js`, `crm-leads-detail.js`
- Update `SESSION_CONTEXT.md`, `go-live/ROADMAP.md`
- Commit and push to `develop`
- Run browser QA on `localhost:3000/crm.html?t=demo`
- Create seed SQL artifact `go-live/seed-automation-rules-demo.sql`
- Split a file if it exceeds 350 lines (Rule 12) — no need to ask
- Apply P6 Foreman Review proposals #1–#4 to executor skill if directly relevant

### What REQUIRES stopping and reporting

- Any schema change (DDL) — the existing `crm_automation_rules` schema must be sufficient. If it's not, STOP and report what's missing.
- Modifying `supabase/functions/lead-intake/index.ts` — the EF dispatch is hardcoded but lives in a deployed Edge Function. Changing it requires a redeploy and is out of scope for this SPEC. See §7.
- Modifying `supabase/functions/send-message/index.ts` — same reason.
- Any file modification not listed in §8 Expected Final State
- Any merge to `main`
- Any test data using phones NOT on the approved list (`+972537889878`, `+972503348349`)
- `crm-event-actions.js` exceeding 350 lines after refactor — split needed, STOP to plan the split

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. If `crm_automation_rules` table schema is missing columns needed for Level 1 conditions → STOP (DDL needed, not authorized)
2. If any of the 5 modified files exceeds 350 lines (Rule 12 hard max) → STOP and plan a split before committing
3. If rule evaluation produces unexpected dispatch (wrong template, wrong recipients) during QA → STOP
4. If any test data seed uses a phone NOT in `['+972537889878', '+972503348349']` → STOP IMMEDIATELY
5. If removing `EVENT_STATUS_DISPATCH` breaks a dispatch path that rules don't cover → STOP (coverage gap)
6. If CRM page shows >0 new console errors after any commit → STOP

---

## 6. Rollback Plan

- **Code:** `git revert` the P8 commits in reverse order. The hardcoded dispatch from P5.5 still exists in git history.
- **Seed data:** `DELETE FROM crm_automation_rules WHERE tenant_id = '8d8cfa7e-...' AND name LIKE 'P8:%'` (if rules are name-prefixed) or by creation timestamp.
- **No DDL to roll back** — existing table schema is unchanged.

---

## 7. Out of Scope (explicit)

- **`lead-intake` Edge Function refactor** — the EF is deployed and hardcodes
  `dispatchIntakeMessages`. Changing it requires a Supabase redeploy. The
  client-side rule engine cannot intercept server-side EF dispatch. Lead-intake
  dispatch stays hardcoded in the EF for now. A future SPEC will move it to
  rule-based dispatch by making the EF call the client-side engine (or a
  server-side rule evaluator). For now, Daniel can replicate lead-intake rules
  in the UI but the EF continues to fire its own dispatch independently.
- **Scheduled/timed rules** ("wait 3 days then send") — Level 2, needs a scheduler
- **Action chains** ("send message AND update status") — Level 2
- **Complex AND/OR conditions** — Level 2
- **Visual flow builder** — Level 3
- **WhatsApp channel** — awaiting Meta API
- **Unsubscribe endpoint** — separate SPEC
- **Prizma tenant seed** — P7 scope. P8 seeds demo only.
- **MODULE_MAP / GLOBAL_MAP updates** — tracked under Guardian M4-DOC-06, Integration Ceremony
- **shared.js split** — tracked under Guardian M5-DEBT-01
- **`crm-messaging-broadcast.js` wizard channel-override fix** (M4-UX-P6-03) — separate tiny SPEC

---

## 8. Expected Final State

### New files
- `modules/crm/crm-automation-engine.js` — rule evaluation engine (~150-250 lines)
  - Exports `window.CrmAutomation` with `evaluate(triggerType, triggerData)` method
  - Queries `crm_automation_rules` for active rules matching the trigger
  - Evaluates conditions (`always`, `status_equals`, `count_threshold`, `source_equals`)
  - Executes matching rules via `CrmMessaging.sendMessage`
  - Error isolation per rule (`Promise.allSettled` or try/catch)
- `modules/Module 4 - CRM/go-live/seed-automation-rules-demo.sql` — seed SQL for demo tenant (~50-80 lines)

### Modified files
- `modules/crm/crm-event-actions.js` — `dispatchEventStatusMessages` refactored:
  replace `EVENT_STATUS_DISPATCH` map lookup with `CrmAutomation.evaluate('event_status_change', {eventId, newStatus, event})`.
  Keep `EVENT_STATUS_DISPATCH` as a commented-out reference or remove entirely.
  Keep `buildEventVariables` (needed by the engine for variable population).
  File should shrink (dispatch logic moves to engine).
- `modules/crm/crm-event-register.js` — `dispatchRegistrationConfirmation` refactored:
  replace inline template-slug mapping with `CrmAutomation.evaluate('event_registration', {leadId, eventId, outcome})`.
- `modules/crm/crm-messaging-rules.js` — UI improvements:
  remove "עדיין לא פועלים" banner.
  Update trigger/condition dropdowns to match the 4 supported trigger types and 4 condition types.
  Keep existing CRUD logic (save, toggle, edit).
- `modules/crm/crm-messaging-broadcast.js` — Message log improvements:
  `loadLog()` SELECT expanded to JOIN `crm_leads(full_name, phone)` and `crm_message_templates(name)`.
  `renderLogTable()` adds lead name, phone, template columns.
  Row click opens expanded detail view (full content, status, error_message, timestamps).
- `modules/crm/crm-leads-detail.js` — "הודעות" tab populated:
  replace "בקרוב" placeholder with actual `crm_message_log` query filtered by `lead_id`.
  Show date, channel, status, content preview per row.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P8 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P8 ✅
- `crm.html` — add `<script src="modules/crm/crm-automation-engine.js"></script>` in the CRM script block (if not auto-loaded)

### Deleted files
None.

### DB state (demo tenant)
- `crm_automation_rules`: ≥10 active rules covering all P5.5 dispatch mappings + registration confirmations
- No schema changes (existing table is sufficient)

### Docs updated
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — P8 CLOSED
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — P8 ✅

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add automation rule evaluation engine`
  - Files: `modules/crm/crm-automation-engine.js` (new), `crm.html` (script tag)
- **Commit 2:** `refactor(crm): replace hardcoded event dispatch with rule evaluation`
  - Files: `modules/crm/crm-event-actions.js`
- **Commit 3:** `refactor(crm): replace hardcoded registration dispatch with rule evaluation`
  - Files: `modules/crm/crm-event-register.js`
- **Commit 4:** `feat(crm): seed default automation rules on demo tenant`
  - Files: `modules/Module 4 - CRM/go-live/seed-automation-rules-demo.sql` (new)
  - DB: INSERT automation rules on demo
- **Commit 5:** `feat(crm): upgrade rules UI — remove banner, add trigger/condition dropdowns`
  - Files: `modules/crm/crm-messaging-rules.js`
- **Commit 6:** `feat(crm): upgrade message log with lead info and click-to-expand`
  - Files: `modules/crm/crm-messaging-broadcast.js`
- **Commit 7:** `feat(crm): populate lead detail messages tab`
  - Files: `modules/crm/crm-leads-detail.js`
- **Commit 8:** `docs(crm): mark P8 CLOSED — automation engine + log improvements`
  - Files: `SESSION_CONTEXT.md`, `go-live/ROADMAP.md`
- **Commit 9:** `chore(spec): close P8_AUTOMATION_ENGINE with retrospective`
  - Files: `EXECUTION_REPORT.md`, `FINDINGS.md`

Budget: 9 commits ± 2 fix = max 11. This is a large SPEC. If file splits are needed (Rule 12), they count within the budget.

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verification |
|-----------|--------|-------------|
| P6 (Full Cycle Test) CLOSED | ✅ VERIFIED | FOREMAN_REVIEW.md verdict 🟢 CLOSED |
| `crm_automation_rules` table exists in Supabase | ✅ VERIFIED | Schema in `001_crm_schema.sql:247-260`, RLS at line 512-516 |
| `crm-messaging-rules.js` has CRUD UI for rules | ✅ VERIFIED | File exists, 234 lines, save/toggle/edit logic |
| `crm_message_log` table has `lead_id` FK | ✅ VERIFIED | Schema at `001_crm_schema.sql:283` |
| `crm_message_log` table has `template_id` FK | ✅ VERIFIED | Schema at `001_crm_schema.sql:285` |
| Demo tenant has ≥24 templates | ⚠️ UNVERIFIED (Cowork, no DB access) | Executor must verify: `SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-...' AND is_active = true` → ≥24 |
| Demo tenant has ≥2 leads with approved phones | ⚠️ UNVERIFIED | Executor must verify |
| Make scenario 9104395 active | ⚠️ UNVERIFIED | Executor verifies by dispatching a test message |
| `localhost:3000` serves CRM | ASSUMED | Executor must start server |
| Chrome DevTools MCP available | ASSUMED | Required for browser QA |

**⚠️ UNVERIFIED fallback: executor must verify columns before executing any seed SQL per P6 Foreman Review Proposal #1 (Cowork SQL must be verified against `information_schema.columns`).**

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| P6 FR §6 Proposal 1 — Cowork SQL must be marked UNVERIFIED | Mark all seed SQL blocks with ⚠️ note | ✅ APPLIED — §10 and §12.4 seed SQL marked with column-verification note |
| P6 FR §6 Proposal 2 — list all valid HTTP codes for EF calls | List all EF response codes when testing | N/A — P8 doesn't call EFs in test criteria |
| P6 FR §7 Proposal 1 — baseline measurement check | Run verify commands before executing | ✅ APPLIED — file sizes marked ⚠️ UNVERIFIED with "executor must `wc -l`" |
| P6 FR §7 Proposal 2 — column verification for SPEC SQL | Verify column names before executing seed SQL | ✅ APPLIED — §10 fallback note |
| P5.5 FR §6 Proposal 1 — constant-value verification | Grep helper files for constant values | ✅ APPLIED — verified TIER2_STATUSES, EVENT_STATUS_DISPATCH, ENTITY_LABELS, EVENT_LABELS against live code |
| P5.5 FR §6 Proposal 2 — precondition verification | Mark DB preconditions UNVERIFIED when Cowork can't access | ✅ APPLIED — 3 DB preconditions marked ⚠️ |
| P5.5 FR §7 Proposal 1 — approved-phone check | Stop-trigger for non-approved phones | ✅ APPLIED — §5 trigger #4 |
| P5.5 FR §7 Proposal 2 — existing-INSERT audit | Audit NOT NULL columns before modifying write functions | ✅ APPLIED — executor should audit `crm_automation_rules` NOT NULL columns before seed |

**Cross-Reference Check completed 2026-04-22: `crm_automation_rules` table ALREADY EXISTS (Phase A). `crm-messaging-rules.js` CRUD UI ALREADY EXISTS (B5). 1 new file (`crm-automation-engine.js`), 0 name collisions. Existing schema sufficient for Level 1 — no DDL needed.**

---

## 12. Technical Design

### 12.1 Rule Evaluation Engine (`crm-automation-engine.js`)

**Architecture:**
```
Trigger point (e.g., event status change)
    │
    ▼
CrmAutomation.evaluate(triggerType, triggerData)
    │
    ├── 1. Query crm_automation_rules WHERE trigger matches + is_active
    ├── 2. For each matching rule, evaluate condition
    ├── 3. For matching conditions, resolve recipients
    ├── 4. For each recipient × channel, call CrmMessaging.sendMessage
    └── 5. Return summary { fired: N, sent: N, failed: N }
```

**Trigger types (Level 1):**
```javascript
var TRIGGER_TYPES = {
  event_status_change: {
    entity: 'event',
    event: 'status_change',
    // triggerData: { eventId, newStatus, event }
  },
  event_registration: {
    entity: 'attendee',
    event: 'created',
    // triggerData: { leadId, eventId, outcome: 'registered'|'waiting_list' }
  },
  lead_status_change: {
    entity: 'lead',
    event: 'status_change',
    // triggerData: { leadId, oldStatus, newStatus, lead }
  },
  lead_intake: {
    entity: 'lead',
    event: 'created',
    // triggerData: { leadId, source, lead }
    // NOTE: this fires from CRM UI only (manual lead entry).
    // The EF lead-intake has its own hardcoded dispatch (out of scope).
  }
};
```

**Mapping to existing `crm_automation_rules` schema:**
- `trigger_entity` → matches `TRIGGER_TYPES[type].entity` (e.g., `'event'`)
- `trigger_event` → matches `TRIGGER_TYPES[type].event` (e.g., `'status_change'`)
- `trigger_condition` → JSON evaluated by condition engine (see below)
- `action_type` → `'send_message'` (only type in Level 1)
- `action_config` → `{ template_slug, channels, recipient_type }`

**Condition evaluators:**
```javascript
var CONDITIONS = {
  always: function(cond, data) { return true; },
  status_equals: function(cond, data) {
    // cond.status = 'registration_open'
    return data.newStatus === cond.status || data.outcome === cond.status;
  },
  count_threshold: function(cond, data) {
    // cond.field = 'attendee_count', cond.operator = '>', cond.value = 50
    var actual = data[cond.field];
    if (cond.operator === '>') return actual > cond.value;
    if (cond.operator === '>=') return actual >= cond.value;
    if (cond.operator === '=') return actual === cond.value;
    return false;
  },
  source_equals: function(cond, data) {
    return data.source === cond.source;
  }
};
```

**Recipient resolution:**
The engine needs to know WHO to send to. This is encoded in `action_config.recipient_type`:
- `trigger_lead` — the lead that triggered the rule (registration, status change)
- `tier2` — all Tier 2 leads (for event announcements)
- `tier2_excl_registered` — Tier 2 minus already-registered for this event
- `attendees` — registered attendees of the event
- `attendees_waiting` — waiting-list attendees

Recipient resolution reuses the existing query patterns from `dispatchEventStatusMessages`
in `crm-event-actions.js` (lines 219-241). The engine extracts these into a shared
`resolveRecipients(recipientType, tenantId, eventId)` function.

**Variable population:**
Reuses `buildEventVariables(event)` from `crm-event-actions.js:14-17` for event-related
variables. For lead variables: `{ name, phone, email }` from the lead row.

### 12.2 Refactoring Hardcoded Dispatch

**`crm-event-actions.js` — event status change:**

Before (P5.5):
```javascript
var EVENT_STATUS_DISPATCH = { ... }; // 8-entry map
async function dispatchEventStatusMessages(eventId, newStatus, event) {
  var dispatchCfg = EVENT_STATUS_DISPATCH[newStatus];
  // ... hardcoded recipient query + send
}
```

After (P8):
```javascript
async function dispatchEventStatusMessages(eventId, newStatus, event) {
  if (!window.CrmAutomation) return;
  await CrmAutomation.evaluate('event_status_change', {
    eventId: eventId,
    newStatus: newStatus,
    event: event
  });
}
```

The function name and call signature stay the same — `changeEventStatus()` still
calls `dispatchEventStatusMessages()` fire-and-forget. The internal implementation
changes from map-lookup to rule evaluation.

**`crm-event-register.js` — registration confirmation:**

Before (P5.5):
```javascript
async function dispatchRegistrationConfirmation(leadId, eventId, outcome) {
  var base = outcome === 'registered' ? 'event_registration_confirmation' : 'event_waiting_list_confirmation';
  // ... hardcoded send
}
```

After (P8):
```javascript
async function dispatchRegistrationConfirmation(leadId, eventId, outcome) {
  if (!window.CrmAutomation) return;
  await CrmAutomation.evaluate('event_registration', {
    leadId: leadId,
    eventId: eventId,
    outcome: outcome  // 'registered' or 'waiting_list'
  });
}
```

### 12.3 UI Improvements — Rules Management

**Changes to `crm-messaging-rules.js`:**

1. **Remove** the amber "עדיין לא פועלים" banner (line ~57-59).

2. **Update** trigger dropdowns in `openRuleModal`:
   - Replace `ENTITY_LABELS` + `EVENT_LABELS` separate dropdowns with a single
     "trigger type" dropdown showing human-readable labels:
     ```
     שינוי סטטוס אירוע    → event_status_change
     הרשמה לאירוע          → event_registration
     שינוי סטטוס ליד       → lead_status_change
     ליד חדש (ידני)        → lead_intake
     ```
   - The existing `trigger_entity` + `trigger_event` columns get populated from
     the trigger type selection (e.g., `event_status_change` → entity=`event`,
     event=`status_change`).

3. **Add** condition type selection:
   - Dropdown: `תמיד` (always) / `סטטוס שווה ל-` (status_equals) / `ספירה עוברת סף` (count_threshold) / `מקור שווה ל-` (source_equals)
   - Conditional fields appear based on selection (e.g., status dropdown for `status_equals`, number input for `count_threshold`)
   - Replaces the current raw JSON textarea for `trigger_condition` — keep JSON as advanced/fallback mode.

4. **Add** `recipient_type` dropdown to `action_config`:
   - Options: `הליד שהפעיל (trigger_lead)` / `כל Tier 2 (tier2)` / `Tier 2 חוץ מנרשמים (tier2_excl_registered)` / `נרשמים (attendees)` / `רשימת המתנה (attendees_waiting)`

5. **Add** template selection showing template name (already partially implemented — `tplOptions` uses `window._crmMessagingTemplates()`). Add channel filter so only templates matching the selected channel(s) are shown.

### 12.4 Default Rules Seed (Demo Tenant)

⚠️ **UNVERIFIED COLUMNS — executor must run `SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_automation_rules' ORDER BY ordinal_position` before executing this SQL.**

Seed ≥10 rules that replicate the P5.5 hardcoded behavior:

| # | Name | trigger_entity | trigger_event | trigger_condition | action_config |
|---|------|---------------|---------------|-------------------|---------------|
| 1 | שינוי סטטוס: ייפתח מחר | event | status_change | `{"type":"status_equals","status":"will_open_tomorrow"}` | `{"template_slug":"event_will_open_tomorrow","channels":["sms","email"],"recipient_type":"tier2_excl_registered"}` |
| 2 | שינוי סטטוס: נפתחה הרשמה | event | status_change | `{"type":"status_equals","status":"registration_open"}` | `{"template_slug":"event_registration_open","channels":["sms","email"],"recipient_type":"tier2"}` |
| 3 | שינוי סטטוס: הזמנה חדשה | event | status_change | `{"type":"status_equals","status":"invite_new"}` | `{"template_slug":"event_invite_new","channels":["sms","email"],"recipient_type":"tier2_excl_registered"}` |
| 4 | שינוי סטטוס: אירוע נסגר | event | status_change | `{"type":"status_equals","status":"closed"}` | `{"template_slug":"event_closed","channels":["sms","email"],"recipient_type":"attendees"}` |
| 5 | שינוי סטטוס: רשימת המתנה | event | status_change | `{"type":"status_equals","status":"waiting_list"}` | `{"template_slug":"event_waiting_list","channels":["sms","email"],"recipient_type":"attendees_waiting"}` |
| 6 | שינוי סטטוס: 2-3 ימים לפני | event | status_change | `{"type":"status_equals","status":"2_3d_before"}` | `{"template_slug":"event_2_3d_before","channels":["sms","email"],"recipient_type":"attendees"}` |
| 7 | שינוי סטטוס: יום אירוע | event | status_change | `{"type":"status_equals","status":"event_day"}` | `{"template_slug":"event_day","channels":["sms","email"],"recipient_type":"attendees"}` |
| 8 | שינוי סטטוס: הזמנה ממתינים | event | status_change | `{"type":"status_equals","status":"invite_waiting_list"}` | `{"template_slug":"event_invite_waiting_list","channels":["sms","email"],"recipient_type":"attendees_waiting"}` |
| 9 | הרשמה: אישור הרשמה | attendee | created | `{"type":"status_equals","status":"registered"}` | `{"template_slug":"event_registration_confirmation","channels":["sms","email"],"recipient_type":"trigger_lead"}` |
| 10 | הרשמה: אישור רשימת המתנה | attendee | created | `{"type":"status_equals","status":"waiting_list"}` | `{"template_slug":"event_waiting_list_confirmation","channels":["sms","email"],"recipient_type":"trigger_lead"}` |

### 12.5 Message Log Improvements

**`crm-messaging-broadcast.js` — `loadLog()` change:**

Before:
```javascript
var q = sb.from('crm_message_log').select('id, lead_id, channel, content, status, created_at');
```

After:
```javascript
var q = sb.from('crm_message_log').select('id, lead_id, channel, content, status, error_message, created_at, crm_leads(full_name, phone), crm_message_templates(name, slug)');
```

This uses Supabase's FK-based JOIN syntax to pull lead name/phone and template
name in the same query.

**`renderLogTable()` change:**

Add columns: "ליד" (lead name), "טלפון" (phone), "תבנית" (template name).
Content column shows first ~40 chars as preview.
Each row has a `click` listener that toggles an expanded section below the row
showing full content, error_message (if present), and all metadata.

### 12.6 Per-Lead Message History

**`crm-leads-detail.js` — "הודעות" tab:**

Replace the `'היסטוריית הודעות — בקרוב'` placeholder (line 112) with a function
that queries `crm_message_log` filtered by the lead's ID:

```javascript
var q = sb.from('crm_message_log')
  .select('id, channel, content, status, error_message, created_at, crm_message_templates(name)')
  .eq('tenant_id', getTenantId())
  .eq('lead_id', leadId)
  .order('created_at', { ascending: false })
  .limit(50);
```

Render as a simple list: date, channel badge, status chip, content preview (first
~60 chars). Click to expand full content. Reuse the same CSS patterns from the
Messaging Hub log table for visual consistency.

### 12.7 Browser QA Protocol

After each commit group, verify on `localhost:3000/crm.html?t=demo`:

1. **After Commit 1 (engine):** `typeof CrmAutomation.evaluate` → `'function'`
2. **After Commit 2+3 (refactor):** Change an event status → messages dispatched
   (verify via `crm_message_log` SQL). Register a lead → confirmation dispatched.
   These should work identically to P5.5 behavior but through the rule engine.
3. **After Commit 4 (seed):** כללי אוטומטיה sub-tab shows ≥10 rules in the table.
4. **After Commit 5 (rules UI):** No amber banner. "+ כלל חדש" opens wizard with
   trigger type dropdown, condition selector, recipient type dropdown.
5. **After Commit 6 (log):** היסטוריה sub-tab shows lead name, phone, template
   per row. Click a row → expanded view with full content.
6. **After Commit 7 (lead detail):** Click a lead → detail modal → "הודעות" tab
   shows that lead's message history (not "בקרוב").

**Test data cleanup:** After all QA, clean up any test messages:
```sql
DELETE FROM crm_message_log WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
-- (Same cleanup as P6)
```

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rule evaluation slower than hardcoded dispatch | LOW | LOW | Rules query is a small table (~10 rows for demo). Fire-and-forget pattern unchanged. |
| `crm-event-actions.js` exceeds 350 lines after refactor | LOW | MEDIUM | Dispatch logic moves OUT (to engine) — file should shrink. If it grows, split per §5 trigger #2. |
| `crm-messaging-broadcast.js` exceeds 350 lines with log improvements | MEDIUM | MEDIUM | Currently ⚠️318 lines. Log expansion adds ~30-50 lines. May need to extract log rendering to a new file. §5 trigger #2 catches this. |
| Supabase JOIN syntax for log query doesn't work with `crm_leads` FK | LOW | LOW | `crm_message_log.lead_id` references `crm_leads(id)` — standard FK JOIN. Tested pattern exists elsewhere in CRM. |
| `lead-intake` EF still sends hardcoded dispatch alongside rules | KNOWN | LOW | Out of scope. EF dispatch and rule-based dispatch are independent. No double-send because lead-intake fires server-side and rule engine fires client-side — different trigger points. |
| Existing rules in `crm_automation_rules` (from B5 manual entry) conflict with P8 seeds | LOW | LOW | Pre-flight: check existing rule count. If >0, clean or skip duplicates. |

---

## 14. `action_config` Schema Reference

For the executor — the `action_config` JSONB column in `crm_automation_rules`
stores the action parameters. Level 1 schema:

```json
{
  "template_slug": "event_registration_open",
  "channels": ["sms", "email"],
  "recipient_type": "tier2"
}
```

Fields:
- `template_slug` — base slug (without channel/language suffix). The engine
  composes the full slug per the existing `send-message` EF pattern:
  `${template_slug}_${channel}_${language}`.
- `channels` — array of channels to send on. Each generates a separate
  `CrmMessaging.sendMessage` call.
- `recipient_type` — who receives the message. Resolved by the engine's
  `resolveRecipients` function.
