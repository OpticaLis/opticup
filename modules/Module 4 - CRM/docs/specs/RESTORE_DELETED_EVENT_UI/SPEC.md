# SPEC — RESTORE_DELETED_EVENT_UI

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer per L-002)
> **Authored on:** 2026-05-04 late night (M4 closure rush)
> **Module:** 4 — CRM
> **Source:** REC-010 (`__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`) — Daniel agreed verbally 2026-05-04 evening, immediately after DELETE_EMPTY_EVENT smoke test passed.
> **Production discipline:** Prizma is LIVE. All testing on demo. RPC is the inverse of `soft_delete_event_if_empty` — strictly additive, no destructive operation.

---

## 1. Goal

Add a "שחזר" button to event-delete rows in the CRM activity-log screen. On click → confirm dialog → call new RPC `restore_event_from_log` which: (1) restores the event (`is_deleted=false`), (2) restores the **explicit list of attendee IDs** captured in the source delete-log row's `details->'attendee_ids'` (Approach B per Foreman scope-correction 2026-05-04), (3) writes a new activity-log row of type `crm.event.restore`, (4) does NOT auto-restore the `crm_message_queue` cancelled rows (they're stale by then — operationally irrelevant).

**Why now:** Daniel's request immediately after DELETE_EMPTY_EVENT shipped: "בעתיד צריך להוסיף אפשרות שחזור דרך מסך הלוגים." Without restore-via-UI, accidental deletes require admin-via-SQL. With the new soft-delete capability shipping, the inverse becomes operationally needed for safe-experiment confidence.

**Approach B chosen 2026-05-04** after Foreman scope-correction sweep: the original SPEC assumed `crm_event_attendees.updated_at` exists for timestamp-based scoping. It does not — the table only has `created_at` and a boolean `is_deleted`. Approach B uses the existing `activity_log.details` jsonb to record the explicit list of attendee_ids captured at delete-time. This requires extending `soft_delete_event_if_empty` to write `attendee_ids` into details, and `restore_event_from_log` to read them back. No DDL, no schema changes.

---

## 2. Background & Verified Evidence

**Pre-Authoring Sweep (per skill §"Reproduce-The-Bug-First", completed 2026-05-04, REVISED for Approach B):**

- ✅ Activity-log tab exists at `crm.html:328-329` (`<section id="tab-activity-log">`).
- ✅ Activity-log module: `modules/crm/crm-activity-log.js`. Includes `ACTION_LABELS['crm.event.delete'] = 'מחיקת אירוע'` (line 21). Read-only by design (line 5).
- ✅ **Activity-log table actual schema (verified 2026-05-04 via information_schema):** `id` uuid, `tenant_id` uuid, `branch_id` uuid (NULL OK), `user_id` uuid (NULL OK — NOT `actor_id`), `level` text NOT NULL, `action` text NOT NULL, `entity_type` text NOT NULL, `entity_id` text NULL (TEXT, NOT uuid — RPC must cast), `details` jsonb NULL, `ip_address` text NULL, `user_agent` text NULL, `created_at` timestamptz NULL.
- ✅ **Existing `crm.event.delete` audit row payload (verified live row id `f6def980-bf8a-4ef1-9b40-d799c0583023`):** `details = {"event_name": "test-delete-C", "deleted_attendees": 2, "cancelled_messages": 0}`. The current RPC does NOT capture `attendee_ids` — this SPEC adds it.
- ✅ **`crm_event_attendees` schema confirmed:** has `is_deleted` boolean and `created_at` timestamptz. Has NO `updated_at`, NO `deleted_at`. The original SPEC's "timestamp-scoped restore" approach is therefore **not feasible** as written.
- ✅ DELETE_EMPTY_EVENT cascade pattern: inline inside RPC body (not via trigger). Migration: `20260504_add_soft_delete_event_if_empty_rpc.sql`.
- ✅ No existing RPC named `restore_event*` (Rule 21 cross-reference clean).

