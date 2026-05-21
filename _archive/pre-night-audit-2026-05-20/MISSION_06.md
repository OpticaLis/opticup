# MISSION 06 — Database Health Snapshot

**Audit:** M4_PRE_NIGHT_COMPREHENSIVE_AUDIT  
**Date:** 2026-05-20  
**Auditor:** opticup-localhost-tester (read-only)

---

## 1. Table Sizes (M4 + related)

| Table | Total Size | Table Size | Index Size |
|---|---|---|---|
| crm_message_log | **18 MB** | 4.5 MB | 856 kB |
| crm_message_queue | 4.9 MB | 4.2 MB | 672 kB |
| short_links | 4.9 MB | 3.5 MB | 1.4 MB |
| crm_leads | 1.1 MB | 760 kB | 272 kB |
| crm_lead_touchpoints | 872 kB | 408 kB | 432 kB |
| crm_message_templates | 552 kB | 80 kB | 32 kB |
| short_link_clicks | 504 kB | 296 kB | 176 kB |
| crm_automation_runs | 424 kB | 280 kB | 104 kB |
| crm_event_attendees | 360 kB | 168 kB | 152 kB |
| crm_status_change_events | 312 kB | 96 kB | 176 kB |
| crm_lead_notes | 296 kB | 200 kB | 56 kB |
| tenants | 232 kB | 128 kB | 64 kB |
| crm_capi_dispatch_queue | 120 kB | 24 kB | 56 kB |
| crm_automation_rules | 112 kB | 40 kB | 32 kB |
| funnel_weekly_briefs | 64 kB | 8 kB | 48 kB |

**Observations:**
- `crm_message_log` at 18 MB is consistent with Sentinel L-NEW-28-1 watch (~14 MB at last scan + 4 MB growth from 1,179 additional Prizma messages today). GUARDIAN_ALERTS projects ~370 MB/year at current rate. No immediate action needed but bears watching.
- `crm_message_queue` at 4.9 MB for a queue table is high. This contains 4,642 `sent` rows that are NOT being archived. **Recommendation: add a cleanup job to archive/delete `sent` rows older than 30 days.** This queue should be a rolling window, not a permanent archive (crm_message_log IS the audit trail).
- All other tables are healthy sizes.

---

## 2. Security Advisors (from get_advisors security)

**Total security advisors: 149 (17 ERROR level + 132 WARN level)** — matches Sentinel M-NEW-28-2 baseline (ZERO DELTA from previous scan). Carry-allowlisted:

| Category | Count | Status |
|---|---|---|
| authenticated_security_definer_function_executable | 56 | Carry-allowlisted — project RPC pattern |
| anon_security_definer_function_executable | 42 | Carry-allowlisted — project RPC pattern |
| function_search_path_mutable | 30 | Carry-allowlisted — project pattern |
| security_definer_view | 17 | Carry-allowlisted — project view pattern |
| Other | 4 | extension_in_public × 2, auth_leaked_password × 1, public_bucket_listing × 1 |

**No new security advisors since last scan.** Status: STABLE.

---

## 3. Performance Advisors (from get_advisors performance)

**Total performance advisors: 632 (380 WARN, 252 INFO)**

| Category | Count | Notes |
|---|---|---|
| multiple_permissive_policies | 222 | Project design choice — two-policy pattern per IR15; known |
| auth_rls_initplan | 158 | RLS plans using current_setting() — project design |
| unused_index | 133 | Many are new tables with no traffic yet |
| unindexed_foreign_keys | 118 | Includes M4 tables — see below |

**CRM-related performance findings (75 advisors):**
- `crm_audit_log`: 2 unindexed FK (employee_id, tenant_id)
- `crm_automation_runs`: 1 unindexed FK (rule_id)
- `crm_broadcasts`: 2 unindexed FK (employee_id, template_id)
- Additional M4 tables with unindexed FKs

**High-impact missing indexes identified (Mission 1 finding):**
- `crm_message_log(tenant_id, status, created_at)` — needed for resend button filter

---

## 4. Unused Indexes (idx_scan = 0, M4 tables)

| Table | Index | Notes |
|---|---|---|
| crm_audit_log | pkey | Table has 0 rows — expected |
| crm_capi_dispatch_queue | idx_capi_queue_failed_retry | Never queried for failed retries yet |
| crm_capi_dispatch_queue | idx_capi_queue_queued_sched | 0 scans despite active dispatch — fb_capi_dispatch_consumer queries differently |
| crm_custom_field_defs/vals | pkey | Tables have 0 rows |
| crm_cx_surveys | pkey | Table has 0 rows |
| crm_event_status_history | pkey | Table has 0 rows |
| crm_lead_touchpoints | pkey | 0 scans (row lookups go via tenant/broadcast/lead indexes) |
| crm_lead_touchpoints | idx_crm_lead_touchpoints_tenant_broadcast_occurred | 0 scans |
| crm_lead_touchpoints | idx_crm_lead_touchpoints_tenant_short_link | 0 scans |
| crm_message_queue | uq_crm_message_queue_idem | Idempotency key never used (0 idem conflicts) |
| crm_status_change_events | idx_sce_origin_rule | 0 scans |
| crm_unsubscribes | pkey | 0 scans |

**Analysis:**
- Empty tables (audit_log, cx_surveys, custom fields, event_status_history): normal — these features haven't been used yet
- `crm_capi_dispatch_queue` indexes have 0 scans despite the dispatch cron running — the cron uses `FOR UPDATE SKIP LOCKED` in a direct SELECT from the cron job SQL, not via the indexed lookup columns. May need query analysis to confirm correct coverage.
- **FINDING F-M6-1 (LOW):** `idx_capi_queue_queued_sched` and `idx_capi_queue_failed_retry` have 0 scans despite active CAPI dispatch cron. The pg_cron SQL queries `status IN ('queued', 'failed') AND retries < 3 AND scheduled_at <= now()` but does this via FOR UPDATE SKIP LOCKED — may not use these indexes if PostgreSQL prefers a seq scan on the small table. Will become relevant at scale.

---

## 5. pg_stat_statements

`pg_stat_statements` extension status: Not queried (extension may or may not be enabled). The advisor results did not return pg_stat_statements data in the performance advisor output. Skipping this sub-check — table sizes and advisor findings are the primary health signals.

---

## 6. Overall DB Health Verdict

**🟢 HEALTHY** with two non-blocking observations:
1. `crm_message_queue` accumulating sent rows indefinitely — add cleanup job
2. Missing `(tenant_id, status, created_at)` index on crm_message_log for resend button efficiency

Neither blocks the night-run.

---

*Mission 06 complete.*
