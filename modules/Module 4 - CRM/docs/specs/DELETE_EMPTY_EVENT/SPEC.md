# SPEC — DELETE_EMPTY_EVENT

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer per L-002)
> **Authored on:** 2026-05-04 (evening)
> **Module:** 4 — CRM
> **Phase:** Post-cutover follow-up
> **Source:** REC-009 (`roles/campaign-overseer/DECISIONS_LOG.md`) — Daniel agreed verbally 2026-05-04 evening.
> **Production discipline:** Prizma is LIVE post-cutover (2026-05-03). All testing on demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). No prizma writes from this SPEC's execution.

---

## 1. Goal

Add a "Delete event" capability to the CRM events screen. The button is visible to operators on the event-edit modal and lets them soft-delete an event **only if no purchases were made** (i.e. `SUM(COALESCE(purchase_amount, 0)) = 0` across all non-deleted attendees on that event). Deletion cascades to attendees (already-existing pattern) and cancels any pending message-queue rows for the event.

**Why now:** Daniel needs this to clean up QA events before any baseline-at-1 numbering reset (B6 from PRE_CUTOVER_QA_A) and to clean up cancelled/empty events from operational view. Without it, every QA cycle inflates `event_number` and clutters the events list. The condition `purchase_amount=0` is **strict** by Daniel directive — testing leads who registered but didn't buy do NOT block deletion (they're noise).

---

## 2. Background & Verified Evidence

**Pre-Authoring Sweep (per skill §"Reproduce-The-Bug-First", completed 2026-05-04):**

- ✅ `crm_events.is_deleted` column exists (boolean NOT NULL). Soft-delete pattern in place.
- ✅ `crm_event_attendees.purchase_amount` column exists (numeric, NULL allowed). This is the gate.
- ✅ Existing trigger `cascade_attendee_soft_delete()` fires on lead soft-delete and cascades to attendees. **Pattern reusable.** New trigger for event-delete will mirror this.
- ✅ `crm_message_queue.event_id` column exists (uuid). Cancelling pending sends on event delete is straightforward UPDATE.
- ✅ No existing RPC or function with name `soft_delete_event*` or `delete_event*` (Rule 21 cross-reference verified — only `cascade_attendee_soft_delete` exists, which is for the lead→attendees direction, not event→attendees).
- ✅ Activity-log type `crm.event.delete` is already registered in `modules/crm/crm-activity-log.js:49` — write-side is ready.
- ✅ Event-edit modal lives at `modules/crm/crm-event-edit.js` (86 lines, well-bounded). Footer pattern at lines 41-50 already houses 2 buttons (submit + cancel) — adding a third (delete) is a small extension. Uses `Modal.confirm` pattern proven in `crm-lead-modals.js:280-296`.
- ✅ No existing UI button for "delete event" anywhere in the CRM. Confirmed via grep across `modules/crm/`.

