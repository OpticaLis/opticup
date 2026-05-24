# SPEC — M6_RECALL_ENGINE

> **Location:** `modules/Module 6 - Prescriptions/docs/specs/M6_RECALL_ENGINE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, night-run-2026-05-24)
> **Authored on:** 2026-05-24
> **Module:** 6 — Prescriptions
> **Phase:** C — Recall Engine (pg_cron + engine function)

---

## 0. Pre-Authoring Reality Check

- `prescription_recall_axes` table exists (M6_SCHEMA). Columns: id, tenant_id, prescription_id, prescription_kind (glasses/contacts), axis_kind (5 variants), due_at (date), is_enabled (bool), triggered_at (timestamptz), created_at.
- `compute_recall_due_dates` RPC exists — populates recall axes from the prescription's valid_from + expires_at + type config. Called by `commit_prescription`. Verified live.
- `v_recall_due` view exists — window-fn 1-per-prescription showing the earliest enabled recall axis per prescription. Verified live.
- Recall axis kinds (recall_axis_kind enum): `next_exam`, `health_fund_validity`, `prescription_validity`, `fit_check`, `glasses_delivery`.
- Glasses day-1 axes: next_exam (12m default), health_fund_validity, prescription_validity, glasses_delivery (disabled until order created). = 4 axes.
- Contacts day-1 axes: next_exam, health_fund_validity, prescription_validity, fit_check (1m for first fitting). = 4+1 = 5 axes.
- No existing pg_cron job for M6 recall.

### Baselines (measured 2026-05-24)

| Metric | Value | How measured |
|---|---|---|
| recall_axis rows (demo) | count from `SELECT count(*) FROM prescription_recall_axes WHERE tenant_id = '8d8cfa7e-...'` | Live query |
| recall_axis rows (prizma) | 0 (no M6 data on prizma yet) | Expected |
| pg_cron jobs | `SELECT count(*) FROM cron.job` | Live query |

---

## 1. Goal

Create the recall-engine pg_cron job that fires daily, scans `prescription_recall_axes` for due or overdue axes, and dispatches recall notifications to M4's messaging pipeline. The engine is infrastructure-only (no UI) — the display is handled by the editor's recall axes section.

## 2. Background & Motivation

M6 Phase A+B created the recall data model (`prescription_recall_axes` + `compute_recall_due_dates` + `v_recall_due`). The data is populated when a prescription is committed. This SPEC adds the cron-triggered engine function that reads due axes and dispatches recall actions. Day-1 recall = a database marker + optional M4 message dispatch. The engine function is SECURITY DEFINER (service_role context) and runs once daily.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected |
|---|---|---|
| SC-1 | New function `process_due_recalls(p_tenant_id uuid)` created | SECURITY DEFINER, service_role-only |
| SC-2 | pg_cron job `m6_recall_engine` created, schedule `0 8 * * *` (daily at 08:00 UTC) | Job active |
| SC-3 | Function scans `prescription_recall_axes` WHERE `due_at <= CURRENT_DATE AND triggered_at IS NULL AND is_enabled = true` | Correct filter |
| SC-4 | For each due axis: sets `triggered_at = now()` | Marks as processed |
| SC-5 | For each due axis where recall → message: inserts into `crm_message_queue` via existing M4 patterns | Message dispatched per tenant config |
| SC-6 | Function is idempotent — re-running on same day processes 0 new axes | triggered_at prevents re-fire |
| SC-7 | Block A guard: service_role bypass, authenticated+anon denied | 42501 on non-service caller |
| SC-8 | REVOKE EXECUTE FROM anon, public; GRANT EXECUTE TO authenticated (Block A denies anyway) | Correct grants |
| SC-9 | `npm run verify:integrity` PASS | exit 0 |
| SC-10 | Demo test: create prescription → commit → verify recall axes populated → simulate due date → run engine → verify triggered_at set | End-to-end demo test |

## 4. Autonomy Envelope

- New: 1 RPC function + 1 pg_cron job + 1 migration (via Supabase MCP).
- Read/write access: prescription_recall_axes (UPDATE triggered_at), crm_message_queue (INSERT, if dispatching).
- No UI changes.
- Demo tenant for testing.

## 5. Stop-on-Deviation Triggers

- M4 message_queue schema or dispatch pattern has changed from what's documented → STOP
- pg_cron extension not available → STOP (unlikely, already used by M4)
- Recall axis enum values differ from what's in this SPEC → STOP

## 6. Rollback Plan

- DROP FUNCTION process_due_recalls;
- DELETE FROM cron.job WHERE jobname = 'm6_recall_engine';
- No data loss — triggered_at is a timestamp, rolling back the function leaves existing data intact.

## 7. Destructive Operations

**None.** (Function and cron job are additive. Rollback via DROP is standard but not part of normal execution.)

## 8. Out of Scope

- Recall rules configuration UI (M12 recall-rules module)
- Custom recall intervals per tenant (day-1 = hardcoded intervals from prescription_types config)
- Recall notification templates (M4 owns; this SPEC dispatches to existing M4 pipeline)
- Per-axis enable/disable UI (editor displays only; editing deferred to M12)

## 9. Expected Final State

### New DB objects

| Object | Type | Notes |
|---|---|---|
| `process_due_recalls(p_tenant_id uuid)` | RPC function | SECURITY DEFINER, Block A, service_role-only |
| `m6_recall_engine` | pg_cron job | Daily 08:00 UTC, calls process_due_recalls for each active tenant |

### Modified docs

| Path | Change |
|---|---|
| `modules/Module 6 - Prescriptions/docs/db-schema.sql` | Add function + cron documentation |
| `modules/Module 6 - Prescriptions/docs/MODULE_MAP.md` | Add function entry |
| `modules/Module 6 - Prescriptions/docs/SESSION_CONTEXT.md` | Update to Phase C CLOSED |
| `docs/GLOBAL_MAP.md` | Add function to M6 RPC section |

## 10. Commit Plan

| # | Scope | Files |
|---|---|---|
| C1 | Create function + cron job via MCP migration | (DB-only, no file commit) |
| C2 | Demo test + verify | (verification step) |
| C3 | Docs + SPEC closure | db-schema.sql, MODULE_MAP, SESSION_CONTEXT, GLOBAL_MAP, SPEC closure files |

## 11. Dependencies / Preconditions

- M6_SCHEMA Phase A+B CLOSED (provides recall_axes table + compute_recall_due_dates)
- pg_cron extension available (verified: M4 already uses it for fb_capi_dispatch_consumer)
- M4 message_queue pattern understood (for optional message dispatch)

## 12. Lessons Already Incorporated

- M6_SCHEMA P-AUTHOR-1: cross-contract matrix (not applicable — no cross-module view/RPC created)
- M6_SCHEMA P-AUTHOR-2: smoke cases with effect vs invariant columns ✅
- Security: Block A mandatory on all new SECURITY DEFINER functions (night-run-2026-05-24 0a finding)
- Grants: REVOKE from public+anon immediately (night-run-2026-05-24 0d pattern)

## 13. Pre-Merge Checklist

- [ ] Function created with Block A
- [ ] Grants: REVOKE public+anon, GRANT authenticated
- [ ] pg_cron job active
- [ ] Demo end-to-end test passing
- [ ] `npm run verify:integrity` exit 0
- [ ] Documentation updated

## 14. Smoke Test Cases

| Case | Effect | Invariant | Type |
|---|---|---|---|
| S-1 | Create + commit prescription on demo → recall axes populated | compute_recall_due_dates works | Precondition |
| S-2 | Update a recall axis due_at to yesterday → run process_due_recalls → triggered_at set | Engine processes due axis | Functional |
| S-3 | Re-run process_due_recalls → 0 new axes processed | Idempotency via triggered_at IS NOT NULL | Functional |
| S-4 | Block A test: authenticated caller → 42501 | ERRCODE 42501 | Security |
| S-5 | Block A test: service_role caller → function completes | No 42501 raised | Security |
