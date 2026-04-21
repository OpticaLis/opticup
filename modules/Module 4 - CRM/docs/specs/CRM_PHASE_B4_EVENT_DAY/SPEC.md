# SPEC — CRM_PHASE_B4_EVENT_DAY

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B4_EVENT_DAY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-20
> **Module:** 4 — CRM
> **Phase:** B4 (Event Day Module — Check-in, Scheduled Times, Attendee Management)
> **Author signature:** Cowork strategic session, Daniel present
> **Execution target:** Claude Code on Windows desktop (NOT Cowork)

---

## 1. Goal

Add an **Event Day Mode** to the CRM — a dedicated operational screen for
managing a live event. When Daniel opens an event that has status
`registration_open`, a prominent "מצב יום אירוע" button appears in the
event detail modal. Clicking it opens a full-page Event Day view with:

1. **Check-in panel** — search by name/phone, one-click check-in using the
   existing `check_in_attendee` RPC
2. **Scheduled times board** — visual timeline of attendees' scheduled slots
3. **Live stats bar** — real-time counters (checked in / total registered / purchases)
4. **Attendee management** — update status, mark purchase amount, toggle
   coupon sent, mark booking fee paid

After this SPEC, Daniel can run SuperSale Event #23 (April 25) entirely from
the CRM — no Monday.com needed for event-day operations.

---

## 2. Background & Motivation

Phase B3 built a read-only CRM UI. The event detail modal shows attendees but
cannot modify them. Event #23 is 5 days away — Daniel needs:
- Check people in as they arrive (currently done in Monday)
- See who's scheduled for which time slot
- Mark purchases and coupon status in real time
- See live attendance stats during the event

The CRM schema already supports all of this:
- `check_in_attendee` RPC exists (Phase A, tested)
- `crm_event_attendees` has `checked_in_at`, `scheduled_time`, `purchase_amount`,
  `coupon_sent`, `booking_fee_paid` columns
- `v_crm_event_attendees_full` view joins attendee + lead + event data

This SPEC builds the UI layer on top of the existing schema. **It writes to
the DB** — specifically attendee-level fields via targeted updates. This is
the first CRM SPEC with write operations.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify | Type |
|---|-----------|---------------|--------|------|
| 1 | New JS files in `modules/crm/` | 3–4 files (see §8) | `ls modules/crm/crm-event-day*.js \| wc -l` | structural |
| 2 | Each new JS file ≤ 350 lines | Max 350 per file | `wc -l modules/crm/crm-event-day*.js` | structural |
| 3 | No new HTML files (Event Day is a JS-driven view within crm.html) | 0 new HTML | `git diff --name-only` | structural |
| 4 | `crm.html` modified: +1 section for Event Day | `tab-event-day` section exists | `grep 'tab-event-day' crm.html` | structural |
| 5 | `css/crm.css` modified: Event Day styles added | `crm-eventday` class exists | `grep 'crm-eventday' css/crm.css` | structural |
| 6 | Event detail modal shows "מצב יום אירוע" button | Button in modal for open events | Browser / code grep | behavioral |
| 7 | Check-in: search finds attendee by name | Type partial name → filtered results | Browser | behavioral |
| 8 | Check-in: search finds attendee by phone | Type partial phone → filtered results | Browser | behavioral |
| 9 | Check-in: click "כניסה" calls `check_in_attendee` RPC | RPC called, `checked_in_at` set | DB verify after test | behavioral |
| 10 | Check-in: already checked-in attendee shows ✅ + timestamp | No double check-in | Browser | behavioral |
| 11 | Scheduled times board renders time slots | Attendees grouped by `scheduled_time` | Browser | behavioral |
| 12 | Live stats bar shows counts | Checked-in / Registered / Purchased counts | Browser | behavioral |
| 13 | Attendee row: update purchase amount | `purchase_amount` saved to DB | DB verify | behavioral |
| 14 | Attendee row: toggle coupon sent | `coupon_sent` + `coupon_sent_at` saved | DB verify | behavioral |
| 15 | Attendee row: mark booking fee paid | `booking_fee_paid` saved | DB verify | behavioral |
| 16 | `writeLog()` called on every write operation | Activity log entry created | `grep writeLog modules/crm/crm-event-day*.js` | structural |
| 17 | All new `.select()` include tenant_id filter | Defense in depth (Rule 22) | `grep -c tenant_id modules/crm/crm-event-day*.js` | structural |
| 18 | Branch clean after final commit | `develop`, clean | `git status` | structural |
| 19 | Commits produced | 3–5 commits | `git log --oneline` | structural |
| 20 | All new JS files pass syntax check | 0 errors | `node --check modules/crm/crm-event-day*.js` | structural |

