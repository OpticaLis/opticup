# FINDINGS — P13_COMPREHENSIVE_QA

> **Location:** `modules/Module 4 - CRM/go-live/specs/P13_COMPREHENSIVE_QA/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Rules

1. One entry per finding. Never merge two unrelated issues.
2. Findings are things discovered OUTSIDE the SPEC's declared scope.
3. Do NOT fix findings inside this SPEC.
4. Every finding needs a **suggested next action**: NEW_SPEC / TECH_DEBT / DISMISS.
5. Severity labels: CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## Findings

### Finding 1 — `crm.lead.update` activity log lists all form fields, not only actually-changed ones

- **Code:** `M4-BUG-01`
- **Severity:** LOW
- **Discovered during:** Phase 1+2 (prior session) — preserved here for review
- **Location:** likely `modules/crm/crm-lead-modals.js` (lead edit save path) + `activity_log.details.fields_changed`
- **Description:** When editing a lead, the `fields_changed` array in `activity_log.details` contains all 6 form fields every time (`[6]`), not just the ones whose value actually changed. This makes audit logs noisy and useless for change tracking.
- **Expected vs Actual:**
  - Expected: `fields_changed: ["status", "city"]` (only the diff)
  - Actual: `fields_changed: [6]` (all fields always)
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Audit usability bug, not a correctness bug. Low traffic area.

---

### Finding 2 — Automation rules write to `crm_message_log` with `broadcast_id=NULL`; no `crm_broadcasts` row created

- **Code:** `M4-BUG-02`
- **Severity:** MEDIUM
- **Discovered during:** Step 13 (and re-confirmed in Steps 14, 15, 16, 22)
- **Location:** `modules/crm/crm-automation-engine.js` — dispatch path
- **Description:** When an automation rule fires, messages are written to `crm_message_log` directly with `broadcast_id=NULL` and no parent row appears in `crm_broadcasts`. This breaks the audit join between "which automated batch sent this message" and the individual message rows. Manual broadcasts (Messaging → Send) correctly create a parent broadcast row.
- **Reproduction:**
  ```sql
  SELECT id, lead_id, broadcast_id, channel FROM crm_message_log
  WHERE event_id='<p13-event-id>' ORDER BY created_at;
  -- All 10+ rows have broadcast_id=NULL
  SELECT COUNT(*) FROM crm_broadcasts
  WHERE tenant_id='8d8cfa7e-...' AND created_at >= '<event-create-time>';
  -- Returns 0 despite 5 rule firings
  ```
- **Expected vs Actual:**
  - Expected: Each rule-firing batch creates one `crm_broadcasts` row; individual `crm_message_log` rows point to it via `broadcast_id`.
  - Actual: `broadcast_id` is always NULL for automation-dispatched messages.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** Breaks audit trail for all automated messaging — the primary mechanism now that P8 is live. SaaS reporting will be blind to "how many automated messages did rule X send yesterday" without this.

---

### Finding 3 — Manual message dispatch from a lead card doesn't write client-side `activity_log` entry

- **Code:** `M4-BUG-03`
- **Severity:** INFO
- **Discovered during:** Phase 1+2 (prior session) — preserved here
- **Location:** `modules/crm/crm-messaging-send.js` or lead-detail SMS/WhatsApp button handler
- **Description:** Clicking the "SMS" or "WhatsApp" button in a lead card dispatches the message (row appears in `crm_message_log`), but no `activity_log` entry records that an operator manually sent a message. Contrast with the broadcast flow which does write `crm.broadcast.send`.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Small audit gap, not customer-facing. Easy to add.

---

### Finding 4 — Source dropdown shows raw slug `p5_5_seed` with no Hebrew label

- **Code:** `M4-L10N-01`
- **Severity:** LOW
- **Discovered during:** Phase 1+2 (prior session) — preserved here
- **Location:** `modules/crm/crm-leads-detail.js` source dropdown
- **Description:** Lead source values like `p5_5_seed`, `manual`, etc. render untranslated in the UI. Staff sees English slugs in an otherwise Hebrew interface.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Cosmetic; wire into the existing Hebrew-label map.

---

### Finding 5 — Pre-existing 404 on every page load

- **Code:** `M4-BUG-04`
- **Severity:** INFO
- **Discovered during:** Phase 1+2 (prior session) — preserved here
- **Location:** Unknown (single `Failed to load resource: 404` in console)
- **Description:** One resource 404 on every CRM page load; didn't investigate root cause.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Noise only. Worth a 5-minute network-tab triage next sprint.

---

### Finding 6 — `register_lead_to_event` RPC does not write an `activity_log` entry

- **Code:** `M4-BUG-05`
- **Severity:** MEDIUM
- **Discovered during:** Step 14 (this session)
- **Location:** RPC `register_lead_to_event` (DB) and/or `modules/crm/crm-event-actions.js` invocation
- **Description:** Registering a lead to an event creates the attendee row and fires rule #9 (confirmation messages), but no `crm.attendee.create` or `crm.event.register_lead` row lands in `activity_log`. This is a high-signal business action that should be audited.
- **Reproduction:**
  ```sql
  -- After registering a lead via UI:
  SELECT action FROM activity_log WHERE tenant_id='...'
   AND entity_type='crm_event_attendees'
   AND action LIKE 'crm.attendee.%create%';
  -- Returns 0 rows
  ```
- **Expected vs Actual:**
  - Expected: `crm.attendee.create` entry with `{lead_id, event_id, registered_by}` details.
  - Actual: No activity_log entry for the registration itself.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** Audit gap for a money-relevant action (registrations drive revenue). Pair with Finding 7.

---

### Finding 7 — Attendee activity_log entries (`checked_in`, `purchase_update`) have empty `details={}`

- **Code:** `M4-BUG-06`
- **Severity:** MEDIUM
- **Discovered during:** Step 16 (this session)
- **Location:** `modules/crm/crm-event-day-*.js` check-in and purchase handlers
- **Description:** `crm.attendee.checked_in` and `crm.attendee.purchase_update` fire correctly (first time ever — thanks to the ActivityLog shim), but their `details` JSON is always `{}`. Without context, the audit entries are barely useful: can't tell which lead, which event, what purchase amount.
- **Reproduction:**
  ```sql
  SELECT action, details FROM activity_log
  WHERE action IN ('crm.attendee.checked_in','crm.attendee.purchase_update');
  -- details is always {}
  ```
- **Expected vs Actual:**
  - Expected: `{lead_name, event_id, event_name, amount}` for purchase; `{lead_name, event_id, event_name, checked_in_at}` for check-in.
  - Actual: `{}`.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Quick win — the calling code already has `lead` and `event` in scope. One-line JSON add per call site.

---

### Finding 8 — `crm.event.status_change` activity_log has `{to, name}` but no `from` or `from_label` (inconsistent with `crm.lead.status_change`)

- **Code:** `M4-BUG-07`
- **Severity:** LOW
- **Discovered during:** Steps 13, 15, 16, 17 (this session)
- **Location:** Caller of `ActivityLog.write` for event status changes — likely `modules/crm/crm-event-actions.js`
- **Description:** The lead status-change audit entry includes `{to, from, to_label, from_label}`. The event status-change entry only has `{to, name}`. Inconsistent — reviewing event timeline from the log requires cross-referencing prior entries to infer the `from` state.
- **Expected vs Actual:**
  - Expected: `{from, to, from_label, to_label, event_number, name}`.
  - Actual: `{to, name}`.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Cheap consistency fix; mirrors pattern already in lead code.

---

### Finding 9 — Rule #4 (`event_closed` → audience `attendees`) does not fire for attendees whose status advanced past `registered` (e.g. `purchased`)

- **Code:** `M4-BUG-08`
- **Severity:** HIGH
- **Discovered during:** Step 17 (this session)
- **Location:** Audience resolver for `recipient_type='attendees'` — `modules/crm/crm-automation-engine.js`
- **Description:** Changing an event to `closed` status should send a wrap-up message to everyone who attended (rule #4). In practice, the audience filter excludes attendees whose status is `purchased` (and likely `attended` as well), so **the most engaged customers — those who bought — receive no post-event communication.** This is a business-logic regression: purchasers are the *primary* target for thank-you/repeat-visit comms.
- **Reproduction:**
  ```
  1. Create event, register lead, status→event_day, check-in, record purchase → attendee.status=purchased
  2. Status → closed
  3. Query crm_message_log for new rows tied to this event and this lead → 0 new rows
  ```
- **Expected vs Actual:**
  - Expected: All attendees (regardless of sub-status `registered | attended | purchased`) receive the wrap-up message.
  - Actual: Only attendees still in `registered` status receive; `attended` and `purchased` are silently excluded.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** HIGH because it silently breaks the highest-value customer touchpoint (post-purchase thank-you). Also decide: does the audience include `cancelled` / `no_show`? Currently unclear.

---

### Finding 10 — Activity Log tab renders empty on initial click; requires manual re-trigger

- **Code:** `M4-BUG-09`
- **Severity:** MEDIUM
- **Discovered during:** Step 18 (this session)
- **Location:** `modules/crm/crm-activity-log.js` (public `renderActivityLog`) + `modules/crm/crm-init.js:24-27` (tab-switch handler)
- **Description:** First click on the "לוג פעילות" nav button leaves `#activity-log-host` empty (innerHTML length 0). Calling `showCrmTab('activity-log')` again via console immediately renders the full 18KB of content. Reload + first-click pattern intermittently reproduces. Likely a race between `ActivityLog.write('crm.page.open', …)` (fires on nav) and the async `renderActivityLog` call chain.
- **Expected vs Actual:**
  - Expected: Click tab once → content renders within 500ms.
  - Actual: Click tab once → empty host; second invocation → renders.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** User-visible bug that erodes trust, but a reload + reclick recovers. Add a retry or ensure the promise chain actually awaits before setting the tab active.

