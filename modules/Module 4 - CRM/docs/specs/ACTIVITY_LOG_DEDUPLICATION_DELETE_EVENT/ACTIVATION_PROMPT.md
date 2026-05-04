# ACTIVATION PROMPT — ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT

> **Tiny SPEC, single 1-line patch.** Estimated executor time: 5-10 minutes including smoke verify.

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT/SPEC.md

Read SPEC.md fully before starting. Then execute under Bounded Autonomy.

EXECUTION ORDER:

0. PRE-FLIGHT:
   a. First Action protocol per CLAUDE.md §1 — verify branch=develop, pull latest, integrity gate clean.
   b. Verify clean repo before continuing.

1. Cross-reference verification:
   a. Confirm modules/crm/crm-event-delete.js lines 31-44 contain the ActivityLog.write block targeted for removal.
   b. Grep `modules/crm/` for other `ActivityLog.write` callers with action='crm.event.delete'. If any other file writes that action, STOP and ask Foreman before proceeding.

2. Commit 1 — Remove duplicate client-side audit write:
   a. Edit `modules/crm/crm-event-delete.js`:
      - Delete the entire block lines 31-44 (the `try { if (window.ActivityLog) { ActivityLog.write({...}); } } catch (_) {}` wrapper).
      - The `if (payload && payload.success === true) { ... }` containing the deleted block can be simplified to a no-op or removed entirely if it now does nothing useful (it just guards a deleted call).
      - Result: function returns the RPC payload directly without any client-side activity-log side effect.
   b. Verify file size decreased ~14 lines: `wc -l modules/crm/crm-event-delete.js` should return ~36.
   c. Iron Rule 12 + integrity gate clean.
   d. Single commit: `fix(crm): remove duplicate client-side activity-log write on event delete (RPC is canonical)`. Add only `modules/crm/crm-event-delete.js`.
   e. Push origin develop.

3. Smoke verify on demo:
   a. Tell Daniel commit is pushed; ask him to run §12 manual QA from the SPEC.
   b. He'll create a test event, delete it, and confirm the activity_log count went up by exactly 1 (not 2).

4. SPEC close:
   a. Write modules/Module 4 - CRM/docs/specs/ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT/EXECUTION_REPORT.md (success criteria outcomes, 1 commit hash, smoke test result).
   b. Write FINDINGS.md (likely 1 line: "No findings; SPEC closed cleanly.").
   c. Single retro commit: `chore(spec): close ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT with retrospective`. Push.

CONSTRAINTS:
- Demo tenant only. NEVER merge to main on develop.
- 1 code commit + 1 retro = 2 commits total.
- Do NOT touch the RPC `soft_delete_event_if_empty`. Server-side audit row stays.
- Stop on any deviation per CLAUDE.md §9.

Begin with step 0.
```
