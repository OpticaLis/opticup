# SPEC — P12_ACTIVITY_LOG

> **Location:** `modules/Module 4 - CRM/go-live/specs/P12_ACTIVITY_LOG/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-23
> **Module:** 4 — CRM
> **Phase:** Go-Live P12
> **Author signature:** Cowork session happy-elegant-edison

---

## 1. Goal

Two tracks:

1. **Quick fix: board selection as radio** — the broadcast wizard currently
   allows selecting both "לידים נכנסים" AND "רשומים" simultaneously. Daniel
   says this causes duplicates and there's no reason to send to both boards
   at once. Change board checkboxes to radio buttons: incoming OR registered
   OR by-event. One choice only.

2. **Activity Log tab** — add a new top-level CRM tab ("לוג פעילות") showing
   a chronological feed of everything happening in the CRM module: lead
   created, lead edited, status changed, event created/updated, message sent,
   broadcast fired, rule toggled, template saved. Like Monday.com's activity
   log. The `activity_log` table already exists (Module 1.5), and several CRM
   files already write to it — but many critical actions are NOT logged yet.
   This SPEC wires logging into all missing actions AND builds the viewer.

---

## 2. Background & Motivation

### Board Radio Fix (Daniel's QA, 2026-04-23)

Daniel: "צריך להגביל או שליחת הודעה לבורד ראשון או לשני או לאירועים (למנוע
כפילות ואין סיבה לשלוח לכמה בורדים במקביל)."

Current state: `crm-broadcast-filters.js:48-67` renders board selection as
checkboxes (`<input type="checkbox">`), allowing both to be checked. The
`allBoardStatuses(selectedBoards)` function merges status lists from both
boards. This can cause the same lead to be counted twice if their status
exists in both tier arrays (unlikely but architecturally wrong), and more
importantly, Daniel says it's confusing and unnecessary.

Fix: change to radio buttons with 3 options: "לידים נכנסים" / "רשומים" /
"לפי אירוע". When "לפי אירוע" is selected, the event multi-select is the
primary filter and board/status filters are hidden.

### Activity Log (Daniel's QA, 2026-04-23)

Daniel: "חייב שיהיה לוגים כללים שזה מסך עם כל הלוגים של המודול. כל מה
שקורה (כמו במאנדיי ומערכות ניהול אחרות)."

**Current state of logging in CRM files:**

| File | Actions logged | Actions NOT logged |
|------|---------------|-------------------|
| `crm-messaging-templates.js` | create, update, deactivate template | — (complete) |
| `crm-messaging-rules.js` | create, update, toggle rule | — (complete) |
| `crm-messaging-broadcast.js` | broadcast.send | — (complete) |
| `crm-event-day-manage.js` | attendee check-in, status change | — (complete) |
| `crm-event-day-checkin.js` | check-in actions | — (complete) |
| `crm-event-day-schedule.js` | schedule publish | — (complete) |
| `crm-init.js` | page open | — |
| **`crm-lead-actions.js`** | — | **create lead, update lead, delete lead, change status** |
| **`crm-lead-modals.js`** | — | **create lead (from modal), edit lead (from modal)** |
| **`crm-event-actions.js`** | — | **create event, update event, delete event, change event status** |
| **`crm-leads-detail.js`** | — | **add note, view detail** |
| **`crm-incoming-tab.js`** | — | **move to registered (status change)** |
| **`crm-leads-tab.js`** | — | **status change from dropdown** |

**Evidence:** `grep -rn "ActivityLog" modules/crm/` — only 7 files have it.
The 6 files above (lead-actions, lead-modals, event-actions, leads-detail,
incoming-tab, leads-tab) have zero `ActivityLog` calls.

**`activity_log` table schema** (from M1.5 `db-schema.sql`):
```sql
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID,
  user_id UUID REFERENCES employees(id),
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'warning', 'error', 'critical')),
  action TEXT NOT NULL,          -- e.g., 'crm.lead.create'
  entity_type TEXT NOT NULL,     -- e.g., 'crm_leads'
  entity_id TEXT,                -- UUID of the affected row
  details JSONB DEFAULT '{}',    -- metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Indexes exist on `(tenant_id, created_at DESC)`, `(tenant_id, entity_type, entity_id)`,
