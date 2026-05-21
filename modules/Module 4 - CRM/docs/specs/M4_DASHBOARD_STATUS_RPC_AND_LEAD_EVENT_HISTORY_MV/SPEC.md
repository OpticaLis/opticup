# SPEC — M4_DASHBOARD_STATUS_RPC_AND_LEAD_EVENT_HISTORY_MV

> **Authored:** 2026-05-21 — Sprint 1 SPEC 3 of 3.
> **Predecessor:** `M4_FULL_AUDIT_FINDINGS_2026_05_21.md` Risks #2 + #3.

## 0. Goal
Two narrow fixes to the dashboard's data layer:
1. **Risk #2 (correctness bug):** `crm-dashboard.js:84` does an unbounded `SELECT status FROM crm_leads`. PostgREST caps at 1000 rows. At 89K+ scale the chart silently shows a ~1% sample as if it were the full distribution. **Replace with a server-side GROUP BY RPC returning the full counts in one call.**
2. **Risk #3 (perf):** `v_crm_lead_event_history` is an O(N) per-lead-aggregate view. At 89K scale: ~1.8 s slowest dashboard query. **Convert to a materialized view with pg_cron refresh every 5 min**, indexed for the dashboard's lookups.

## 1. Acceptance bar
- Dashboard loads on demo with zero JS console errors.
- Status-distribution counts equal the SQL truth `SELECT status, count(*) FROM crm_leads WHERE tenant_id=$demo AND is_deleted=false GROUP BY status` (not the silently-truncated 1000-row sample).
- Returning-customer count comes from MV, query < 50 ms client-side.
- pg_cron `mv_crm_lead_event_history_refresh` schedule active and `last_run` populated within 6 minutes of creation.
- Iron Rule 31 gate exit 0.

## 2. Files modified
1. New migration: `20260521162500_m4_dashboard_status_counts_rpc.sql` — RPC `crm_dashboard_status_counts(p_tenant_id uuid)` returning jsonb `[{status, count}]`. SECURITY DEFINER + canonical JWT-claim header.
2. New migration: `20260521162600_m4_lead_event_history_mv.sql` — MV `mv_crm_lead_event_history` cloning the view's body + index on `(tenant_id, is_returning_customer)` + pg_cron job `m4-refresh-lead-event-history-mv` every 5 min running `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crm_lead_event_history`.
3. `modules/crm/crm-dashboard.js` line 81: switch returning-customer COUNT from view → MV.
4. `modules/crm/crm-dashboard.js` line 84: replace unbounded SELECT with RPC call.

## 3. Destructive Operations
1. DDL: 1 new RPC + 1 new MATERIALIZED VIEW + 1 new index + 1 new pg_cron job (all additive).
2. JS code edits on `modules/crm/crm-dashboard.js` (2 line changes inside the existing `fetchDashboardData` function).
3. NO drop of `v_crm_lead_event_history` itself (other code may reference it; deprecate-and-remove deferred).

## 4. Out of scope
- Refactoring the view definition itself (the view stays; we add an MV alongside).
- Replacing dashboard's other unbounded SELECTs (none others identified in this run).
- Sub-second Dashboard total load time (multiple queries still run sequentially).

## 5. Verification
4 closing docs + Chrome MCP IR34 (dashboard loads + status counts correct + console clean) + the cron schedule check.

---
*End of SPEC.*
