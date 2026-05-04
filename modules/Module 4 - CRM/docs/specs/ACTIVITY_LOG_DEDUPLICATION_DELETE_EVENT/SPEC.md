# SPEC — ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer per L-002)
> **Authored on:** 2026-05-04 late night (M4 closure rush)
> **Module:** 4 — CRM
> **Source finding:** F1 (HIGH) from `DELETE_EMPTY_EVENT/FINDINGS.md` — every event delete writes 2 audit rows instead of 1.
> **Production discipline:** Prizma is LIVE post-cutover. This SPEC is a 1-line patch with zero risk to data integrity (it only removes a duplicate write).

---

## 1. Goal

Remove the redundant client-side `ActivityLog.write` call in `modules/crm/crm-event-delete.js` so each event-delete produces exactly 1 audit row, written server-side by the canonical RPC `soft_delete_event_if_empty`.

**Why:** the RPC is the source of truth (atomic with the data change, includes richer details from server context). The JS-side write is a redundant noise row that pollutes activity-log queries and inflates row counts.

---

## 2. Background & Verified Evidence

**Pre-Authoring Sweep (per skill §"Reproduce-The-Bug-First", completed 2026-05-04):**

- ✅ The duplicate write exists at `modules/crm/crm-event-delete.js` lines 31-44 (verified via Read tool).
- ✅ The server-side write happens inside the RPC body (verified in `supabase/migrations/20260504_add_soft_delete_event_if_empty_rpc.sql`).
- ✅ DELETE_EMPTY_EVENT EXECUTION_REPORT §3 row 3.13 explicitly states the duplicate write was caught post-commit and ⚠️-marked.
- ✅ The RPC's audit row contains MORE detail than the JS row (it includes the resolved tenant context + transactional consistency with the data change). Server-side wins.

**Decision (per FOREMAN_REVIEW §3 of DELETE_EMPTY_EVENT):** server-side row is canonical. Remove client-side write.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | Lines 31-44 of `modules/crm/crm-event-delete.js` removed (the `try { if (window.ActivityLog) { ActivityLog.write({...}); } } catch (_) {}` block) | block gone | `grep -n "ActivityLog.write" modules/crm/crm-event-delete.js` returns 0 lines |
| 3.2 | Function `softDeleteEventIfEmpty` still works end-to-end | RPC still returns `{success:true, deleted_attendees, cancelled_messages}` and the function returns it | function call test in browser console |
| 3.3 | File size of `modules/crm/crm-event-delete.js` decreases by ~14 lines (was 50, becomes ~36) | wc -l < 40 | `wc -l modules/crm/crm-event-delete.js` |
| 3.4 | Iron Rule 12 + integrity gate clean | exit 0/2 | post-commit |
| 3.5 | Single commit | exactly 1 commit | `git log` |
| 3.6 | Demo verification: delete one new test event → activity_log gets exactly 1 new row of type `crm.event.delete` | count of new rows = 1 | DB query immediately before + after delete |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Delete the `try { if (window.ActivityLog) { ActivityLog.write({...}); } } catch (_) {}` block (lines 31-44).
- Adjust formatting / whitespace as needed to keep the file clean.
- Run integrity gate, single commit, push to develop.
- Smoke-verify on demo via 1 delete + 1 activity_log count query.
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` (likely 1-line: "No findings, fix landed cleanly.")

**Executor MUST stop and ask:**
- If `ActivityLog.write` calls exist for OTHER actions in the same file (none expected, but check) — STOP, list them, ask Foreman whether they're also redundant.
- Any merge to main.
- If the activity_log row count after a test delete is 0 (RPC also stopped writing) — STOP, RPC may have regressed independently.

---

## 5. Stop Triggers (in addition to global per CLAUDE.md §9)

1. **Server-side RPC write missing post-patch:** if test delete results in 0 activity_log rows, the RPC's audit write itself has regressed — STOP, do not commit, investigate the RPC body.
2. **More than 1 audit row per delete:** if some OTHER code path also writes for `crm.event.delete` — STOP and ask Foreman before deciding which to keep.
3. **Race condition with cascade trigger:** unexpected, but if removing the JS-side write breaks the cascade in any way — STOP.

---

## 6. Rollback Plan

Trivial: `git revert <commit>`. The deleted code block was the entire client-side audit path. Reverting restores it; double-write resumes (harmless, just noisy).

---

## 7. Out of Scope

- **Audit existing `ActivityLog.write` calls in OTHER files** for similar redundancy patterns. This SPEC fixes only the one identified in DELETE_EMPTY_EVENT F1. A broader audit may be a separate sweep SPEC.
- **Schema changes to activity_log table** — none needed.
- **Performance optimization** of activity_log inserts — out of scope.
- **Removing existing duplicate rows** from production data — Daniel's call whether to clean retroactively. NOT this SPEC.

---

## 8. Expected Final State

```
opticup repo:
  modules/crm/crm-event-delete.js   (MODIFIED — 50 lines → ~36 lines, 1 try-catch block removed)
  modules/Module 4 - CRM/docs/specs/ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT/
    SPEC.md                         (this file)
    ACTIVATION_PROMPT.md            (sibling)
    EXECUTION_REPORT.md             (added by executor)
    FINDINGS.md                     (added by executor)
```

**Live state:** every event-delete from this commit forward writes exactly 1 activity_log row (the server-side one).

---

## 9. Commit Plan

**Commit 1:**
- Message: `fix(crm): remove duplicate client-side activity-log write on event delete (RPC is canonical)`
- File: `modules/crm/crm-event-delete.js`

**No merge to main.** Daniel handles PR + merge after smoke verify.

---

## 10. Cross-Reference Check (Step 1.5 sweep, completed 2026-05-04)

| Name | Lookup result | Resolution |
|------|--------------|------------|
| `ActivityLog.write` calls in `modules/crm/crm-event-delete.js` | EXISTS (lines 31-44) | TARGET — remove |
| `activity_log` table | EXISTS (M1.5-shared) | Server-side write canonical, do not touch |
| `soft_delete_event_if_empty` RPC | EXISTS, includes its own audit write | Reuse, no change |
| Other `ActivityLog.write` callers in CRM module | UNVERIFIED at author time — executor checks at Step 1.5 | Stop trigger #2 covers if found |

---

## 11. Lessons Already Incorporated

- **DELETE_EMPTY_EVENT FOREMAN_REVIEW §4 P1 (audit-row cross-layer survey):** this SPEC is the direct fix for the audit-row-cross-layer-survey gap that caused F1.
- **Iron Rule 21 (no orphans, no duplicates):** removing the duplicate is exactly Rule 21 enforcement.

---

## 12. Manual QA — Daniel runs (after commit lands)

On demo tenant only:

1. Open CRM → events → create empty test event "test-dedup-A".
2. Run SQL: `SELECT COUNT(*) FROM activity_log WHERE action='crm.event.delete' AND tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb';` — note the baseline count N.
3. Delete the event via UI.
4. Run the same SQL — expect count = N + 1 (exactly one new row, not 2).
5. Verify: `SELECT * FROM activity_log WHERE entity_id=<event-id> AND action='crm.event.delete';` — exactly 1 row, with details containing `deleted_attendees` + `cancelled_messages`.

**Stop trigger:** count = N + 0 → RPC regression. count = N + 2 → patch didn't land.

---

## 13. Deferrals

- **Broader CRM audit-write sweep:** future SPEC if more duplicates surface.
- **Cleanup of historical duplicate rows:** Daniel's operational call, not a SPEC.

---

*End of SPEC.*