**Daniel's locked decisions:**
- Q1 (verbal, 2026-05-04 evening) → restore via activity-log screen, NOT a separate restore-tab.
- Q2 (verbal, 2026-05-04 evening) → only `crm.event.delete` rows get the restore button. Other delete actions out of scope.
- Q3 (implicit) → soft-restore only, mirror of soft-delete. No hard-restore UI.
- Q4 (verbal, 2026-05-04 late-night Foreman scope-correction) → **Approach B** (capture attendee_ids in audit row, replay on restore) chosen over Approach A (add `is_deleted_at` column) and Approach C (event-only restore).

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | New RPC `restore_event_from_log(p_tenant_id uuid, p_log_id uuid)` exists | function returns `jsonb` | `pg_get_functiondef` |
| 3.2 | RPC validates: log row exists, log row's tenant matches p_tenant_id, log row's action='crm.event.delete', log row's entity_type='crm_events' | reject with `error:'invalid_log_id'` if any check fails | psql test on demo |
| 3.3 | RPC SELECTS event by `entity_id` (cast text→uuid) from log row, verifies `is_deleted=true` (must be currently deleted to restore) | reject with `error:'event_not_deleted'` if event already active | psql test |
| 3.4 | **MIGRATION v2 of `soft_delete_event_if_empty`:** capture attendee_ids in audit row. The RPC must, BEFORE the cascade UPDATE, run `SELECT array_agg(id::text) INTO v_attendee_ids FROM crm_event_attendees WHERE event_id=p_event_id AND tenant_id=p_tenant_id AND is_deleted=false`. Then after cascade, the audit-log INSERT's `details` jsonb must include `attendee_ids: <array>` (in addition to the existing event_name + deleted_attendees + cancelled_messages). | `details` jsonb has `attendee_ids` array | DB query on a fresh delete |
| 3.5 | RPC sets `crm_events.is_deleted=false` for the event | event row reactivated | DB query |
| 3.6 | RPC restores attendees by EXPLICIT ID list: reads `attendee_ids` from the source delete-log row's `details->'attendee_ids'`, then `UPDATE crm_event_attendees SET is_deleted=false WHERE id = ANY(<list>) AND tenant_id=p_tenant_id AND is_deleted=true`. **Backward compatibility:** if `attendee_ids` is absent from details (i.e., this is a delete-log row from before this SPEC ships), restore the event row only and return `{success:true, restored_attendees:0, note:'pre_v2_log_event_only'}` — do not attempt naive cascade. | only the explicit attendees restored; pre-v2 logs restore event only | psql test on both fresh + legacy log rows |
| 3.7 | RPC inserts new activity_log row of type `crm.event.restore` with `entity_type='crm_events'`, `entity_id=event_id::text`, `details` jsonb containing: `event_name`, `restored_attendees:N`, `source_log_id:p_log_id::text` (reference to the source delete-log row) | 1 new audit row | DB query |
| 3.8 | RPC returns `{success:true, event_id, restored_attendees:N, source_log_id}` on success | structured response | curl/psql |
| 3.9 | New JS module `modules/crm/crm-event-restore.js` exposes `window.CrmEventActions.restoreEventFromLog(logId, tenantId)` | matching the signature | function call test |
| 3.10 | Activity-log tab UI: rows with `action='crm.event.delete'` display a "שחזר" button (small, indigo or gold style, RTL position) | button visible only on delete rows | manual browse |
| 3.11 | Click "שחזר" → confirm dialog "שחזור אירוע — האם לשחזר את האירוע ואת המשתתפים שהיו רשומים אליו?" | confirm modal | manual |
| 3.12 | On confirm → call RPC → on success: toast "האירוע שוחזר", reload activity-log + reload events list | event reappears in events list | manual end-to-end |
| 3.13 | On `error:'event_not_deleted'` → toast "האירוע כבר פעיל" | friendly | manual |
| 3.14 | On `error:'invalid_log_id'` → toast "שגיאה בשחזור" | friendly | manual |
| 3.15 | New action label added to `ACTION_LABELS` map in `crm-activity-log.js`: `'crm.event.restore': 'שחזור אירוע'` | label visible in log | UI check |
| 3.16 | New action added to `ACTION_GROUPS.events` array in `crm-activity-log.js` | filterable | UI check |
| 3.17 | Iron Rule 12 — file size: every modified file ≤350 lines | wc -l per touched file | post-commit |
| 3.18 | Iron Rule 14 — tenant_id on every UPDATE in both RPCs (delete v2 + restore) | grep RPC bodies | post-commit |
| 3.19 | Iron Rule 15 — both RPCs `SECURITY DEFINER` with explicit `tenant_id` filter | RPC source review | post-commit |
| 3.20 | Iron Rule 31 — integrity gate clean | exit 0/2 | post-commit |
| 3.21 | Migration files: (a) `supabase/migrations/{YYYYMMDD}_extend_soft_delete_event_capture_attendee_ids.sql` (CREATE OR REPLACE on the existing function), (b) `supabase/migrations/{YYYYMMDD}_add_restore_event_from_log_rpc.sql` | both exist, both applied | `git log --name-only` |
| 3.22 | 2 commits on develop: 1 backend (both migrations + RPCs), 1 frontend (JS module + activity-log button + label maps) | exactly 2 commits | `git log` |
| 3.23 | Demo end-to-end: delete event #X via DELETE_EMPTY_EVENT (now v2) with 2 attendees → confirm `details.attendee_ids` is a 2-element array in the audit row → click "שחזר" → confirm → event reappears, both attendees restored, new restore-row in activity-log | round-trip works | manual smoke test |
| 3.24 | Backward-compat: pick a pre-v2 delete-log row (one written before this SPEC ships, e.g. row id `f6def980-...` from 2026-05-04 16:15:44) → click "שחזר" → expect: event-only restore (no attendee restore), success toast variant or note in result. Pre-v2 attendees NOT magically restored. | graceful degradation | manual + DB |
| 3.25 | Edge case: after a successful restore, a 2nd "שחזר" click on the SAME source log row should fail with `error:'event_not_deleted'` (since the event is now active). | idempotency guard | manual |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Author both migration files (extend `soft_delete_event_if_empty` + new `restore_event_from_log`) and apply both via Supabase MCP `apply_migration` in order.
- Write the new RPC body following the same SECURITY DEFINER + tenant-isolation pattern as `soft_delete_event_if_empty`.
- Create new JS module `modules/crm/crm-event-restore.js` (target ≤100 lines).
- Edit `modules/crm/crm-activity-log.js` to (a) add ACTION_LABELS entries, (b) add ACTION_GROUPS.events entry, (c) add the "שחזר" button render logic in the row-render path for delete rows ONLY (do not add for other delete actions).
- Edit `crm.html` to add a `<script>` tag for the new JS module before `crm-activity-log.js`.
- Reuse existing `Modal.confirm`, `Toast.success`, `Toast.error`, `sb.rpc` patterns.
- Run integrity gate, 2-commit chain, push to develop.
- After execution + smoke test, write `EXECUTION_REPORT.md` + `FINDINGS.md`.

