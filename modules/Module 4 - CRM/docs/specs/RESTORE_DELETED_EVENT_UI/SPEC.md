# SPEC — RESTORE_DELETED_EVENT_UI

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer per L-002)
> **Authored on:** 2026-05-04 late night (M4 closure rush)
> **Module:** 4 — CRM
> **Source:** REC-010 (`__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`) — Daniel agreed verbally 2026-05-04 evening, immediately after DELETE_EMPTY_EVENT smoke test passed.
> **Production discipline:** Prizma is LIVE. All testing on demo. RPC is the inverse of `soft_delete_event_if_empty` — strictly additive, no destructive operation.

---

## 1. Goal

Add a "שחזר" button to event-delete rows in the CRM activity-log screen. On click → confirm dialog → call new RPC `restore_event_from_log` which: (1) restores the event (`is_deleted=false`), (2) restores the attendees that were soft-deleted **at the same timestamp** as the original delete (using the activity-log entry's `created_at` as the scope marker), (3) writes a new activity-log row of type `crm.event.restore`, (4) does NOT auto-restore the `crm_message_queue` cancelled rows (they're stale by then — operationally irrelevant).

**Why now:** Daniel's request immediately after DELETE_EMPTY_EVENT shipped: "בעתיד צריך להוסיף אפשרות שחזור דרך מסך הלוגים." Without restore-via-UI, accidental deletes require admin-via-SQL. With the new soft-delete capability shipping, the inverse becomes operationally needed for safe-experiment confidence.

---

## 2. Background & Verified Evidence

**Pre-Authoring Sweep (per skill §"Reproduce-The-Bug-First", completed 2026-05-04):**

- ✅ Activity-log tab exists at `crm.html:328-329` (`<section id="tab-activity-log">`).
- ✅ Activity-log module: `modules/crm/crm-activity-log.js`. Includes `ACTION_LABELS['crm.event.delete'] = 'מחיקת אירוע'` (line 21). Read-only by design (line 5: "Read-only — never writes to activity_log.").
- ✅ Activity-log row schema: `id`, `tenant_id`, `entity_type`, `entity_id`, `action`, `actor_id`, `details` (jsonb), `created_at`, `level`. The `details` jsonb on a `crm.event.delete` row contains `event_name`, `deleted_attendees`, `cancelled_messages` (per DELETE_EMPTY_EVENT RPC).
- ✅ DELETE_EMPTY_EVENT cascade trigger pattern: `cascade_attendee_soft_delete()` is for lead→attendees direction. The event-delete cascade is implemented inline inside the RPC body (not via trigger) — see migration `20260504_add_soft_delete_event_if_empty_rpc.sql`. The reverse direction (event-restore) will similarly be inline RPC, not trigger.
- ✅ `crm_event_attendees.is_deleted` is updated by the delete RPC at the same transaction timestamp as the event row. **Critical:** restoration scope MUST use the activity-log row's `created_at` to filter which attendees to restore — naive `is_deleted=false` on all event attendees would resurrect rows that were independently deleted before the event-level delete.
- ✅ No existing RPC named `restore_event*` (Rule 21 cross-reference clean).

