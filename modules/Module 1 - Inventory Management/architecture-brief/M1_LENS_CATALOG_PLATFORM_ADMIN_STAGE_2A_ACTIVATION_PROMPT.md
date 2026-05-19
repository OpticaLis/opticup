You are the opticup-strategic Module Strategist for Module 1. Load the opticup-strategic skill.

Read the Brief in full at:
modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_BRIEF.md

This is Stage 2A of a 5-stage plan to close out M1 Lens Catalog. Stage 2A = the full Platform Catalog Admin screen, Optic Up team only, with two product-type tabs (glasses + contacts) that share brand/series tree (filtered by lens_type) and swap the variants pane schema. No Excel import (that's 2B). No tenant-side changes.

Authoritative mockup (read in FULL — 671 lines — before authoring SPEC):
modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html

Author a SPEC inside modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/ per folder-per-SPEC protocol. Then run the Full-Auto Pipeline end-to-end: Executor → Reviewer → Localhost-Tester → Foreman closure.

Hard rules enforced this run (Brief §5 + §9):
1. NO polish-by-validation closure. If Executor finds zero changes needed, STOP and escalate to Architect via escalation file.
2. Tier C VFV mandatory. Chrome MCP side-by-side renders: glasses tab + contacts tab + empty state + populated state + all four creation modals (supplier / brand / series / variant). Classify match/minor/fail per element.
3. FOREMAN_REVIEW.md mandatory within 24h of close — same session as EXECUTION_REPORT.md.
4. Page-scope CSS override pattern only. Do NOT mutate shared/css/styles.css :root.
5. One concern per SPEC. If Executor sees a bug in unrelated code, log to FINDINGS, continue.
6. New screen is Optic Up team only. Server permission check + client navigation hiding + RLS on every write (Iron Rule 22 defense-in-depth).
7. DO NOT touch the existing tenant-side inventory screen — that's Stage 4.
8. DO NOT delete the 3 misclassified "brands" (יומיות / חודשיות / שנתיות) — separate curation SPEC.
9. Excel import buttons exist in DOM but `disabled` with tooltip "זמין בשלב 2ב".

Existing on-disk state (already shipped on develop):
- M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 closed 🟢 — 3-column visual chrome lives in shared/js/catalog-private-admin.js + shared/css/catalog-private-admin.css. Stage 2A EXTENDS this, doesn't rewrite from scratch. The 4th column + tabs + creation modals are new.

DB structure to honor (verified via Supabase MCP 2026-05-18):
- lens_brand + lens_design = SHARED across lens types (discriminator: lens_design.lens_type)
- lens_variant = glasses-only (SPH/CYL/index/coating/diameter columns)
- contact_lens_variant = contacts-only (base_curve/diameter/sph/cyl/axis/wearing_schedule/qty_per_box columns)
- contact_lens_brand and contact_lens_design DO NOT EXIST — use lens_* tables with lens_type filter

Pre-Action Collision Check: claim lock with branch develop + files owned glob "shared/css/catalog-private-admin*,shared/js/catalog-private-admin.js,modules/lens-catalog-admin/**,modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/**,inventory.html".

Pipeline: Path X sequential. Stop on deviation. Standard escalation protocol if blocked.

After the pipeline closes, emit ONE Hebrew status line to Daniel summarizing: verdict + commit count + Tier C VFV result + Foreman verdict + any permission-key-creation note for either demo or Prizma.
