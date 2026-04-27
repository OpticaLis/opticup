# SPEC — PERMISSIONS_PHASE3_CSS_GATING_2026_04_27

> **Authored:** 2026-04-27 night
> **Severity:** HIGH — manager-role users still missing UI controls in production
> **Type:** Audit + Fix (combined)

---

## 1. Goal

Identify and fix every UI element across the ERP that is gated by the legacy `.admin-mode` body class instead of by granular permission keys. Daniel reported that "מנהל בדיקה" (manager role with `inventory.edit` granted) still doesn't see the +/− qty buttons in inventory while Daniel (admin/ceo) does. PHASE2 fixed the `if (!isAdmin)` JS guards but missed the CSS-class-based gating.

After this SPEC: every UI control is gated by the correct granular permission, verified live by side-by-side comparison of admin vs manager screenshots on every screen with permission-gated UI.

---

## 2. Background — verified live state

Probed in Cowork pre-flight (NOT confabulated this time):

```bash
$ grep -rh "\.admin-mode" css/ | sort -u
.admin-col{display:none}.admin-mode .admin-col{display:table-cell}
.admin-mode .cost-field{display:flex}
.admin-tab{display:none!important}.admin-mode .admin-tab{display:inline-block!important}
.cost-col{display:none}.admin-mode .cost-col{display:table-cell}
.qty-btns{display:none}.admin-mode .qty-btns{display:inline}
```

The duplicate (rules appear in 5 different stylesheets — employees.css, inventory.css, settings.css, shipments.css, styles.css) is consistent across files.

**Five gated UI elements:**

| Class | Meaning | Should be gated by |
|---|---|---|
| `.qty-btns` | +/− quantity buttons in inventory rows | `inventory.edit` |
| `.admin-col` | "Admin" table columns (likely cost/profit) | `settings.edit` (cost data) |
| `.admin-tab` | "Admin" navigation tab | `settings.edit` |
| `.cost-col` | Cost column in tables | `settings.edit` |
| `.cost-field` | Cost input in forms | `settings.edit` |

The mapping above is the SPEC author's hypothesis — Claude Code MUST verify each one by reading the actual HTML where each class appears + checking what surrounding context shows (e.g. is the qty-btn next to a price/cost field, or an inventory item count?).

PHASE2 commit `f9c277d` set `body.classList.toggle('admin-mode', hasPermission('settings.edit'))` in `applyUIPermissions`. So today the body class follows `settings.edit`. Manager has `inventory.edit` but NOT `settings.edit` → no `admin-mode` class → no qty-btns. **That's the bug Daniel sees.**

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | ERP repo on `develop`, clean | "nothing to commit" | `git status` |
| 2 | Commits this SPEC | 4 (audit, fix, doc, retro) | `git log origin/develop..HEAD --oneline` |
| 3 | Audit doc identifies all UI elements per `.admin-mode` class | 5 classes mapped | `AUDIT.md` §A has 5 rows |
| 4 | Each class mapped to permission, verified by code context | every row has perm + evidence | `AUDIT.md` §A column "verified-by" |
| 5 | New CSS classes introduced, named after the permission | `.has-inventory-edit` / `.has-settings-edit` (or equivalent naming convention) | `grep "has-inventory-edit\|has-settings-edit" css/*.css` |
| 6 | `.admin-mode` references removed or repurposed | 0 production-CSS references to legacy `.admin-mode` (or kept ONLY where mapped to settings.edit explicitly) | `grep -rn '.admin-mode' css/` → either 0 or all-kept-with-explicit-settings.edit-mapping |
| 7 | `applyUIPermissions` toggles ALL granular classes | function in `js/auth-service.js` toggles each new class based on its permission | `grep -A 20 'applyUIPermissions' js/auth-service.js` shows toggle calls per class |
| 8 | Visual QA: admin sees all UI controls | screenshot from Daniel's tab (still logged in as ceo) | attached to EXECUTION_REPORT |
| 9 | Visual QA: manager sees correct subset | screenshot from new_page logged in as Demo manager (PIN 090004) | attached to EXECUTION_REPORT — must show qty-btns visible, cost-col HIDDEN |
| 10 | Side-by-side diff documented | for each of 5 classes, document admin-visible vs manager-visible | `EXECUTION_REPORT.md` §QA table |
| 11 | No regressions | every previously-visible-to-admin element still visible | screenshot evidence |
| 12 | ERP `npm run verify:integrity` | exit 0 | runs cleanly |
| 13 | EXECUTION_REPORT, FINDINGS exist | files present | ls SPEC_FOLDER |
| 14 | Storefront repo untouched | 0 commits | `git -C opticup-storefront status` |
| 15 | Pre-flight artifact captured | `BEFORE_STATE.json` with current CSS rules + screenshot of admin UI before changes | file present |

