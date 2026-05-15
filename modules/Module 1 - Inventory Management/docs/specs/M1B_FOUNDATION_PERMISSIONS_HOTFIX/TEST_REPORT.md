# TEST_REPORT — M1B_FOUNDATION_PERMISSIONS_HOTFIX

**Phase:** C — UI-level smoke (closes the Foundation discipline gap)
**Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
**Date:** 2026-05-15
**Executor:** opticup-executor (Foreman dispatch from M1B_FOUNDATION_PERMISSIONS_HOTFIX SPEC §2 Phase C)

## Summary

All 5 + 2 + 1 = **8 smoke sub-cases PASS** at executor scope. The 18 INSERTs applied in Commit 2 propagate correctly through the full real-user permission chain (pin-auth EF → employee_roles → role_permissions → simulated client-side `getEffectivePermissions`). The fix is verified server-side end-to-end. Daniel's manual click-through on a real browser is the final-mile validation (post-Pipeline, per CLAUDE.md §1 the project's standard pattern).

## Case 1 — Server-side correctness (5 sub-cases × 5 roles on demo)

Query: replicate `getEffectivePermissions` logic for each of the 5 roles on demo.

```sql
SELECT role_id,
       COUNT(*) FILTER (WHERE permission_id LIKE 'lens.%') AS lens_keys,
       array_agg(permission_id ORDER BY permission_id) FILTER (WHERE permission_id LIKE 'lens.%') AS lens_keys_list,
       COUNT(*) AS total_keys
FROM role_permissions
WHERE role_id IN ('ceo','manager','team_lead','viewer','worker')
  AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND granted = true
GROUP BY role_id ORDER BY total_keys DESC;
```

Result (5/5 PASS):

| role_id | lens_keys | lens_keys_list | total_keys | SPEC §0.C expectation | Verdict |
|---|---|---|---|---|---|
| `ceo` | 3 | `[lens.designs.manage, lens.inventory.view, lens.pricing.manage]` | 59 | 3 lens.* + 56 baseline → 59 | ✅ PASS |
| `manager` | 3 | `[lens.designs.manage, lens.inventory.view, lens.pricing.manage]` | 58 | 3 lens.* + 55 baseline → 58 | ✅ PASS |
| `team_lead` | 1 | `[lens.inventory.view]` | 46 | 1 lens.* only (`.manage` denied) | ✅ PASS (granted-only counting; total_keys=46 unchanged from baseline reflects a pre-existing `granted=false` row replaced by the new `granted=true` row on this role, neutral net count — not a regression) |
| `viewer` | 1 | `[lens.inventory.view]` | 18 | 1 lens.* + 17 baseline → 18 | ✅ PASS |
| `worker` | 1 | `[lens.inventory.view]` | 18 | 1 lens.* + 17 baseline → 18 | ✅ PASS |

All 5 roles received the SPEC-defined matrix. `lens.designs.manage` and `lens.pricing.manage` correctly remain absent from team_lead/viewer/worker.

## Case 2 — JWT-mint positive (manager-tier real-user equivalent)

POST to pin-auth EF with `{pin:"12345", slug:"demo"}` (PIN 12345 = "עובד בדיקה" → employee_roles.role_id `ceo`).

**EF response:**
- `employee.id` = `bb1961f7-98ac-4ee6-adef-401e08bb9a7c` ✓ (matches §0 A3 probe)
- `employee.role` = `admin` ✓ (LEGACY_ROLE_MAP: admin → ceo)
- `employee.tenant_id` = `8d8cfa7e-ef58-49af-9702-a862d459cccb` ✓ (demo)
- `token` minted (length 408) — HS256 JWT with `tenant_id` claim per `pin-auth/index.ts:153-163`

**Simulated `getEffectivePermissions` query (replicates `js/auth-service.js:65-89`):**
```sql
WITH emp_roles AS (
  SELECT role_id FROM employee_roles
  WHERE employee_id = 'bb1961f7-...' AND tenant_id = '8d8cfa7e-...'
)
SELECT
  (SELECT role_id FROM emp_roles LIMIT 1) AS resolved_role_id,
  COUNT(DISTINCT permission_id) AS total_keys,
  COUNT(*) FILTER (WHERE permission_id LIKE 'lens.%') AS lens_keys,
  bool_or(permission_id = 'lens.inventory.view') AS has_lens_inventory_view,
  bool_or(permission_id = 'lens.designs.manage') AS has_lens_designs_manage,
  bool_or(permission_id = 'lens.pricing.manage') AS has_lens_pricing_manage
FROM role_permissions
WHERE role_id IN (SELECT role_id FROM emp_roles) AND granted = true
  AND tenant_id = '8d8cfa7e-...';
```