**Daniel's locked decisions (verbal, 2026-05-04, REC-009):**
- Q1 → condition is **strict** `purchase_amount = 0`. Testing leads who registered but didn't buy are NOT blockers.
- Q2 → soft-delete only. No hard delete option. (Implicit, follows Iron Rule 3.)
- Q3 → cascade to attendees + cancel queued messages. (Implicit, prevents orphan automation firing on a deleted event.)

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | New RPC `soft_delete_event_if_empty` exists in public schema | function returns JSON `{ success, error?, deleted_attendees, cancelled_messages }` | `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='soft_delete_event_if_empty'` |
| 3.2 | RPC takes `(p_tenant_id uuid, p_event_id uuid)` | matches lead-side delete pattern | function signature query |
| 3.3 | RPC checks `SUM(COALESCE(purchase_amount, 0))` across `is_deleted=false` attendees inside the same transaction with `SELECT FOR UPDATE` lock on event row | atomic: no race-condition window between check and delete | `EXPLAIN ANALYZE` shows lock + sum in single tx |
| 3.4 | RPC returns `{ success:false, error:'has_purchases', total_purchases:NN.NN }` when sum > 0 | no soft-delete performed | curl/psql test on demo event seeded with one purchased attendee |
| 3.5 | RPC sets `crm_events.is_deleted=true` AND cascades `crm_event_attendees.is_deleted=true` for all attendees on that event AND sets `crm_message_queue.status='cancelled'` for any rows where `event_id = $1 AND status IN ('queued', 'pending')` | three tables updated in single tx | psql test on demo |
| 3.6 | RPC enforces tenant isolation: rejects with `error:'event_not_found'` if `tenant_id` doesn't match event's tenant | 404-equivalent | psql test |
| 3.7 | New JS module `modules/crm/crm-event-delete.js` exposes `window.CrmEventActions.softDeleteEventIfEmpty(eventId, eventName, tenantId)` returning a Promise | matches `CrmLeadActions.softDeleteLead` shape | function call test in browser console |
| 3.8 | "מחק אירוע" button added to `crm-event-edit.js` footer, color `bg-rose-600` matching delete-lead style | red button visible on event-edit modal next to submit + cancel | open modal in CRM UI |
| 3.9 | Click button → confirm dialog "מחיקת אירוע — האם למחוק את האירוע? פעולה זו ניתנת לשחזור על-ידי מנהל המערכת." → on confirm, call RPC → on success: close modal, toast "האירוע נמחק", reload events list | UX matches lead-delete pattern | manual test |
| 3.10 | If RPC returns `error:'has_purchases'`, show Hebrew toast "לא ניתן למחוק — האירוע כולל רכישות בסך X ₪" with the actual amount | Daniel-friendly error | manual test on demo event seeded with purchased attendee |
| 3.11 | After successful delete, the event no longer appears in the events list (`crm-events-tab.js` already filters `is_deleted=false`) | event hidden | reload list |
| 3.12 | After successful delete, the cascaded attendees do not appear in event-day or event-detail screens | hidden | manual check |
| 3.13 | Activity log entry written: type `crm.event.delete`, payload contains event_id + event_number + event_name | 1 row in `crm_activity_log` | DB query |
| 3.14 | Iron Rule 12 — file size: every modified file ≤350 lines | `wc -l` per touched file | post-commit |
| 3.15 | Iron Rule 14 — tenant_id on every UPDATE in RPC | grep RPC body for `tenant_id =` clause on every UPDATE | post-commit |
| 3.16 | Iron Rule 15 — RPC marked `SECURITY DEFINER` with explicit `tenant_id` filter (defense-in-depth) | matches existing `cascade_attendee_soft_delete` pattern | RPC source review |
| 3.17 | Iron Rule 31 — integrity gate clean | `npm run verify:integrity` exit 0/2 | post-commit |
| 3.18 | Migration file at `supabase/migrations/{YYYYMMDD}_add_soft_delete_event_if_empty_rpc.sql` | exists, applied | `git log --name-only` |
| 3.19 | Single-commit chain: 1 commit for migration + RPC, 1 commit for JS module + UI wire-up = 2 commits total | exactly 2 commits | `git log` |
| 3.20 | Demo end-to-end test: create empty demo event → delete via UI → verify gone. Then create demo event with one attendee with `purchase_amount=100` → attempt delete → verify blocked with Hebrew error toast | both paths verified live | screenshot evidence in EXECUTION_REPORT |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Author the migration SQL + apply via Supabase MCP `apply_migration`
- Write the RPC body following the `cascade_attendee_soft_delete` pattern
- Create new JS module `modules/crm/crm-event-delete.js` (target: ≤120 lines)
- Edit `modules/crm/crm-event-edit.js` to add the delete button + handler (1 button + ~15 lines of handler code)
- Reuse existing helpers: `Modal.confirm`, `Toast.success`/`Toast.error`, `window.reloadCrmEventsTab` (verify exists)
- Use existing `T.EVENTS`, `T.EVENT_ATTENDEES`, `T.MESSAGE_QUEUE` constants from `shared.js` (verify before use)
- Run integrity gate, commit per the 2-commit plan, push to develop
- After execution + smoke test, write `EXECUTION_REPORT.md` + `FINDINGS.md`

**Executor MUST stop and ask:**
- If `T.EVENTS` / `T.EVENT_ATTENDEES` / `T.MESSAGE_QUEUE` constants do not exist with those exact names — STOP, paste actual names, ask Foreman.
- If `window.reloadCrmEventsTab` does not exist — STOP, identify the actual reload function.
- If the RPC's atomic locking pattern produces unexpected behavior in pgbench-style concurrent tests (e.g., deadlock) — STOP.
- If during smoke test, deleting an empty demo event leaves orphan rows in any related table not covered by this SPEC — STOP, inventory orphans, ask Foreman.
- Any prizma write — STOP. All testing on demo only.
- Any merge to main.
- Any deviation from the 2-commit chain in §9.

---

## 5. Stop Triggers (in addition to global per CLAUDE.md §9)

1. **Tenant-isolation breach in RPC test:** if seed data places a demo-tenant event delete somehow affecting prizma rows (or vice-versa) — STOP, Iron Rule 15 violation, do not commit.
2. **`purchase_amount` semantics mismatch:** if the executor discovers the column is populated by some auto-process and contains non-zero values for unfinished checkouts — STOP, ask Foreman whether the gate should be `purchase_amount > 0` strictly or include some other condition (e.g. `paid_at IS NOT NULL`).
3. **Trigger function name collision:** if a function called `soft_delete_event_if_empty` or `cascade_event_soft_delete` already exists in the DB — STOP, do NOT replace, ask Foreman.
4. **Existing event-delete button found anywhere:** if the executor discovers any existing UI affordance for event deletion that the SPEC's pre-flight missed — STOP, list it, ask Foreman whether to extend or replace per Rule 21.
5. **Cascaded attendee count anomaly:** if the smoke test creates an event with 5 attendees and the RPC reports `deleted_attendees=4` (off-by-one) — STOP, do not commit.