**Daniel's locked decisions (verbal, 2026-05-04):**
- Q1 → restore via activity-log screen ("שחזור דרך מסך הלוגים"), NOT a separate restore-tab.
- Q2 → only `crm.event.delete` rows get the restore button. Other delete actions (lead.delete, etc.) are out of scope for this SPEC.
- Q3 (implicit) → soft-restore only, mirror of soft-delete. No UI for hard-restore.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | New RPC `restore_event_from_log(p_tenant_id uuid, p_log_id uuid)` exists | function returns `jsonb` | `pg_get_functiondef` |
| 3.2 | RPC validates: log row exists, log row's tenant matches p_tenant_id, log row's action='crm.event.delete', log row's entity_type='crm_events' | reject with `error:'invalid_log_id'` if any check fails | psql test on demo |
| 3.3 | RPC SELECTS event by `entity_id` from log row, verifies `is_deleted=true` (must be currently deleted to restore) | reject with `error:'event_not_deleted'` if event already active | psql test |
| 3.4 | RPC sets `crm_events.is_deleted=false` for the event | event row reactivated | DB query |
| 3.5 | RPC restores attendees scoped by timestamp: `UPDATE crm_event_attendees SET is_deleted=false WHERE event_id=$1 AND is_deleted=true AND tenant_id=$2 AND updated_at >= log_row.created_at - INTERVAL '5 seconds' AND updated_at <= log_row.created_at + INTERVAL '5 seconds'` (5-second window absorbs clock skew + multi-row update transaction time) | only attendees soft-deleted at same time as event | psql test with mixed-vintage attendees |
| 3.6 | RPC inserts new activity_log row of type `crm.event.restore`, with details: event_id, event_number, event_name, restored_attendees count, source_log_id (reference to the original delete log row) | 1 new audit row | DB query |
| 3.7 | RPC returns `{success:true, event_id, restored_attendees:N}` on success | structured response | curl/psql |
| 3.8 | New JS module `modules/crm/crm-event-restore.js` exposes `window.CrmEventActions.restoreEventFromLog(logId, tenantId)` | matching the signature | function call test |
| 3.9 | Activity-log tab UI: rows with `action='crm.event.delete'` display a "שחזר" button (small, gold/indigo style, RTL position) | button visible only on delete rows | manual browse |
| 3.10 | Click "שחזר" → confirm dialog "שחזור אירוע — האם לשחזר את האירוע ואת המשתתפים שהיו רשומים אליו?" | confirm modal | manual |
| 3.11 | On confirm → call RPC → on success: toast "האירוע שוחזר", reload activity-log + reload events list | event reappears in events list | manual end-to-end |
| 3.12 | On `error:'event_not_deleted'` → toast "האירוע כבר פעיל" | friendly | manual |
| 3.13 | On `error:'invalid_log_id'` → toast "שגיאה בשחזור" | friendly | manual |
| 3.14 | New action label added to `ACTION_LABELS` map in `crm-activity-log.js`: `'crm.event.restore': 'שחזור אירוע'` | label visible in log | UI check |
| 3.15 | New action added to `ACTION_GROUPS.events` array in `crm-activity-log.js` | filterable | UI check |
| 3.16 | Iron Rule 12 — file size: every modified file ≤350 lines | wc -l per touched file | post-commit |
| 3.17 | Iron Rule 14 — tenant_id on every UPDATE in RPC | grep RPC body | post-commit |
| 3.18 | Iron Rule 15 — RPC `SECURITY DEFINER` with explicit `tenant_id` filter | RPC source review | post-commit |
| 3.19 | Iron Rule 31 — integrity gate clean | exit 0/2 | post-commit |
| 3.20 | Migration file at `supabase/migrations/{YYYYMMDD}_add_restore_event_from_log_rpc.sql` | exists, applied | `git log --name-only` |
| 3.21 | 2 commits on develop: 1 backend (migration + RPC), 1 frontend (JS module + activity-log button + label maps) | exactly 2 commits | `git log` |
| 3.22 | Demo end-to-end: delete event #X via DELETE_EMPTY_EVENT → confirm event gone, attendees soft-deleted → click "שחזר" on activity-log delete row → confirm → event reappears with all attendees restored, new restore-row appears in activity-log | round-trip works | manual smoke test |
| 3.23 | Demo edge case: delete event #Y, then independently soft-delete one attendee an hour later via direct UPDATE → restore → only the cascade-deleted attendees restore, the manually-deleted-later one stays deleted | timestamp scoping holds | manual + DB query |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Author the migration SQL + apply via Supabase MCP `apply_migration`.
- Write the RPC body following the inverse of `soft_delete_event_if_empty` pattern.
- Create new JS module `modules/crm/crm-event-restore.js` (target ≤100 lines).
- Edit `modules/crm/crm-activity-log.js` to (a) add ACTION_LABELS entries, (b) add ACTION_GROUPS.events entry, (c) add the "שחזר" button render logic in the row-render path for delete rows.
- Edit `crm.html` if the new JS module needs a `<script>` tag (it does).
- Reuse existing `Modal.confirm`, `Toast.success`, `Toast.error`, `sb.rpc` patterns.
- Run integrity gate, 2-commit chain, push to develop.
- After execution + smoke test, write `EXECUTION_REPORT.md` + `FINDINGS.md`.