**Criteria 6–15 are behavioral** — require a browser or DB query to verify.
If Chrome DevTools is not available on the target machine, defer these to
Daniel's manual QA and document in EXECUTION_REPORT §1.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Create new files: `modules/crm/crm-event-day*.js`
- Modify `crm.html` to add the Event Day tab section
- Modify `css/crm.css` to add Event Day styles
- Modify `modules/crm/crm-events-detail.js` to add "מצב יום אירוע" button
- Run the `check_in_attendee` RPC on **demo tenant** for testing
- Run `.update()` on `crm_event_attendees` for **demo tenant** fields:
  `purchase_amount`, `coupon_sent`, `coupon_sent_at`, `booking_fee_paid`,
  `status` — but ONLY via specific update helpers, never raw SQL
- Call `writeLog()` / `ActivityLog.write()` for audit trail
- Use `escapeHtml()` on all user-facing data (Rule 8)
- Follow existing CRM patterns from B3 code

### What REQUIRES stopping and reporting

- ANY write to Prizma tenant (`6ad0781b-...`) — use demo only for testing
- ANY modification to tables/schema (DDL) — this is a UI SPEC
- ANY modification to shared files (`js/shared.js`, `shared/js/*`, `shared/css/*`)
- ANY modification to files outside CRM scope
- ANY new RPC or View creation
- If `check_in_attendee` RPC returns unexpected errors

---

## 5. Stop-on-Deviation Triggers

- If any new JS file exceeds 350 lines → split before continuing
- If `crm.html` exceeds 200 lines after modifications → stop and evaluate
- If the `check_in_attendee` RPC doesn't exist or has different params than
  documented → STOP (schema drift)
- If `v_crm_event_attendees_full` is missing any column referenced in §9 → STOP
- If any write to Prizma tenant occurs accidentally → STOP, rollback, report

---

## 6. Rollback Plan

New files: delete. Modified files:
- `crm.html` — `git checkout crm.html`
- `css/crm.css` — `git checkout css/crm.css`
- `modules/crm/crm-events-detail.js` — `git checkout modules/crm/crm-events-detail.js`

Any DB writes during testing are on demo tenant only — reversible via
`UPDATE crm_event_attendees SET checked_in_at = NULL, status = 'registered' WHERE tenant_id = '8d8cfa7e-...'`.

---

## 7. Out of Scope

- **Messaging Hub** — no WhatsApp/SMS send functionality (Phase B5)
- **CX Survey UI** — no survey creation/management screen (Phase B5+)
- **QR code generation** — the check-in uses name/phone search, not QR scan
  (QR is a future enhancement when the storefront registration flow is built)
- **New lead creation** — walk-ins are handled by searching existing leads only.
  If someone arrives who isn't in the system, Daniel adds them in Monday for
  now. Lead creation UI is a future SPEC.
- **Event creation/editing** — events are created via Monday sync. Event CRUD
  in the CRM is a future SPEC.
- **Make/Monday integration** — no webhook triggers (Phase B5)
- **Storefront repo** — no changes
- **Demo tenant seeding** — executor should verify demo has event data; if not,
  skip behavioral testing and note in FINDINGS

---

## 8. File Plan

### New files