---

## 6. Rollback Plan

- **Migration rollback:** `DROP FUNCTION IF EXISTS soft_delete_event_if_empty(uuid, uuid);` — trivial, no data lost (RPC is read-then-write; the RPC itself doesn't change schema, only adds a function).
- **JS module rollback:** `git revert <commit-2>` — removes the button + handler + JS module file. UI returns to current state.
- **Mid-execution failure:** if commit-1 (migration + RPC) lands but commit-2 (UI) fails verify, the RPC sits unused in the DB. Harmless — no caller. Defer fix.
- **Post-commit data fix:** if a commit lands and an event was deleted that shouldn't have been, restore via `UPDATE crm_events SET is_deleted=false WHERE id=$1` + the cascade-attendees rows similarly. Soft-delete is reversible.

---

## 7. Out of Scope

- **Hard-delete option** (Iron Rule 3 forbids; soft-delete only).
- **Bulk-delete** (multiple events at once) — single event per click.
- **Permission gates by role** (any operator who can edit the event can delete it; permissions matrix is a separate SPEC if Daniel wants restriction).
- **Restore-deleted-event UI** — admin restores via DB if needed; no UI in this SPEC.
- **Audit log retention policy changes** — the activity-log entry is one row, no special retention.
- **B6 baseline-at-1 numbering reset** — that's a separate Daniel-only operational decision after this SPEC ships.
- **Cancelling already-sent messages** — `crm_message_log` rows for messages already dispatched stay as-is (history). Only `crm_message_queue` rows in pending/queued state are cancelled.
- **Storefront updates** — no storefront-side change. Customers who registered to a deleted event simply lose access; no notification email is sent (Daniel's call — if customers want to know, that's a future SPEC).

---

## 8. Expected Final State

```
opticup repo:
  supabase/migrations/
    {YYYYMMDD}_add_soft_delete_event_if_empty_rpc.sql      (NEW)
  modules/crm/
    crm-event-delete.js                                    (NEW, ~80-120 lines)
    crm-event-edit.js                                      (MODIFIED, +~20 lines for button + handler)
  modules/Module 4 - CRM/docs/specs/DELETE_EMPTY_EVENT/
    SPEC.md                                                (this file)
    ACTIVATION_PROMPT.md                                   (sibling)
    EXECUTION_REPORT.md                                    (added by executor)
    FINDINGS.md                                            (added by executor)
```

**Live state after SPEC closes:**
- New RPC `soft_delete_event_if_empty(uuid, uuid)` callable
- 2 commits on `develop`, pushed
- Demo tenant has at least 2 test events: 1 deleted via UI (gate passed), 1 retained (gate blocked due to seeded purchase)
- Activity log on demo has at least 1 row of type `crm.event.delete`

---

## 9. Commit Plan

**Commit 1 — backend (migration + RPC):**
- Message: `feat(crm): soft_delete_event_if_empty RPC + cascade to attendees + queue`
- Files: `supabase/migrations/{YYYYMMDD}_add_soft_delete_event_if_empty_rpc.sql`
- After commit: applied via `apply_migration` MCP (no extra deploy step — RPCs live in DB once migration applies).

**Commit 2 — frontend (JS module + UI button):**
- Message: `feat(crm): delete-event button on event-edit modal (gated on purchase_amount=0)`
- Files: `modules/crm/crm-event-delete.js` (new), `modules/crm/crm-event-edit.js` (modified)

**No merge to main** from this SPEC. Daniel handles PR + merge to main per `feedback_main_merge_via_pr.md`.

---

## 10. Cross-Reference Check (Step 1.5 sweep, completed 2026-05-04)

| Name | Lookup result | Resolution |
|------|--------------|------------|
| RPC `soft_delete_event_if_empty` | NOT in `information_schema.routines` | New — OK |
| Function `cascade_attendee_soft_delete` | EXISTS (lead→attendees direction) | Keep, do not modify; new RPC is event→attendees direction (orthogonal) |
| Activity-log type `crm.event.delete` | EXISTS in `crm-activity-log.js:49` | Reuse |
| `Modal.confirm` helper | EXISTS, used by `crm-lead-modals.js:282` | Reuse verbatim |
| `Toast.success` / `Toast.error` | EXISTS, used by `crm-lead-modals.js:289-293` | Reuse |
| `window.CrmLeadActions.softDeleteLead` | EXISTS, ~`crm-lead-actions.js` (verify file exists) | Pattern model for the new `CrmEventActions.softDeleteEventIfEmpty` |
| `window.reloadCrmEventsTab` | UNVERIFIED — executor checks at Step 1.5 of execution | If absent, use the same reload approach the events tab uses internally |
| Constants `T.EVENTS` / `T.EVENT_ATTENDEES` / `T.MESSAGE_QUEUE` | UNVERIFIED — executor checks `shared.js` | Stop trigger #3 in §5 covers mismatch |

**Sweep outcome: 8 names checked, 0 collisions, 2 names flagged for executor's pre-flight verification.**

---

## 11. Lessons Already Incorporated

From recent FOREMAN_REVIEWs and the Overseer LEARNINGS file:

- **L-001 (Overseer):** verify infrastructure + test data BEFORE dispatching → §3 #3.20 gives the executor explicit demo-seed instructions (one purchased attendee, one empty event).
- **L-003 (Overseer):** verify ground-truth before trusting state → §10 explicitly marks 2 names as UNVERIFIED + gives the executor a Step 1.5 mandate.
- **ATOMIC_CONFIRMATION_FLOW Foreman §"add platform-deploy-block escape valve":** §5 stop-trigger #3 covers function-name collision proactively.
- **ATTENDEE_COUNTER FOREMAN §"Rule-21 orphan co-staging false positive":** §9 commit plan splits backend (commit 1 — DB only) from frontend (commit 2 — JS only) so the Rule-21 hook can't trip on co-staged similar var names.
- **QUICK_REGISTER_QR_FLOW FINDINGS F3 (Make MCP unreliable for large blueprints):** N/A here — this SPEC has zero Make-scenario edits.

---

## 12. Manual QA — Daniel runs (after the 2 commits land)

On demo tenant only:

1. Open CRM → events tab. Create an empty test event "test-delete-A" with status `registration_open`.
2. Open event-edit modal → click "מחק אירוע" → confirm dialog → confirm. Expect: modal closes, toast "האירוע נמחק", events list refreshes, "test-delete-A" gone.
3. Verify in DB: `crm_events` row has `is_deleted=true`. `crm_activity_log` has 1 row of type `crm.event.delete`.
4. Create another test event "test-delete-B". Add 1 attendee (any test phone), set `purchase_amount=100` on that attendee row directly via SQL.
5. Open event-edit → click "מחק אירוע" → confirm → expect: blocked with Hebrew toast "לא ניתן למחוק — האירוע כולל רכישות בסך 100 ₪". Modal stays open.
6. Verify in DB: "test-delete-B" still has `is_deleted=false`. No cascade fired.
7. Repeat (1) but with an event that has 2 attendees, both with `purchase_amount=NULL` and 1 with a queued `crm_message_queue` row. After delete: both attendees soft-deleted, queue row marked `status='cancelled'`.

**Stop trigger:** ANY prizma write during this QA → halt and escalate. ANY unexpected error toast → screenshot + escalate.

---

## 13. Deferrals (NOT this SPEC, but related)

- **B6 baseline-at-1 numbering reset:** unblocked by this SPEC. Daniel runs operationally after delete-empty-event ships and he cleans up QA events.
- **Restore-deleted-event UI:** if Daniel finds himself wanting to restore frequently, future SPEC. Today's restore is admin-via-SQL.
- **Bulk-delete events:** future SPEC if needed; one-by-one is fine for current operational volume (low double-digit events/year per tenant).
- **Permission-gate by role:** future, only if Daniel wants to restrict managers from deleting.

---

## 14. Pre-Flight for Executor (Step 0 of ACTIVATION_PROMPT)

The executor's first action — BEFORE ANY OTHER STEP — is to commit pending Campaign Overseer artifacts. This SPEC was authored in a Cowork session that updated 4 files outside git:

- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`
- `roles/campaign-overseer/DECISIONS_LOG.md`
- `modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_FLOW/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_FLOW/FINDINGS.md`

The Cowork VM holds VM-mount drift and will not commit cleanly there. The executor (Windows desktop) sees them as untracked or modified. Before starting Commit 1 of this SPEC, the executor MUST:

1. Run First Action protocol per CLAUDE.md §1 (verify branch, pull, integrity gate).
2. Run `git status` — if the 4 files above appear as untracked/modified, perform: `git add <paths>` + `git commit -m "chore(overseer): close QUICK_REGISTER_QR_FLOW + open REC-009"` + `git push origin develop`.
3. Verify clean repo, then begin Step 1 of this SPEC.

If `git status` shows clean (a prior Daniel-driven session already committed them), skip step 2 and proceed.

---

*End of SPEC.*