**Executor MUST stop and ask:**
- If the activity-log row schema differs from the assumption (no `details` jsonb, or `created_at` not present) — STOP, paste actual schema.
- If the 5-second timestamp window in §3.5 produces unexpected behavior in concurrent-delete tests — STOP, ask Foreman about widening or narrowing.
- If during smoke §3.23, the timestamp scoping incorrectly restores the manually-deleted-later attendee — STOP, the scoping logic needs refinement.
- Any prizma write — STOP. Demo only.
- Any merge to main.

---

## 5. Stop Triggers (in addition to global per CLAUDE.md §9)

1. **Tenant-isolation breach in restore:** if a demo log_id can restore a prizma event (or vice-versa) — STOP, Iron Rule 15 violation.
2. **Cascade-restore over-shoot:** if the timestamp scoping restores attendees that were not part of the original delete — STOP, narrow the window or add additional filter.
3. **Activity-log row not found:** if `restore_event_from_log` is called with a log_id that doesn't exist, the RPC must return `error:'invalid_log_id'`, not 500.
4. **Multiple restores of same event:** if a delete is restored once, then deleted again, then restored again — the 2nd restore must use the 2nd delete's log_id, not the 1st. STOP if the executor's implementation uses any "last delete" heuristic instead of the explicit log_id.
5. **Existing restore button anywhere:** if the executor finds any pre-existing restore UI (unlikely but possible) — STOP, don't duplicate.

---

## 6. Rollback Plan

- **Migration rollback:** `DROP FUNCTION IF EXISTS restore_event_from_log(uuid, uuid);` — RPC is purely additive.
- **JS rollback:** `git revert <commit-2>` — removes the button + JS module + label-map entries.
- **Mid-execution failure:** if commit-1 lands but commit-2 fails verify, RPC sits unused. Harmless.
- **Post-commit data fix:** if a restore was performed incorrectly (wrong attendees restored), `UPDATE` to soft-delete them again. No data loss.

---

## 7. Out of Scope

- **Restore button for OTHER delete actions** (`crm.lead.delete`, `crm.template.deactivate`, etc.). This SPEC handles only `crm.event.delete`.
- **Bulk-restore** (restore multiple events at once) — not requested.
- **Auto-restore of cancelled message-queue rows** — Daniel's call is they're stale; do not restore.
- **Audit-log retention policy changes** — out of scope.
- **Permission gates by role** — any operator who can see the activity-log tab can click שחזר. Permissions matrix is a separate SPEC if Daniel wants restriction.
- **Restore UI for events with NEW attendees added after delete** — i.e., what if an event was deleted, then someone separately restored it via SQL and added attendees, then THIS UI tries to restore via the original log_id? The RPC's check `is_deleted=true` (§3.3) blocks this case with `error:'event_not_deleted'`. No further handling needed.

---

## 8. Expected Final State

```
opticup repo:
  supabase/migrations/
    {YYYYMMDD}_add_restore_event_from_log_rpc.sql      (NEW)
  modules/crm/
    crm-event-restore.js                               (NEW, target ≤100 lines)
    crm-activity-log.js                                (MODIFIED — adds 1 ACTION_LABEL entry, 1 ACTION_GROUPS entry, button render + handler in row template)
  crm.html                                             (MODIFIED — adds <script src="modules/crm/crm-event-restore.js"> before crm-activity-log.js)
  modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/
    SPEC.md                                            (this file)
    ACTIVATION_PROMPT.md                               (sibling)
    EXECUTION_REPORT.md                                (added by executor)
    FINDINGS.md                                        (added by executor)
```

**Live state:** demo tenant has at least 1 round-tripped event (delete → restore → working) + 1 restore activity-log row.

---

## 9. Commit Plan

**Commit 1 — Backend (migration + RPC):**
- Message: `feat(crm): restore_event_from_log RPC + cascade restore by timestamp scope`
- Files: `supabase/migrations/{YYYYMMDD}_add_restore_event_from_log_rpc.sql`

