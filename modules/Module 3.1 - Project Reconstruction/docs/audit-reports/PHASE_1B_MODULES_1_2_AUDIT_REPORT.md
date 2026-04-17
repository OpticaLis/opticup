# Module 3.1 — Phase 1B Audit Report

**Date:** 2026-04-11
**Phase:** 1B Modules 1-2 (covers Modules 1, 1.5, 2)
**Mode:** READ-ONLY
**Branches verified:** `develop` (opticup, `opticalis/opticup`)
**Files audited:** 69 of 70 in scope (1 BROKEN — binary .docx, correctly skipped per instructions)
**Verdict:** **YELLOW** — Modules 1.5 and 2 are essentially clean and production-accurate. Module 1 is accurate at the core but carries three visibly misplaced/stale legacy artifacts (`SPEC.md`, `OPTIC_UP_PROJECT_GUIDE_v1.1.md`, `STRATEGIC_CHAT_OPENING_PROMPT.md`) plus minor drift in counts and stale ⬜ headers in Module 1.5's ROADMAP. No blockers for Module 3.1 planning, but targeted cleanup should happen before Phase 2.

---

## 1. Inventory

### Module 1 — `modules/Module 1 - Inventory Management`

| File | Size (bytes) | Last Modified | Type |
|---|---|---|---|
| MESSAGE_TO_MODULE_1_STRATEGIC.md | 1,982 | 2026-03-21 | OTHER (handoff note) |
| MODULE_1_COMPLETION_SUMMARY.md | 15,844 | 2026-03-21 | OTHER (module summary) |
| MY_CHEATSHEET.md | 4,867 | 2026-03-14 | OTHER (personal workflow) |
| ROADMAP.md | 22,453 | 2026-03-29 | ROADMAP |
| SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md | 16,213 | 2026-03-25 | TEMPLATE |
| STRATEGIC_CHAT_OPENING_PROMPT.md | 9,138 | 2026-03-21 | TEMPLATE |
| docs/AI_OCR_FIX_AND_FINAL_QA_SPEC.md | 14,053 | 2026-03-29 | PHASE_SPEC |
| docs/CHANGELOG.md | 89,165 | 2026-03-29 | CHANGELOG |
| docs/db-schema.sql | 106,038 | 2026-03-29 | DB_SCHEMA |
| docs/FLOW_REVIEW_AND_FIXES_SPEC.md | 5,296 | 2026-03-23 | PHASE_SPEC |
| docs/FLOW_REVIEW_FIXES_2_SPEC.md | 9,013 | 2026-03-24 | PHASE_SPEC |
| docs/FLOW_REVIEW_FIXES_3_SPEC.md | 16,080 | 2026-03-24 | PHASE_SPEC |
| docs/FLOW_REVIEW_FIXES_4_SPEC.md | 16,435 | 2026-03-29 | PHASE_SPEC |
| docs/MODULE_MAP.md | 206,015 | 2026-03-29 | MODULE_MAP |
| docs/MODULE_SPEC.md | 51,006 | 2026-03-29 | MODULE_SPEC |
| docs/OPTIC_UP_PROJECT_GUIDE_v1.1.md | 25,606 | 2026-03-14 | OTHER (Miro extraction + workflow guide) |
| docs/PHASE_2_SPEC.md | 20,879 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_3_SPEC.md | 19,615 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_3.5_SPEC.docx | 22,333 | 2026-03-14 | PHASE_SPEC (BROKEN — see §5) |
| docs/PHASE_3.75_SPEC.md | 13,710 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_3.8_SPEC.md | 4,383 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_4_SPEC.md | 34,356 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_5_SPEC.md | 35,907 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_5.5_SPEC.md | 43,053 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_5.75_SPEC.md | 19,238 | 2026-03-14 | PHASE_SPEC |
| docs/PHASE_5.9_SPEC.md | 28,689 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_7_SPEC_UPDATED.md | 14,656 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_8_SPEC.md | 24,063 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_8_QA_SPEC.md | 14,437 | 2026-03-23 | PHASE_SPEC |
| docs/PHASE_QA_SPEC_v2.md | 9,588 | 2026-03-21 | PHASE_SPEC |
| docs/QA_TRACKER.md | 39,542 | 2026-03-21 | OTHER (test tracker) |
| docs/SESSION_CONTEXT.md | 5,818 | 2026-03-29 | SESSION_CONTEXT |
| docs/SPEC.md | 44,604 | 2026-03-14 | OTHER (Miro board extraction, 28-module vision) |

**Total: 32 files, ~888 KB**

### Module 1.5 — `modules/Module 1.5 - Shared Components`

| File | Size (bytes) | Last Modified | Type |
|---|---|---|---|
| MODULE_1.5_SECONDARY_CHAT_TEMPLATE.md | 12,856 | 2026-03-21 | TEMPLATE |
| MODULE_1.5_STRATEGIC_CHAT_PROMPT.md | 11,413 | 2026-03-21 | TEMPLATE |
| MODULE_1_5_COMPLETION_SUMMARY.md | 14,373 | 2026-03-21 | OTHER (module summary) |
| MY_CHEATSHEET.md | 5,298 | 2026-03-21 | OTHER |
| ROADMAP.md | 29,570 | 2026-03-21 | ROADMAP |
| docs/CHANGELOG.md | 13,136 | 2026-03-21 | CHANGELOG |
| docs/db-schema.sql | 6,171 | 2026-03-21 | DB_SCHEMA |
| docs/MESSAGE_TO_MODULE_1.5_STRATEGIC.md | 1,312 | 2026-03-21 | OTHER (handoff note) |
| docs/MODULE_1.5_PHASE_0_SPEC.md | 24,565 | 2026-03-21 | PHASE_SPEC |
| docs/MODULE_MAP.md | 16,188 | 2026-03-29 | MODULE_MAP |
| docs/MODULE_SPEC.md | 15,754 | 2026-03-21 | MODULE_SPEC |
| docs/PHASE_1_SPEC.md | 17,209 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_2_SPEC.md | 24,723 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_3_SPEC.md | 25,088 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_4_SPEC.md | 18,468 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_5_MIGRATION_MAP.md | 24,514 | 2026-03-21 | OTHER (migration scan) |
| docs/PHASE_5_SPEC.md | 15,200 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_6_SPEC.md | 6,206 | 2026-03-21 | PHASE_SPEC |
| docs/PHASE_QA_SPEC.md | 13,263 | 2026-03-21 | PHASE_SPEC |
| docs/SESSION_CONTEXT.md | 5,621 | 2026-03-21 | SESSION_CONTEXT |