---

### Finding 11 — `crm.attendee.*` activity_log actions have no Hebrew label and no category-filter group

- **Code:** `M4-L10N-02`
- **Severity:** LOW
- **Discovered during:** Step 18 (this session)
- **Location:** `modules/crm/crm-activity-log.js` — `ACTION_LABELS` dict (line 11–34) + `ACTION_GROUPS` (line 47–54)
- **Description:** `ACTION_LABELS` defines `crm.event.attendee_checkin` and `crm.event.attendee_status`, but the actual action slugs written to the DB are `crm.attendee.checked_in` and `crm.attendee.purchase_update`. Result: the UI shows the raw English slug (no Hebrew label) and these actions are absent from any category filter. The entity-type filter `משתתפים` does catch them, but the category dropdown "קטגוריה → אירועים" doesn't.
- **Expected vs Actual:**
  - Expected: Hebrew label "צ׳ק-אין משתתף" / "עדכון רכישת משתתף" + inclusion in "אירועים" group.
  - Actual: Raw English slugs + missing from group filter.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** 6-line fix. Add both slugs to `ACTION_LABELS` and to the `events` array in `ACTION_GROUPS`.

---

### Finding 12 — User column in Activity Log shows short UUID instead of employee name

- **Code:** `M4-BUG-10`
- **Severity:** LOW
- **Discovered during:** Step 18 (this session)
- **Location:** `modules/crm/crm-activity-log.js:199` — `_employees[r.user_id]` fallback to `String(r.user_id).slice(0,8)`
- **Description:** All rows show `bb1961f7` (the first 8 chars of the logged-in user's UUID) instead of the employee's full name. `ensureEmployees()` queries `employees` table by `tenant_id`, but apparently the current Supabase auth user's `auth.uid()` is not matched to any `employees.id` — probably because PIN-auth users aren't members of `employees` the same way or have a separate mapping.
- **Expected vs Actual:**
  - Expected: "דניאל" (or equivalent full_name).
  - Actual: "bb1961f7" UUID prefix.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Wire the correct user-id → employee-name map (may need to join via `profiles` or use `current_setting('request.jwt.claims')->>'full_name'`).

---

### Finding 13 — Automation Rules UI has no delete button (only toggle + edit)

- **Code:** `M4-UX-01`
- **Severity:** MEDIUM
- **Discovered during:** Step 20 (this session)
- **Location:** `modules/crm/crm-messaging-rules.js:130` — row action column renders only the "עריכה" button
- **Description:** SPEC Step 20 asked to "Delete or disable all 10 existing automation rules from the UI". UI supports only disable (toggle). Consequence: stale rules accumulate; orphaned-from-previous-template rules can't be removed by staff; operators must contact admin for DDL.
- **Expected vs Actual:**
  - Expected: A "מחק" button per rule, with a double-confirm (to mirror lead-delete flow).
  - Actual: Only edit + toggle. No way to remove a rule from the UI.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** Self-service gap that affects every future rule-cleanup task.

---

### Finding 14 — Templates panel "משתנים ▾" inserts variable at cursor; no clipboard copy + no toast

- **Code:** `M4-UX-02`
- **Severity:** LOW
- **Discovered during:** Step 25 (this session)
- **Location:** `modules/crm/crm-messaging-templates.js` — variables dropdown click handler
- **Description:** SPEC expected: click variable → copied to clipboard + toast notification. Actual: click inserts `%name%` at the textarea cursor position; no clipboard write; no toast. The actual behavior is arguably more useful (one click saves you a paste), but the SPEC-vs-reality mismatch means either the SPEC is wrong or there's a missing toast.
- **Expected vs Actual (per SPEC):**
  - Expected: variable copied to clipboard + "הועתק ללוח" toast.
  - Actual: variable inserted at cursor in the edit textarea.
- **Suggested next action:** DISMISS *or* minor NEW_SPEC to add a clarifying toast ("הוכנס לתוכן" or similar)
- **Rationale for action:** Feature works; behavior is defensible. Update SPEC to match reality, or add a toast for clarity.

---

## Summary by severity

| Severity | Count | Codes |
|----------|-------|-------|
| CRITICAL | 0 | — |
| HIGH | 1 | M4-BUG-08 |
| MEDIUM | 4 | M4-BUG-02, M4-BUG-05, M4-BUG-09, M4-UX-01 |
| LOW | 4 | M4-BUG-01, M4-BUG-07, M4-L10N-01, M4-L10N-02 (... wait — recount below) |
| INFO | 2 | M4-BUG-03, M4-BUG-04 |

**Recount:** HIGH 1, MEDIUM 4, LOW 4 (F-1, F-7 wait: F-7 is MEDIUM), let me re-map strictly:

| Code | Sev | Finding # |
|------|-----|-----------|
| M4-BUG-01 | LOW | 1 |
| M4-BUG-02 | MEDIUM | 2 |
| M4-BUG-03 | INFO | 3 |
| M4-L10N-01 | LOW | 4 |
| M4-BUG-04 | INFO | 5 |
| M4-BUG-05 | MEDIUM | 6 |
| M4-BUG-06 | MEDIUM | 7 |
| M4-BUG-07 | LOW | 8 |
| M4-BUG-08 | HIGH | 9 |
| M4-BUG-09 | MEDIUM | 10 |
| M4-L10N-02 | LOW | 11 |
| M4-BUG-10 | LOW | 12 |
| M4-UX-01 | MEDIUM | 13 |
| M4-UX-02 | LOW | 14 |

**Final tally: 0 CRITICAL · 1 HIGH · 5 MEDIUM · 6 LOW · 2 INFO = 14 findings** (5 carried over from Phases 1+2; 9 new this session).
