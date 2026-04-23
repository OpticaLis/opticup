# SPEC — P14_EVENT_CLOSED_AUDIENCE

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P14_EVENT_CLOSED_AUDIENCE/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** P7-BLOCKER — must land before Prizma cutover

---

## 1. Goal

Fix the `attendees` audience resolver in `crm-automation-engine.js` so that
the `event_closed` automation rule (rule #4) sends wrap-up messages to **all
attendees who actually participated** — including those whose status advanced
to `attended`, `purchased`, or `no_show`. Currently, only `registered` and
`confirmed` statuses are included, which silently excludes the most engaged
customers (purchasers) from post-event communications.

**Daniel's decision (2026-04-23):** include `no_show`, exclude `cancelled`.

---

## 2. Origin

- **Finding:** M4-BUG-08 (P13_COMPREHENSIVE_QA, Finding #9)
- **Severity:** HIGH
- **Discovered by:** opticup-executor during P13 Step 17
- **Foreman disposition:** NEW_SPEC, P7-BLOCKER

---

## 3. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | `crm-automation-engine.js` line 104 `attStatus` array for `attendees` | `['registered','confirmed','attended','purchased','no_show']` |
| 2 | `attendees_waiting` path unchanged | `['waiting_list']` — no modification |
| 3 | File line count | ≤ 235 (current 228 + minor change) |
| 4 | `wc -l modules/crm/crm-automation-engine.js` | ≤ 235 |
| 5 | `git diff --stat` | 1 file changed |
| 6 | Zero other files modified | `git status` shows only `crm-automation-engine.js` |
| 7 | `grep -n "attStatus" modules/crm/crm-automation-engine.js` | Shows the expanded array |

---

## 4. Autonomy Envelope

**MAXIMUM AUTONOMY.** This is a 1-line fix with clear expected output.

- Execute the edit
- Verify all 7 criteria
- Commit and push
- Write EXECUTION_REPORT.md

No questions needed. No Daniel approval needed mid-execution.

---

## 5. Stop-on-Deviation Triggers

1. The line to edit is not at the expected location (line 104 area with `attStatus`)
2. Any other file needs modification
3. Any criterion from §3 fails after the edit

---

## 6. The Fix

**File:** `modules/crm/crm-automation-engine.js`
**Line:** 104 (inside `resolveRecipients` function)

**Current code:**
```javascript
var attStatus = (recipientType === 'attendees_waiting') ? ['waiting_list'] : ['registered','confirmed'];
```

**New code:**
```javascript
var attStatus = (recipientType === 'attendees_waiting') ? ['waiting_list'] : ['registered','confirmed','attended','purchased','no_show'];
```

**What this changes:**
- `attendees` recipient type: adds `attended`, `purchased`, `no_show` to the
  status filter. These attendees will now receive automation messages (e.g.,
  event_closed wrap-up).
- `attendees_waiting` recipient type: unchanged (`waiting_list` only).
- `cancelled` attendees: excluded per Daniel's decision — they explicitly
  opted out.

---

## 7. Out of Scope

- No changes to `attendees_waiting` logic
- No changes to any other file
- No changes to the automation rules themselves
- No changes to templates
- No UI changes
- No Edge Function changes
- No schema changes

---

## 8. Expected Final State

```
modules/crm/crm-automation-engine.js  — 1 line changed, ≤235 lines total
```

One commit: `fix(crm): expand event_closed audience to include attended, purchased, no_show attendees`

---

## 9. Rollback Plan

Revert the single commit. One line of code.

---

## 10. Commit Plan

Single commit:
```
fix(crm): expand event_closed audience to include attended, purchased, no_show attendees

Fixes M4-BUG-08 (P13 Finding #9, P7-BLOCKER).
The attendees audience resolver only included 'registered' and 'confirmed',
silently excluding 'attended', 'purchased', and 'no_show' from post-event
communications. This meant purchasers — the most valuable customers — never
received wrap-up messages when an event closed.

Decision: include no_show (may be interested in future events), exclude
cancelled (explicitly opted out). Per Daniel 2026-04-23.
```

---

## 11. Lessons Already Incorporated

- **From P13 FOREMAN_REVIEW Proposal 2 (author):** QA SPECs must account for
  state coupling between sequential test steps — the original SPEC didn't
  anticipate that check-in → purchase would advance attendee status past the
  audience filter. This SPEC explicitly names all 5 included statuses.
- **Cross-Reference Check completed 2026-04-23:** `attStatus` is local to
  `resolveRecipients`, no global collision. 0 hits outside the function.

---

*End of SPEC — P14_EVENT_CLOSED_AUDIENCE*