**Commit 2 — Frontend (JS module + activity-log button):**
- Message: `feat(crm): "שחזר" button on activity-log delete rows`
- Files: `modules/crm/crm-event-restore.js` (new), `modules/crm/crm-activity-log.js` (modified), `crm.html` (modified)

**No merge to main.** Daniel handles PR + merge after smoke verify.

---

## 10. Cross-Reference Check (Step 1.5 sweep, completed 2026-05-04)

| Name | Lookup result | Resolution |
|------|--------------|------------|
| RPC `restore_event_from_log` | NOT in `information_schema.routines` | New — OK |
| RPC `soft_delete_event_if_empty` | EXISTS (DELETE_EMPTY_EVENT) | Inverse pattern; reuse approach but don't modify |
| Activity-log table `activity_log` | EXISTS (M1.5-shared) | Reuse — read for source row, write for restore row |
| ACTION_LABELS in `crm-activity-log.js` | EXISTS line 11-34 | Add 1 entry |
| ACTION_GROUPS in `crm-activity-log.js` | EXISTS line 47-54 | Add to `events` group |
| `Modal.confirm`, `Toast.success`, `Toast.error` | EXISTS, reused throughout CRM | Reuse |
| `window.CrmEventActions` namespace | EXISTS (DELETE_EMPTY_EVENT created it) | Add new method to existing namespace |
| `sb.rpc(...)` idiom | EXISTS, established CRM convention | Reuse |
| `loadActivityLog` reload function | EXISTS (line 6 of crm-activity-log.js) | Reuse |
| Row-render path for activity-log entries | UNVERIFIED at author time — executor checks at Step 1.5 | Stop trigger #5 covers if confusion |

**Sweep outcome: 10 names checked, 0 collisions, 1 flagged for executor pre-flight.**

---

## 11. Lessons Already Incorporated

- **DELETE_EMPTY_EVENT FOREMAN_REVIEW §4 P1 (audit-row cross-layer survey):** the new RPC writes the audit row server-side; the JS module does NOT call `ActivityLog.write` (lesson absorbed from F1). Single canonical write.
- **DELETE_EMPTY_EVENT FOREMAN_REVIEW §4 P2 (Iron Rule scope clarity):** ACTIVATION_PROMPT below quotes `sb.rpc()` is fine, no Rule 7 cite.
- **DELETE_EMPTY_EVENT FOREMAN_REVIEW §1 lesson (table name):** §2 explicitly notes the table is shared `activity_log`, not `crm_activity_log`.
- **L-001 (verify infrastructure + test data):** §3.22 + §3.23 require pre-existing demo soft-deleted events; the executor's smoke test must seed if absent.

---

## 12. Manual QA — Daniel runs (after the 2 commits land)

On demo tenant only:

1. Find a recently-deleted event in the activity-log tab (you can create one fresh: create test event "test-restore-A", add 2 attendees, delete it). Note the activity-log row.
2. Click "שחזר" on that row → confirm dialog → confirm.
3. Expect: toast "האירוע שוחזר", activity-log refreshes (now shows a new `שחזור אירוע` row), events list refreshes (event is back), attendees are back as registered.
4. Verify in DB: event `is_deleted=false`, both attendees `is_deleted=false`, 1 new activity-log row with `action='crm.event.restore'`.
5. Edge-case test: create event "test-restore-B", add 2 attendees. Soft-delete attendee #1 directly via SQL: `UPDATE crm_event_attendees SET is_deleted=true, updated_at=now() WHERE id=<id>;`. Wait 30 seconds. Now delete the event via UI (this cascades attendee #2 too). Click "שחזר" — expect: only attendee #2 restores (cascade scope), attendee #1 stays deleted (was deleted at a different timestamp).

**Stop trigger:** if attendee #1 ALSO comes back, the timestamp scoping is too wide. Halt and escalate.

---

## 13. Deferrals (NOT this SPEC, but related)

- **Restore for OTHER entity types** (leads, templates) — separate SPECs if Daniel wants.
- **Restore-history UI** — show "this event was deleted at X, restored at Y" timeline. Future SPEC if useful.
- **Auto-restore expiry** — should restore-availability expire after 30 days? Daniel's call. Currently restores work indefinitely.

---

*End of SPEC.*
