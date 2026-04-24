# Activation Prompt — CRM_EVENT_STATUS_FIX

> **Run this on Claude Code. Hotfix for 3 bugs introduced in CRM_HOTFIXES merge.**
> **Priority: HIGH — these are regressions on main.**

---

## Context

After merging CRM_HOTFIXES to main, Daniel reports 3 bugs in the Events tab:

1. When changing an event's status (e.g., to "נפתח מחר" or "הרשמה פתוחה"),
   the event card in the board disappears until page refresh. The board
   should re-render with the updated status immediately.

2. When changing status to "הרשמה פתוחה" (registration open), the
   confirmation gate modal does NOT open. It should trigger the automation
   rule that sends invitations to all leads with status "waiting" — via
   the CrmConfirmSend confirmation gate.

3. The status shown on the event card in the board doesn't update after
   a status change — it shows the old status until page refresh.

These are likely regressions from the CRM_HOTFIXES SPEC where
`crm-events-detail.js` was compressed from 362 to 350 lines.
The line compression may have broken the status-change callback,
the board refresh trigger, or the automation rule evaluation.

---

## Pre-Flight

1. `cd` to ERP repo
2. `git branch` → must be `develop`
3. `git pull origin develop`
4. `git status` → clean
5. Read `modules/crm/crm-events-detail.js` — focus on:
   - The status change handler (look for `wireStatusChange` or similar)
   - The callback after status update (should refresh the board / re-render the card)
   - Any automation trigger that fires on status change to "הרשמה פתוחה"
6. Read `modules/crm/crm-automation-engine.js` — look for:
   - Automation rules triggered by event status change
   - The `evaluate` function and how it's called after status change
7. Compare the CURRENT state of `crm-events-detail.js` with the version
   BEFORE CRM_HOTFIXES (commit `1436a30`):
   ```
   git diff 1436a30..HEAD -- modules/crm/crm-events-detail.js
   ```
   This will show exactly what changed and what might have been broken
   during the 362→350 line compression.

---

## Investigation Steps

1. **Trace the status-change flow:**
   - User clicks "שנה סטטוס" → what function handles it?
   - After the DB update succeeds → what callback re-renders the board?
   - Is there a `CrmAutomation.evaluate('event_status_change', ...)` call?

2. **Check for broken references after line compression:**
   - Did the compression accidentally remove or break a callback?
   - Did it break a function call that was split across lines?
   - Did it merge two statements incorrectly?

3. **Check the confirmation gate trigger:**
   - When status changes to "הרשמה פתוחה", should the automation engine
     fire a rule that sends invitations to waiting leads?
   - Is `CrmConfirmSend` being called? Is the gate opening?

---

## Fix Guidelines

- Fix the root cause — don't add workarounds
- Keep `crm-events-detail.js` under 350 lines
- If the fix requires adding lines and the file is at cap, extract a
  helper to a separate file (follow the pattern of `crm-event-send-message.js`)
- Test by checking: status change → board updates → automation fires

---

## Commit

```
git commit -m "fix(crm): restore event status change board refresh and automation trigger"
git push origin develop
```

Then report what you found and fixed.

---

## MANDATORY at End

- `git status` → clean
- Push to `develop`
- Report: what was broken, why, and what was fixed

---

## Warnings

- Do NOT modify Edge Functions
- Do NOT run SQL writes
- File size limit: 350 lines max per file