**Total: 20 files, ~301 KB**

### Module 2 — `modules/Module 2 - Platform Admin`

| File | Size (bytes) | Last Modified | Type |
|---|---|---|---|
| MODULE_2_COMPLETE_SUMMARY.md | 12,730 | 2026-03-26 | OTHER (module summary) |
| MODULE_2_MY_CHEATSHEET.md | 6,243 | 2026-03-26 | OTHER |
| MODULE_2_SECONDARY_CHAT_TEMPLATE.md | 16,265 | 2026-03-26 | TEMPLATE |
| MODULE_2_STRATEGIC_CHAT_PROMPT.md | 9,855 | 2026-03-26 | TEMPLATE |
| ROADMAP.md | 25,805 | 2026-03-26 | ROADMAP |
| docs/CHANGELOG.md | 11,110 | 2026-03-26 | CHANGELOG |
| docs/create_tenant_rpc.sql | 20,887 | 2026-03-26 | DB_SCHEMA (auxiliary — stale, see §3.3) |
| docs/db-schema.sql | 16,008 | 2026-03-26 | DB_SCHEMA |
| docs/MODULE_MAP.md | 21,907 | 2026-03-26 | MODULE_MAP |
| docs/MODULE_SPEC.md | 15,135 | 2026-03-26 | MODULE_SPEC |
| docs/PHASE_1_SPEC.md | 24,236 | 2026-03-26 | PHASE_SPEC |
| docs/PHASE_2_SPEC.md | 22,500 | 2026-03-26 | PHASE_SPEC |
| docs/PHASE_3_SPEC.md | 34,261 | 2026-03-26 | PHASE_SPEC |
| docs/PHASE_4_SPEC.md | 24,763 | 2026-03-26 | PHASE_SPEC |
| docs/PHASE_5_SPEC.md | 20,663 | 2026-03-26 | PHASE_SPEC |
| docs/PHASE_QA_SPEC.md | 14,735 | 2026-03-26 | PHASE_SPEC |
| docs/phase3a-rpcs.sql | 3,199 | 2026-03-26 | DB_SCHEMA (auxiliary) |
| docs/phase3b-rpcs.sql | 5,362 | 2026-03-26 | DB_SCHEMA (auxiliary) |
| docs/phase3c-rpcs.sql | 4,794 | 2026-03-26 | DB_SCHEMA (auxiliary) |
| docs/phase3-fix-last-active.sql | 1,851 | 2026-03-26 | DB_SCHEMA (auxiliary) |
| docs/phase4a-rpcs.sql | 7,909 | 2026-03-26 | DB_SCHEMA (auxiliary) |
| docs/phase5a-storefront-config.sql | 22,814 | 2026-03-26 | DB_SCHEMA (auxiliary — current `create_tenant` 11-step version) |
| docs/phase-qa-setup.sql | 5,800 | 2026-03-26 | DB_SCHEMA (auxiliary) |
| docs/PHASE_QA_SPEC.md | — | — | (listed above) |
| docs/SESSION_CONTEXT.md | 3,342 | 2026-03-26 | SESSION_CONTEXT |

**Total: 22 files (includes the 8 auxiliary SQL files explicitly in scope per the spec), ~353 KB**

---

## 2. Status per File

### Module 1

**Core docs:**
- `ROADMAP.md` — **ALIVE** — comprehensive, all 15 build phases + 6 flow-review/AI-OCR rounds marked ✅, Phase 6 (Supplier Portal) correctly marked 🚫 deferred with justification.
- `docs/SESSION_CONTEXT.md` — **SUSPECT** — accurate snapshot of last AI-OCR-Fix+QA session, but counts leak Module 2 state into Module 1's boundary ("9 HTML pages" includes admin/error/landing which belong to Module 2; "50+ tables + 14 RPC functions" includes Module 2 RPCs). Not wrong, just drifted into project-wide view.
- `docs/MODULE_MAP.md` — **ALIVE** — 206 KB code map matches `~155 JS files` claim in SESSION_CONTEXT, consistent with MY_CHEATSHEET's note of "856 שורות" history (clearly grown since).
- `docs/MODULE_SPEC.md` — **ALIVE** — current-state spec through Phase 8 + Flow-Review-2/3/4 + Debt-Upgrades + AI-OCR-Fix; descriptions match CHANGELOG/db-schema. Contains references to `opticup-storefront` Phase 6 deferred views section.
- `docs/CHANGELOG.md` — **ALIVE** — 89 KB historical record, commits verifiable against git log, covers every phase from Debt-Upgrades (top) back to Phase 0.
- `docs/db-schema.sql` — **ALIVE** — 106 KB, all 50+ tables documented with RLS, migrations listed up through 058 and `038_*` / `050_*` / phase5_9_*. Consistent with MODULE_SPEC.

