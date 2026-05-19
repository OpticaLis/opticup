# FINDINGS — M4_FUNNEL_HEALTH_DASHBOARD

> **Executor:** opticup-executor (Sonnet)
> **Date:** 2026-05-19
> **Inherited from SPEC:** F-A1

---

## F-A1 (INHERITED from SPEC §0.7)

| Field | Value |
|-------|-------|
| **ID** | F-A1 |
| **Severity** | INFO |
| **Source** | SPEC author pre-flight |
| **Location** | `modules/Module 4 - CRM/architecture-brief/M4_FUNNEL_PHASE_2_5_OVERNIGHT_BRIEF.md` §2 |
| **Description** | Brief §2 references an M6 knowledge map that does not exist on origin/main. M2 §5.6 inlines the latency query sufficiently. |
| **Action** | None required for this SPEC. Brief reference is stale documentation. |

---

## F-B1 (NEW — discovered during C2 migration)

| Field | Value |
|-------|-------|
| **ID** | F-B1 |
| **Severity** | MEDIUM |
| **Source** | C2 migration execution |
| **Location** | `mv_funnel_health_dashboard` (live DB) |
| **Description** | PostgreSQL does not support RLS on materialized views. SPEC criterion 17 (2-policy RLS pair) is physically unachievable. Tenant isolation falls back to IR22 JS-layer .eq('tenant_id', tid) filter. |
| **Suggested action** | Foreman to decide: (a) accept IR22 JS-layer-only isolation, OR (b) wrap mv in a security-definer VIEW with JWT-claim WHERE clause for DB-level enforcement. |

---

## F-B2 (NEW — discovered during Step 1.5 pre-flight)

| Field | Value |
|-------|-------|
| **ID** | F-B2 |
| **Severity** | LOW |
| **Source** | Step 1.5 DB probes |
| **Location** | SPEC §0.4 |
| **Description** | SPEC §0.4 states "crm_permissions table exists" — live table name is `permissions`. Required migration correction step. Add table-name reality-check to executor SKILL.md Step 1.5 (P-EXEC-2). |
| **Suggested action** | Foreman to update SPEC §0.4 for historical accuracy. Apply P-EXEC-2 to executor skill. |
