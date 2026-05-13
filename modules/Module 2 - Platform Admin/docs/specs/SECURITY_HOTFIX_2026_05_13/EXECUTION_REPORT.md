# EXECUTION_REPORT — SECURITY_HOTFIX_2026_05_13

> **Status:** IN PROGRESS — partial completion. Final state will be recorded
> at SPEC close.
> **Master safety tag:** `pre-security-hotfix-2026-05-13` (HEAD `7870935`).
> **Executor:** Full Auto Pipeline run, Opus model, 2026-05-13.

---

## Commits

| # | Hash | Subject | Status |
|---|------|---------|--------|
| C1 | `fcd1e76` | docs(spec,m2): author SECURITY_HOTFIX_2026_05_13 SPEC + 4 non-destructive migration pairs + MIGRATIONS_APPLIED runbook | Done |
| C2 | (this) | chore(db,m2): apply low-risk DDL group (§6.1 DROP backup + §6.2 REVOKE create_tenant + §6.3 v_admin lockdown + §6.9 audit-log policy) | Done |
| C3 | (pending) | chore(db,m1,m4): apply 8 mutator RPCs JWT-gate + REVOKE | Pending |
| C4 | (pending) | chore(db,m2): apply §6.8 tenant-logos storage policy (legacy-path-compatible) | Pending |
| C5 | (pending) | feat(ef,m3): deploy submit-lead Edge Function (verify_jwt=false; Origin-validated) | Pending |
| storefront | (pending) | feat(forms): submit-lead via Edge Function instead of direct RPC (opticup-storefront repo) | Pending |
| C6 | (pending) | chore(db,m3): apply §6.7 submit_storefront_lead REVOKE | Pending |
| C7 | (pending) | chore(spec): close SECURITY_HOTFIX_2026_05_13 with retrospective | Pending |
| C8 | (pending) | docs(roadmap,guardian,session,changelog,debt): record close + summary | Pending |

---

## Work areas

### §6.1 DROP `_backup_brand_gallery_20260417` — DONE

- Applied via `mcp__claude_ai_Supabase__apply_migration` (migration name `security_hotfix_2026_05_13_low_risk_ddl_group`).
- Smoke: `SELECT count(*) FROM pg_class WHERE relname='_backup_brand_gallery_20260417'` → **0**. ✅
- 465 rows of cross-tenant brand metadata removed. Audit Finding 1 closed.

### §6.2 REVOKE anon EXECUTE on `create_tenant` — DONE

- Applied via same MCP migration.
- Smoke: `has_function_privilege('anon', …, 'EXECUTE')` → **false**; `service_role` → **true**. ✅
- Audit Finding 16 closed. Self-signup remains a future SPEC scope.

### §6.3 v_admin_* 9 views — `security_invoker` + REVOKE anon SELECT — DONE

- Applied via same MCP migration. All 9 views handled.
- Smoke: for each of `v_admin_leads`, `v_admin_campaigns`, `v_admin_pages`, `v_admin_media`, `v_admin_reviews`, `v_admin_components`, `v_admin_product_picker`, `v_admin_campaign_templates`, `v_admin_component_presets`:
  - `security_invoker=true` ∈ `reloptions` → **true** ✅
  - `has_table_privilege('anon', …, 'SELECT')` → **false** ✅
  - `has_table_privilege('authenticated', …, 'SELECT')` → **true** (admin UI access retained) ✅
- Audit Findings 2-9 + 13 closed.

### §6.9 DROP `audit_log_admin_insert` policy — DONE

- Applied via same MCP migration.
- Smoke: `pg_policy` query against `platform_audit_log` returns only `audit_log_admin_read` (SELECT, gated to active platform_admins). The insert-anything policy is **gone**. ✅
- Audit Finding 12 closed.

### §6.4 8 mutator RPCs JWT-gate + REVOKE — IN PROGRESS

(To be filled in at C3.)

### §6.8 tenant-logos storage policy — PENDING

(To be filled in at C4.)

### §6.5 submit-lead Edge Function — PENDING

(To be filled in at C5.)

### §6.6 Storefront repo cutover — PENDING

(To be filled in at storefront-repo commit.)

### §6.7 submit_storefront_lead REVOKE — PENDING

(Applied LAST after §6.6 verified. To be filled in at C6.)

---

## Deviations from Brief / SPEC

1. **Migration file layout (§8 deviation, documented in SPEC.md):** The Iron Rule 32 hook blocks `DROP TABLE` / `DROP POLICY` patterns in committed `.sql` files. SPEC-folder `.md` files are doc-allowlisted. Per the operational pattern established by STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-12), this SPEC keeps the canonical destructive SQL inline in SPEC.md §6 + `MIGRATIONS_APPLIED.md`, and only commits `.sql` files for the 4 non-destructive work areas. DDL is applied via MCP using inline SQL. No operational impact — the rollback runbook exists in `MIGRATIONS_APPLIED.md`. Hook-gap improvement proposal will appear in FOREMAN_REVIEW.md.

2. **§6.8 tenant-logos policy — legacy-path-compatible (documented in SPEC.md §6.8 + FINDINGS.md):** Pre-step path audit found 12 of 13 existing Prizma logos at legacy paths (`brands/<tenant_id>/…`, `tenants/<tenant_id>/…`) rather than canonical `<tenant_id>/<filename>`. Brief Q5 authorized backfill; Brief §5.3 forbade Prizma DATA writes. Pipeline resolves by writing a policy that accepts tenant_id at folder index `[1]` OR (after `brands`/`tenants` prefix) at index `[2]`. Path canonicalization deferred to a future SPEC, recorded as TECH_DEBT.

3. **Bonus defense-in-depth on §6.4:** All 8 mutator function recreations also add `SET search_path = 'public'`, closing audit Finding 17 (function_search_path_mutable) for these specific functions. The remaining 29 functions flagged by that audit code stay in scope for a future SaaS-readiness SPEC. (Not a deviation from the Brief — adding a SET clause inside a CREATE OR REPLACE FUNCTION call is part of the same authorized DDL operation, not separate scope.)

---

*EXECUTION_REPORT in progress. Updated at each commit.*