**Executor MUST stop and ask:**
- If the existing `soft_delete_event_if_empty` RPC source differs materially from what's documented in §2 — STOP, paste actual definition, ask Foreman.
- If the activity-log row schema differs from §2 — STOP, paste actual schema.
- If `array_agg(id::text)` produces unexpected output (e.g. NULL on empty event) — STOP. Recommended handling: empty array `'{}'::text[]` for empty events, then restore attendee count = 0.
- If a pre-v2 delete log row's `details` is missing the `attendee_ids` key, the RPC must NOT throw — it must return `success:true, restored_attendees:0, note:'pre_v2_log_event_only'`. Verify this branch is implemented before committing.
- Any prizma write — STOP. Demo only.
- Any merge to main.

---

## 5. Stop Triggers (in addition to global per CLAUDE.md §9)

1. **Tenant-isolation breach in restore:** if a demo log_id can restore a prizma event (or vice-versa) — STOP, Iron Rule 15 violation.
2. **Cascade-restore by ID list fails on legacy log:** if a pre-v2 delete log row (no `attendee_ids` in details) causes the RPC to error 500 instead of returning the graceful pre_v2 path — STOP, fix the branch.
3. **Activity-log row not found:** if `restore_event_from_log` is called with a log_id that doesn't exist, the RPC must return `error:'invalid_log_id'`, not 500.
4. **Multiple restores of same event:** if a delete is restored once, then deleted again, then restored again — the 2nd restore must use the 2nd delete's log_id, not the 1st. STOP if the executor's implementation uses any "last delete" heuristic instead of the explicit log_id.
5. **Existing restore button anywhere:** if the executor finds any pre-existing restore UI (unlikely but possible) — STOP, don't duplicate.
6. **Migration v2 of soft_delete_event_if_empty doesn't apply cleanly:** if `apply_migration` errors on the CREATE OR REPLACE — STOP, paste error. Likely cause: signature drift since SPEC was authored. Fix by matching current signature.
7. **`attendee_ids` array not actually populated in fresh delete:** after applying migration v2 + creating a fresh test delete with attendees, query the audit row and confirm `details->'attendee_ids'` is a non-null jsonb array. If null or missing — STOP, the array_agg expression is wrong.

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
    {YYYYMMDD}_extend_soft_delete_event_capture_attendee_ids.sql   (NEW — CREATE OR REPLACE on existing function, adds attendee_ids capture into details jsonb)
    {YYYYMMDD+1}_add_restore_event_from_log_rpc.sql                (NEW)
  modules/crm/
    crm-event-restore.js                                            (NEW, target ≤100 lines)
    crm-activity-log.js                                             (MODIFIED — adds 1 ACTION_LABEL entry, 1 ACTION_GROUPS entry, button render + handler in row template)
  crm.html                                                          (MODIFIED — adds <script src="modules/crm/crm-event-restore.js"> before crm-activity-log.js)
  modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/
    SPEC.md                                                         (this file)
    ACTIVATION_PROMPT.md                                            (sibling)
    EXECUTION_REPORT.md                                             (added by executor)
    FINDINGS.md                                                     (added by executor)