```
modules/crm/crm-event-day.js       — Event Day main view: layout, stats bar, tab switching
modules/crm/crm-event-day-checkin.js — Check-in panel: search, check-in button, RPC call
modules/crm/crm-event-day-schedule.js — Scheduled times board: time-slot grouping
modules/crm/crm-event-day-manage.js — Attendee management: inline edit purchase/coupon/fee
```

Total: 4 new JS files.

### Modified files

```
crm.html                            — Add <section id="tab-event-day"> + script tags
css/crm.css                         — Add Event Day styles (stats bar, check-in, schedule)
modules/crm/crm-events-detail.js    — Add "מצב יום אירוע" button to event modal
modules/crm/crm-init.js             — Add 'event-day' to showCrmTab routing
```

---

## 9. UI Specification

### 9.1 Entry Point — Event Detail Modal Button

In the existing event detail modal (from `crm-events-detail.js`), add a
prominent button when the event status is `registration_open` or `completed`:

```
┌─────────────────────────────────────────────────────┐
│  📅 אירוע #23 — SuperSale אפריל 2026         [✕]   │
├─────────────────────────────────────────────────────┤
│  [existing detail content...]                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  🎯  מצב יום אירוע  — כניסה למסך ניהול יום   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

Clicking the button:
1. Closes the modal
2. Switches to the `event-day` tab
3. Loads Event Day view for this specific event

### 9.2 Event Day — Main Layout

```
┌─────────────────────────────────────────────────────┐
│ ◀ חזרה לאירועים  │  📅 אירוע #23 — SuperSale אפריל │
├─────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │ 12/84  │ │  8     │ │ ₪9,600 │ │  72    │        │
│ │ נכנסו  │ │ רכשו   │ │ הכנסות │ │ ממתינים│        │
│ └────────┘ └────────┘ └────────┘ └────────┘        │
├─────────────────────────────────────────────────────┤
│ Sub-tabs:  ✅ כניסות  |  🕐 זמנים  |  📋 ניהול     │
├─────────────────────────────────────────────────────┤
│                                                      │
│              [Sub-tab Content Area]                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

The header shows the event name + number. The stats bar updates after every
write operation (re-fetch from `v_crm_event_stats`).

**Back button:** returns to the Events tab (`showCrmTab('events')`).

### 9.3 Sub-tab 1 — Check-in (כניסות)

**Data source:** `v_crm_event_attendees_full` for this event

