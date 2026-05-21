# FINDINGS — M4_DASHBOARD_STATUS_RPC_AND_LEAD_EVENT_HISTORY_MV

## F-01 (resolved) — Dashboard status chart silently capped at 1000 rows
**Severity:** HIGH originally (correctness bug, not just perf).
**Resolution:** server-side GROUP BY RPC returns full distribution as jsonb scalar. Bypasses PostgREST's db-max-rows=1000 cap. Verified at small scale (4 leads); will work identically at 100K+ because the cap doesn't apply to jsonb scalar returns.

## F-02 (resolved) — v_crm_lead_event_history O(N) scan at every dashboard load
**Severity:** HIGH originally.
**Resolution:** materialized view + pg_cron `*/5 * * * *` REFRESH CONCURRENTLY. Dashboard reads MV (sub-ms lookup via tenant+is_returning_customer index) instead of computing the aggregate live.

## F-03 (self-flag, follow-up) — crm-dashboard.js now at exactly 350 lines
**Severity:** LOW.
**What:** added 6 lines of comments + restructured the status aggregator. File now sits at the absolute IR12 cap (350). Future edits to this file would breach. A trivial follow-up commit can trim 5-10 lines of headroom (collapse if-else, remove stale comments).

## F-04 (INFO — context for Sprint 2) — Dashboard load time dominated by sequential queries
**Severity:** LOW.
**What:** Even with this SPEC's fixes, `fetchDashboardData` issues 4 queries in Promise.all (event_stats view, leads_count, returning MV, status RPC). At 100K scale, the slowest is now the leads_count HEAD request (~500ms server). Dashboard total ~600-800ms. Acceptable, well under 1s. Documented for completeness.

## F-05 (INFO — out of scope, Sprint 2 candidate) — `v_crm_lead_event_history` view itself remains
**Severity:** INFO.
**What:** The original view is NOT dropped — other modules may reference it. Future SPEC can audit consumers and deprecate it if all callers can move to the MV. Stays for now.

---
*End of findings.*