**Root-level "other" files:**
- `MODULE_1_COMPLETION_SUMMARY.md` — **SUSPECT** — snapshot as of Phase 5.9+QA ("45 DB tables, 7 RPCs, 78 JS files"), superseded by SESSION_CONTEXT's "50+ tables, 14 RPCs, ~155 files" but still accurate for its era. Should be frozen as a historical closing document, not updated.
- `MESSAGE_TO_MODULE_1_STRATEGIC.md` — **ORPHAN** — single-use handoff note for "Phase 7 kickoff", Phase 7 is now ✅ complete. Purpose fulfilled.
- `MY_CHEATSHEET.md` — **STALE** — personal workflow guide, still references `SECONDARY_CHAT_TEMPLATE_FINAL.md` (file doesn't exist — the real filename is `SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md`) and "MODULE_MAP.md (856 שורות)" when the current map is closer to 5000+ lines.
- `SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md` — **ALIVE** — current project-wide secondary chat template; file structure paragraph is up-to-date (references Module 1.5 shared/ components, 11 shared/js files, debt module 21 files, AI subfolder, etc.).
- `STRATEGIC_CHAT_OPENING_PROMPT.md` — **STALE** — outdated strategic chat template; claims "Phase 3.75 ⬜ (הבא)", "30 קבצי JS", "13 migrations", pre-Phase 4 structure, "hide `?dev_bypass=opticup2024`" as an open item. Snapshot from very early in the project, never updated.

**Phase specs (18):**
- `PHASE_2_SPEC.md`, `PHASE_3_SPEC.md`, `PHASE_3.75_SPEC.md`, `PHASE_3.8_SPEC.md`, `PHASE_4_SPEC.md`, `PHASE_5_SPEC.md`, `PHASE_5.5_SPEC.md`, `PHASE_5.75_SPEC.md`, `PHASE_5.9_SPEC.md`, `PHASE_7_SPEC_UPDATED.md`, `PHASE_8_SPEC.md`, `PHASE_8_QA_SPEC.md`, `PHASE_QA_SPEC_v2.md`, `AI_OCR_FIX_AND_FINAL_QA_SPEC.md`, `FLOW_REVIEW_AND_FIXES_SPEC.md`, `FLOW_REVIEW_FIXES_2_SPEC.md`, `FLOW_REVIEW_FIXES_3_SPEC.md`, `FLOW_REVIEW_FIXES_4_SPEC.md` — **all ALIVE as frozen historical specs.** They're the contemporaneous "what we intended to build" for each phase. None should be updated — they're the paper trail.
- `PHASE_3.5_SPEC.docx` — **BROKEN** — binary .docx in a markdown directory. Per instructions, not read. Only phase spec not in .md format.

**Other:**
- `docs/QA_TRACKER.md` — **STALE** — 448-test checklist stuck in "In Progress" state with most tests still `[ ]` unchecked. The actual final QA result (39/39 for AI-OCR-Fix-QA, 177/190 for Phase QA) lives in CHANGELOG+SESSION_CONTEXT. QA_TRACKER was never finalized; it's a frozen working doc.
- `docs/OPTIC_UP_PROJECT_GUIDE_v1.1.md` — **ORPHAN / MISPLACED** — original "Optic Up Project Guide v1.1" = Miro board extraction of the full 28-module product vision (eye exams, CRM, lab, POS, WhatsApp, calendar, lens inventory, lead mgmt, loyalty, repairs, reports, etc.) + preface on "how Daniel collaborates with Claude". Dated 2026-03-08, before the project was reorganized into modules. Belongs at project-level `docs/`, not inside Module 1.
- `docs/SPEC.md` — **ORPHAN / MISPLACED — NOT a duplicate of MODULE_SPEC.md.** This is the same Miro board extraction as OPTIC_UP_PROJECT_GUIDE_v1.1.md (same source URL, same 2026-03-08 date), minus the Claude workflow preface. 28 modules in scope, matches what the project *imagines becoming*, not what was built in Module 1. The discovery-phase suspicion that this was a stale duplicate of `MODULE_SPEC.md` is **incorrect** — it's an unrelated historical document.

### Module 1.5

- `ROADMAP.md` — **SUSPECT** — summary table at lines 68-77 correctly marks Phases 0-6+QA as ✅, but detailed phase sections later in the same file still carry stale header markers: line 363 "### פאזה 4 ⬜ — Table Builder + Permissions", line 462 "### פאזה 5 ⬜ — Cleanup & Hardening", line 515 "### פאזת QA ⬜ — Full Regression". Internal contradiction between table and detail.
- `docs/SESSION_CONTEXT.md` — **ALIVE** — current as of 2026-03-19 "Phase 6 complete + QA". Documents deferred items (suppliers-debt migration, styles.css deletion, DB.* migration, RLS permissive on 9 tables).
- `docs/MODULE_MAP.md` — **SUSPECT** — **correctly** lists 11 JS files in shared/js/ (includes `table-resize.js` 103L and `sort-utils.js` 43L added post-Phase 5) but both `MODULE_SPEC.md` and `MODULE_1_5_COMPLETION_SUMMARY.md` still claim "9 files, 1,359 lines". The MAP is the authority and is correct; SPEC and SUMMARY are stale count-wise.
- `docs/MODULE_SPEC.md` — **SUSPECT** — see above; shared/js count is 9 while actual is 11. Everything else (DB changes, contracts, shipped pages list) is accurate.
- `docs/CHANGELOG.md` — **ALIVE** — complete Phase 0 → QA → Phase 6 history with commit hashes.
- `docs/db-schema.sql` — **ALIVE** — activity_log table, 3 atomic RPCs, ui_config ALTER, custom_fields ALTER, QA-phase permissions PK alterations. Matches MODULE_MAP section 6.
- `docs/MESSAGE_TO_MODULE_1.5_STRATEGIC.md` — **ORPHAN** — single-use Phase 6 handoff note, Phase 6 now ✅.
- `MODULE_1_5_COMPLETION_SUMMARY.md` — **SUSPECT** — consistent with Phase 6 closure but retains "9 files, 1,359 lines" count.
- `MY_CHEATSHEET.md` — **ALIVE** — personal workflow notes, still accurate.
- `MODULE_1.5_SECONDARY_CHAT_TEMPLATE.md`, `MODULE_1.5_STRATEGIC_CHAT_PROMPT.md` — **ALIVE** (frozen templates — module is complete, templates are historical).
- `docs/MODULE_1.5_PHASE_0_SPEC.md`, `PHASE_1_SPEC.md`, `PHASE_2_SPEC.md`, `PHASE_3_SPEC.md`, `PHASE_4_SPEC.md`, `PHASE_5_SPEC.md`, `PHASE_6_SPEC.md`, `PHASE_QA_SPEC.md` — **all ALIVE as frozen historical specs.**
- `docs/PHASE_5_MIGRATION_MAP.md` — **ALIVE** — the 140-item step-0 scan that drove Phase 5 (inventory/employees/settings/index/shipments migration map with 98+15+6+2+19 items). Useful historical reference.

### Module 2

- `ROADMAP.md` — **SUSPECT** — says "9 new columns on tenants" but MODULE_MAP, MODULE_SPEC, db-schema.sql, and MODULE_2_COMPLETE_SUMMARY all correctly say 10 (the 10th is `last_active`, added via `phase3-fix-last-active.sql` during Phase 3 when discovered missing). One-column drift in ROADMAP only.
- `docs/SESSION_CONTEXT.md` — **ALIVE** — reports 88/92 PASS / 0 FAIL / 4 SKIP, module COMPLETE ✅. Documents all 8 known-debt items and all test artifacts.
- `docs/MODULE_MAP.md` — **ALIVE** — 19 file entries, full function registry, 14 RPC functions listed, correct column counts.
- `docs/MODULE_SPEC.md` — **ALIVE** — current-state, 14 RPCs, 6 tables, role hierarchy, QA status section with 13 test-category table (88/92).
- `docs/CHANGELOG.md` — **ALIVE** — 5 phase sections + QA section, every commit traced.
- `docs/db-schema.sql` — **ALIVE** — 5 original tables + `storefront_config` (Phase 5a), all RLS policies, all `ALTER TABLE tenants` columns, all 14 RPCs described in-place.
- `docs/create_tenant_rpc.sql` — **SUSPECT** — **10-step version** of `create_tenant()`. Superseded by `phase5a-storefront-config.sql` Block 3 which contains the **current 11-step version** (adds `storefront_config` row at Step 11). Two versions coexist; current deployed state per CHANGELOG is the 11-step version.
- `docs/phase3a-rpcs.sql` — **ALIVE** — `get_all_tenants_overview`, `get_tenant_stats`. Note: `get_all_tenants_overview` in this file references `last_active` before that column existed — hence the `phase3-fix-last-active.sql` follow-up.
- `docs/phase3b-rpcs.sql` — **ALIVE** — `suspend_tenant`, `activate_tenant`, `update_tenant`.
- `docs/phase3c-rpcs.sql` — **ALIVE** — `get_tenant_activity_log`, `get_tenant_employees`, `reset_employee_pin`.
- `docs/phase3-fix-last-active.sql` — **ALIVE** — one-off hotfix adding `last_active` column and recreating `get_all_tenants_overview`. Referenced in CHANGELOG's Phase 3 "Bug Fixes" section.
- `docs/phase4a-rpcs.sql` — **ALIVE** — `check_plan_limit`, `is_feature_enabled`. Referenced by `plan-helpers.js` and every `checkPlanLimit()` caller in Module 1 pages.
- `docs/phase5a-storefront-config.sql` — **ALIVE** — `storefront_config` CREATE TABLE + RLS + migration + full `create_tenant` 11-step rewrite. Current authoritative version.
- `docs/phase-qa-setup.sql` — **ALIVE** — pre-QA setup reference (test admin users, plan assignment helpers, verification queries). Referenced in SESSION_CONTEXT ("787c2ba — QA: pre-QA setup SQL reference") and CHANGELOG.
- Root `MODULE_2_COMPLETE_SUMMARY.md`, `ROADMAP.md`, `MODULE_2_MY_CHEATSHEET.md`, `MODULE_2_SECONDARY_CHAT_TEMPLATE.md`, `MODULE_2_STRATEGIC_CHAT_PROMPT.md` — **all ALIVE** — Module 2 is complete, these are frozen closure/template docs.
- Phase specs (`PHASE_1_SPEC.md`, `PHASE_2_SPEC.md`, `PHASE_3_SPEC.md`, `PHASE_4_SPEC.md`, `PHASE_5_SPEC.md`, `PHASE_QA_SPEC.md`) — **all ALIVE** as frozen historical specs.

---

## 3. Discrepancies

### 3.1 Within Module 1 (file-vs-file)

- `SESSION_CONTEXT.md:100-101` says "9 HTML pages: index, inventory, suppliers-debt, employees, shipments, settings, admin, error, landing" and "50+ DB tables + 14 RPC functions". `MODULE_1_COMPLETION_SUMMARY.md:19-20` says "6 HTML pages", "45 DB tables", "7 RPCs". Reality (per the project as a whole after Module 2 shipped): SESSION_CONTEXT is newer but counts `admin.html`, `error.html`, `landing.html` which are owned by Module 2, not Module 1. COMPLETION_SUMMARY is frozen at its era and remains accurate for "end of Module 1". Both are technically right under different definitions of scope, but anyone reading SESSION_CONTEXT as "Module 1's state" will get confused.
- `STRATEGIC_CHAT_OPENING_PROMPT.md:83-89` says "Phase 3.75 ⬜ (הבא)", "30 קבצי JS", 13 migrations, mentions Phase 4/5/6 as `⬜`. Every other file (ROADMAP, SESSION_CONTEXT, CHANGELOG, MODULE_SPEC, MODULE_MAP, COMPLETION_SUMMARY) confirms all those phases ✅. Reality (per `ROADMAP.md:60-84`): all phases through AI-OCR-Fix-QA are ✅, PHASE_6 was deferred 🚫.
- `MY_CHEATSHEET.md:47` references `SECONDARY_CHAT_TEMPLATE_FINAL.md` but the actual file is `SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md` (verified in directory listing). Line 53 references `MODULE_MAP.md (856 שורות)` but actual MODULE_MAP is now 206 KB (many multiples larger).
- `QA_TRACKER.md:6` says "Status: In Progress" with most tests `[ ]` unchecked. `SESSION_CONTEXT.md:107` reports "39/39 QA tests passed" for AI-OCR-Fix-QA, and `CHANGELOG.md` Phase QA section reports "~190 tests (177 PASS)". QA_TRACKER was orphaned mid-use; the canonical QA result lives in CHANGELOG.
- `SPEC.md` (the 44 KB Miro extraction) and `OPTIC_UP_PROJECT_GUIDE_v1.1.md` (the 25 KB Miro extraction + workflow preface) are near-duplicates of each other — same source (Miro board, 2026-03-08), both describing 28 modules including many that were never built (eye exams, lab, POS, WhatsApp, etc.). Inconsistent footprint in Module 1's `docs/` directory; neither is referenced by any other Module 1 file.

### 3.2 Within Module 1.5 (file-vs-file)

- `ROADMAP.md:68-77` summary table: Phases 0 through 6 + QA all ✅. But `ROADMAP.md:363` reads `### פאזה 4 ⬜ — Table Builder + Permissions`, `ROADMAP.md:462` reads `### פאזה 5 ⬜ — Cleanup & Hardening`, `ROADMAP.md:515` reads `### פאזת QA ⬜ — Full Regression`. The detail section headers were never flipped to ✅ when the summary table was updated. Reality (per CHANGELOG + SESSION_CONTEXT): all three are ✅.
- `MODULE_MAP.md` table at section 2 lists **11 JS files** in `shared/js/` (including `table-resize.js` 103L and `sort-utils.js` 43L). `MODULE_SPEC.md` table at section "shared/js/ (9 files, 1,359 lines)" and `MODULE_1_5_COMPLETION_SUMMARY.md:41-42` say "9 files ~1,359 lines". Reality: 11 files. The two post-Phase-5 additions (table-resize, sort-utils — both created during Module 1 Flow-Review-3/4 and moved into shared/) were added to MODULE_MAP but the SPEC and SUMMARY were never re-counted.

### 3.3 Within Module 2 (file-vs-file)

- `ROADMAP.md:146-156` says "ALTER TABLE tenants ADD ... 9 columns". `MODULE_MAP.md:207` says "tenants table extensions (10 columns added in Phase 1 + 3)". `MODULE_SPEC.md:24-25` says 10 columns. `db-schema.sql:156-166` lists 10 `ALTER TABLE tenants ADD COLUMN`s. `phase3-fix-last-active.sql` is a dedicated hotfix for the 10th (`last_active`). Reality: 10 columns. ROADMAP is under-counted by 1.
- `docs/create_tenant_rpc.sql` contains a **10-step** `create_tenant()` body. `docs/phase5a-storefront-config.sql:76-350` contains an **11-step** `create_tenant()` body with Step 11 being `INSERT INTO storefront_config`. `db-schema.sql:213-218` comments say "11-step atomic provisioning". `MODULE_MAP.md:217`, `MODULE_SPEC.md:43`, and `CHANGELOG.md` Phase 5 section all confirm 11 steps. Reality: the deployed version is 11 steps (the Phase 5a rewrite); `create_tenant_rpc.sql` is the pre-Phase-5 version and is now stale as a reference.
- `PHASE_1_SPEC.md:70-95` spec for `platform_admins` RLS defined three policies: `platform_admins_self_read`, `platform_admins_super_read`, `platform_admins_super_write`. Deployed schema in `db-schema.sql:74-82` has two: `platform_admins_read` (`auth.uid() = auth_user_id`) and `platform_admins_super_write` (via `is_platform_super_admin()`). This is a deliberate evolution during implementation — `is_platform_super_admin()` function was introduced to avoid recursive policy evaluation (documented in MODULE_2_COMPLETE_SUMMARY.md section "Architecture — החלטות מרכזיות → RLS Pattern"). Not a bug; the spec is simply pre-implementation.
- `PHASE_5_SPEC.md` Section 4.2 mentions deferring `shared_resources` and `resource_access_log` tables to Module 3. `db-schema.sql` does not contain them. `MODULE_2_COMPLETE_SUMMARY.md` "Known Debt" row 7 confirms "B2B tables deferred to Module 3". Not a discrepancy — consistent scope cut, but worth noting that the ROADMAP Phase 5 overview still mentions "shared_resources" as a deliverable (line 380-397 of ROADMAP) which creates a minor internal inconsistency in the ROADMAP file itself.

### 3.4 Cross-module discrepancies (Module 1 says X, Module 2 says Y)

- **`tenants` table ownership ambiguity.** Module 1's `db-schema.sql:72-97` defines `tenants` as owned by Module 1 (original creation in Phase 3.75). Module 1.5's `db-schema.sql:13-14` adds `ALTER TABLE tenants ADD COLUMN ui_config JSONB`. Module 2's `db-schema.sql:156-166` adds 10 more columns (plan_id, status, trial_ends_at, owner_*, created_by, suspended_reason, deleted_at, last_active). All three files describe overlapping alters on the same table. Not a conflict (the alters are additive and non-overlapping column names), but there is no single source of truth for the final state of `tenants`. Expected: `docs/GLOBAL_SCHEMA.sql` is the merged canonical version — verify in Phase 1A.
- **`employees` table ownership ambiguity.** Module 1 owns it (db-schema.sql:167-181); Module 2's `db-schema.sql:194` adds `must_change_pin BOOLEAN DEFAULT false` via ALTER. Same additive pattern as tenants. Same caveat.
- **"Phase 5" label collision.** Module 1.5 uses "Phase 5" to mean "Cleanup & Hardening — CSS migration". Module 1 uses "Phase 5" to mean "AI Agent for Supplier Management". Both modules also both have sub-phases labeled "5a/5b/5c/5d/5e" (Module 1.5: CSS migration steps; Module 1: AI OCR learning stages). A reader scanning commits or SESSION_CONTEXT entries could easily confuse them. Not a file-vs-file contradiction within one module, but a cross-module naming collision worth flagging.
- **Suspended-tenant blocking logic was built twice.** Module 2's `PHASE_3_SPEC.md` section 14 specified "suspended tenant overlay in shared.js/index.html". Module 2's `PHASE_5_SPEC.md` section 5.2 then documents removing that overlay and replacing it with a hard redirect to `error.html`. Both specs are frozen "as written" — no internal contradiction within Module 2 because Phase 5's spec explicitly references "the Phase 3 overlay code", but a reader who reads PHASE_3_SPEC in isolation might implement the wrong thing. Resolved in the actual code per CHANGELOG.
- **`admin.html`, `error.html`, `landing.html`, `plan-helpers.js`, `modules/admin-platform/*` ownership.** Module 1's `SESSION_CONTEXT.md` lists "9 HTML pages" including these; Module 2's `MODULE_MAP.md` and `MODULE_SPEC.md` own them. These are Module 2 files. Module 1's SESSION_CONTEXT is drifting into a project-wide view rather than a module-bounded view.

---

## 4. Outdated Content

Specific passages describing reality that no longer exists:

- `modules/Module 1 - Inventory Management/STRATEGIC_CHAT_OPENING_PROMPT.md:83-89` — describes "Phase 3.75 ⬜ Multi-Tenancy Foundation (הבא)" as the next phase. Current: Phase 3.75 + 10 more phases ✅, module complete.
- `modules/Module 1 - Inventory Management/STRATEGIC_CHAT_OPENING_PROMPT.md:89-95` — claims "30 JS files, 4 globals, 7 module folders, 13 migrations". Current: ~155 JS files, ~11 globals, 15+ module folders (incl. admin-platform from Module 2), ~60+ migration files.
- `modules/Module 1 - Inventory Management/STRATEGIC_CHAT_OPENING_PROMPT.md:140` — "Open items before production: הסרת `?dev_bypass=opticup2024`". Per `QA_TRACKER.md:13`: `dev_bypass removed from auth-service.js (28cc3ba)`. Already addressed.
- `modules/Module 1 - Inventory Management/MY_CHEATSHEET.md:47` — references `SECONDARY_CHAT_TEMPLATE_FINAL.md`. Current: file is named `SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md` (renamed during the template consolidation).
- `modules/Module 1 - Inventory Management/MY_CHEATSHEET.md:53` — describes "MODULE_MAP.md (856 שורות)". Current: MODULE_MAP is 206 KB (~5000+ lines based on typical markdown density).
- `modules/Module 1 - Inventory Management/docs/QA_TRACKER.md:6` — "Status: In Progress" at a time when Module 1 is fully complete and merged. All 448 tracked tests are abandoned `[ ]` placeholders.
- `modules/Module 1 - Inventory Management/MODULE_1_COMPLETION_SUMMARY.md:19-20` — "78 JS files, 45 DB tables, 7 RPCs". Superseded by Phase 7/8/Flow-Review rounds that added files and tables. Valid as a historical snapshot, but the implicit "this is current" framing is stale.
- `modules/Module 1.5 - Shared Components/ROADMAP.md:363, 462, 515` — phase detail headers still say "⬜" despite the summary table and CHANGELOG marking them ✅.
- `modules/Module 1.5 - Shared Components/docs/MODULE_SPEC.md:23` — "shared/js/ (9 files, 1,359 lines)". Current (per MODULE_MAP): 11 files including `table-resize.js` and `sort-utils.js`.
- `modules/Module 1.5 - Shared Components/MODULE_1_5_COMPLETION_SUMMARY.md:41-42` — same "9 files, 1,359 lines" claim. Same issue.
- `modules/Module 2 - Platform Admin/ROADMAP.md:154-156` — "ALTER TABLE tenants ADD COLUMN ... (9 columns)". Current: 10 columns (last_active was added via phase3 hotfix).
- `modules/Module 2 - Platform Admin/ROADMAP.md:380-397` — Phase 5 overview paragraph still lists `shared_resources` and `resource_access_log` as deliverables. These were deferred to Module 3 per `MODULE_2_COMPLETE_SUMMARY.md` "Known Debt" row 7. ROADMAP Phase 5 description is aspirational, not shipped.
- `modules/Module 2 - Platform Admin/docs/create_tenant_rpc.sql` — entire file documents the 10-step version of `create_tenant()`. Current deployed version is 11 steps (Step 11 = `INSERT INTO storefront_config`) per `phase5a-storefront-config.sql`. The 10-step file remains in the repo as a historical reference rather than a current source of truth.

---

## 5. Missing

- **EXPECTED:** `modules/Module 1 - Inventory Management/docs/PHASE_1_SPEC.md`. **WHERE:** none. **REFERENCED BY:** `ROADMAP.md:96-103` (Phase 1 ✅ — הזמנות רכש). **EXPLANATION:** Phase 1 predates the `docs/PHASE_X_SPEC.md` convention. Phase 0-1-1.5 appear to have been built before the module-level `docs/` directory structure was formalized (see `MODULE_1.5_PHASE_0_SPEC.md` which documents creating `docs/` as part of Phase 0 of Module 1.5). Not a bug — just a pre-convention gap.
- **EXPECTED:** `modules/Module 1 - Inventory Management/docs/PHASE_6_SPEC.md`. **WHERE:** none. **REFERENCED BY:** `ROADMAP.md:83, 273-279` ("Phase 6 🚫 נדחה — פורטל ספקים (ייבנה במודול עתידי)"). **EXPLANATION:** Phase 6 was explicitly deferred and never built as part of Module 1 — intended to become a separate future module (Module 17 per `MESSAGE_TO_MODULE_1_STRATEGIC.md:8`: "פורטל ספקים נדחה למודול 17"). No spec file should exist.
- **EXPECTED:** `modules/Module 1 - Inventory Management/docs/PHASE_0_SPEC.md`, `PHASE_1.5_SPEC.md`, `PHASE_3.5_SPEC.md` (as .md, not .docx). **WHERE:** none. **REFERENCED BY:** `ROADMAP.md:89-145` (all phases ✅). **EXPLANATION:** Same as PHASE_1 — pre-convention. Phase 3.5 does have a .docx file of the same name but it's BROKEN (see below) and predates the .md convention.
- **BROKEN file:** `modules/Module 1 - Inventory Management/docs/PHASE_3.5_SPEC.docx` (22,333 bytes, 2026-03-14). Binary .docx in a markdown-expected directory; only non-.md phase spec in the audit. Per audit instructions, not opened. Content likely parallels the other .md phase specs but is unreadable by standard tools.
- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` references `shared/js/table-resize.js` and `shared/js/sort-utils.js`. Not missing (they exist per MAP), but they are the root cause of the count drift in MODULE_SPEC/SUMMARY noted above.
- Module 2 `PHASE_5_SPEC.md` referenced `shared_resources` and `resource_access_log` as intended tables. **EXPECTED** in `db-schema.sql` per Phase 5 spec. **WHERE:** not in schema. **REFERENCED BY:** ROADMAP.md:379-398, PHASE_5_SPEC.md section 2. **EXPLANATION:** explicit scope cut, deferred to Module 3 per MODULE_2_COMPLETE_SUMMARY.md "Known Debt" row 7.
- Module 1 SESSION_CONTEXT's "Open Issues — LOW / DEFERRED" references `receipt-ocr-review.js at 401 lines — borderline` and `debt-dashboard.js at 424 lines — candidate for split`. Neither is in the in-scope doc list (those are code files, not docs), but the tracking of these items in SESSION_CONTEXT is the only place they live. Not a missing file — just noting that tech-debt-in-docs is spread across multiple places.

---

## 6. Cross-references

### To Phase 1A scope (docs/GLOBAL_MAP.md, GLOBAL_SCHEMA.sql, CLAUDE.md, opticup/docs/)

- `Module 1 - Inventory Management/SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md:89-91` — references `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` as "GLOBAL docs (read-only during dev)". Strategic Chat synthesis needs to verify those two files exist and are up-to-date at project level.
- `Module 1 - Inventory Management/SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md:192-194` — references `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `CLAUDE.md` as authority files.
- `Module 1 - Inventory Management/STRATEGIC_CHAT_OPENING_PROMPT.md` (stale) references `CLAUDE.md` and `docs/` conventions throughout.
- `Module 1 - Inventory Management/MY_CHEATSHEET.md:46` — references `CLAUDE.md` as required reading.
- `Module 1 - Inventory Management/docs/SESSION_CONTEXT.md:118-121` — "Next Steps: Module 3 — Storefront planning or additional Module 1 improvements". (Cross-reference to Phase 1C scope.)
- `Module 1 - Inventory Management/docs/MODULE_SPEC.md` entire document references GLOBAL_SCHEMA and CLAUDE.md at its header ("For rules → CLAUDE.md").
- `Module 1 - Inventory Management/docs/MODULE_SPEC.md:763-768` — "Planned Views (Phase 6 — Supplier Portal): v_supplier_inventory, v_supplier_documents, v_supplier_payments, v_supplier_returns". Cross-reference to a deferred-but-specified module.
- `Module 1 - Inventory Management/docs/PHASE_3.75_SPEC.md` entire document — references `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` integration ceremony.
- `Module 1 - Inventory Management/docs/PHASE_5.75_SPEC.md:88-93` — references future `docs/GLOBAL_MAP.md` contracts for communications RPCs.
- `Module 1 - Inventory Management/docs/PHASE_7_SPEC_UPDATED.md:6` — references `docs/GLOBAL_MAP.md` for shared component APIs.
- `Module 1 - Inventory Management/docs/SPEC.md` + `OPTIC_UP_PROJECT_GUIDE_v1.1.md` — both reference the Miro board ("Optic Up Project New") as their ultimate source. Not a Phase 1A file per se, but worth noting as the project's original external source of truth.

- `Module 1.5 - Shared Components/ROADMAP.md:58-62` — references Module 3 (Storefront) as a downstream dependency ("design tokens מתואמים — לא תלות ישירה — repo נפרד"). Cross-reference to Phase 1C scope.
- `Module 1.5 - Shared Components/MODULE_1_5_COMPLETION_SUMMARY.md:282` — "מודול 3 (Storefront) — design tokens מתואמים (לא תלות ישירה — repo נפרד)". Phase 1C.
- `Module 1.5 - Shared Components/MODULE_1.5_SECONDARY_CHAT_TEMPLATE.md:59-61` — references `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` as reference reads.
- `Module 1.5 - Shared Components/MODULE_1.5_STRATEGIC_CHAT_PROMPT.md:180-186` — "Storefront — אתר חנות ממותג ללקוח הקצה (עתידי)". Phase 1C.
- `Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md:88` — "Next: Module 2 (Platform Admin) or feature modules per MASTER_ROADMAP". References Phase 1A-scope `MASTER_ROADMAP`.
- `Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md:94` — "RLS discrepancy: GLOBAL_SCHEMA.sql documents USING(true) on roles/permissions/role_permissions, but live DB has tenant-isolation RLS. Live DB is correct." **This is a direct flag that GLOBAL_SCHEMA.sql is stale vs. the live DB — Phase 1A should verify/fix.**
- `Module 1.5 - Shared Components/docs/MODULE_1.5_PHASE_0_SPEC.md` entire document — the spec that _created_ `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql`. Phase 1A synthesis must verify those files exist.
- `Module 1.5 - Shared Components/docs/PHASE_4_SPEC.md:11` — references `docs/GLOBAL_MAP.md`.
- `Module 1.5 - Shared Components/docs/PHASE_5_SPEC.md` — references CLAUDE.md and GLOBAL docs for Integration Ceremony.

- `Module 2 - Platform Admin/ROADMAP.md:18` — "Storefront — אתר חנות ממותג ללקוח הקצה (עתידי)". Phase 1C.
- `Module 2 - Platform Admin/ROADMAP.md:364-417` (Phase 5) — the entire `storefront_config` table is DB-prep for Module 3 Storefront. Every reference to "Storefront" / "Module 3" is a Phase 1C cross-reference.
- `Module 2 - Platform Admin/ROADMAP.md:500-544` — `checkPlanLimit`, `isFeatureEnabled`, `resolveTenant` contracts declared for "every future module" including Module 3.
- `Module 2 - Platform Admin/MODULE_2_COMPLETE_SUMMARY.md:231-236` — "Module 3 (Storefront): storefront_config table, plan features (isFeatureEnabled), tenant resolution". Explicit Module 3 handoff.
- `Module 2 - Platform Admin/MODULE_2_COMPLETE_SUMMARY.md:205-206` — "B2B tables deferred → Module 3". Phase 1C.
- `Module 2 - Platform Admin/docs/SESSION_CONTEXT.md:44-48` — "B2B tables (shared_resources, resource_access_log) deferred to Module 3", "storefront_config SQL reference ready but execution deferred to Module 3". **Phase 1C synthesis must verify whether those Module 3 tables were actually built in the storefront repo, or still pending.**
- `Module 2 - Platform Admin/docs/SESSION_CONTEXT.md:51-52` — "Next Steps: Module 3 planning — Storefront (public-facing store per tenant)".
- `Module 2 - Platform Admin/docs/PHASE_5_SPEC.md` entire document — references Module 3 Storefront throughout.
- `Module 2 - Platform Admin/docs/PHASE_5_SPEC.md:378-415` — `storefront_config` table schema explicitly for Module 3 use.
- `Module 2 - Platform Admin/MODULE_2_SECONDARY_CHAT_TEMPLATE.md:50-61` — references `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, and both Module 1 and Module 1.5 MODULE_MAP.md as reference reads.
- `Module 2 - Platform Admin/MODULE_2_STRATEGIC_CHAT_PROMPT.md:182-184` — references `ROADMAP.md`, `CLAUDE.md` as attach files.
- `Module 2 - Platform Admin/docs/MODULE_MAP.md:15-25` — admin.html loads `shared/css/` (8 files) and `shared/js/` (`toast, modal-builder, modal-wizard, table-builder`) from Module 1.5. Cross-module dependency.
- `Module 2 - Platform Admin/docs/MODULE_SPEC.md:101-113` — contract dependencies on Module 1.5's `Modal`, `Toast`, `TableBuilder`.

---

## 7. Recommendations

1. **[FLAG-FOR-DECISION]** `modules/Module 1 - Inventory Management/docs/SPEC.md` + `modules/Module 1 - Inventory Management/docs/OPTIC_UP_PROJECT_GUIDE_v1.1.md` — these two files are the 2026-03-08 Miro board extraction of the full 28-module Optic Up vision (eye exams, CRM, lab, POS, WhatsApp, calendar, etc.), not Module 1 documentation. They are misplaced inside Module 1's `docs/` folder and together consume 70 KB. Decide: **(a)** MOVE both to project-level `docs/ORIGINAL_PRODUCT_VISION.md` (merge — they share source) and keep as historical reference for any future module planning; **(b)** MOVE only one (they overlap heavily); or **(c)** DELETE entirely since the relevant vision has been re-encoded into each module's ROADMAP. Recommendation leans toward (a) — this is the only record of the full product ambition and will be needed for Modules 4+. Phase 2 should not touch them until this decision is made. **Priority:** medium (no harm leaving them, but they pollute Module 1's scope).

2. **[REWRITE]** `modules/Module 1 - Inventory Management/STRATEGIC_CHAT_OPENING_PROMPT.md` — completely stale template (says Phase 3.75 is "הבא", 30 JS files, pre-Phase 4 layout, `?dev_bypass` still open). Either DELETE it (Module 1 is complete, no new strategic chat will ever be opened for it) or REWRITE as a frozen historical artifact with a "FROZEN: last updated YYYY-MM-DD, module complete, do not use" header. Recommendation: DELETE — it has no forward use and every current reader would be misled. **Priority:** medium.

3. **[DELETE]** `modules/Module 1 - Inventory Management/docs/QA_TRACKER.md` — 448-test checklist stuck in "In Progress" with most tests `[ ]`. The canonical QA result lives in CHANGELOG + SESSION_CONTEXT. Keeping this file live suggests QA is incomplete when it isn't. Alternative: convert to a `PHASE_QA_RESULTS.md` stub that just links to the CHANGELOG section. **Priority:** low.

4. **[REWRITE]** `modules/Module 1.5 - Shared Components/ROADMAP.md` — fix three stale detail headers at lines 363, 462, 515 (`⬜` → `✅`) and update the shared/js count in MODULE_SPEC.md section "shared/js/" and MODULE_1_5_COMPLETION_SUMMARY.md table (9 → 11 files, add `table-resize.js` and `sort-utils.js`). Three small surgical edits across three files. **Priority:** low (cosmetic, no behavior impact).

5. **[DELETE]** `modules/Module 2 - Platform Admin/docs/create_tenant_rpc.sql` — this is the pre-Phase-5 10-step version of `create_tenant()`. The current 11-step version lives in `phase5a-storefront-config.sql` Block 3 and is the deployed state. Having both in-repo invites confusion ("which version is current?"). The phase5a file is the authority. Alternative: add a 3-line comment at the top of `create_tenant_rpc.sql` saying "SUPERSEDED by phase5a-storefront-config.sql — kept for history". **Priority:** low.

6. **[REWRITE]** `modules/Module 2 - Platform Admin/ROADMAP.md:146-156` (Phase 1 tenants extension) — change "9 columns" to "10 columns" and add `last_active` to the list. Also fix the Phase 5 overview to remove `shared_resources` / `resource_access_log` mentions (or explicitly mark them 🚫 deferred). Two-line edit. **Priority:** low.

7. **[FLAG-FOR-DECISION]** **Module 1's SESSION_CONTEXT drift into project-wide state.** Module 1's `SESSION_CONTEXT.md` counts admin.html/error.html/landing.html and Module 2 RPCs as part of "Module 1's current state". This is because Module 1 was in production while Module 2 was being built, and the scope blurred. Decide: **(a)** freeze Module 1's SESSION_CONTEXT at its pre-Module-2 state, leaving current project state in a new project-level `docs/PROJECT_STATE.md`; or **(b)** accept that Module 1's SESSION_CONTEXT is effectively the project status doc until a proper one exists. Strategic Chat should make the call based on Phase 1A findings. **Priority:** medium-low (doesn't block anything, but invites future confusion).

**Section-7 context note:** The verdict is YELLOW, not RED, because Module 1.5 and Module 2 are both in excellent shape — their core docs (ROADMAP, MODULE_MAP, MODULE_SPEC, CHANGELOG, db-schema) agree with each other and with what was actually built. The issues above are all cosmetic or concern orphaned/misplaced legacy files. None of them block Module 3.1 strategic planning or Phase 2 execution. If Phase 2 is tightly time-boxed, recommendations 2, 3, 4, 5, and 6 can be executed in a single ~1-hour housekeeping pass. Recommendations 1 and 7 are genuine strategic decisions and should surface in the Strategic Chat synthesis.

---

End of Report

Report file size: (computed on write)
Generated by: Claude Code under Phase 1B of Module 3.1
Total files read: 69 of 70 in scope (1 BROKEN .docx correctly skipped)
Total time: single-run audit
