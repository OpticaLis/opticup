# Activation Prompt — CRM_PRE_MERGE

> **Run this on Claude Code. This is the final step before merge-to-main.**
> **No SPEC file — this is a micro-task combining a one-line bugfix + Integration Ceremony docs.**

---

## Context

CRM Module 4 has completed all SPECs (CRM_HOTFIXES, EVENT_CONFIRMATION_EMAIL)
and all 7 OPEN_ISSUES are resolved. One known bug remains (QR broken on
UI-register path) plus Integration Ceremony docs need updating before merge.

---

## Pre-Flight

1. `cd` to ERP repo
2. `git branch` → must be `develop`
3. `git pull origin develop`
4. `git status` → clean (ignore `docs/guardian/*` if dirty — those are Sentinel outputs)

---

## Part 1 — One-Line Bugfix (M4-BUG-EVCONF-01)

### The bug
In `modules/crm/crm-automation-engine.js`, the `buildVariables` function
(around line 130-131) initializes `vars` with `name`, `phone`, `email` but
does NOT include `lead_id`. The confirmation email template uses `%lead_id%`
in the QR code URL. On the UI-register path (staff registers a lead via CRM),
the QR encodes the literal string `%lead_id%` instead of the actual lead UUID.

### The fix
Find this line (approximately line 131):
```javascript
var vars = { name: lead.full_name || '', phone: lead.phone || '', email: lead.email || '' };
```

Add immediately after it:
```javascript
vars.lead_id = lead.id || '';
```

### Verify
- `grep -n "lead_id" modules/crm/crm-automation-engine.js` → should show the new line
- Pre-commit hook passes
- File stays under 350 lines

### Commit
```
git add modules/crm/crm-automation-engine.js
git commit -m "fix(crm): inject lead_id into buildVariables for QR code on UI-register path"
```

---

## Part 2 — Integration Ceremony (Documentation Updates)

Update these files to reflect all CRM work since the last Integration Ceremony.
New globals, functions, and files were added across SHORT_LINKS, CRM_HOTFIXES,
and EVENT_CONFIRMATION_EMAIL SPECs.

### 2a. `modules/Module 4 - CRM/docs/MODULE_MAP.md`

Add these new entries (verify each exists with grep before adding):

**New files:**
- `modules/crm/crm-event-send-message.js` — Compose modal for free-form
  message sending from event detail. Global: `window.CrmEventSendMessage`
  with `.open(event, attendees)` and `.wire(container)`.

**New functions/globals in existing files:**
- `crm-automation-engine.js`: `promoteWaitingLeadsToInvited(planItems, results)`
  — atomic UPDATE of lead status from waiting→invited after event invitation
  dispatch. Exposed on `window.CrmAutomation`.
- `crm-automation-engine.js`: `buildVariables` now includes `lead_id` variable.

### 2b. `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`

Update to reflect:
- CRM_HOTFIXES: ✅ CLOSED (commits 9fe1e36, 99ca541, 531e4c4)
- EVENT_CONFIRMATION_EMAIL: ✅ CLOSED (commits fcd7994, 979574c)
- All 7 OPEN_ISSUES resolved
- Status: ready for merge-to-main pending Daniel's QA

### 2c. `modules/Module 4 - CRM/docs/CHANGELOG.md`

Add entries for all CRM commits since last changelog update. Include commit
hashes and one-line descriptions.

### 2d. `docs/GLOBAL_MAP.md`

Add new CRM globals to the function registry:
- `window.CrmEventSendMessage` — { open, wire } — compose modal for event messaging
- `window.CrmAutomation.promoteWaitingLeadsToInvited` — atomic lead status promotion

### Commit
```
git add modules/Module\ 4\ -\ CRM/docs/MODULE_MAP.md
git add modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md
git add modules/Module\ 4\ -\ CRM/docs/CHANGELOG.md
git add docs/GLOBAL_MAP.md
git commit -m "docs(crm): Integration Ceremony — update MODULE_MAP, SESSION_CONTEXT, CHANGELOG, GLOBAL_MAP"
```

---

## Part 3 — Final Verification

1. `git status` → clean
2. `git log --oneline -5` → show the 2 new commits
3. No console errors (if verify script available, run it)
4. Report to user: "Ready for merge-to-main."

---

## MANDATORY at End

- `git status` → must be clean
- Push to develop: `git push origin develop`
- Report commit hashes

---

## Warnings

- Do NOT modify any Edge Functions
- Do NOT run any SQL writes
- Do NOT create new files (except if MODULE_MAP or CHANGELOG don't exist yet)
- Do NOT touch `docs/GLOBAL_SCHEMA.sql` — no schema changes in these SPECs
- File size limit: 350 lines max. The bugfix adds 1 line to crm-automation-engine.js
  which is at 347-348 lines — verify it stays under 350