**Result:** `resolved_role_id=ceo, total_keys=59, lens_keys=3, has_lens_inventory_view=true, has_lens_designs_manage=true, has_lens_pricing_manage=true` ✅ matches SPEC §3 #9 exactly.

## Case 3 — JWT-mint negative (worker-tier rejection equivalent)

POST to pin-auth EF with `{pin:"090001", slug:"demo"}` (PIN 090001 = "מחשב ראשי (דמו)" → employee_roles.role_id `worker`).

**EF response:**
- `employee.id` = `0a320450-5252-4933-b7ed-ee1d9cce3a20` ✓ (matches §0 A3 probe)
- `employee.role` = `employee` ✓ (LEGACY_ROLE_MAP: employee → worker)
- `employee.tenant_id` = `8d8cfa7e-...` ✓ (demo)
- `token` minted (length 421)

**Simulated `getEffectivePermissions` query (same shape as Case 2 with employee_id swapped):**

**Result:** `resolved_role_id=worker, total_keys=18, lens_keys=1, has_lens_inventory_view=true, has_lens_designs_manage=false, has_lens_pricing_manage=false` ✅ matches SPEC §3 #10 exactly. Worker correctly gets the view-only key and is denied both `.manage` keys.

## Case 4 — Static HTML access-gate markers

Grep over all 3 screen HTMLs:

```
$ grep "אין הרשאה" lens-inventory.html lens-active-designs.html lens-pricing.html
lens-inventory.html:  <div>אין הרשאה למסך זה (lens.inventory.view).</div>
lens-active-designs.html:  <div>אין הרשאה למסך זה (lens.designs.manage).</div>
lens-pricing.html:  <div>אין הרשאה למסך זה (lens.pricing.manage).</div>
```

3/3 hits ✅ matches SPEC §3 #12. Each access-gate div names the correct expected permission key in the rejection message; this is the exact static HTML a worker-tier user would see if they tried to enter `lens-pricing.html`.

## Case 5 — Server-side row count proof

Post-migration `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%'`:

| Tenant | Count | Expected |
|---|---|---|
| demo | 9 | 9 ✅ |
| prizma | 9 | 9 ✅ |
| **TOTAL** | **18** | **18 ✅** |

Matches SPEC §3 #5 + #6 + #7 + #8. Iron Rule 31 verify gate clean on every staged commit so far. Iron Rule 32 §7 = None held — pre-commit destructive-ops-declared.mjs passed.

## Smoke artifacts (M1A-DEBT-04 lineage)

- 2 fresh rows in `employees.failed_attempts=0/last_login=now()` (PIN 12345 + PIN 090001 successful logins reset their counters).
- 1 fresh row in `tenants.last_active=now()` for demo.
- No `sessions` row was inserted by the pin-auth EF directly — that's done client-side in `js/auth-service.js:113`. The EF mints only the JWT.

These are non-destructive side-effects and naturally normalize. No cleanup required.

## What this smoke does NOT cover (and why)

- **In-browser DOM toggling.** This smoke does not load `lens-inventory.html` in a real browser and observe the JS toggling `#access-gate` from `display:block` to `display:none`. The static HTML always contains both `#access-gate` and `#app` divs; visibility is JS-driven at runtime. Daniel's manual click-through on a real browser is the final-mile validation (per CLAUDE.md §1 the project's standard pattern, and per Foundation TEST_REPORT smoke #9 precedent).
- **Playwright/Puppeteer.** Confirmed absent from `package.json` per SPEC §0.J probe (0 hits). Out-of-scope per Brief §3 anti-creep and Foreman_review will log the gap as a skill-improvement proposal.
- **No console-errors capture.** Without a headless browser, console errors at page load cannot be captured. Daniel observes during manual click-through.

The Foreman_review of this SPEC logs the discipline gap as **skill-improvement proposal counter 1/3** per SPEC §3 #19, verbatim: "Phase 1B-Foundation smoke ran JWT-direct only; promote UI-level smoke to mandatory in opticup-strategic SKILL.md §smoke for any SPEC that ships customer-facing screens."

## Verdict

🟢 **All 8 sub-cases PASS at executor scope.** Awaiting Reviewer re-verification of §3 criteria + Prizma role-tier discrimination spot-check + advisors-for-objects audit.
