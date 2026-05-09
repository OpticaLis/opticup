```
You are opticup-executor. Load your skill: opticup-skills:opticup-executor.

Execute SPEC at:
modules/Module 1 - Inventory/docs/specs/PERMISSIONS_PHASE2_FIX_2026_04_27/SPEC.md

This SPEC mutates production data. Pre-flight BEFORE_STATE.json is MANDATORY.

Context (read in this order):
1. CLAUDE.md — Iron Rules 1–31
2. The SPEC.md above, in full
3. modules/Module 1 - Inventory/docs/specs/PERMISSIONS_AUDIT_PHASE1_2026_04_27/DIAGNOSIS_REPORT.md — Phase 1 findings this fix is based on
4. js/auth-service.js, js/shared.js, modules/admin/admin.js, modules/debt/ai/ai-config.js, modules/permissions/employee-list.js, modules/inventory/inventory-edit.js, modules/inventory/inventory-actions.js, modules/inventory/inventory-table.js
5. The 3 most recent FOREMAN_REVIEW.md files

Bounded Autonomy:
- §3 has 21 success criteria with exact expected values. Match → continue. Mismatch → STOP.
- Pre-flight BEFORE_STATE.json is MANDATORY before any DB write — must include row-dump rollback statements for the 5 tenants in scope.
- §7 Out-of-Scope is exhaustive.

Hard constraints:
- DO NOT touch LEGACY_ROLE_MAP (js/auth-service.js:21).
- DO NOT touch is_super_admin column or super-admin code paths.
- DO NOT touch RLS policies or view definitions.
- DO NOT touch the storefront repo.
- DO NOT modify employees.role text column semantics.
- The 3 test-store tenants to DELETE (cascade): test-store-qa, test-store-v2, test-store-verify.
  Their UUIDs:
  - db710f25-fa10-4321-b280-4808679c727a (test-store-qa)
  - 9d6c19e0-f1d7-47be-ba2f-8c4e1638e894 (test-store-v2)
  - f185ed73-8337-454f-be21-12dde73aaf21 (test-store-verify)
- Surviving tenants: prizma (6ad0781b-37f0-47a9-92e3-be9ed1477e1c) and demo (8d8cfa7e-ef58-49af-9702-a862d459cccb).
- DO NOT touch ANY other tenant for any reason.

Iron Rule 7 (DB via helpers): use sb.from(AT.PERMISSIONS), AT.ROLES, AT.ROLE_PERMS, AT.EMP_ROLES, T.EMPLOYEES — never raw strings.
Iron Rule 22: every write includes explicit tenant_id filter.

QA after writing code (per SPEC §12):
1. DB structural — long-form keys gone, short-form present, role_permissions reference integrity 0 orphans, tenants count = 2.
2. Code-side — isAdmin global removed, admin-mode body class removed, AI bypass replaced, test page deleted, data-permission attrs renamed.
3. Localhost matrix — all/none row buttons present, save persists.
4. Localhost manager bulk QA — create QA Manager test employee on Demo, sign in, verify bulk inventory ops work, delete test employee at end.
5. Storefront repo untouched.

Both repos clean at end:
- ERP (opticup): on develop, "nothing to commit, working tree clean"
- Storefront: untouched
Push ERP to origin/develop. Storefront — no push.

Mandatory deliverables in SPEC folder:
1. EXECUTION_REPORT.md
2. FINDINGS.md
3. BEFORE_STATE.json (pre-flight, MANDATORY)
4. AFTER_STATE.json (post-execution)

Hebrew status to Daniel (one sentence) when done:
"באג ה-Manager תוקן, 3 חנויות בדיקה נמחקו, שמות הרשאות אוחדו, וכפתורי 'הכל'/'כלום' נוספו למטריצה."
Then list the 8 commit hashes.

If anything diverges from §3 — STOP, run §6 rollback, report. Do NOT improvise.
```