and `(tenant_id, action)`. RLS with JWT tenant isolation is active.

---

## 3. Success Criteria (Measurable)

### Track A — Board Radio Fix (quick fix)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Board selection uses radio buttons, not checkboxes | `<input type="radio" name="wiz-board">` | Code review: `crm-broadcast-filters.js` |
| 2 | Three options: "לידים נכנסים" / "רשומים" / "לפי אירוע" | Radio group with 3 values | Code review |
| 3 | Default selection: "לידים נכנסים" | First radio checked on wizard open | Code review |
| 4 | When "לפי אירוע" selected, event list visible, status checkboxes hidden | Conditional rendering | Code review |
| 5 | When board selected, status checkboxes show only that board's statuses | `boardStatuses(selectedBoard)` | Code review |
| 6 | Cannot select both boards simultaneously | Radio = mutual exclusion | Code review |
| 7 | Recipient count updates correctly after fix | Same `buildLeadIds` logic with single board | Code review |

### Track B — Wire ActivityLog into Missing CRM Actions

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 8 | `crm-lead-actions.js` logs `crm.lead.create` | `ActivityLog.write({action:'crm.lead.create', entity_type:'crm_leads', entity_id:id, details:{name, phone}})` | `grep ActivityLog crm-lead-actions.js` → hit |
| 9 | `crm-lead-actions.js` logs `crm.lead.update` | Similar pattern | grep |
| 10 | `crm-lead-actions.js` logs `crm.lead.delete` (soft-delete) | Similar pattern | grep |
| 11 | `crm-lead-actions.js` logs `crm.lead.status_change` | Includes `from` and `to` status in details | grep |
| 12 | `crm-event-actions.js` logs `crm.event.create` | Similar pattern | grep |
| 13 | `crm-event-actions.js` logs `crm.event.update` | Similar pattern | grep |
| 14 | `crm-event-actions.js` logs `crm.event.delete` | Similar pattern | grep |
| 15 | `crm-event-actions.js` logs `crm.event.status_change` | Includes `from` and `to` status | grep |
| 16 | `crm-leads-detail.js` logs `crm.lead.note_add` | Logs when a note is added | grep |
| 17 | `crm-incoming-tab.js` logs `crm.lead.move_to_registered` | Logs the tier transition | grep |
| 18 | `crm-leads-tab.js` logs `crm.lead.status_change` from status dropdown | Same pattern as #11 | grep |
| 19 | All ActivityLog calls are async, non-blocking (fire-and-forget) | `try { ActivityLog.write(...) } catch(_){}` pattern | Code review |
| 20 | No new `logWrite` IIFE helpers (use `ActivityLog.write` directly) | Avoid rule-21 false positives from P11 Finding 2 | `grep 'function logWrite' crm-lead-actions.js` → 0 |

### Track C — Activity Log Tab (Viewer)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 21 | New nav item in `crm.html` sidebar: "לוג פעילות" with icon | `<button ... data-tab="activity-log">` | Code review of `crm.html` |
| 22 | New tab section in `crm.html`: `<section id="tab-activity-log">` | Section exists | Code review |
| 23 | New file: `modules/crm/crm-activity-log.js` | File exists, ≤ 350 lines | `ls` + `wc -l` |
| 24 | `crm.html` loads the new script | `<script src="modules/crm/crm-activity-log.js">` | Code review |
| 25 | Tab renders a filterable table of `activity_log` rows | Query: `sb.from('activity_log').select(...)` with CRM entity types | Code review |
| 26 | Columns: תאריך (HH:MM), פעולה, סוג, ישות, משתמש, פרטים | Table headers | Code review |
| 27 | Filter by action type (dropdown) | All / leads / events / messaging / rules / templates | Code review |
| 28 | Filter by date range (from/to) | Date inputs | Code review |
| 29 | Filter by entity type (dropdown) | crm_leads / crm_events / crm_automation_rule / crm_message_template / crm_broadcast / all | Code review |
| 30 | Pagination (50 per page) | Same pattern as `crm-messaging-log.js` | Code review |
| 31 | Action names displayed in Hebrew | Map: `crm.lead.create` → "יצירת ליד", etc. | Code review |
| 32 | Click on row expands to show full `details` JSON (formatted) | Expandable row pattern from `crm-messaging-log.js` | Code review |
| 33 | Log entries show employee name (not just ID) | JOIN `employees(full_name)` or lookup from cache | Code review |
| 34 | Page loads with recent 50 entries, sorted newest first | `order('created_at', {ascending: false}).limit(50)` | Code review |
| 35 | Only CRM entity types shown (not inventory or other modules) | Filter: `.in('entity_type', ['crm_leads','crm_events','crm_event_attendees','crm_automation_rule','crm_message_template','crm_broadcast','crm_message_log','crm'])` | Code review |

