# FINDINGS — P2A_LEAD_MANAGEMENT

> **Location:** `modules/Module 4 - CRM/go-live/specs/P2A_LEAD_MANAGEMENT/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Audit note from status change not auto-refreshed in open detail modal

- **Code:** `M4-UX-01`
- **Severity:** LOW
- **Discovered during:** §13 Test 4 (add note verification — I noticed the earlier status-change note was not shown in the notes tab even though the DB had it)
- **Location:** `modules/crm/crm-leads-detail.js:60-76` (`fetchDetailData`) + `modules/crm/crm-lead-actions.js:29-53` (`changeLeadStatus`)
- **Description:** When the user changes a lead's status from the detail modal, `CrmLeadActions.changeLeadStatus` writes the audit note to `crm_lead_notes` — but the detail modal's in-memory `data.notes` array isn't mutated. If the user then switches to the notes tab, they see the pre-change snapshot only. Closing and re-opening the modal shows the note (`fetchDetailData` re-runs). Symptom: status changed, UI says "סטטוס עודכן", yet the audit log appears empty until modal is reopened.
- **Reproduction:**
  ```
  1. Open a lead's detail modal.
  2. Click the status badge → pick a new status.
  3. Switch to the "הערות" tab.
  4. Expected: most recent note is "סטטוס שונה מ-X ל-Y".
  5. Actual: list shows only pre-modal notes (or "אין הערות").
  ```
- **Expected vs Actual:**
  - Expected: audit notes appear in the notes tab as soon as they're written.
  - Actual: require modal reopen to see them.
- **Suggested next action:** TECH_DEBT (small UX polish — not blocking).
- **Rationale for action:** Fixing cleanly requires either (a) passing the `data` closure into `CrmLeadActions.changeLeadStatus` so the action can `data.notes.unshift(newNoteRow)`, (b) firing a `crm-lead-note-added` CustomEvent that the modal listens for, or (c) re-fetching notes after each status change. All three are design calls that belong with the Foreman, not with P2a's surgical scope. A follow-up mini-SPEC or a minor P2b task is the right vehicle. Current workaround: user closes and reopens the modal to see the audit trail.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `Toast.show()` is called in 7+ places across CRM but doesn't exist on the shared Toast API

- **Code:** `M4-BUG-02` (or `M5-DEBT-09` if Foreman prefers the cross-cutting tech-debt classification)
- **Severity:** MEDIUM
- **Discovered during:** §13 Test 3 first attempt — my own P2a code hit this bug and I fixed the 7 P2a call sites in `731a68a`. Then I grepped and found pre-existing identical calls in files I didn't modify.
- **Location:** Pre-existing occurrences (not touched by P2a):
  - `modules/crm/crm-event-day-checkin.js:101`
  - `modules/crm/crm-event-day-schedule.js:157` (defensive: guarded by `typeof Toast.show === 'function'`)
  - `modules/crm/crm-event-day-manage.js:25` (defensive `toast()` helper, safe)
  - `modules/crm/crm-leads-tab.js:190` (pre-P2a stub: `Toast.show('בקרוב')`)
  - `modules/crm/crm-leads-detail.js:271, 273` (pre-P2a: "בקרוב" stubs for edit/event-day buttons)
  - `modules/crm/crm-messaging-templates.js:52` (defensive helper, safe)
  - `modules/crm/crm-messaging-broadcast.js:41` (defensive helper, safe)
  - `modules/crm/crm-messaging-rules.js:34` (defensive: guarded)
- **Description:** `shared/js/toast.js` exports `Toast.{success, error, warning, info}` — there is no `.show()`. In synchronous handlers, `Toast.show(...)` throws `TypeError: Toast.show is not a function` but the exception is swallowed at the top of the event loop (visible only in DevTools console). In async contexts — like my `changeLeadStatus` handler — it propagates up the await chain and unwinds any code after the call. Pre-existing occurrences without defensive guards (`crm-event-day-checkin`, `crm-leads-tab`, `crm-leads-detail`) all throw silently when triggered. Three messaging files already define a local `toast(type, msg)` helper that falls back correctly; the rest do not.
- **Reproduction:**
  ```
  // In browser console on /crm.html:
  Toast.show('test')
  // → TypeError: Toast.show is not a function
  Toast.success('test')
  // → renders a success toast
  ```
- **Expected vs Actual:**
  - Expected: all CRM toasts render via a consistent API.
  - Actual: most are no-ops that also throw; only the 3 messaging files + my newly-fixed P2a files use the real API.
- **Suggested next action:** NEW_SPEC (small consolidation SPEC — "CRM Toast consistency pass").
- **Rationale for action:** Cleanup touches ~6 files and ~10 call sites. Not complex, but it is its own concern (consistent UX API usage) and fixing it piecemeal during unrelated SPECs violates the "one concern per task" rule. Alternative: add a compat shim to `shared/js/toast.js` (`Toast.show = Toast.info` or similar) — faster and zero-file-touch in the CRM module, but that just codifies the confusion. Foreman decides.
- **Foreman override (filled by Foreman in review):** { }

---
