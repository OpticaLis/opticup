# Module Brief — M1B_FOUNDATION_PERMISSIONS_HOTFIX

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Foreman review
**Pipeline:** Full Auto Pipeline (single chat, end-to-end)
**Branch:** `develop`. Daniel-only merge to main after Pipeline closes 🟢.

---

## 1. Purpose

Phase 1B-Foundation closed 🟢 with smoke 9/9 PASS, but the real user `daniel@prizma-optic.co.il` hits "אין הרשאה למסך זה (lens.inventory.view)" on all 3 new screens. The Foundation Pipeline's smoke ran in **JWT-direct context with full permissions** — it never exercised the real-user-through-real-UI path.

This SPEC closes the gap. It is **both** a bug-fix (the 3 screens are unreachable for real users) **and** a discipline-fix (UI-level smoke is required, not just JWT-direct smoke).

**Symptom (verified):** `localhost:3000/lens-inventory.html?t=demo` shows "אין הרשאה למסך זה (lens.inventory.view)" via screenshot from Daniel 2026-05-15.

**Root cause is unknown** — the SPEC's first job is to determine which of three scenarios applies:

- **Scenario A** — the 3 permission keys (`lens.inventory.view`, `lens.designs.manage`, `lens.pricing.manage`) were never created in the `permissions` table. Foundation Brief §9 Q5 was "permission seeding — micro-migration in this SPEC or separate? Architect rec: micro-migration in this SPEC if keys don't exist." The Module Strategist may have answered Q5 as "separate" and then forgot to create the separate seed.
- **Scenario B** — the keys exist but are not assigned to any role (or only to a `super_admin` role Daniel doesn't have). Common in multi-role systems.
- **Scenario C** — the keys exist and are assigned, but the screen's `is_user_authorized_for(p_screen_key)` call uses the wrong key (typo, namespace drift).

The SPEC's §0 Pre-Authoring Reality Check determines which scenario applies, then applies the right fix.

---

## 2. Scope — In

### Phase A — Diagnose (always)

Run live Supabase probes:

```sql
-- A1: Do the 3 keys exist in the permissions table?
SELECT permission_key, description FROM permissions
WHERE permission_key IN ('lens.inventory.view', 'lens.designs.manage', 'lens.pricing.manage');
-- expected: 3 rows. If 0 → Scenario A. If 1-2 → partial Scenario A. If 3 → continue.

-- A2: Which roles have these permissions assigned?
SELECT r.role_name, rp.permission_key
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE rp.permission_key IN ('lens.inventory.view', 'lens.designs.manage', 'lens.pricing.manage')
ORDER BY rp.permission_key, r.role_name;
-- expected: at least one role per key. If empty → Scenario B.

-- A3: What permissions does Daniel's employee record have?
SELECT e.email, e.role_id, r.role_name, array_agg(rp.permission_key ORDER BY rp.permission_key)
FROM employees e
JOIN roles r ON r.id = e.role_id
LEFT JOIN role_permissions rp ON rp.role_id = e.role_id
WHERE e.email = 'daniel@prizma-optic.co.il'
  AND e.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'  -- demo
GROUP BY e.email, e.role_id, r.role_name;
-- Cross-check against A2 results.

-- A4: What permission keys does Phase 1A's catalog-admin screen use successfully?
-- (sanity check — was the project's permission infrastructure broken before, or only the 3 new keys?)
SELECT DISTINCT permission_key FROM role_permissions
WHERE permission_key LIKE 'lens.%' OR permission_key LIKE 'platform.%'
ORDER BY permission_key;

-- A5: Sanity — confirm is_user_authorized_for function exists + its body matches expectation
SELECT pg_get_functiondef('is_user_authorized_for'::regproc);
-- OR the actual permission function name — Module Strategist confirms via grep against
-- modules/lens-inventory/ + modules/lens-active-designs/ + modules/lens-pricing/ source

-- A6: What's the screen-side code that gates entry?
-- via shell:
--   grep -rn "is_user_authorized_for\|hasPermission\|checkPermission" \
--     modules/lens-inventory/ modules/lens-active-designs/ modules/lens-pricing/ | head -20
-- This catches Scenario C (typo / wrong key in code).

-- A7: For comparison, what's the permission check in the existing working Phase 1A
-- lens-catalog-admin screen?
-- via shell:
--   grep -rn "is_user_authorized_for\|hasPermission\|is_platform_super_admin" \
--     modules/lens-catalog-admin/ | head -10
```

Pin every result as §0 baseline. The SPEC then branches on scenario:

### Phase B — Fix per scenario

**Scenario A (keys missing):** Add a seed migration that creates the 3 permission rows in the `permissions` table. Description in Hebrew + English (match existing project pattern). Confirm via re-running probe A1.

**Scenario B (keys exist but not assigned to relevant roles):** Determine which roles SHOULD have each key:
- `lens.inventory.view` → most retail roles (cashier, optician, branch_manager, owner).
- `lens.designs.manage` → manager-tier roles (branch_manager, owner; NOT cashier or optician).
- `lens.pricing.manage` → manager-tier roles (branch_manager, owner; NOT cashier or optician).

Module Strategist confirms the actual role taxonomy in live DB before deciding assignment. Apply via migration that INSERTs into `role_permissions` for each (role × permission) pair. **Both demo + prizma** tenants need the assignment (since the same screens will be used in production).

**Scenario C (code uses wrong key):** Identify the typo in the screen JS, fix it, confirm via grep. No DB changes; pure code fix.

If multiple scenarios apply (e.g., keys missing AND screen uses wrong key) — apply all relevant fixes.

### Phase C — UI-level smoke (new discipline)

The Foundation Pipeline's smoke ran in JWT-direct mode. This SPEC introduces **UI-level smoke**: simulate a real user logging in and clicking through the screen.

For each of the 3 screens:

1. Generate a JWT for `daniel@prizma-optic.co.il` (demo tenant) — using the same `pin-auth` Edge Function the real ERP uses. NOT a hand-crafted JWT.
2. Load the page in a **headless browser** (Playwright / Puppeteer — Module Strategist decides which is already in the project via probe; if neither, use a `curl` + JS extraction fallback).
3. Confirm the page renders the main content (not the "אין הרשאה" message).
4. Capture screenshot OR DOM snippet showing the main content visible.
5. Confirm zero console errors.

This is the missing 10th smoke step Foundation should have had. Capture in TEST_REPORT.md.

**Fallback if headless browser not available:** Module Strategist confirms via probe whether Playwright is installed (`grep -rn "playwright" package.json package-lock.json`). If yes, use it. If no, two options:
- **(a)** Install Playwright minimally (`npm install --save-dev @playwright/test`) — but this is a tooling addition, requires Daniel sign-off.
- **(b)** Use a hand-rolled fetch-then-parse: POST to `pin-auth` to get JWT, then `curl http://localhost:3000/lens-inventory.html?t=demo` + extract HTML, grep for the "אין הרשאה" marker. Less rich than headless browser but catches the bug class.

*Architect recommendation: (b) Day-1.* Keeps blast radius narrow. Playwright is a larger discipline question for later.

### Phase D — Production application

Apply the same permission assignments to prizma tenant (UUID: per current `tenants` table — Module Strategist probes). This is required because the same screens will be used in production; without it, the bug recurs on the first staff login post-merge.

**Critical:** Production prizma application is **per-employee role**, not per-employee. Some Prizma employees genuinely SHOULD NOT have `lens.pricing.manage` (cashiers, etc.). Module Strategist confirms the Prizma role taxonomy and applies only to the appropriate roles. NO Prizma data assumptions — verify each role's existing permission set before adding.

---

## 3. Scope — Out (anti-creep)

- **No screen logic changes** beyond fixing a permission-key typo if Scenario C applies.
- **No new permission infrastructure.** Reuse `permissions` + `role_permissions` + `is_user_authorized_for` (or whatever the actual function name is).
- **No new permission categories** beyond the 3 named.
- **No retroactive Phase 1A permission audit** (e.g., Phase 1A `platform.*` keys). Out-of-scope unless the diagnose phase reveals a project-wide infrastructure break.
- **No Playwright/test-infra introduction** unless Daniel explicitly approves mid-Pipeline.
- **No JS framework changes** in the 3 screens.
- **Modifying mockups, decisions/M1.md, Phase 1 Brief, Foundation SPEC.** Pure hotfix.
- **CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT** — except adding M1B-FOUNDATION-PERM-DEBT row if a discipline gap surfaces.
- **Procurement Pipeline.** Held until this SPEC closes 🟢 + Daniel manual click-through PASSes.
- **Iron Rule 32 §7 = None.**

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Diagnose BEFORE fix (Phase A) — do not assume Scenario A/B/C without evidence | Architect — Phase 1A pattern |
| 2 | Apply fix to BOTH demo + prizma (both will need it pre-LIVE) | Architect — single migration, both tenants |
| 3 | UI-level smoke MANDATORY before close — fetch + parse fallback if Playwright unavailable | Architect — closes Foundation discipline gap |
| 4 | Role taxonomy verified live for Prizma before assignment — no role-set assumptions | Architect — protects production |
| 5 | Iron Rule 32 §7 = None | Project policy |
| 6 | All RPC discipline (REVOKE/GRANT, search_path, JWT guard) — no new RPCs expected, but if any surface, inherit pattern | Project policy |
| 7 | Single Pipeline run for diagnose + fix + smoke | Architect — same shape as M1A_OPERATIONS_RPCS_FIX |

---

## 5. Success Criteria

1. **Phase A complete:** SPEC §0 baselines all 7 probe results. Scenario classified explicitly.
2. **Phase B fix applied per classified scenario** — migration committed OR code fix committed.
3. **3 permission keys exist in `permissions` table** on both demo + prizma. Verified by re-running probe A1 against each tenant.
4. **3 permission keys assigned to appropriate roles** on both demo + prizma. Verified by re-running A2 + A3.
5. **Daniel's role (or his individual employee row, per actual permission model) has all 3 keys.** Verified by A3 returning all 3 keys for daniel@prizma-optic.co.il on demo.
6. **Real-user UI smoke PASS** on demo for all 3 screens — via Playwright OR fetch+parse fallback. Captured in TEST_REPORT.md.
7. **No console errors** at page load for each of 3 screens under real-user JWT.
8. **Permission gate still rejects** users without the keys (negative test — confirm a different demo user lacking the keys hits the "אין הרשאה" page).
9. **Iron Rules 14, 15, 18 (RLS), 21 (no duplicates), 31 (gate), 32 (no destructive)** — no new violations.
10. **No Prizma data written beyond `role_permissions` INSERTs** for the 3 keys × appropriate roles. Verified by `git diff` showing only migration + maybe permissions/role assignments.
11. **MIGRATION.md Applied Log** (per harvested E1) — every `apply_migration` call logged with timestamp.
12. **Commit count: 3-6, single-concern, on `develop`.**
13. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW** inside the SPEC folder.
14. **FOREMAN_REVIEW logs the Foundation smoke discipline gap** as a skill-improvement proposal: "Phase 1B-Foundation smoke ran in JWT-direct mode; should have included UI-level smoke under a real-user JWT. Promote to mandatory in opticup-strategic SKILL.md §smoke." Counter starts at 1/3.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

§0 Inner-call arity audit + Smoke-touched schema audit + Concurrent-Pipeline orthogonality envelope per harvested patterns.

Specific probes are A1-A7 in §2 Phase A above.

Additional shell probes:
```bash
# B1: Confirm pin-auth EF exists and what its response shape is
ls -la supabase/functions/pin-auth/
grep -n "JWT\|token" supabase/functions/pin-auth/index.ts | head -10

# B2: Playwright presence?
grep -rn "playwright\|@playwright" package.json package-lock.json 2>/dev/null | head -5

# B3: Existing permission test pattern (any prior test smoke that exercises permissions?)
grep -rn "is_user_authorized_for\|permission_key" tests/ scripts/ 2>/dev/null | head -10

# B4: Foundation SPEC's actual answer to Q5 (permission seeding)
grep -nA10 "permission" modules/Module\ 1\ -\ Inventory\ Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/SPEC.md | head -40

# B5: Daniel's actual employee record on demo + prizma — what role(s)?
# (probe via SQL in §2 A3)
```

---

## 7. Iron Rules in Sharp Focus

- **Rule 14, 15** — any new INSERT into permissions/role_permissions stays tenant-correct (tenant_id columns if those tables are tenant-scoped; if global, document explicitly in §0).
- **Rule 21** — extend existing permission infrastructure; do not invent a new one.
- **Rule 22** — defense-in-depth (if new RPCs surface — none expected).
- **Rule 23** — no secrets in test JWTs (regenerate via pin-auth, never paste a real production JWT).
- **Rule 31** — integrity gate clean every commit.
- **Rule 32** — None.

---

## 8. Anti-Patterns (Things to Avoid)

- **Authoring blind without §0 probes.** Phase 1A + M1B0 pattern.
- **Assuming scenario without evidence.** Probes first; classify; then fix.
- **Skipping prizma application.** Without it, bug recurs first day Daniel uses production.
- **Adding `super_admin` as the only role with the keys.** Real users have role-tier-specific permissions; broad role assignment.
- **Touching Phase 1A `lens-catalog-admin.html` permission setup.** Out-of-scope unless the diagnose phase reveals shared-infrastructure break.
- **Skipping UI-level smoke.** That's the lesson; running JWT-direct smoke only repeats Foundation's mistake.
- **Generating fake JWTs by hand.** Use the real `pin-auth` EF path so the smoke tests the actual production code path.
- **Inventing new tables.** Reuse existing.
- **`window.prompt() / confirm()`.** N/A this SPEC (no UI changes).

---

## 9. Open Questions for the Module Strategist

1. **Playwright vs fetch+parse fallback for UI smoke?**
*Recommendation: fetch+parse Day-1.* Adding Playwright is a tooling discipline question for a larger SPEC; not blocking this hotfix.

2. **Per-role assignment matrix — full enumeration in SPEC or "all manager-tier roles" wildcard?**
*Recommendation: full enumeration.* Each role × key explicit in the migration. Prevents over-grant; matches Iron Rule clarity.

3. **Negative test — which demo user lacks the keys for the rejection smoke?**
*Recommendation: create one if absent, or reuse an existing low-tier role (e.g., a `cashier` role employee).* Module Strategist confirms via probe.

4. **Does Phase 1A `lens-catalog-admin` use the same permission infrastructure or a different gate (e.g., `is_platform_super_admin`)?**
*Likely different per Phase 1A EXECUTION_REPORT.* Probe A7 confirms; if so, this SPEC inherits nothing from Phase 1A on permission patterns.

5. **Production prizma role taxonomy — exhaustive list?**
*Recommendation: probe live + enumerate in §0.* The Foreman_review SHOULD spot-check that every Prizma role got the right assignment (or correctly DIDN'T get one).

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/SPEC.md` | The SPEC that shipped the bug |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/EXECUTION_REPORT.md` | What was claimed vs what reality shows |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/TEST_REPORT.md` | The JWT-direct smoke that missed the bug |
| `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_PHASE_1B_FOUNDATION_BRIEF.md` §9 Q5 | Permission seeding open question |
| `modules/lens-inventory/` + `modules/lens-active-designs/` + `modules/lens-pricing/` | Screen-side permission check code |
| `modules/lens-catalog-admin/` | Phase 1A working permission pattern (different gate?) |
| `supabase/functions/pin-auth/` | JWT generation for real-user smoke |
| `.claude/skills/opticup-architect/references/decisions/M1.md` | Confirm D-M1-XX doesn't conflict |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note

Full Auto Pipeline in a single Claude Code chat. The sibling Activation Prompt is what Daniel pastes.

Pipeline order:
1. `opticup-strategic` reads this Brief + runs §0 probes (Phase A — diagnose).
2. Classifies scenario, authors SPEC at `modules/Module 1 - Inventory Management/docs/specs/M1B_FOUNDATION_PERMISSIONS_HOTFIX/SPEC.md`.
3. Hands off to `opticup-executor`.
4. Executor applies the scenario-appropriate fix (Phase B), then production application (Phase D).
5. **Mandatory UI-level smoke** (Phase C): real-user JWT via `pin-auth`, fetch the 3 screens, confirm main content renders. Captured in TEST_REPORT.md.
6. Executor writes EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION.md (Applied Log).
7. `opticup-reviewer` re-runs criteria + Foreman-spot-checks role taxonomy on prizma → writes REVIEW.md.
8. `opticup-strategic` Foreman-reviews + logs the smoke discipline gap as a skill-improvement proposal counter-starting at 1/3 → writes FOREMAN_REVIEW.md.
9. ONE Hebrew status line to Daniel.

After 🟢: Daniel does ONE manual click-through on each of the 3 screens to confirm UI works for real. On real-user PASS → Architect dispatches `M1_LENS_PHASE_1B_PROCUREMENT`.

---

*End of Brief. Diagnose → fix → UI-level smoke → both tenants. Closes the Foundation smoke discipline gap.*