### Track D — Source Dropdown Quick Fix (from P11 Finding)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 36 | Source dropdown includes `supersale_form` with Hebrew label "טופס אתר" | Option in `crm-broadcast-filters.js` | Code review |
| 37 | `site` option removed or renamed to match actual data | No orphan option | Code review |

### Track E — Documentation & Quality

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 38 | SESSION_CONTEXT.md updated | P12 CLOSED | grep |
| 39 | Go-Live ROADMAP updated | P12 check | grep |
| 40 | All CRM JS files ≤ 350 lines | Rule 12 | `wc -l modules/crm/*.js` |
| 41 | CRM page loads with 0 new console errors | Pre-existing only | Code review |
| 42 | Commits produced | 5–10 | `git log --oneline` |

---

## 4. Autonomy Envelope

### MAXIMUM AUTONOMY — designed for unattended run.

Pre-authorized:
- Read/modify any file under `modules/crm/`
- Read/modify `crm.html` and `css/crm*.css`
- Create `modules/crm/crm-activity-log.js` (new file)
- Add `<script>` tag + nav item + tab section to `crm.html`
- Split files for Rule 12
- Commit and push to `develop`

### What REQUIRES stopping

- Modifying any Edge Function
- Schema changes (DDL)
- Files outside `modules/crm/`, `crm.html`, `css/crm*.css`, `modules/Module 4 - CRM/`
- Modifying `shared/js/activity-logger.js` (M1.5 shared component)
- Any merge to `main`

### DO NOT STOP once past pre-flight.

---

## 5. Stop-on-Deviation Triggers

1. If any file exceeds 350 lines and cannot be split → STOP
2. If `crm.html` fails to load → STOP
3. If `activity_log` table doesn't exist or has different schema → STOP
4. If adding the new tab breaks existing tab navigation → STOP

---

## 6. Rollback Plan

- Code only: `git revert` in reverse order.
- No DB changes. No EF changes.
- `crm.html` changes (nav item + section + script tag) revert cleanly.

---

## 7. Out of Scope

- Edge Function changes
- Schema changes (no ALTER TABLE)
- Modifying `shared/js/activity-logger.js`
- Prizma tenant operations
- MODULE_MAP / GLOBAL_MAP updates (Integration Ceremony)
- Writing logs from Edge Functions (send-message, lead-intake already have
  their own logging via `crm_message_log`)
- Real-time log streaming / WebSocket

---

## 8. Expected Final State

### New files
- `modules/crm/crm-activity-log.js` (~200-280 lines) — activity log tab renderer

### Modified files
- `crm.html` — add nav item + tab section + script tag
- `modules/crm/crm-broadcast-filters.js` (279L) — board radio fix + source dropdown fix
- `modules/crm/crm-lead-actions.js` (251L) — add ActivityLog calls (~+15 lines)
- `modules/crm/crm-event-actions.js` — add ActivityLog calls (~+15 lines)
- `modules/crm/crm-leads-detail.js` (344L) — add ActivityLog for note_add (~+3 lines)
  ⚠️ **Near Rule 12 ceiling (344 → ~347).** If this pushes past 350, defer
  the note_add log to the next detail-file split SPEC.
- `modules/crm/crm-incoming-tab.js` — add ActivityLog for move_to_registered (~+3 lines)
- `modules/crm/crm-leads-tab.js` — add ActivityLog for status_change (~+3 lines)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `modules/Module 4 - CRM/go-live/ROADMAP.md`

---

## 9. Commit Plan