```

**Live state:** demo tenant has at least 1 fresh delete with `attendee_ids` array in audit details + 1 round-tripped event (delete → restore → working) + 1 restore activity-log row.

---

## 9. Commit Plan

**Commit 1 — Backend (migration v2 of delete + new restore RPC):**
- Message: `feat(crm): restore_event_from_log RPC + extend soft_delete_event_if_empty to capture attendee_ids`
- Files: BOTH migrations together — `supabase/migrations/{YYYYMMDD}_extend_soft_delete_event_capture_attendee_ids.sql` AND `supabase/migrations/{YYYYMMDD+1}_add_restore_event_from_log_rpc.sql`. Executor applies both via `apply_migration` MCP in order before commit.

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

1. **Round-trip test:** create test event "test-restore-A", add 2 attendees (test phones 0537889878 + 0503348349, no purchases). Delete via UI.
2. Open activity-log tab → confirm a `מחיקת אירוע` row exists for "test-restore-A". DB-verify (or trust the new restore button shows up): the row's `details->'attendee_ids'` is an array of 2 UUIDs.
3. Click "שחזר" on that row → confirm dialog → confirm.
4. Expect: toast "האירוע שוחזר", activity-log refreshes (new `שחזור אירוע` row appears at top), events list refreshes (event back), attendees are back as registered.
5. DB verify: event `is_deleted=false`, both attendees `is_deleted=false`, 1 new activity_log row with `action='crm.event.restore'` and `details.source_log_id` pointing at the original delete row.
6. **Idempotency test:** click "שחזר" on the same source log row a second time → expect failure toast "האירוע כבר פעיל" (event already active).
7. **Pre-v2 backward-compat test:** find a delete-log row from before this SPEC shipped (the audit row id from earlier today, e.g. one from 2026-05-04 16:15) → click "שחזר" → expect: event-only restore (no attendees come back; if the event was hard-deleted via earlier QA, restoration shows `error:'event_not_deleted'` instead, which is also correct).

**Stop triggers:** if attendees from a DIFFERENT event get restored, the ID-list scoping has a bug. If pre-v2 row throws 500 instead of returning a graceful pre_v2 path, the backward-compat branch is wrong. Either case → halt and escalate.

---

## 13. Deferrals (NOT this SPEC, but related)

- **Restore for OTHER entity types** (leads, templates) — separate SPECs if Daniel wants.
- **Restore-history UI** — show "this event was deleted at X, restored at Y" timeline. Future SPEC if useful.
- **Auto-restore expiry** — should restore-availability expire after 30 days? Daniel's call. Currently restores work indefinitely.

---

*End of SPEC.*
