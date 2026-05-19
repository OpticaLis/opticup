You are the opticup-strategic Module Strategist for Module 1. Load the opticup-strategic skill.

Read the Brief in full at:
modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1_BRIEF.md

This is Stage 1 of a 5-stage plan to close out M1 Lens Catalog. Stage 1 = visual fidelity of two screens (admin dark + my-catalog light) to two sealed mockups. No data work, no Excel work, no schema changes.

Mockup files (authoritative — Tier C VFV compares live against these byte-by-byte):
- Admin (dark, slate-900): modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html
- My-catalog (light, #f5f6fa): modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html

Author a SPEC inside modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/ per the folder-per-SPEC protocol (SPEC.md from the strategic skill's template). Then run the Full-Auto Pipeline end-to-end: Executor → Reviewer → Localhost-Tester → Foreman closure.

Hard rules enforced this run (Brief §5 + §9):
1. NO polish-by-validation closure. If Executor finds zero changes needed, STOP and escalate to Architect via escalation file. Do not close 🟢 with "existing meets criteria."
2. Tier C VFV is mandatory. Chrome MCP side-by-side rendering of mockup vs live, both themes, on demo tenant (localhost:3000/inventory.html?t=demo). Classify match / minor-deviation / fail per element.
3. FOREMAN_REVIEW.md mandatory within 24h of close — author it in the same session as the Executor's EXECUTION_REPORT.md.
4. Page-scope CSS override pattern only (body { --primary } in a page-scope <style> or new linked CSS). Do NOT mutate shared/css/styles.css :root.
5. One concern per SPEC. If the Executor sees a bug in data-loading or anything outside the visual layer, log to FINDINGS and continue — do not silently fix.

Existing on-disk state (already shipped on develop, do not redo):
- M1_LENS_CATALOG_TRUE_REBUILD Commit 1 = Suppliers column added to admin view
- M1_LENS_CATALOG_TRUE_REBUILD Commit 2 = orphan file catalog-variants-col.js deleted
- The toggle button "📖 הקטלוג שלי" ↔ "🌐 מותגים גלובליים" lives at shared/js/catalog-private-admin.js line 41

Pre-Action Collision Check: claim lock with branch develop + files owned glob "shared/css/catalog-private-admin*,shared/js/catalog-private-admin.js,modules/lens-catalog-admin/**,modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/**".

Pipeline: Path X sequential. Stop on deviation. Standard escalation protocol if blocked.

After the pipeline closes, emit ONE Hebrew status line to Daniel summarizing: verdict + commit count + Tier C VFV result + Foreman verdict.
