# ACTIVATION PROMPT — RESTORE_DELETED_EVENT_UI

> **Single SPEC, 2 commits + retro. Estimated executor time: 1.5-2 hours.**

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/SPEC.md

Read SPEC.md fully before starting. Then execute under Bounded Autonomy.

EXECUTION ORDER:

0. PRE-FLIGHT:
   a. First Action protocol per CLAUDE.md §1 — branch=develop, pull, integrity gate clean.
   b. Verify clean repo before continuing.

1. Cross-reference verification (SPEC §10 UNVERIFIED items):
   a. Open modules/crm/crm-activity-log.js and locate the row-render path for activity-log entries. Identify where you'll inject the conditional "שחזר" button (only for rows where action='crm.event.delete').
   b. Confirm the activity_log row schema includes: id, tenant_id, entity_type, entity_id, action, actor_id, details (jsonb), created_at, level. Query information_schema.columns for activity_log.
   STOP if any of these can't be resolved cleanly.

2. Commit 1 — Backend (migration + RPC):
   a. Author migration file `supabase/migrations/{TODAY_YYYYMMDD}_add_restore_event_from_log_rpc.sql`.
   b. RPC body must:
      - Take (p_tenant_id uuid, p_log_id uuid)
      - SELECT the activity_log row by p_log_id; if not exists or tenant mismatch or action!='crm.event.delete' or entity_type!='crm_events' → return `{success:false, error:'invalid_log_id'}`
      - SELECT the event by entity_id; verify is_deleted=true; if active → return `{success:false, error:'event_not_deleted'}`
      - SELECT FOR UPDATE on the event row (atomic lock)
      - UPDATE crm_events.is_deleted=false WHERE id=event_id AND tenant_id=p_tenant_id
      - UPDATE crm_event_attendees.is_deleted=false WHERE event_id=event_id AND tenant_id=p_tenant_id AND is_deleted=true AND updated_at BETWEEN log_row.created_at - INTERVAL '5 seconds' AND log_row.created_at + INTERVAL '5 seconds'  (timestamp-scoped restore)
      - INSERT into activity_log: tenant_id, entity_type='crm_events', entity_id=event_id, action='crm.event.restore', actor_id=auth.uid(), details=jsonb_build_object('event_id', event_id, 'event_number', evt.event_number, 'event_name', evt.name, 'restored_attendees', restored_count, 'source_log_id', p_log_id), level='info'
      - Return `{success:true, event_id, restored_attendees:N}`
      - SECURITY DEFINER, with explicit tenant_id filter on every UPDATE (Iron Rule 14 + 15)
      - DO NOT call ActivityLog.write client-side (lesson from DELETE_EMPTY_EVENT F1 — server-side audit is canonical)
   c. Apply migration via Supabase MCP `apply_migration`.
   d. Verify in DB: function exists, signature correct.
   e. Iron Rule 31 — integrity gate clean.
   f. Single commit: `feat(crm): restore_event_from_log RPC + cascade restore by timestamp scope`. Add only the migration file.
   g. Push origin develop.

3. Commit 2 — Frontend (JS module + activity-log button + label maps):
   a. Create `modules/crm/crm-event-restore.js` (target ≤100 lines):
      - Exposes `window.CrmEventActions = window.CrmEventActions || {}; window.CrmEventActions.restoreEventFromLog = async function(logId, tenantId) { ... }`
      - Calls `sb.rpc('restore_event_from_log', { p_tenant_id: tid, p_log_id: logId })`
      - Returns the RPC's jsonb payload directly
      - DO NOT call ActivityLog.write client-side
   b. Modify `modules/crm/crm-activity-log.js`:
      - Add to ACTION_LABELS map: `'crm.event.restore': 'שחזור אירוע'`
      - Add 'crm.event.restore' to ACTION_GROUPS.events array
      - In the row-render path, when action='crm.event.delete' AND the event is currently is_deleted (verify via a small DB lookup or by trusting the server-side state), inject a small "שחזר" button. Style: indigo or gold to differentiate from destructive actions. Position: in actions column or end-of-row.
      - Button click handler: Modal.confirm with title 'שחזור אירוע', message 'האם לשחזר את האירוע ואת המשתתפים שהיו רשומים אליו?'
        * On confirm → call CrmEventActions.restoreEventFromLog(row.id, getTenantId())
        * On RPC success → Toast.success('האירוע שוחזר'), reload the activity-log via loadActivityLog(), reload events list via window.reloadCrmEventsTab if available
        * On `error:'event_not_deleted'` → Toast.error('האירוע כבר פעיל')
        * On `error:'invalid_log_id'` → Toast.error('שגיאה בשחזור')
        * On other errors → Toast.error('שגיאה: ' + err.message)
   c. Modify `crm.html`: add `<script src="modules/crm/crm-event-restore.js"></script>` BEFORE the `<script src="modules/crm/crm-activity-log.js"></script>` line.
   d. Iron Rule 12 — verify all touched files ≤350 lines.
   e. Iron Rule 31 — integrity gate clean.
   f. Single commit: `feat(crm): "שחזר" button on activity-log delete rows`. Add: crm-event-restore.js + crm-activity-log.js + crm.html.
   g. Push origin develop.

4. Smoke test on demo tenant:
   a. Tell Daniel commit 2 is pushed; ask him to run §12 manual QA from the SPEC (round-trip + edge-case).
   b. Daniel reports back.
   c. If a failure appears that isn't a stop-trigger, log as a finding rather than stopping.

5. SPEC close:
   a. Write modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/EXECUTION_REPORT.md (success criteria outcomes per row, 2 commit hashes, smoke test result).
   b. Write FINDINGS.md (anything surprising, anything deferred).
   c. Single retro commit: `chore(spec): close RESTORE_DELETED_EVENT_UI with retrospective`. Push.

CONSTRAINTS:
- Demo tenant only. Zero prizma writes.
- 2 code commits + 1 retro = 3 commits total. NEVER merge to main.
- DO NOT modify the existing soft_delete_event_if_empty RPC.
- DO NOT modify cascade_attendee_soft_delete trigger.
- DO NOT add ActivityLog.write client-side anywhere — server-side RPC is canonical (lesson from DELETE_EMPTY_EVENT F1).
- DO NOT widen the timestamp scope beyond ±5 seconds without Foreman approval.
- Stop on any deviation per CLAUDE.md §9.

Begin with step 0.
```