- **Commit 1:** `fix(crm): change broadcast board selection to radio buttons`
  Files: `crm-broadcast-filters.js`
- **Commit 2:** `fix(crm): update source dropdown values to match Prizma data`
  Files: `crm-broadcast-filters.js`
  (may merge with Commit 1 — same file, related fix)
- **Commit 3:** `feat(crm): wire ActivityLog into lead + event actions`
  Files: `crm-lead-actions.js`, `crm-event-actions.js`, `crm-leads-detail.js`,
  `crm-incoming-tab.js`, `crm-leads-tab.js`
- **Commit 4:** `feat(crm): add activity log tab to CRM`
  Files: `crm-activity-log.js` (new), `crm.html`
- **Commit 5:** `test(crm): verify activity log tab renders with correct data`
  (no-op eligible)
- **Commit 6:** `docs(crm): mark P12 CLOSED`
  Files: SESSION_CONTEXT.md, ROADMAP.md
- **Commit 7:** `chore(spec): close P12_ACTIVITY_LOG with retrospective`
  Files: EXECUTION_REPORT.md, FINDINGS.md

Budget: 5–10 commits (no-op eligible commits may merge).

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verification |
|-----------|--------|-------------|
| P11 (Broadcast Upgrade) CLOSED | VERIFIED | FOREMAN_REVIEW.md written |
| `activity_log` table exists in Supabase | VERIFIED | Schema in M1.5 `db-schema.sql`, RLS active |
| `ActivityLog.write` global available | VERIFIED | `shared/js/activity-logger.js` loaded in all pages |
| `crm.html` has sidebar nav pattern | VERIFIED | 6 existing nav items, same `data-tab` + `showCrmTab` pattern |
| `employees` table for user name lookup | VERIFIED | `employees(full_name)` — can JOIN or cache |

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| P11 FR §6 Proposal 1 — Browser QA code-review criteria | All criteria use "Code review" as verify (no "Browser QA") | APPLIED |
| P11 FR §6 Proposal 2 — data taxonomy for filters | Source values documented from Prizma data | APPLIED |
| P11 Finding M4-DATA-P11-01 — source dropdown mismatch | Track D fixes it | APPLIED |
| P11 Finding M4-TOOL-P11-02 — rule-21 false positives | Criterion #20: no new `logWrite` IIFE helpers | APPLIED |
| P10 FR — root-cause-first SPEC | §2 traces each issue to exact code + line numbers | APPLIED |

**Cross-Reference Check 2026-04-23:**
- `crm-activity-log.js` — grepped, does not exist. 0 collisions.
- `renderActivityLog` / `CrmActivityLog` — grepped, 0 hits. Safe global names.
- `showCrmTab('activity-log')` — no existing tab uses this key.

---

## 12. Technical Design

### 12.1 Board Radio Fix (`crm-broadcast-filters.js`)

Replace checkbox rendering in `renderRecipientsStep` with radio buttons:

```javascript
var BOARD_DEFS = [
  { key: 'incoming',   label: 'לידים נכנסים' },
  { key: 'registered', label: 'רשומים' },
  { key: 'by_event',   label: 'לפי אירוע' }
];

// In renderRecipientsStep:
var boardRadios = BOARD_DEFS.map(function (b) {
  var checked = b.key === state.board ? ' checked' : '';
  return '<label class="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">' +
    '<input type="radio" name="wiz-board" value="' + b.key + '"' + checked + '>' +
    '<span class="text-sm font-medium">' + escape(b.label) + '</span>' +
  '</label>';
}).join('');
```

**State change:** `_wizard.boards` (array) → `_wizard.board` (string, default `'incoming'`).

**Conditional display:**
- When `board === 'incoming'` or `board === 'registered'`: show status checkboxes
  for that board's statuses. Hide event selection.
- When `board === 'by_event'`: show event multi-select + open-only toggle.
  Hide status checkboxes.

**`buildLeadIds` adjustment:**

```javascript
if (state.board === 'by_event') {
  // Filter by events only — no board/status filter
  // (existing multi-event logic applies)
} else {
  // Single board — get that board's statuses
  var boardSts = boardStatuses(state.board);
  if (state.statuses && state.statuses.length) {
    q = q.in('status', state.statuses);
  } else {
    q = q.in('status', boardSts);
  }
}
```

