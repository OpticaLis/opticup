# SPEC — C1: role_permissions upsert missing tenant_id in on_conflict

> **Author:** opticup-strategic (acting via Cowork)
> **Created:** 2026-04-26
> **Severity:** CRITICAL — blocks all permission edits in Platform Admin
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` → row C1
> **Owning module (logical):** Module 2 — Platform Admin (file lives in `modules/permissions/`)

---

## 1. Goal

Fix the broken `role_permissions` upsert that returns `400 Bad Request` whenever
an admin toggles a permission for a role. The upsert specifies `onConflict:
'role_id,permission_id'`, but the table's primary key is the 3-column composite
`(role_id, permission_id, tenant_id)`. PostgREST rejects the upsert because the
on_conflict columns don't match an existing UNIQUE/PK constraint.

## 2. Root Cause (verified)

- **DB schema** (`modules/Module 1.5 - Shared Components/docs/db-schema.sql:137`):
  `ALTER TABLE role_permissions ADD PRIMARY KEY (role_id, permission_id, tenant_id);`
  Migration executed 2026-03-19 to support multi-tenant permissions.
- **Buggy code** (`modules/permissions/employee-list.js:321`):
  ```js
  .upsert({ role_id: roleId, permission_id: permissionId, granted,
            tenant_id: getTenantId() },
          { onConflict: 'role_id,permission_id' });
  ```
- **Symptom:** Browser console reports `POST .../role_permissions?on_conflict=...
  400 (Bad Request)` from `supabase.js:20`. Toast: "שגיאה בעדכון הרשאה".

## 3. Success Criteria (measurable)

1. `modules/permissions/employee-list.js:321` reads:
   `{ onConflict: 'role_id,permission_id,tenant_id' }`.
2. No other `role_permissions` upsert call exists project-wide (verify with grep).
3. Manual QA on demo tenant (after merge to main): toggle a permission for a
   role → toast "הרשאות עודכנו" appears, no 400 in console, the row exists in
   `role_permissions` with the expected `granted` value.
4. Pre-commit hooks pass (`npm run verify:integrity`, file-size, rule-21, etc.).
5. Final `git status` clean (only the one file modified, the SPEC folder added,
   the ROADMAP row updated).

## 4. Autonomy Envelope

- **Permitted:** edit `modules/permissions/employee-list.js`. Edit
  `M1_FIXES_2026_04_26/ROADMAP.md` to flip C1 to ✅ with commit hash.
- **Forbidden:** any other source file, any DB change, any RLS change, any view
  change, any migration. This is a 1-character-list fix.

## 5. Stop-on-Deviation Triggers

- More than one `role_permissions` upsert exists → STOP, report all locations
  before fixing.
- Edit produces a diff larger than 1 line → STOP, investigate.
- `git status` shows files outside the permitted list modified → STOP.
- Pre-commit hooks fail → STOP, fix the root cause, never `--no-verify`.

## 6. Rollback Plan

Single-commit fix. Revert with `git revert <hash>` if any regression appears.
No data is mutated. Old `granted` rows stay intact (the fix only changes how
new upserts find their target row).

## 7. Out-of-Scope

- Fixing any other ROADMAP row (D1–D7, B1–B5, A1–A4).
- Refactoring `updateRolePermission()` itself (PIN re-prompt, batch updates).
- Adding `requirePermission()` audit — already present.
- Touching the `roles` or `permissions` tables themselves (they have separate
  PKs which already include tenant_id and are not affected).

## 8. Expected Final State

```
git status (excerpt):
  M  modules/permissions/employee-list.js
  M  modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md
  ?? modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/C1_PERMISSIONS_UPSERT/SPEC.md
  ?? modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/C1_PERMISSIONS_UPSERT/EXECUTION_REPORT.md
```
After commit: working tree clean.

## 9. Commit Plan

Single commit:
```
fix(permissions): add tenant_id to role_permissions upsert on_conflict (C1)

The role_permissions PK is (role_id, permission_id, tenant_id) since the
2026-03-19 multi-tenant migration. The upsert in employee-list.js only
specified (role_id, permission_id) which caused PostgREST to reject the
write with 400 Bad Request, blocking all role-permission edits in
Platform Admin.

Fixes M1_FIXES_2026_04_26 row C1.
```

Files added to commit (explicit, no `git add -A`):
- `modules/permissions/employee-list.js`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/ROADMAP.md`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/C1_PERMISSIONS_UPSERT/SPEC.md`
- `modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/C1_PERMISSIONS_UPSERT/EXECUTION_REPORT.md`

## 10. Iron-Rule Self-Audit (filled at execution close)

| Rule | Status | Evidence |
|------|--------|----------|
| 7 — DB via helpers | N/A | This is a sb-direct call already; not changing the wrapper choice in this fix. Logged as finding. |
| 14 — tenant_id on table | ✅ | Table already has tenant_id; PK migration 2026-03-19 enforced it. |
| 18 — UNIQUE includes tenant_id | ✅ | This SPEC exists *because* the PK already includes tenant_id and the client wasn't honoring it. |
| 21 — No duplicates | ✅ | Single `role_permissions` upsert call project-wide (grep confirmed). |
| 22 — Defense-in-depth | ✅ | tenant_id is already in the upsert payload. |
| 31 — Integrity gate | ✅ | `npm run verify:integrity` runs in pre-commit. |

---

*End of SPEC.*