```
┌─────────────────────────────────────────────────────┐
│ 🔍 חיפוש: [_________________________]               │
├─────────────────────────────────────────────────────┤
│  שם           │ טלפון         │ זמן מתוזמן │ סטטוס │ פעולה    │
│───────────────┼───────────────┼────────────┼───────┼──────────│
│  ישראל כהן   │ 050-717-5675  │ 10:00      │ 🔵 רשום│ [כניסה]  │
│  אלנה ברקי   │ 054-221-0500  │ 10:00      │ ✅ נכנס│ 10:15    │
│  מוחמד חסן   │ 052-880-1234  │ 10:30      │ 🔵 רשום│ [כניסה]  │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Search filters by name OR phone (client-side, same pattern as leads tab)
- "כניסה" button calls `check_in_attendee` RPC
- On success: button changes to ✅ + check-in timestamp
- On "already_checked_in": show toast with original check-in time
- On error: show error toast
- After check-in: refresh stats bar counters
- Sort: by scheduled_time, then by full_name

### 9.4 Sub-tab 2 — Scheduled Times (זמנים)

**Data source:** same attendees, grouped by `scheduled_time`

```
┌─────────────────────────────────────────────────────┐
│  🕐 10:00 (8 משתתפים — 3 נכנסו)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ ✅ ישראל כהן (10:15)  │ 🔵 דנה לוי           │   │
│  │ ✅ אלנה ברקי (10:12)  │ 🔵 יוסי מזרחי        │   │
│  │ ✅ רון כהן (10:08)     │ 🔵 מאיה שלום          │   │
│  │                        │ 🔵 עדי פרץ            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  🕐 10:30 (6 משתתפים — 0 נכנסו)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ 🔵 מוחמד חסן  │ 🔵 שרה אברהם                │   │
│  │ ...                                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ⚠️ ללא זמן מתוזמן (12 משתתפים)                     │
│  [...]                                               │
└─────────────────────────────────────────────────────┘
```

**Implementation:**
- Group attendees by `scheduled_time` value
- Within each group, checked-in first (sorted by check-in time), then pending
- "ללא זמן מתוזמן" group at the bottom for NULL `scheduled_time`
- Each name is a chip/badge — green if checked in, blue if registered
- Click on a name → check them in (same RPC as the check-in tab)

### 9.5 Sub-tab 3 — Attendee Management (ניהול)

**Data source:** `v_crm_event_attendees_full` + direct writes to `crm_event_attendees`

```
┌─────────────────────────────────────────────────────┐
│ 🔍 חיפוש: [__________]  סטטוס: [▼ הכל]             │
├─────────────────────────────────────────────────────┤
│  שם          │ טלפון    │ סטטוס │ רכישה  │ קופון │ דמי הזמנה │
│──────────────┼──────────┼───────┼────────┼───────┼───────────│
│  ישראל כהן  │050-717..│ ✅ נכנס│₪1,200  │ ✅    │ ✅         │
│                         │       │[ערוך]  │[שלח]  │[שולם]     │
│──────────────┼──────────┼───────┼────────┼───────┼───────────│
│  אלנה ברקי  │054-221..│ ✅ נכנס│ —      │ ❌    │ ✅         │
│                         │       │[ערוך]  │[שלח]  │           │
└─────────────────────────────────────────────────────┘
```

**Editable fields (per attendee row):**

1. **Purchase amount** — click "ערוך" → inline input → save
   - Writes `purchase_amount` to `crm_event_attendees`
   - Also updates `status` to `'purchased'` if amount > 0
   - Calls `writeLog()` with action `crm.attendee.purchase_update`

2. **Coupon sent** — click "שלח" toggle
   - Writes `coupon_sent = true, coupon_sent_at = now()`
   - Calls `writeLog()` with action `crm.attendee.coupon_sent`
   - Toggle is one-way (can mark sent, not un-sent)

3. **Booking fee paid** — click "שולם" toggle
   - Writes `booking_fee_paid = true`
   - Calls `writeLog()` with action `crm.attendee.fee_paid`
   - Toggle is one-way (paid, not un-paid)

**All writes use `sb.from('crm_event_attendees').update({...}).eq('id', attendeeId).eq('tenant_id', getTenantId())`** — defense in depth.

**PIN verification:** NOT required for these updates. They are staff-level
operational actions during a live event. PIN was already verified at login.

---

## 10. Technical Patterns

### 10.1 Data Loading

The Event Day view loads all attendees for ONE event on entry, then operates
on the in-memory array. Writes go to the DB and also update the local array.

```js
// Load attendees for a specific event
const attendees = await sb.from('v_crm_event_attendees_full')
  .select('*')
  .eq('event_id', eventId)
  .eq('tenant_id', getTenantId())
  .eq('is_deleted', false)
  .order('scheduled_time', { nullsFirst: false })
  .order('full_name');
```

### 10.2 Check-in via RPC

```js
const result = await sb.rpc('check_in_attendee', {
  p_tenant_id: getTenantId(),
  p_attendee_id: attendeeId
});
// result.data = { success: true, attendee_id, checked_in_at }
// or { success: false, error: 'already_checked_in', checked_in_at }
// or { success: false, error: 'attendee_not_found' }
```

### 10.3 Inline Updates

```js
// Update purchase amount
const { error } = await sb.from('crm_event_attendees')
  .update({ purchase_amount: amount, status: amount > 0 ? 'purchased' : undefined })
  .eq('id', attendeeId)
  .eq('tenant_id', getTenantId());

