# Claude Code — Execute P20 Confirmation Gate SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P20 adds a Confirmation Gate to ALL automated CRM message dispatches.
When an automation rule fires, instead of sending immediately, a preview
modal shows the message text, recipients, and approve/cancel buttons.
Daniel requested this to prevent accidental mass-sends during status changes.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P20_CONFIRMATION_GATE/SPEC.md`

**Known untracked:** SPEC folders from prior SPECs may be untracked. Ignore
them, use selective `git add` by filename.

**Dependency:** P19 (shared.js split) should be executed first — but P20 does
not depend on shared.js at all (CRM files don't use FIELD_MAP), so the
execution order is flexible.

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully
3. **Verify automation engine line count:** `wc -l modules/crm/crm-automation-engine.js` — expected: ~228
4. **Verify messaging log line count:** `wc -l modules/crm/crm-messaging-log.js` — expected: ~151
5. **Verify `pending_review` unused:** `grep -rn "pending_review" modules/crm/` — expected: 0
6. Start `localhost:3000`, verify CRM loads on `crm.html?t=demo`
7. **Only approved phones:** `+972537889878`, `+972503348349`

**If pre-flight passes → GO.**

---

## Execution Sequence

### Phase 1 — Modal + Engine Wiring (1 commit)

1. Create `modules/crm/crm-confirm-send.js` (~200L):
   - `CrmConfirmSend.show(sendPlan)` — renders preview modal
   - Approve → dispatch all via `CrmMessaging.sendMessage`
   - Cancel → write `pending_review` rows to `crm_message_log`
2. Modify `crm-automation-engine.js`:
   - `fireRule` returns sendPlan instead of dispatching
   - `evaluate` collects all plans → `CrmConfirmSend.show(combined)`
   - Fallback: if `CrmConfirmSend` not available → send immediately (backwards compat)
3. Add `<script>` tag to `crm.html`
4. Test: change event status → modal appears → approve → messages sent
5. Test: change event status → modal appears → cancel → pending_review rows in log
6. Commit: `feat(crm): add confirmation gate — preview modal before automated sends`

**Checkpoint 1:** Report modal + approve + cancel results.

### Phase 2 — Log Resend (1 commit)

1. Edit `crm-messaging-log.js`:
   - `pending_review` badge (amber/yellow)
   - Resend button on expanded pending_review rows
   - Wire resend → send dialog pre-filled → on success update old row to `superseded`
2. Test: find a pending_review row → click resend → edit → send → verify
3. Commit: `feat(crm): pending_review resend from message log`

---

## Key Rules

- **Only approved phones** for any SMS test
- **Rule 12:** all files ≤ 350 lines
- **Rule 22:** all writes include `tenant_id`
- **Rule 8:** escapeHtml on all user-visible dynamic content
- **Broadcast wizard + send dialog must NOT be affected** (they bypass the engine)
- **Clean ALL test data** at end

---

*End of ACTIVATION_PROMPT — P20_CONFIRMATION_GATE*