---

## 4. Autonomy Envelope

### CAN
- Read every file in repo.
- Read-only SQL via Supabase MCP.
- Modify CSS files (the 5 stylesheets) + `js/auth-service.js` (applyUIPermissions function only).
- Modify any HTML file ONLY to update class names if needed (e.g. add granular classes alongside existing ones).
- Use Chrome MCP `new_page` for QA on Demo. DO NOT navigate Daniel's existing prizma tab.
- Take screenshots via Chrome MCP and save them to SPEC folder for evidence.
- Commit and push to `develop`.

### MUST STOP
- Any DB writes.
- Any merge to `main`.
- Touching the storefront repo.
- Touching files outside the audit's mapped scope (e.g. don't refactor whole auth-service.js — just the relevant function).
- Removing `.admin-mode` references that aren't yet mapped — if a 6th use of the class is found that wasn't in the original 5, STOP and report.

---

## 5. Stop Triggers

- If Chrome MCP can't reach `localhost:3000` — STOP. Visual QA is mandatory; no SQL substitution allowed.
- If Demo manager test user (PIN 090004) doesn't authenticate — STOP. Means Phase 2's tenant cleanup may have nuked the test user.
- If any of the 5 `.admin-mode` rules turns out to be needed by something this SPEC's audit didn't anticipate — STOP and re-author.
- If after the fix, admin's screen loses ANY UI control that was visible before — STOP, that's a regression.

---

## 6. Rollback

`git reset --hard {START_COMMIT}` reverts all changes. No DB writes to undo.

---

## 7. Out of Scope