// writeLog for every mutation
if (window.ActivityLog) {
  ActivityLog.write({
    action: 'crm.attendee.purchase_update',
    entity_type: 'crm_event_attendees',
    entity_id: attendeeId,
    severity: 'info',
    metadata: { event_id: eventId, amount: amount }
  });
}
```

### 10.4 Stats Bar Refresh

After every write operation, re-fetch stats:
```js
const stats = await sb.from('v_crm_event_stats')
  .select('total_registered, total_attended, total_purchased, total_revenue')
  .eq('event_id', eventId)
  .eq('tenant_id', getTenantId())
  .single();
```

### 10.5 Tab System

Event Day is a hidden 4th tab in `crm.html` that doesn't appear in the main
nav. It's activated programmatically when the user clicks "מצב יום אירוע"
from the event detail modal. The back button returns to the Events tab.

```js
// In crm-events-detail.js — button click handler:
Modal.close();
window._currentEventDayId = eventId;
showCrmTab('event-day');
```

```js
// In crm-init.js — add to showCrmTab routing:
if (name === 'event-day' && typeof loadCrmEventDay === 'function') loadCrmEventDay();
```

The `event-day` tab is NOT shown in the nav buttons. Users enter it only
through the event modal button and exit via the back button.

### 10.6 Actual crm-init.js showCrmTab Pattern (VERIFIED)

The actual `showCrmTab` function in `crm-init.js` (lines 10-21) works as follows:
- Hides all `.tab` sections inside `#crm-main`
- Deactivates all `#crmNav button[data-tab]` buttons
- Shows the target `#tab-{name}` section
- Activates the matching nav button (if it exists — Event Day has no nav button, which is fine)
- Calls the appropriate loader function

The executor should add `'event-day'` to the routing in this function.

---

## 11. Commit Plan

- **Commit 1:** `feat(crm): add Event Day view layout and stats bar`
  Files: `crm.html` (add section), `css/crm.css` (add styles),
  `modules/crm/crm-event-day.js` (main view), `modules/crm/crm-init.js` (routing)

- **Commit 2:** `feat(crm): add Event Day check-in panel with RPC`
  Files: `modules/crm/crm-event-day-checkin.js`

- **Commit 3:** `feat(crm): add scheduled times board`
  Files: `modules/crm/crm-event-day-schedule.js`

- **Commit 4:** `feat(crm): add attendee management (purchase, coupon, fee)`
  Files: `modules/crm/crm-event-day-manage.js`,
  `modules/crm/crm-events-detail.js` (add entry button)

---

## 12. Dependencies / Preconditions

- **Node.js** on the machine (v24.14.0) — for git/verify only
- **No build step** — Vanilla JS
- **Supabase MCP** connected (for RPC testing on demo tenant)
- Branch: `develop`
- Machine: Windows desktop
- **Pre-verified schema objects:**
  - `check_in_attendee(p_tenant_id, p_attendee_id)` RPC — exists (Phase A)
  - `v_crm_event_attendees_full` view — exists, includes `scheduled_time`,
    `checked_in_at`, `purchase_amount`, `coupon_sent`, `booking_fee_paid`
  - `crm_event_attendees` table — writable, has all required columns
  - `v_crm_event_stats` view — exists (used for stats bar)
- **Demo tenant** UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
  - **PRE-FLIGHT CHECK:** executor must verify demo tenant has at least 1 event
    with attendees. If not — create a minimal test event + 3 attendees via
    SQL INSERT on demo tenant before building UI. Document as Decision, not
    Deviation.
- **Existing CRM code available:**
  - All `modules/crm/crm-*.js` files from Phase B3
  - `CrmHelpers.*` namespace (phone format, currency, status badges, etc.)
  - `window.CRM_STATUSES` cache
  - `showCrmTab()`, `ensureCrmStatusCache()`, `showCrmError()`
- **Chrome DevTools:** If available (`--remote-debugging-port=9222`), use for
  behavioral criteria 6–15. If not available, defer to manual QA and note in
  EXECUTION_REPORT.
