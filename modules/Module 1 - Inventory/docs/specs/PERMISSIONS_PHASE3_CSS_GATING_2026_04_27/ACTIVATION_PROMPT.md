```
You are opticup-executor. Load your skill: opticup-skills:opticup-executor.

Execute SPEC at:
modules/Module 1 - Inventory/docs/specs/PERMISSIONS_PHASE3_CSS_GATING_2026_04_27/SPEC.md

USER-VISIBLE BUG: Daniel reports "מנהל בדיקה" (manager role with inventory.edit) does NOT see +/- qty buttons in inventory.html, while Daniel (ceo) does. PHASE2 fixed JS guards but missed CSS-class-based gating via the legacy .admin-mode body class. This SPEC audits + fixes all .admin-mode CSS coupling.

This is a 2-phase SPEC:
- Phase A: Audit (read-only) — write AUDIT.md mapping each .admin-mode CSS rule to its correct permission. STOP after audit if any mapping is ambiguous; ask Foreman.
- Phase B: Fix — add granular CSS classes (.has-inventory-edit, .has-settings-edit, etc.) toggled by applyUIPermissions in auth-service.js.
- Phase C: Visual QA — side-by-side admin vs manager screenshots, no SQL substitution.

Hard constraints:
- VISUAL QA IS MANDATORY. Daniel demanded this twice. Take screenshots via Chrome MCP and save to SPEC folder.
- Use Chrome MCP `new_page` for manager session (PIN 090004 on Demo). DO NOT navigate Daniel's existing prizma tab to a different tenant.
- DO NOT touch the storefront repo.
- DO NOT remove ANY .admin-mode CSS rule that protects cost data (cost-col, cost-field) — those legitimately need settings.edit.
- DO NOT consolidate the 5 duplicate stylesheets. Add identical rules to each to maintain parity.

Reproduce the bug FIRST per executor SKILL Step 1:
- Open Demo as manager (PIN 090004) in new_page → inventory.html
- Confirm qty-btns hidden + bulk-bar appears after row select (the PHASE2 fix worked) + cost-col hidden (correct)
- Compare to admin (prizma, ceo): qty-btns VISIBLE
- This confirms SPEC's premise. If reproduction fails, STOP.

QA produces 4 screenshots minimum:
- admin-inventory-before.png (Daniel ceo, pre-fix — for evidence baseline; can use existing tab)
- manager-inventory-before.png (Demo manager, pre-fix — must show no qty-btns)
- After fix:
  - admin-inventory-after.png (no regression)
  - manager-inventory-after.png (qty-btns visible — THE FIX)

Mandatory deliverables in SPEC folder:
1. AUDIT.md (Phase A finding)
2. BEFORE_STATE.json (pre-flight)
3. EXECUTION_REPORT.md
4. FINDINGS.md
5. 4+ screenshots

4 commits per §9 plan. Both repos clean at end. Push ERP to origin/develop.

If after applying the fix, ANY UI element previously visible to admin is now hidden — STOP and rollback. That's a regression.

Hebrew status to Daniel when done:
"תוקן. מנהל בדיקה רואה עכשיו את כפתורי +/- כמו האדמין. שלוש קבצי CSS עודכנו עם הרשאות מבוססות-מפתח."
List 4 commit hashes.
```
