# FINDINGS — P12_ACTIVITY_LOG

> **Location:** `modules/Module 4 - CRM/go-live/specs/P12_ACTIVITY_LOG/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Rule-21 verifier flags `var x = (...)` as duplicate function definition

- **Code:** `M4-TOOL-P12-01` (a sibling of P11's `M4-TOOL-P11-02`, but a different false-positive class — that one was about IIFE-scoped `logWrite` helpers; this one is about the regex's parenthesized-RHS handling)
- **Severity:** MEDIUM
- **Discovered during:** Phase 2 commit attempt (`feat(crm): wire ActivityLog into lead + event actions`).
- **Location:** `scripts/checks/rule-21-orphans.mjs:7` (the second pattern in the `PATTERNS` array).
- **Description:** The pattern `/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g` is meant to detect arrow-function definitions like `var foo = () => {...}` or `var foo = (a, b) => {...}`. It instead matches **any** `var/let/const` followed by `=` followed by `(`. So `var info = (CrmHelpers && CrmHelpers.getStatusInfo) ? ... : null;` is incorrectly registered as a definition of a function named `info`. When two unrelated files happen to use the same local-var name with a parenthesized RHS expression (e.g. `var info`, `var phone`, `var email`), the verifier reports a fake cross-file duplicate and blocks the commit.
- **Reproduction:**
  ```
  cd /c/Users/User/opticup
  git add modules/crm/crm-lead-actions.js modules/crm/crm-event-actions.js
  git commit -m "test"
  # → [rule-21-orphans] modules\crm\crm-lead-actions.js:18 —
  #   function "info" defined in 2 files: ...crm-event-actions.js, ...crm-lead-actions.js
  ```
- **Expected vs Actual:**
  - Expected: only true arrow-function definitions match. `var info = (X && Y) ? Z : W;` should NOT match because the parens belong to a precedence-grouping expression, not to a function-parameter list.
  - Actual: any `var foo = (...` matches, regardless of whether it ends in `=>` or `function`.
- **Suggested next action:** TECH_DEBT (small, ~1-line regex fix in `scripts/checks/rule-21-orphans.mjs`).
- **Rationale for action:** The fix is a single-line regex tightening. Suggested replacement: `/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g` (require `=>` after the closing paren). Or equivalently, allow `function` keyword as an alternative branch. This eliminates the entire class of false positives (which has now bitten P11 and P12) while still catching legitimate arrow-function declarations. The Sentinel can verify by running `verify.mjs --full` before and after the fix and confirming only real duplicates remain.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `updateEvent` and `deleteEvent` functions do not exist in CRM

- **Code:** `M4-FEAT-P12-01`
- **Severity:** LOW
- **Discovered during:** §3 criteria #13 (`crm.event.update` log) and #14 (`crm.event.delete` log) verification.
- **Location:** `modules/crm/crm-event-actions.js` (the file that the SPEC pointed to). Also greppable: `grep -rn "updateEvent\|deleteEvent\|crm_events.*\.update\|crm_events.*\.delete" modules/crm/` returns 0 hits.
- **Description:** The SPEC table at §12.3 listed "update event" and "delete event" as actions to wire ActivityLog into, but the underlying mutation functions don't exist in the CRM module. `crm-event-actions.js` only exposes `createEvent`, `changeEventStatus`, and the modal helpers. Event editing/deletion is not currently a feature in the CRM UI (or at least not via this file).
- **Reproduction:**
  ```
  grep -rn "updateEvent\|deleteEvent" modules/crm/
  # → no results
  grep -n "function" modules/crm/crm-event-actions.js
  # → only createEvent, changeEventStatus, openCreateEventModal,
  #   eventStatusLabel, dispatchEventStatusMessages,
  #   openEventStatusDropdown, closeEventStatusDropdown
  ```
- **Expected vs Actual:**
  - Expected: SPEC criteria #13 and #14 satisfied with grep hits for `crm.event.update` and `crm.event.delete` log calls.
  - Actual: criteria not satisfiable — no functions to attach the logs to.
- **Suggested next action:** NEW_SPEC if event editing is on the roadmap (it isn't currently — Daniel's QA never asked for it); otherwise DISMISS the criteria. The `crm.event.update` and `crm.event.delete` action labels are pre-mapped in `crm-activity-log.js:ACTION_LABELS` so adding the calls later is a 2-line edit per call site.
- **Rationale for action:** Event lifecycle today: create → status_change → (event_day workflow) → done. Edit/delete have never been requested. Building empty stubs would violate "don't add features beyond the task." If a future SPEC adds event editing, that SPEC should also wire the log in the same commit.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `deleteLead` (soft-delete) function does not exist in CRM action layer

- **Code:** `M4-FEAT-P12-02`
- **Severity:** LOW
- **Discovered during:** §3 criterion #10 (`crm.lead.delete` log) verification.
- **Location:** `modules/crm/crm-lead-actions.js` and the rest of `modules/crm/`. Grep `deleteLead\|is_deleted.*true\|softDelete` returns 0 hits in the CRM module.
- **Description:** Iron Rule 3 mandates soft-delete (`is_deleted` flag) and forbids permanent delete without double PIN. The `crm_leads` table has the `is_deleted` column and views filter on it (`v_crm_leads_with_tags` uses `.eq('is_deleted', false)`). But the CRM has never exposed a "delete lead" UI action — there is no button, no helper function, no modal. SPEC criterion #10 expected a log to be wired into `deleteLead`, but the function doesn't exist.
- **Reproduction:**
  ```
  grep -rn "deleteLead\|is_deleted.*true\|softDelete" modules/crm/
  # → no hits
  grep -n "function" modules/crm/crm-lead-actions.js
  # → changeLeadStatus, bulkChangeStatus, addLeadNote, createManualLead,
  #   updateLead, transferLeadToTier2, leadTier — no delete
  ```
- **Expected vs Actual:**
  - Expected: criterion #10 satisfied with a `crm.lead.delete` log call.
  - Actual: no UI path exists for deleting a lead, so no place to log.
- **Suggested next action:** DISMISS until a "lead delete" feature is requested. The `crm.lead.delete` label is pre-mapped in `crm-activity-log.js:ACTION_LABELS` so future wiring is trivial.
- **Rationale for action:** Adding a delete UI is product work, not P12 scope. Iron Rule 3 already covers the implementation pattern when it does become needed (soft-delete + double PIN). Marketing/CRM teams have not asked for lead deletion — the closer-to-business alternative is to mark a lead `unsubscribed_at` (which already exists and is respected throughout the messaging pipeline).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — `changeEventStatus` SELECT does not include current `status` value

- **Code:** `M4-DEBT-P12-03`
- **Severity:** LOW
- **Discovered during:** §3 criterion #15 wiring (`crm.event.status_change` log details).
- **Location:** `modules/crm/crm-event-actions.js:212` — `var evRes = await sb.from('crm_events').select('name, event_date, start_time, location_address').eq('id', eventId).eq('tenant_id', tenantId).single();`
- **Description:** When changing an event's status, `changeEventStatus` SELECTs the event's `name`, `event_date`, `start_time`, `location_address` — but not the current `status` value. As a result, the new ActivityLog entry can record `to: newStatus` but cannot record `from: oldStatus`. By contrast, `changeLeadStatus` accepts `oldStatus` as a parameter from the caller, so its log entry has `from` and `to`. Event status changes lose half the audit-trail signal.
- **Reproduction:**
  ```
  # In crm-event-actions.js (lines 209-224 after the P12 edit), the log call
  # is forced to omit `from`:
  ActivityLog.write({
    action: 'crm.event.status_change',
    entity_type: 'crm_events',
    entity_id: eventId,
    details: { to: newStatus, name: evRes.data && evRes.data.name }
    //         ^^^^^^^^^^^^ no `from` because not in SELECT
  });
  ```
- **Expected vs Actual:**
  - Expected: `details: { from, to, name }` for parity with `crm.lead.status_change`.
  - Actual: `details: { to, name }` only.
- **Suggested next action:** TECH_DEBT — add `'status'` to the SELECT clause in `changeEventStatus`, then change the log to include `from: evRes.data && evRes.data.status`. ~1-line change. Could be bundled into the next CRM SPEC that touches `crm-event-actions.js`.
- **Rationale for action:** Trivial to fix when the file is next opened. Not blocking — the log entry still records the new status and the entity ID, so the `from` value is recoverable by walking earlier log rows for the same entity. Premature to fix in P12 (SPEC §7 listed schema-adjacent reads as out-of-scope for this SPEC).
- **Foreman override (filled by Foreman in review):** { }