- LEGACY_ROLE_MAP changes (kept per Daniel's prior decision).
- DB schema changes (no permissions table touched).
- Adding new permission keys.
- Touching is_super_admin or super-admin code paths.
- Studio storefront UI gating (different system, not affected by this issue).
- The CSS class consolidation (5 stylesheets have duplicate rules) — Daniel can decide later if worth a cleanup SPEC. THIS SPEC just modifies what each rule does.

---

## 8. Expected Final State

### Phase A — Audit (read-only, write `AUDIT.md` only)

For each of the 5 `.admin-mode`-gated classes, find:
- Where in HTML it's used (file + line)
- What surrounding context shows (is it inventory data, cost data, settings UI, etc.)
- What permission SHOULD govern its visibility (with evidence — code comment, surrounding fields, intent)
- What permission CURRENTLY governs (`settings.edit` for all 5)
- Whether the mapping is wrong (likely yes for `qty-btns` and possibly `admin-col`/`admin-tab`; likely correct for `cost-col`/`cost-field`)

Write the findings to `AUDIT.md` in the SPEC folder. Daniel can stop after Phase A if he wants to pause-and-decide; otherwise continue to Phase B.

### Phase B — Fix

For each class with a wrong gate:
1. Add a new CSS class to all 5 stylesheets (or refactor to a shared file — executor's call) with the correct permission name. Suggested: `.has-{permission-key-with-dots-as-dashes}`. So `inventory.edit` becomes `.has-inventory-edit`. The CSS rule mirrors the old `.admin-mode` one but uses the new class.
2. Keep the old `.admin-mode` rule for classes that genuinely need `settings.edit` (cost-col, cost-field).
3. In `js/auth-service.js` `applyUIPermissions`, add toggle calls:
   ```js
   document.body.classList.toggle('has-inventory-edit', hasPermission('inventory.edit'));
   document.body.classList.toggle('has-settings-edit', hasPermission('settings.edit'));
   // ... one per granular class needed
   ```
4. Keep the existing `body.admin-mode` toggle for backward-compat with settings-edit-gated rules.

### Phase C — Visual QA

1. **Admin baseline (Daniel's tab):** screenshot the inventory page with Daniel logged in (don't disturb session, just request screenshot via Chrome MCP `take_screenshot`).
2. **Manager comparison (new_page):** sign in to Demo as manager (PIN 090004) in a NEW tab. Screenshot the same inventory page.
3. **Side-by-side diff documented:**
   - qty-btns: admin SHOWS, manager NOW SHOWS (was hidden — the fix)
   - cost-col: admin SHOWS, manager HIDDEN (still correct)
   - cost-field: admin SHOWS, manager HIDDEN (still correct)
   - admin-col: depends on Phase A finding
   - admin-tab: depends on Phase A finding

### Files Modified

| File | Type |
|---|---|
| 5 CSS files (employees.css, inventory.css, settings.css, shipments.css, styles.css) | edit — add granular class rules |
| `js/auth-service.js` | edit — extend `applyUIPermissions` |
| `AUDIT.md` (SPEC folder) | new |
| `EXECUTION_REPORT.md` | new |
| `FINDINGS.md` | new |
| `BEFORE_STATE.json` | new (pre-flight) |
| Module 1 SESSION_CONTEXT.md | append entry |
| Screenshots | new (in SPEC folder) |

---

## 9. Commit Plan

| # | Commit | Touches |
|---|--------|---------|
| 1 | `chore(audit): permissions phase 3 CSS gating audit findings` | AUDIT.md + BEFORE_STATE.json |
| 2 | `fix(css): replace .admin-mode coupling with granular permission classes` | 5 CSS files + auth-service.js |
| 3 | `docs(m1): record phase 3 CSS gating fix in SESSION_CONTEXT` | SESSION_CONTEXT |
| 4 | `chore(spec): close PERMISSIONS_PHASE3_CSS_GATING with retrospective` | EXECUTION_REPORT + FINDINGS + screenshots |

---

## 10. Lessons Already Incorporated

- **FROM `PERMISSIONS_HOTFIX_NULL_BYTES/FOREMAN_REVIEW.md` Strategic Proposal A (Reproduce-The-Bug-First)** → APPLIED: §2 includes the actual `grep` output I ran, not assumed evidence. The 5 classes are real and verified.
- **FROM `PERMISSIONS_HOTFIX_NULL_BYTES/FOREMAN_REVIEW.md` Strategic Proposal B (Apply accumulated proposals)** → ACKNOWLEDGED: I'm not yet applying the 20 accumulated proposals to my SKILL file. This SPEC is a hotfix in flight. The full skill update is queued for after Daniel pauses.
- **FROM Daniel's repeated visual-QA demand** → APPLIED: §3 #8-#11 mandate live screenshots, side-by-side comparison, no SQL substitution.
- **FROM `PERMISSIONS_PHASE2_FIX/FOREMAN_REVIEW.md` Cross-Asset Coupling Survey** → APPLIED: this SPEC IS the coupling survey for `.admin-mode`. The class is the asset; CSS files + JS toggles are the consumers; the audit is the survey.

---

## 11. QA — Mandatory Visual Checks

Document in EXECUTION_REPORT §QA, with screenshot file references:

```
1. Admin (Daniel, prizma, ceo) — inventory.html
   - qty-btns visible? YES (expected)
   - cost-col visible? YES (expected)
   - cost-field visible in product modal? YES (expected)
   - admin-col visible? YES (expected)
   - admin-tab visible? YES (expected)

2. Manager (Demo, PIN 090004) — inventory.html (NEW TAB)
   - qty-btns visible? **MUST be YES post-fix** (was NO pre-fix — THE BUG)
   - cost-col visible? NO (correct — settings.edit absent)
   - cost-field visible? NO (correct)
   - admin-col visible? depends on audit decision
   - admin-tab visible? depends on audit decision

3. Worker (Demo, create test user with role=worker if needed)
   - qty-btns visible? NO (no inventory.edit)
   - All admin/cost fields HIDDEN (no settings.edit)
```

Side-by-side screenshots in SPEC folder. Filenames:
- `admin-inventory-before.png` (pre-fix)
- `manager-inventory-before.png` (pre-fix — should show no qty-btns)
- `manager-inventory-after.png` (post-fix — qty-btns visible)
- `admin-inventory-after.png` (post-fix — no regression)

---

## 12. Notes for Executor

- This SPEC explicitly authorizes you to STOP after Phase A audit if you find ambiguity. Phase B fix should not start until the audit's permission mappings are unambiguous.
- The 5 stylesheets duplicating the same rules is a known tech-debt; do NOT consolidate them in this SPEC. Add the new rules to all 5 to maintain parity.
- The `applyUIPermissions` function already exists. Don't rewrite it — extend it.
- For visual QA, use Chrome MCP `new_page` for the manager tab (per Phase 2 lesson); reload-in-place is fine for the admin tab if needed for the patched JS to take effect.
- If the Demo manager test user (PIN 090004) is the one created during Phase 2 QA, verify they still exist before relying on it. If deleted, recreate (employee with role='manager' on Demo, all inventory.* perms granted, NOT settings.edit).