### 12.2 Source Dropdown Fix (`crm-broadcast-filters.js`)

**Current Prizma data (verified via grep of SESSION_CONTEXT.md + Finding M4-DATA-P11-01):**
- `supersale_form` (~650 rows)
- `manual` (~50 rows)
- `NULL` (~200 rows)

**Updated dropdown:**
```javascript
var SOURCE_OPTIONS = [
  { value: '',                label: 'כל המקורות' },
  { value: 'supersale_form',  label: 'טופס אתר' },
  { value: 'manual',          label: 'ידני' },
  { value: 'import',          label: 'ייבוא' }
];
```

Remove `site` and `other`. Add `supersale_form` with Hebrew label "טופס אתר".

### 12.3 ActivityLog Wiring

**Pattern to follow (matches existing CRM files, avoids rule-21 IIFE issues):**

```javascript
// Direct call, no wrapper function — avoids rule-21 false positives
if (window.ActivityLog && typeof ActivityLog.write === 'function') {
  try {
    ActivityLog.write({
      action: 'crm.lead.create',
      entity_type: 'crm_leads',
      entity_id: newLeadId,
      details: { full_name: name, phone: phone, source: source }
    });
  } catch (_) {}
}
```

**Actions to wire:**

| File | Function | Action string | Details |
|------|----------|--------------|---------|
| `crm-lead-actions.js` | `createManualLead` | `crm.lead.create` | `{full_name, phone, source:'manual'}` |
| `crm-lead-actions.js` | `updateLead` | `crm.lead.update` | `{full_name, phone, fields_changed:[...]}` |
| `crm-lead-actions.js` | `deleteLead` (if exists) | `crm.lead.delete` | `{full_name}` |
| `crm-lead-actions.js` | `changeLeadStatus` (if exists) | `crm.lead.status_change` | `{from, to, full_name}` |
| `crm-event-actions.js` | create event | `crm.event.create` | `{name, event_date}` |
| `crm-event-actions.js` | update event | `crm.event.update` | `{name, fields_changed:[...]}` |
| `crm-event-actions.js` | delete event | `crm.event.delete` | `{name}` |
| `crm-event-actions.js` | change event status | `crm.event.status_change` | `{from, to, name}` |
| `crm-leads-detail.js` | add note | `crm.lead.note_add` | `{lead_name, note_preview}` |
| `crm-incoming-tab.js` | move to registered | `crm.lead.move_to_registered` | `{full_name, phone}` |
| `crm-leads-tab.js` | status dropdown change | `crm.lead.status_change` | `{from, to, full_name}` |

**⚠️ `crm-leads-detail.js` is at 344 lines.** Adding 3 lines for note_add
logging brings it to ~347. If it would exceed 350, the executor should defer
this one log call to the next SPEC that splits lead-detail (already tracked
in P9 Finding M4-DEBT-P9-06).

### 12.4 Activity Log Tab

**`crm.html` additions:**

1. Nav item (after "יום אירוע"):
```html
<button class="crm-nav-item" data-tab="activity-log" onclick="showCrmTab('activity-log')">
  <span class="crm-nav-icon">📋</span>
  <span class="crm-nav-label">לוג פעילות</span>
</button>
```

2. Tab section:
```html
<section id="tab-activity-log" class="crm-tab">
  <div id="activity-log-host"></div>
</section>
```

3. Script tag (before `crm-init.js`):
```html
<script src="modules/crm/crm-activity-log.js"></script>
```

**`crm-activity-log.js` — new file (~200-280 lines):**

Structure mirrors `crm-messaging-log.js` (151L) which has the same pattern:
filters + table + pagination + expandable rows.

