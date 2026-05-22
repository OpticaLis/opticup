# FINDINGS — M4_SHORT_LINKS_CODE_TENANT_SCOPED_UNIQUE

## F-01 (UNRESOLVED — execution deferred) — IR18 debt on short_links
**Severity:** LOW (theoretical; no operational impact today).
**Status:** Migration authored, not applied. Resume path documented.

## F-02 (BLOCKER for execution) — Supabase intermittent connectivity outage
**Severity:** EXTERNAL.
**What:** During this Sprint, multiple `execute_sql` probes returned `Connection terminated due to connection timeout`. The pre-check query for this Item never ran. Per IR32, destructive constraint changes require pre-check; deferred execution.

## F-03 (INFO) — Code-generation collision checks are overly strict (will be safe post-migration)
**Severity:** INFO.
**What:** `crm_create_static_short_link` + per-recipient generators check `SELECT 1 FROM short_links WHERE code = v_new_code` without tenant_id scope. Post-migration, that's overly strict (would re-roll a code that's safe in the current tenant because it belongs to a different tenant). Doesn't break anything; just causes one extra collision-loop iteration in rare cases. Optional follow-up SPEC.

## F-04 (Sprint 4 candidate) — Post-apply code-gen check tightening
**Severity:** LOW.
**SPEC name:** `M4_SHORT_LINKS_CODE_GEN_TENANT_SCOPED_CHECK`. After F-01 lands, update all code-generation paths' collision check to include `AND tenant_id = p_tenant_id` for marginal perf.

---
*End of findings.*
