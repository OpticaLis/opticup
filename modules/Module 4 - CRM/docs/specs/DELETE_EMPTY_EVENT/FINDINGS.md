# FINDINGS — DELETE_EMPTY_EVENT

> **Logged by:** opticup-executor
> **Logged on:** 2026-05-04
> **Scope:** items discovered during execution that are NOT in the SPEC.
> Each entry has severity, location, description, and suggested next action.
> "One concern per task" — none of these were fixed inside this SPEC.

---

## F1 — Double activity_log write on event delete (HIGH)

**Severity:** HIGH (data integrity / audit accuracy)

**Location:**
- Server: `supabase/migrations/20260504_add_soft_delete_event_if_empty_rpc.sql` lines 95–110 (the `INSERT INTO public.activity_log` block inside the RPC)
- Client: `modules/crm/crm-event-delete.js` lines 28–43 (the `ActivityLog.write({...})` block)

**Description:** Each successful event-delete writes TWO rows into
`activity_log` with `action='crm.event.delete'`:

1. From the RPC (server-side, atomic with the data change). Details:
   `{event_id, event_number, event_name, deleted_attendees, cancelled_messages}`
2. From the JS module (client-side, fire-and-forget, no retry). Details:
   `{event_name, deleted_attendees, cancelled_messages}` — missing
   `event_id` and `event_number`.

Verified live against demo: `SELECT … FROM activity_log WHERE action =
'crm.event.delete' AND tenant_id = '8d8cfa7e…'` returned 4 rows for 2
deletes (test-delete-A and test-delete-C).

This violates SPEC §3.13 ("Activity log entry written … 1 row in
`crm_activity_log`" — note the SPEC's table-name typo, which is itself F3
below). It also degrades audit-log usefulness: anyone querying the table
will see duplicate events at slightly different timestamps (~300ms apart).

**Why it happened:** The RPC was authored to match the existing
`cascade_attendee_soft_delete` server-side pattern (audit row written
inside the function), AND the JS module was authored to match the
existing `crm-event-actions.js` client-side pattern (audit row written
after every mutation). Both are correct in isolation — but the SPEC
didn't pick one. ACTIVATION_PROMPT step 2.b said "Insert activity-log row
(use existing helper or direct INSERT into crm_activity_log…)" — "or"
allowed both interpretations.

**Suggested next action:** Open a small follow-up SPEC (DELETE_EMPTY_EVENT_DEDUP_AUDIT)
that does ONE thing: remove the `ActivityLog.write` block from
`crm-event-delete.js` (lines 28–43). Single-commit, single-file,
~15-line deletion. Server-side wins (richer details, atomic with the
data change). Smoke-test by repeating the delete on demo and verifying
exactly one new `activity_log` row.

---

## F2 — message-queue cancel branch not exercised in smoke test (LOW)

**Severity:** LOW (coverage gap, not a defect)

**Location:** `supabase/migrations/20260504_add_soft_delete_event_if_empty_rpc.sql`
lines 78–88 (the `WITH cancelled_msgs AS (UPDATE … crm_message_queue …)`
block).

**Description:** SPEC §12 step 7 specified "an event that has 2 attendees,
both with `purchase_amount=NULL` and 1 with a queued `crm_message_queue`
row. After delete: both attendees soft-deleted, queue row marked
`status='cancelled'`." The actual smoke test (Daniel, demo) covered the
2-attendee path but did NOT seed a `crm_message_queue` row, so
`cancelled_messages` returned `0` for both deletes. The branch IS
implemented and the SQL is straightforward (`UPDATE … WHERE event_id =
$1 AND status IN ('queued','pending')`), but it has not been live-verified.

Implementation evidence: live audit row `details.cancelled_messages = 0`
for both demo deletes, confirming the branch ran without error (just
matched 0 rows).

**Suggested next action:** No follow-up SPEC. Low risk because (a) the
SQL is trivial and (b) the queued-message rows are themselves rare on
the demo tenant. Document as a smoke-test enhancement: future similar
SPECs (any RPC that cascades to `crm_message_queue`) should include a
demo-seed script that inserts a queued message before the manual QA, so
the cancel branch is exercised end-to-end. This is a process improvement,
not a code fix.

---

## F3 — SPEC §3.13 references non-existent `crm_activity_log` table (INFO)

**Severity:** INFO (documentation drift, not a code defect)

**Location:** `modules/Module 4 - CRM/docs/specs/DELETE_EMPTY_EVENT/SPEC.md`
§3.13 ("1 row in `crm_activity_log`") and §10 row "Activity-log type
`crm.event.delete` … EXISTS in `crm-activity-log.js:49`" — the JS file
exists, the DB table named `crm_activity_log` does NOT.

**Description:** Optic Up has ONE shared `activity_log` table (M1.5-owned).
CRM-scoped rows are filtered by `entity_type IN ('crm_leads','crm_events',
'crm_event_attendees', …)`. There is no `crm_activity_log` table. Daniel
hit this during smoke-test verification: his SQL `SELECT … FROM
crm_activity_log` errored with "relation does not exist". The actual
rows ARE being written, just to `activity_log`.

**Suggested next action:** No SPEC needed. Two small fixes for the
record's sake (could be folded into the F1 follow-up SPEC):

1. SPEC.md §3.13 — replace `crm_activity_log` → `activity_log`.
2. SPEC.md §10 — clarify that `crm-activity-log.js` is the CRM-scoped
   *reader* of `activity_log`; writes go through `ActivityLog.write` or
   directly into `activity_log` from RPCs.

Or if Daniel prefers, leave the SPEC as-is (historical document) and
just record this finding for the project's executive vocabulary.

---

## F4 — REC-010 forward-link: restore-deleted-event UI via activity_log (INFO)

**Severity:** INFO (forward-link to a future feature)

**Location:** N/A — feature request anchor.

**Description:** Daniel opened REC-010 during smoke test (recorded by
the Campaign Overseer in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`):
"add restore-deleted-event UI via the activity-logs screen." Use case:
operators occasionally delete the wrong event (oversight cleanup), and
the current restore path is admin-via-SQL (`UPDATE crm_events SET
is_deleted=false WHERE id=$1` + cascade undo). A UI restore button
on the `crm.event.delete` row in the activity-log tab would be a small,
contained ergonomic upgrade.

**Suggested next action:** When Daniel's queue surfaces REC-010 for
prioritization, the Foreman authors a SPEC. Pre-flight should reference
this FINDINGS file to inherit the audit-log-row shape (event_id,
event_number, event_name) — and should fold in F3's SPEC.md fixes if
not yet done. Rough scope estimate: 1 commit (~50 lines JS +
existing-RPC reuse), no migration (the data is already in
`activity_log` and `crm_events`).

---

*End of FINDINGS. 4 findings: 1 HIGH, 1 LOW, 2 INFO.*