```javascript
(function () {
  'use strict';

  var ACTION_LABELS = {
    'crm.lead.create':            'יצירת ליד',
    'crm.lead.update':            'עדכון ליד',
    'crm.lead.delete':            'מחיקת ליד',
    'crm.lead.status_change':     'שינוי סטטוס ליד',
    'crm.lead.move_to_registered':'העברה לרשומים',
    'crm.lead.note_add':          'הוספת הערה',
    'crm.event.create':           'יצירת אירוע',
    'crm.event.update':           'עדכון אירוע',
    'crm.event.delete':           'מחיקת אירוע',
    'crm.event.status_change':    'שינוי סטטוס אירוע',
    'crm.broadcast.send':         'שליחת ברודקאסט',
    'crm.template.create':        'יצירת תבנית',
    'crm.template.update':        'עדכון תבנית',
    'crm.template.deactivate':    'ביטול תבנית',
    'crm.rule.create':            'יצירת כלל',
    'crm.rule.update':            'עדכון כלל',
    'crm.rule.toggle':            'שינוי סטטוס כלל',
    'crm.page.open':              'פתיחת עמוד CRM'
  };

  var ENTITY_LABELS = {
    'crm_leads':              'לידים',
    'crm_events':             'אירועים',
    'crm_event_attendees':    'משתתפים',
    'crm_automation_rule':    'כללי אוטומציה',
    'crm_message_template':   'תבניות',
    'crm_broadcast':          'שליחה ידנית',
    'crm':                    'כללי'
  };

  var CRM_ENTITY_TYPES = Object.keys(ENTITY_LABELS);

  var PAGE_SIZE = 50;
  var _rows = [];
  var _page = 1;
  var _expandedId = null;
  var _employees = {};

  async function renderActivityLog(host) {
    // Render filter bar + table container
    // Load employees cache for name display
    // Load log entries filtered by CRM entity types
    // Render table with Hebrew action labels
  }

  window.renderActivityLog = renderActivityLog;
  // Tab integration: showCrmTab('activity-log') calls renderActivityLog(host)
})();
```

**Filter bar:**
- Action type dropdown: הכל / לידים / אירועים / הודעות / כללים / תבניות
- Entity type dropdown (secondary): maps to `entity_type` column
- Date range: from/to date inputs
- Level filter: הכל / info / warning / error

**Table columns:**
| Column | Source | Format |
|--------|--------|--------|
| תאריך | `created_at` | `CrmHelpers.formatDateTime()` (includes HH:MM) |
| פעולה | `action` | Hebrew via `ACTION_LABELS` map |
| סוג | `entity_type` | Hebrew via `ENTITY_LABELS` map |
| ישות | `entity_id` | UUID (truncated to first 8 chars) or entity name from details |
| משתמש | `user_id` → JOIN `employees` | Employee full name |
| פרטים | `details` | First 60 chars of JSON.stringify, or specific field extraction |

**Expandable row (click to expand):**
Shows full `details` JSONB formatted as readable key-value pairs in Hebrew
where possible. Same expand/collapse pattern as `crm-messaging-log.js:114-128`.

**Employee cache:**
Load once on tab open: `sb.from('employees').select('id, full_name').eq('tenant_id', tid)`.
Store in `_employees` map for O(1) lookup. Small dataset (~5-20 employees per tenant).

### 12.5 Tab Integration in `crm-init.js`

The existing `showCrmTab` function in `crm-init.js` handles tab switching.
The executor must check how it dispatches to tab renderers and add the
activity-log case:

```javascript
if (tab === 'activity-log') {
  var host = document.getElementById('activity-log-host');
  if (host && typeof renderActivityLog === 'function') renderActivityLog(host);
}
```

### 12.6 Browser QA Protocol (code-review equivalents for overnight run)

1. **After Commit 1:** Confirm `crm-broadcast-filters.js` renders `<input type="radio" name="wiz-board">` (not checkbox). Confirm `state.board` is a string (not array). Confirm `buildLeadIds` uses single board value.
2. **After Commit 2:** Confirm source dropdown has `supersale_form` option, no `site` option.
3. **After Commit 3:** `grep -c ActivityLog modules/crm/crm-lead-actions.js` → ≥3. Same for `crm-event-actions.js`. Verify `crm-leads-detail.js` stays ≤350 lines.
4. **After Commit 4:** `ls modules/crm/crm-activity-log.js` exists. `grep 'activity-log' crm.html` → nav item + section + script tag. File ≤ 350 lines.
5. **After all commits:** `wc -l modules/crm/*.js` → all ≤ 350.
