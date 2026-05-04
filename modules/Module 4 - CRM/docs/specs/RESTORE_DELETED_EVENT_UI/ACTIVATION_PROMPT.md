# ACTIVATION PROMPT — RESTORE_DELETED_EVENT_UI

> **Single SPEC, 2 commits + retro. Estimated executor time: 1.5-2 hours.**
> **Approach B (locked 2026-05-04 by Daniel after Foreman scope-correction):** capture attendee_ids in the audit row at delete-time, replay the explicit ID list at restore-time. NO timestamp-scoped restore (the original SPEC's approach was infeasible — `crm_event_attendees` has no `updated_at`).

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/SPEC.md

Read SPEC.md fully before starting. Then execute under Bounded Autonomy. Note that Approach B was chosen — DO NOT use updated_at on crm_event_attendees, that column does not exist.

EXECUTION ORDER:

0. PRE-FLIGHT:
   a. First Action protocol per CLAUDE.md §1 — branch=develop, pull, integrity gate clean.
   b. Verify clean repo before continuing.

1. Cross-reference verification (SPEC §10 + §2 verification):
   a. Open `supabase/migrations/20260504_add_soft_delete_event_if_empty_rpc.sql` and read the existing RPC body. You will write a CREATE OR REPLACE that ADDS the attendee_ids capture but keeps everything else identical (same return shape, same cascade, same lock).
   b. Confirm activity_log schema matches §2 of the SPEC: `entity_id` is TEXT (not uuid — RPC must cast), `user_id` (NOT actor_id), `created_at` is timestamptz nullable.
   c. Confirm crm_event_attendees has columns: id, tenant_id, event_id, is_deleted, created_at. NO updated_at, NO deleted_at. (If any of these assumptions break, STOP.)
   d. Confirm `modules/crm/crm-activity-log.js` is read-only by design (line 5 comment) — your row-render addition must remain read-only-passthrough; the only WRITE happens via the new RPC.
   STOP if any assumption breaks.

2. Commit 1 — Backend (migration v2 of delete + new restore RPC):
   a. Author migration file `supabase/migrations/{TODAY_YYYYMMDD}_extend_soft_delete_event_capture_attendee_ids.sql`:
      - CREATE OR REPLACE FUNCTION soft_delete_event_if_empty(p_tenant_id uuid, p_event_id uuid)
      - Body identical to the v1 logic EXCEPT: BEFORE the cascade UPDATE on crm_event_attendees, run
        `SELECT COALESCE(array_agg(id::text), ARRAY[]::text[]) INTO v_attendee_ids FROM crm_event_attendees WHERE event_id=p_event_id AND tenant_id=p_tenant_id AND is_deleted=false;`
      - Then in the audit-log INSERT, the details jsonb must include the array: `'attendee_ids', to_jsonb(v_attendee_ids)` alongside the existing event_name, deleted_attendees, cancelled_messages keys.
      - DO NOT change the function's return signature or success/error shape.
   b. Author migration file `supabase/migrations/{TODAY_YYYYMMDD+1}_add_restore_event_from_log_rpc.sql`:
      - CREATE FUNCTION restore_event_from_log(p_tenant_id uuid, p_log_id uuid) RETURNS jsonb
      - SECURITY DEFINER, search_path = public
      - Body:
        * SELECT the source log row by id; if missing OR tenant_id <> p_tenant_id OR action <> 'crm.event.delete' OR entity_type <> 'crm_events' → return `{success:false, error:'invalid_log_id'}`.
        * v_event_id uuid := log_row.entity_id::uuid (cast)
        * SELECT FOR UPDATE on crm_events WHERE id=v_event_id AND tenant_id=p_tenant_id; if not found → return `{success:false, error:'event_not_found'}`; if is_deleted=false → return `{success:false, error:'event_not_deleted'}`.
        * UPDATE crm_events SET is_deleted=false WHERE id=v_event_id AND tenant_id=p_tenant_id.
        * v_attendee_ids := log_row.details->'attendee_ids'  (jsonb array, may be NULL on pre-v2 logs).
        * If v_attendee_ids IS NULL OR jsonb_array_length(v_attendee_ids) = 0:
            v_restored := 0; v_note := 'pre_v2_log_event_only' (or empty if it's a fresh empty-event delete)
          Else:
            UPDATE crm_event_attendees SET is_deleted=false WHERE id IN (SELECT (jsonb_array_elements_text(v_attendee_ids))::uuid) AND tenant_id=p_tenant_id AND is_deleted=true;
            GET DIAGNOSTICS v_restored = ROW_COUNT.
        * INSERT INTO activity_log (tenant_id, user_id, level, action, entity_type, entity_id, details) VALUES (p_tenant_id, auth.uid(), 'info', 'crm.event.restore', 'crm_events', v_event_id::text, jsonb_build_object('event_name', evt.name, 'restored_attendees', v_restored, 'source_log_id', p_log_id::text))
        * RETURN jsonb_build_object('success', true, 'event_id', v_event_id, 'restored_attendees', v_restored, 'source_log_id', p_log_id::text)
      - Iron Rule 14: every UPDATE includes `tenant_id = p_tenant_id`. Iron Rule 15: SECURITY DEFINER + explicit filters.
   c. Apply BOTH migrations via Supabase MCP `apply_migration` in order.
   d. Verify: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname IN ('soft_delete_event_if_empty','restore_event_from_log');` returns 2 functions. Run a sanity insert (delete a fresh demo test event with 1 attendee) → confirm new audit row's `details->'attendee_ids'` is a 1-element array.
   e. Iron Rule 31 — integrity gate clean.
   f. Single commit: `feat(crm): restore_event_from_log RPC + extend soft_delete_event_if_empty to capture attendee_ids`. Add BOTH migration files only.
   g. Push origin develop.

3. Commit 2 — Frontend (JS module + activity-log button + label maps):
   a. Create `modules/crm/crm-event-restore.js` (target ≤100 lines):
      - Exposes `window.CrmEventActions = window.CrmEventActions || {}; window.CrmEventActions.restoreEventFromLog = async function(logId, tenantId) { ... }`
      - Calls `sb.rpc('restore_event_from_log', { p_tenant_id: tid, p_log_id: logId })`
      - Returns the RPC's jsonb payload directly
      - DO NOT call ActivityLog.write client-side (Lesson absorbed from DELETE_EMPTY_EVENT F1)
   b. Modify `modules/crm/crm-activity-log.js`:
      - Add to ACTION_LABELS: `'crm.event.restore': 'שחזור אירוע'`
      - Add 'crm.event.restore' to ACTION_GROUPS.events array
      - In the row-render path, when action='crm.event.delete', inject a small "שחזר" button (indigo style, RTL position, in actions column or end-of-row).
      - Button click handler: Modal.confirm with title 'שחזור אירוע', message 'האם לשחזר את האירוע ואת המשתתפים שהיו רשומים אליו?'
        * On confirm → call CrmEventActions.restoreEventFromLog(row.id, getTenantId())
        * On RPC success → Toast.success('האירוע שוחזר'), reload the activity-log via loadActivityLog(), reload events list via window.reloadCrmEventsTab if available
        * On `error:'event_not_deleted'` → Toast.error('האירוע כבר פעיל')
        * On `error:'invalid_log_id'` → Toast.error('שגיאה בשחזור')
        * On `error:'event_not_found'` → Toast.error('האירוע נמחק לצמיתות ואינו ניתן לשחזור')
        * On other errors → Toast.error('שגיאה: ' + err.message)
   c. Modify `crm.html`: add `<script src="modules/crm/crm-event-restore.js"></script>` BEFORE the `<script src="modules/crm/crm-activity-log.js"></script>` line.
   d. Iron Rule 12 — verify all touched files ≤350 lines.
   e. Iron Rule 31 — integrity gate clean.
   f. Single commit: `feat(crm): "שחזר" button on activity-log delete rows`. Add: crm-event-restore.js + crm-activity-log.js + crm.html.
   g. Push origin develop.

4. Smoke test on demo tenant:
   a. Tell Daniel commit 2 is pushed; ask him to run §12 manual QA from the SPEC (round-trip + idempotency + pre-v2 backward-compat).
   b. Daniel reports back.
   c. If a failure appears that isn't a stop-trigger, log as a finding rather than stopping.

5. SPEC close:
   a. Write modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/EXECUTION_REPORT.md (success criteria outcomes per row, 2 commit hashes, smoke test result).
   b. Write FINDINGS.md (anything surprising, anything deferred — e.g., note that pre-v2 log rows can only restore the event, not the attendees).
   c. Single retro commit: `chore(spec): close RESTORE_DELETED_EVENT_UI with retrospective`. Push.

CONSTRAINTS:
- Demo tenant only. Zero prizma writes.
- 2 code commits + 1 retro = 3 commits total. NEVER merge to main.
- DO NOT modify cascade_attendee_soft_delete trigger.
- DO NOT add ActivityLog.write client-side anywhere (lesson from DELETE_EMPTY_EVENT F1).
- DO NOT use `updated_at` on crm_event_attendees — column does not exist (this is the entire reason the SPEC was rewritten to Approach B).
- Stop on any deviation per CLAUDE.md §9.

Begin with step 0.
```
