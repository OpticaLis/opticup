# Claude Code — Execute P14 Event Closed Audience Hotfix

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P14 is a P7-BLOCKER hotfix. The `attendees` audience resolver in
`crm-automation-engine.js` only includes `registered` and `confirmed`
statuses, which means purchasers and checked-in attendees never receive
post-event wrap-up messages when an event closes. Daniel approved the fix:
include `no_show`, exclude `cancelled`.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P14_EVENT_CLOSED_AUDIENCE/SPEC.md`

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC
3. Verify the line to edit exists:
   ```
   grep -n "attStatus" modules/crm/crm-automation-engine.js
   ```
   Expect: line ~104, `['registered','confirmed']`

**If pre-flight passes → GO.**

---

## Execution

1. Edit `modules/crm/crm-automation-engine.js` line 104:

   **From:**
   ```javascript
   var attStatus = (recipientType === 'attendees_waiting') ? ['waiting_list'] : ['registered','confirmed'];
   ```

   **To:**
   ```javascript
   var attStatus = (recipientType === 'attendees_waiting') ? ['waiting_list'] : ['registered','confirmed','attended','purchased','no_show'];
   ```

2. Verify all 7 criteria from SPEC §3
3. Commit:
   ```
   fix(crm): expand event_closed audience to include attended, purchased, no_show attendees
   ```
4. Push to develop
5. Write `EXECUTION_REPORT.md` in the SPEC folder

---

## Key Rules

- **ONE file only.** If anything else needs changing — STOP.
- **No EF changes. No schema changes. No UI changes.**
- **Demo tenant only** for any verification queries.

---

*End of ACTIVATION_PROMPT — P14_EVENT_CLOSED_AUDIENCE*