- **Pending commits from Cowork:** Before starting execution, commit
  the following files that are saved on disk but not yet committed:
  1. `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B3_UI_CORE/FOREMAN_REVIEW.md`
  2. `css/crm.css` (nav#crmNav fix)
  3. `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` (new)
  4. `modules/Module 4 - CRM/docs/CHANGELOG.md` (new)
  5. `modules/Module 4 - CRM/docs/MODULE_MAP.md` (new)
  6. This SPEC file itself
  Commit these first as `docs(crm): add B3 FOREMAN_REVIEW, fix nav CSS, create Module 4 docs`
  + `docs(crm): add CRM_PHASE_B4_EVENT_DAY SPEC`

---

## 13. Lessons Already Incorporated

- FROM `CRM_PHASE_B3/FOREMAN_REVIEW.md` Proposal 1 → "Mandatory file-inspection
  before writing SPEC code blocks" — APPLIED: I verified the actual
  `showCrmTab` function structure in `crm-init.js` (lines 10-21), the actual
  `crm.html` tab/section pattern (lines 38-80), and the actual `css/crm.css`
  class naming convention before writing §9 and §10. Documented in §10.6.
- FROM `CRM_PHASE_B3/FOREMAN_REVIEW.md` Proposal 2 → "Chrome DevTools
  precondition" — APPLIED: Success criteria table (§3) has a "Type" column
  classifying each criterion as structural or behavioral. §12 explicitly
  notes Chrome is optional and behavioral criteria can be deferred.
- FROM `CRM_PHASE_B2/FOREMAN_REVIEW.md` Proposal 1 → "Bulk DML transport
  guidance" — NOT APPLICABLE (no bulk imports).
- FROM `CRM_PHASE_B1/FOREMAN_REVIEW.md` Proposal 1 → "Verify execution-
  environment preconditions" — APPLIED: §12 confirms Node.js v24.14.0 on
  Windows desktop (verified in B3 execution). No Python needed.
- Cross-Reference Check completed 2026-04-20 against GLOBAL_MAP.md +
  GLOBAL_SCHEMA.sql + FILE_STRUCTURE.md + MODULE_MAP.md: **0 collisions**.
  No existing `crm-event-day` prefixed files or functions. All names are new.

---

## 14. Execution Notes

### Write Safety

This is the first CRM SPEC with DB writes. Rules:
- **Rule 2:** `writeLog()` / `ActivityLog.write()` on every mutation
- **Rule 7:** All writes go through `sb.from().update()` — never raw SQL
- **Rule 22:** Every `.update()` includes `.eq('tenant_id', getTenantId())`
- **Rule 8:** All user input (purchase amount) must be sanitized — numeric
  validation before write, `escapeHtml()` on display
- **Check-in uses the existing RPC** — do NOT implement check-in as a raw
  `.update()`. The RPC handles locking, double-check-in prevention, and
  timestamp setting atomically.

### Demo Tenant Testing

If the executor can access Supabase MCP:
1. Verify demo tenant has events: `SELECT count(*) FROM crm_events WHERE tenant_id = '8d8cfa7e-...'`
2. Verify demo tenant has attendees: `SELECT count(*) FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-...'`
3. If count = 0, seed minimal test data (1 event + 3 attendees) — this is
   authorized DML on demo tenant only.

### RTL & Existing Patterns

Follow all CRM CSS patterns from B3:
- `direction: rtl` inherited from `<html dir="rtl">`
- Status badges via `CrmHelpers.statusBadgeHtml()`
- Phone formatting via `CrmHelpers.formatPhone()`
- Currency via `CrmHelpers.formatCurrency()`
- All tables use `crm-table` class
- All cards use `card` class

### Script Load Order in `crm.html`

Add new scripts AFTER the existing CRM scripts, BEFORE `</body>`:
```
<script src="modules/crm/crm-event-day.js"></script>
<script src="modules/crm/crm-event-day-checkin.js"></script>
<script src="modules/crm/crm-event-day-schedule.js"></script>
<script src="modules/crm/crm-event-day-manage.js"></script>
```

**IMPORTANT:** This is the ACTUAL script order pattern from `crm.html`. The
existing CRM scripts are at lines 97-103. Add the new scripts at lines 104-107
(before the `</body>` at line 105 currently).
