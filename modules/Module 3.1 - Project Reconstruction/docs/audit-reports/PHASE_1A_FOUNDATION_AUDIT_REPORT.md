# Module 3.1 — Phase 1A Foundation Audit Report
**Date:** 2026-04-11
**Phase:** 1A — Foundation Audit (opticup repo, foundation layer)
**Mode:** READ-ONLY
**Branch verified:** develop (opticalis/opticup)
**Files audited:** 15 of 15 read in full + 1 stat-only

---

## 1. Inventory

| Path | Size (bytes) | Last-modified | Category |
|---|---|---|---|
| `docs/AUTONOMOUS_MODE.md` | 6,740 | 2026-04-10 | foundation-doc |
| `docs/CONVENTIONS.md` | 8,555 | 2026-04-10 | foundation-doc |
| `docs/DB_TABLES_REFERENCE.md` | 10,043 | 2026-04-10 | foundation-doc |
| `docs/FILE_STRUCTURE.md` | 11,173 | 2026-04-10 | foundation-doc |
| `docs/GLOBAL_MAP.md` | 71,568 | 2026-03-30 | foundation-doc |
| `docs/GLOBAL_SCHEMA.sql` | 127,840 | 2026-03-30 | foundation-doc |
| `docs/TROUBLESHOOTING.md` | 5,908 | 2026-03-21 | foundation-doc |
| `docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` | 17,718 | 2026-04-11 | template |
| `CLAUDE.md` | 21,742 | 2026-04-10 | root-meta |
| `README.md` | 1,171 | 2026-03-21 | root-meta |
| `MASTER_ROADMAP.md` | 21,061 | 2026-03-21 | root-meta |
| `STRATEGIC_CHAT_ONBOARDING.md` | 11,116 | 2026-03-21 | root-meta |
| `PHASE_0_PROGRESS.md` | 7,356 | 2026-04-10 | root-meta |
| `TECH_DEBT.md` | 11,417 | 2026-04-10 | root-meta |
| `package.json` | 419 | 2026-04-10 | root-meta |
| `C:prizma.claudelaunch.json` | 146 | 2026-03-21 | flagged |

---

## 2. Status per File

- `docs/AUTONOMOUS_MODE.md` — **ALIVE** — authoritative, internally consistent, dated April 2026, matches CLAUDE.md §11 references. Minor nit: §2 Layer 1 description ("exit 2 surfaces info but does not block") matches ERP verify.mjs current state post-305b22e, but TECH_DEBT #7 still marks this as open debt (see §3).
- `docs/CONVENTIONS.md` — **ALIVE** — 14 numbered conventions, all grounded in existing code; cross-refs to Iron Rules 5, 8, 11, 21, 22 are correct.
- `docs/DB_TABLES_REFERENCE.md` — **SUSPECT** — table rows accurate but scope is ERP-only. Warns "Don't confuse `storefront_leads` with `cms_leads`" and points to `opticup-storefront/CLAUDE.md`, yet `cms_leads` is neither in GLOBAL_SCHEMA.sql nor listed elsewhere in this foundation layer. Cross-repo reference without local grounding.
- `docs/FILE_STRUCTURE.md` — **ALIVE** — file tree accurate at a directory level. Includes `modules/storefront/` subfolder with 20 files (the Studio admin UI). Heading "## docs/" still lists `AUTONOMOUS_MODE.md` with annotation "(TBD — Phase 0)" (line 96) — Phase 0 is complete, annotation is stale.
- `docs/GLOBAL_MAP.md` — **SUSPECT** — large, mostly accurate for Modules 1 / 1.5 / 2. Zero mentions of Module 3, Storefront, or the 4-layer chat hierarchy (0 grep hits for Module 3, opticup-storefront, Secondary Chat, Module Strategic, 4-layer). Reflects a single repo world.
- `docs/GLOBAL_SCHEMA.sql` — **SUSPECT** — 2,413 lines, tables + policies only. Contains one `storefront_config` table (line 2339) described as "per-tenant, DB prep for Module 3 (Storefront)". Zero `CREATE VIEW` / `CREATE OR REPLACE VIEW` statements (all storefront consumer views are missing — matches ERP TECH_DEBT #6). Zero `v_storefront_*`, zero `cms_leads`, zero `storefront_leads`, zero `storefront_articles`, zero `storefront_pages`. The views which the Storefront repo depends on are not declared anywhere in this file.
- `docs/TROUBLESHOOTING.md` — **STALE** — 145 lines. Most recent dated entry is March 2026 (phase 7 hotfix + da7cce6 on 2026-03-21). Zero entries from Phases 4–8, Module 1.5, Module 2, Phase 0 rails. Whole categories missing (auth, permissions, debt, shipments, OCR, Platform Admin, Storefront Studio).
- `docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` — **ALIVE** (with caveats — see §3) — Hebrew prompt, 302 lines. §2 explicitly declares the 4-layer hierarchy. §4 explicitly declares the two-repo architecture. §7 says "Iron Rules 1–30" and maps 24–30 to storefront. §10 defines Phase 0 Audit + Phase QA convention. §11 defines "who updates what". **Well structured, ready to serve as a Module 3.1 artifact, pending fixes in §3 Discrepancies.**
- `CLAUDE.md` — **ALIVE** — project constitution. 328 lines (within <400 hard limit). Internally consistent. First Action Protocol is the catch that saved the wrong-repo discovery session today. See §3 for cross-foundation discrepancies.
- `README.md` — **STALE** — 33 lines, titled "אופטיקה פריזמה — מערכת מלאי" (Prizma Optics — Inventory System). Describes the project as a single-tenant inventory app for Prizma: "מערכת ניהול מלאי למשקפיים ואביזרי אופטיקה." No mention of SaaS, multi-tenant, Optic Up, storefront, or modules 1.5 / 2 / 3. Frozen in Phase 0 / pre-rebrand state.
- `MASTER_ROADMAP.md` — **STALE** — 383 lines. Dated "עודכן לאחרונה: מרץ 2026". Describes a reality that is 4+ months obsolete. See §4 Outdated Content for line-by-line punch list.
- `STRATEGIC_CHAT_ONBOARDING.md` — **STALE** — dated March 2026. Describes a 4-layer hierarchy but with OLD terminology ("צ'אט מפקח" = "Supervisor/Foreman chat" instead of "Secondary Chat" / "Module Strategic Chat"). Uses obsolete stack history ("Sprint 14 day", "29 מודולים ב-5 פאזות"). References `PROJECT_GUIDE.md` which does not exist in the repo. Repo URL section still references `prizma-inventory` as an old name. Contradicts the newer UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md layer terminology.
- `PHASE_0_PROGRESS.md` — **ALIVE** — dated April 2026. Accurate record of Phase 0 sub-phases (0A–0F). One internal tension with TECH_DEBT.md (see §3).
- `TECH_DEBT.md` — **SUSPECT** — 243 lines. Item #7 "verify.mjs warnings exit policy inconsistent" is listed as ACTIVE but PHASE_0_PROGRESS.md says commit `305b22e` "harmonized warnings exit" as part of 0F. Item #3 dated Phase 0A complete = baseline 417 violations / 39 warnings; current state per AUTONOMOUS_MODE.md is ~400 violations / ~36 warnings (consistent within rounding). No items for missing TROUBLESHOOTING.md entries, no item for the malformed `C:prizma.claudelaunch.json` file, no item for README.md being out-of-date, no item for MASTER_ROADMAP.md being stale.
- `package.json` — **ALIVE** — 20 lines, version 1.0.0, scripts for `verify`/`verify:staged`/`verify:full`, husky prepare hook. Matches Phase 0 rails. Dependencies: @supabase/supabase-js ^2.99.2, xlsx ^0.18.5. DevDeps: husky ^9.1.7, chalk ^5.3.0. Project name is `opticup` (not `prizma-inventory`) — consistent with current rebrand.
- `C:prizma.claudelaunch.json` — **ORPHAN** — 146 bytes, filename begins with `C:` which looks like a Windows drive-prefix path leak (probably the result of someone running `touch "C:prizma..."` on a Unix-style tool that then interpreted `C:` as a literal file prefix). Not referenced by any other file in the audit list. Candidate for cleanup — see §7.

---

## 3. Discrepancies

1. **Module 2 completion status contradicts across files.**
   - `GLOBAL_MAP.md:774` — Module 2 listed as "Phase 4 ✅".
   - `MASTER_ROADMAP.md:88` — "⬜ מודול 1.5 — Shared Components Refactor — הבא אחרי 5.9" and Module 2 is listed as ⬜ "טרם התחיל" (has not started).
   - Reality (per audit anchors): **Module 1, 1.5, and 2 are all complete.** MASTER_ROADMAP wins on ownership of this info per CLAUDE.md §7 Authority Matrix, but is the stalest source.

2. **Storefront layer absent from GLOBAL_MAP and GLOBAL_SCHEMA but present everywhere else.**
   - `CLAUDE.md:41` — lists `opticalis/opticup-storefront` as a separate repo.
   - `CLAUDE.md:24` — says Module 3 "lives in separate repo `opticup-storefront`".
   - `docs/FILE_STRUCTURE.md:152` — lists `modules/storefront/` with 20 Studio files.
   - `docs/DB_TABLES_REFERENCE.md:120-129` — lists `storefront_config` + `storefront_leads` + warning about `cms_leads`.
   - `docs/GLOBAL_MAP.md` — **zero mentions** of Module 3 or `opticup-storefront` (confirmed via grep, 0 matches).
   - `docs/GLOBAL_SCHEMA.sql:2339` — only a stub `storefront_config` table. No `storefront_leads`, `cms_leads`, `storefront_articles`, `storefront_pages`, no views (`v_storefront_products`, `v_storefront_brands`, `v_public_tenant`, etc.). Cross-references in `DB_TABLES_REFERENCE.md:129` and `TECH_DEBT.md#6` confirm these objects exist in live DB but are not declared here.
   - **Reality anchor:** Module 3 is the active module, Phase A complete. The foundation docs treat it as if it does not yet exist.

3. **Chat-hierarchy terminology split.**
   - `docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md:31-35` — uses **4 layers: Main Strategic → Module Strategic → Secondary Chat → Claude Code**.
   - `STRATEGIC_CHAT_ONBOARDING.md:43-48` — uses different naming: "Main Strategic Chat ↔ Module Strategic Chat ↔ **צ'אט מפקח** (Supervisor chat) ↔ Claude Code". Layer 3 is called "Supervisor" / "Foreman" instead of "Secondary Chat".
   - `MASTER_ROADMAP.md:53-60` — uses yet another variation: "🔧 צ'אט מפקח (מנהל עבודה)" = Supervisor / Work manager.
   - `CLAUDE.md` — does not document the 4-layer hierarchy at all. No mention of Main Strategic, Module Strategic, or Secondary/Supervisor chats.
   - **Impact:** Three different naming systems for the same concept across foundation docs.

4. **Iron Rules numbering range inconsistent.**
   - `CLAUDE.md:96-103` — defines Rules 1–23 (13 Iron + 7 SaaS + 3 Hygiene).
   - `docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md:150` — "חוקים 1-30. הם מתועדים במלואם בקבצי CLAUDE.md" — claims 1–30 exist. Rules 24–30 are labeled "Storefront Rules" pointing to opticup-storefront/CLAUDE.md.
   - `MASTER_ROADMAP.md:296-314` — lists 17 bullet-list rules with no numbering, not matching either 1–23 or 1–30 schemes.
   - `STRATEGIC_CHAT_ONBOARDING.md` — uses no rule numbering; references rules by convention.
   - **Reality anchor:** 1–23 in opticup, 24–30 in storefront. `CLAUDE.md` should explicitly acknowledge 24–30 as cross-repo rules (currently silent).

5. **TECH_DEBT #7 state contradicts PHASE_0_PROGRESS.md.**
   - `PHASE_0_PROGRESS.md:21` — commit `305b22e (warnings exit harmonization)` is listed as part of Phase 0A Key Commits.
   - `docs/AUTONOMOUS_MODE.md:19` — "Warnings produce exit 2 (surfaces information but does not block the commit)" — unified behavior.
   - `TECH_DEBT.md:191-228` — Item #7 is still in "Active Debt" section with priority 🟢 LOW, noting the ERP/Storefront inconsistency exists. Resolved Debt section is empty ("_(none yet)_").
   - **Impact:** TECH_DEBT.md has not been trued up after the harmonization fix. Needs either a move to Resolved Debt or a state update confirming the fix landed but pre-date-specific caveats.

6. **package.json does not declare the `scripts/schema-diff.mjs` runner.**
   - `package.json:4-10` exposes `verify`, `verify:staged`, `verify:full`, `prepare`. No entry for `verify:schema`, `schema-diff`, or similar.
   - `docs/AUTONOMOUS_MODE.md:44` — schema-diff is documented as a first-class rail.
   - `PHASE_0_PROGRESS.md:38` — schema-diff is a Phase 0B deliverable.
   - **Impact:** Nothing broken at runtime (it's a direct `node scripts/schema-diff.mjs` call), but verify-as-contract surface in package.json is incomplete.

7. **README.md contradicts project identity everywhere else.**
   - `README.md:1-2` — title "אופטיקה פריזמה — מערכת מלאי" = "Prizma Optics — Inventory System". Single-tenant framing.
   - `CLAUDE.md:35-43` — Optic Up is a multi-tenant SaaS; first tenant is Prizma; repo is `opticup`.
   - `MASTER_ROADMAP.md:17-19` — "פלטפורמת SaaS לרשתות וחנויות אופטיקה".
   - **Impact:** If a new developer reads README.md first (the normal thing to do), they get a mental model that the next 15 files immediately contradict.

8. **TROUBLESHOOTING.md does not reference known Phase 0+ tech debt items.**
   - `TECH_DEBT.md` lists #5/#6 (information_schema inaccessibility, zero declared views) as Active Debt with concrete risk text.
   - `TROUBLESHOOTING.md` has no entry on either of these, and no category of "Phase 0 rails / verify / schema-diff" at all.
   - **Impact:** On-call flow "check TROUBLESHOOTING.md first" returns nothing even though TECH_DEBT already knows about the problem.

---

## 4. Outdated Content

### MASTER_ROADMAP.md (the punch list — severe)

- `MASTER_ROADMAP.md:6` — "עודכן לאחרונה: מרץ 2026" (last updated March 2026). Current date: 2026-04-11. Stale by ~5–6 weeks.
- `MASTER_ROADMAP.md:64` — Heading "חלק 4 — איפה אנחנו (מרץ 2026)" (Where we are — March 2026). Current reality is April 2026 and multiple modules have shipped since.
- `MASTER_ROADMAP.md:66-67` — "מודול 1 — מלאי מסגרות... הושלם עד פאזה 5.75. פאזות 5.9 (ארגזים) ו-6 (פורטל ספקים) נותרו." Current state: **Module 1 is COMPLETE (including Phase 5.9 shipments, plus Module 1 QA).** Phase 5.9 shipped (confirmed via GLOBAL_SCHEMA.sql:1686-1812 having `shipments`, `shipment_items`, `courier_companies`, and `next_box_number` RPC).
- `MASTER_ROADMAP.md:84` — "5.9 ⬜ | **ארגזים ומשלוחים** | **מסיימים עכשיו — ראה פירוט בחלק 6**" — wrong state, shipped.
- `MASTER_ROADMAP.md:88` — "⬜ מודול 1.5 — Shared Components Refactor — הבא אחרי 5.9". Current state: **Module 1.5 is COMPLETE** (per GLOBAL_MAP.md:773 "✅ Complete (QA passed)").
- `MASTER_ROADMAP.md:90` — "כל השאר — טרם התחיל" (all else — not started). **Module 2 has completed Phase 4.** Module 3 is in remediation with Phase A complete.
- `MASTER_ROADMAP.md:96-121` — The 22-module build-order table shows status `⬜` on modules 1.5, 2, 3, 4–22. At least 1.5 and 2 are completed; 3 is active. The table is stale from the first three rows onward.
- `MASTER_ROADMAP.md:124-170` — The "חלק 6 — פאזה 5.9: ארגזים ומשלוחים" section is framed as "we're building this now" with future-tense language. Phase 5.9 has shipped; this entire section is a retrospective, not a plan.
- `MASTER_ROADMAP.md:172-208` — "חלק 7 — מודול 1.5: Shared Components Refactor — 6 משימות". Entire section is a forward-looking plan for a module that has shipped. Section describes a future state that is already the present.
- `MASTER_ROADMAP.md:212-220` — "חלק 8 — מודול 2: Platform Admin". Describes Module 2 as an upcoming plan. Module 2 exists with admin.html, 5 tables, 14 RPCs (per GLOBAL_MAP.md:774, 905-913).
- `MASTER_ROADMAP.md:222-229` — "חלק 9 — Storefront (מודולים 3 + 8)". Frames Module 3 as "Repo נפרד. Astro + TypeScript + Tailwind. קורא רק Views + RPC." — accurate vision but does not acknowledge it as a live repo with active work. No mention of remediation phase or Module 3.1 (this module).
- `MASTER_ROADMAP.md:253-291` — "חלק 11 — מפת DB". Table grouping labels current tables as "קיים ✅ (מודול 1, ~40+ טבלאות)" with Module 2 and Storefront still in "✅ מודול 2" future-state groupings. GLOBAL_SCHEMA.sql has 51 tables (per audit count, including all Module 2 + stubs).
- `MASTER_ROADMAP.md:315-366` — "חלק 14 — כל ההחלטות" decisions table. Every date stamp is "מרץ 2026". No entry for: Phase 0 completion (April 2026), Module 1.5 completion, Module 2 completion, Module 3.1 kickoff, 4-layer hierarchy formalization, dual-repo architecture decision, Iron Rules 21–23 addition.
- `MASTER_ROADMAP.md:367-378` — "חלק 15 — הצעד הבא" (the next step). Says: "עכשיו: לסיים פאזה 5.9 (ארגזים ומשלוחים) במודול 1." Current next step: Module 3.1 foundation audit. Four modules worth of work separate the stated "next step" from reality.
- `MASTER_ROADMAP.md:381` — "22 מודולים" — still counts Module 3.1 absent; at minimum there are now 22 + Module 3.1 + any module list changes from the Module 3 remediation.

### STRATEGIC_CHAT_ONBOARDING.md

- `STRATEGIC_CHAT_ONBOARDING.md:5` — "עודכן לאחרונה: מרץ 2026". Stale.
- `STRATEGIC_CHAT_ONBOARDING.md:43-48` — 4-layer workflow diagram uses "צ'אט מפקח" (supervisor chat) terminology. New canon is "Secondary Chat" per UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md:31-35.
- `STRATEGIC_CHAT_ONBOARDING.md:57-62` — describes original March 2026 plan: "Stack: **Next.js + TypeScript**", "Repo: `opticalis/prizma-inventory`", "ספרינט 14 יום ל-MVP: 8 מודולים". All obsolete.
- `STRATEGIC_CHAT_ONBOARDING.md:89` — References `PROJECT_GUIDE.md` as "הוראות לצ'אט מפקח" (Instructions for the supervisor chat). This file does not exist in the repo (not in the audit list, not in GLOBAL_MAP §3 Global Docs or §12 Reference Files Index of CLAUDE.md).
- `STRATEGIC_CHAT_ONBOARDING.md:110-116` — "מה קיים עכשיו בפועל (מרץ 2026)" = "What exists now (March 2026)". Lists only Module 1 state. Missing: Module 1.5, Module 2, Phase 0 rails, Module 3.1.
- `STRATEGIC_CHAT_ONBOARDING.md:131-135` — "מה לא קיים עדיין" (what does not exist yet) lists "shared/ components (מודול 1.5)", "activity_log מרכזי (מודול 1.5)", "Platform Admin (מודול 2)", "Storefront (מודול 3)". All four items in this "does not exist" list actually exist.

### README.md

- `README.md:1` — Title "אופטיקה פריזמה — מערכת מלאי" should be "Optic Up" or similar SaaS-level name.
- `README.md:3-4` — "מערכת ניהול מלאי למשקפיים ואביזרי אופטיקה" describes a single-tenant inventory system. Current reality: multi-tenant SaaS platform for optical stores.
- `README.md:7-11` — Module list has only 4 items: "מלאי ראשי / הכנסת מלאי / הזמנת רכש / ניהול מותגים וספקים". Current module count: 3+ completed + several in active development including storefront.
- `README.md:31-32` — URLs `https://app.opticalis.co.il/` and Supabase URL are still correct. But the "app" description does not match the SaaS framing.

### FILE_STRUCTURE.md

- `FILE_STRUCTURE.md:96` — "`AUTONOMOUS_MODE.md` — autonomous execution protocol (TBD — Phase 0)". The "(TBD — Phase 0)" annotation is stale; Phase 0 is complete and the file is the live protocol.

### TECH_DEBT.md

- `TECH_DEBT.md:59` — Item #3 snapshot is at commit `4849d6f`; baseline count (417 violations / 39 warnings). Quietly stale vs current state (~400 / ~36 per AUTONOMOUS_MODE.md). Small drift, low priority.
- `TECH_DEBT.md:191-228` — Item #7 mentions a fix that has already landed per PHASE_0_PROGRESS.md; see §3 Discrepancy #5.
- `TECH_DEBT.md:232` — Resolved Debt section: "_(none yet)_". Multiple items from Phase 0 have implicitly been resolved; none have been moved.

---

## 5. Missing

- **EXPECTED:** `PROJECT_GUIDE.md`. **WHERE:** repo root. **REFERENCED BY:** `STRATEGIC_CHAT_ONBOARDING.md:89` ("Instructions for the supervisor chat — נדבק בצ'אט מפקח"). Not present on disk, not in any other file's reference list. Either historic artifact that was never authored, or was renamed to UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md (in which case the reference is stale).
- **EXPECTED:** Module 3 / Storefront entries in `docs/GLOBAL_MAP.md`. **WHERE:** §6 Module Registry (line 701-). **REFERENCED BY:** `CLAUDE.md:24`, `DB_TABLES_REFERENCE.md:120-129`, `FILE_STRUCTURE.md:152` — all of which treat Module 3 / storefront as a live concern. GLOBAL_MAP has zero entries, zero cross-repo section, zero chat-hierarchy documentation.
- **EXPECTED:** View declarations in `docs/GLOBAL_SCHEMA.sql`. **WHERE:** any section. **REFERENCED BY:** `TECH_DEBT.md#6` ("GLOBAL_SCHEMA.sql declares zero views (rails gap, not doc gap)"), `CLAUDE.md:79` (Iron Rule 13 "Views-only for external reads"), `DB_TABLES_REFERENCE.md:129`. Zero `CREATE VIEW` statements found in the entire 2413-line SQL file.
- **EXPECTED:** `cms_leads` table declaration. **WHERE:** `docs/GLOBAL_SCHEMA.sql`. **REFERENCED BY:** `DB_TABLES_REFERENCE.md:129` ("Don't confuse `storefront_leads` with `cms_leads`"). Referenced-but-not-declared.
- **EXPECTED:** Storefront table declarations (`storefront_pages`, `storefront_articles`, `storefront_leads`, block content tables, translation glossary table). **WHERE:** `docs/GLOBAL_SCHEMA.sql`. **REFERENCED BY:** `FILE_STRUCTURE.md:26-27` (storefront-studio.html, storefront-glossary.html), `DB_TABLES_REFERENCE.md:127` (`storefront_leads`). The ERP has HTML and T constants for storefront content management, but the SQL schema only has a single `storefront_config` stub row.
- **EXPECTED:** Explicit cross-repo rule declaration. **WHERE:** `CLAUDE.md` Section 4–6. **REFERENCED BY:** UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md:150 ("חוקים 1-30"). CLAUDE.md defines 1–23 and is silent on the existence of Rules 24–30 in the storefront repo. A missing acknowledgement line, not a missing file.
- **EXPECTED:** Module 3.1 entry in `docs/GLOBAL_MAP.md §6 Module Registry`. **WHERE:** line 701-920. **REFERENCED BY:** the prompt file at `modules/Module 3.1 - Project Reconstruction/docs/PHASE_1A_FOUNDATION_AUDIT_SPEC.md` (this audit's own scope).
- **EXPECTED:** Phase 0 entries in `docs/TROUBLESHOOTING.md`. **WHERE:** any category. **REFERENCED BY:** TECH_DEBT.md items 3, 5, 6, 7 (all have concrete symptoms that would fit a TROUBLESHOOTING entry template).
- **EXPECTED:** Template for Strategic/Secondary Chat sessions in `docs/Templates/`. **WHERE:** `docs/Templates/` folder. **REFERENCED BY:** UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md is the Module Strategic layer template but there is no Main Strategic template or Secondary Chat template here. The folder contains one file. Incomplete scaffold.

---

## 6. Cross-references

Bridges to Phase 1B (Modules 1/2 audit) and Phase 1C (Module 3 dual-repo audit):

1. **`CLAUDE.md:24` → modules/Module X/docs/SESSION_CONTEXT.md (Modules 1, 1.5, 2)** — First Action Protocol mandates reading these. Phase 1B audit needs to verify they exist and are current.
2. **`CLAUDE.md:41` → `opticalis/opticup-storefront` repo** — declares separate repo; Phase 1C owns auditing that repo's own CLAUDE.md and confirming Rules 24–30 live there as claimed.
3. **`docs/GLOBAL_MAP.md:701-914` (Module Registry) → `modules/inventory/*`, `modules/debt/*`, `modules/admin-platform/*`, etc.** — file paths listed should match reality; Phase 1B audit confirms.
4. **`docs/GLOBAL_SCHEMA.sql` → per-module `db-schema.sql` files** — `CLAUDE.md:121` designates per-module schema as source-of-truth, merged to global at Integration Ceremony. Phase 1B audit verifies the merge is complete for Modules 1, 1.5, 2.
5. **`docs/DB_TABLES_REFERENCE.md:120-129` → `opticup-storefront/CLAUDE.md`** — cross-repo reference for `cms_leads` / `storefront_leads` distinction. Phase 1C audit must verify this is documented in the storefront repo.
6. **`docs/FILE_STRUCTURE.md:8, 152` → `modules/storefront/` (20 files, ERP-side Studio admin UI)** — Studio is partly in the ERP repo and partly in the storefront repo. Phase 1C owns the storefront-repo half; Phase 1B may need to cross-check the Studio admin UI against its storefront-repo consumer.
7. **`docs/TROUBLESHOOTING.md:21` → `css/inventory.css`, `css/employees.css`, etc.** — module-owned CSS files referenced from a foundation doc. Phase 1B audit verifies these files still exist at the paths listed.
8. **`CLAUDE.md:235` → `modules/Module 1.5 - Shared Components/scripts/clone-tenant.sql`, `cleanup-tenant.sql`** — Phase 1B audit verifies these module-owned scripts exist.
9. **`MASTER_ROADMAP.md:172-208` → `modules/Module 1.5 - Shared Components/`** — the 6-task plan for Module 1.5. Phase 1B must compare the plan to what actually shipped.
10. **`MASTER_ROADMAP.md:212-220` → `modules/Module 2 - Platform Admin/`** — the Module 2 plan. Phase 1B must compare plan vs reality.
11. **`STRATEGIC_CHAT_ONBOARDING.md:89` → `PROJECT_GUIDE.md`** — dangling reference. Phase 1B/1C may find a renamed descendant or confirm it's dead.
12. **`UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md:210-220` → Level 1/2/3 SQL autonomy** — references `optic_readonly` DB role and levels. This is strategic-chat contract, not foundation. Phase 1C audit (Module 3) may confirm Level 1 is active there.
13. **`PHASE_0_PROGRESS.md:64-87` → `.github/workflows/verify.yml` in BOTH repos** — Phase 0E shipped CI to both. Phase 1C audit must confirm the Storefront workflow is live.
14. **`PHASE_0_PROGRESS.md:49-57` → `opticup-storefront/scripts/visual-regression.mjs` + 10 baseline JSON files** — Phase 1C audit must confirm these exist in the storefront repo.
15. **`TECH_DEBT.md#11` → Storefront-side items (normalize-logo.ts, submit.ts, etc.)** — same-file references to debt items that live in a different repo. Phase 1C audit confirms the storefront TECH_DEBT.md records the same items.

---

## 7. Recommendations

1. **[REWRITE]** `MASTER_ROADMAP.md` — produce a 2026-04-11 rewrite that (a) marks Modules 1, 1.5, 2 as ✅ Complete with dates, (b) inserts Module 3.1 as current active work, (c) updates Chapter 11 DB map to reflect 51 tables across 3 modules, (d) adds April 2026 entries to Chapter 14 decisions table (Phase 0 completion, dual-repo formalization, Iron Rules 21–23, 4-layer hierarchy), (e) replaces Chapter 15 "next step" with the real next step. Reason: this file is the claimed "project brain" yet describes a world from March 2026 that no longer exists. Every downstream strategic-chat session that reads it starts with a wrong mental model.

2. **[REWRITE]** `README.md` — replace Prizma-specific single-tenant inventory description with the Optic Up SaaS identity. Point to CLAUDE.md and MASTER_ROADMAP.md as the entry-point documents. Reason: README is the first file a newcomer opens; currently it sets up a mental model that every subsequent file contradicts.

3. **[REWRITE]** `STRATEGIC_CHAT_ONBOARDING.md` — harmonize chat-layer terminology with UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md ("Secondary Chat" canonical, not "צ'אט מפקח"), delete references to the dangling `PROJECT_GUIDE.md`, update "what exists now" section to reflect April 2026, update "what doesn't exist" to remove Modules 1.5 / 2 and list actual gaps instead. Reason: this file is meant to prime new Main Strategic Chats, so drift here corrupts every strategic session that loads it.

4. **[REWRITE]** `CLAUDE.md` §4–§6 — add a short explicit acknowledgement that Rules 24–30 live in `opticup-storefront/CLAUDE.md` and apply only to storefront work, so readers see the full rule set scope at a glance. Add one-line "for the chat hierarchy see STRATEGIC_CHAT_ONBOARDING.md / UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md". Reason: keeps CLAUDE.md as the authoritative constitution without making it longer than 400 lines, while closing the rule-numbering gap.

5. **[REWRITE]** `docs/GLOBAL_MAP.md` — add §6.x "Module 3 — Storefront (opticup-storefront repo)" entry pointing to the storefront repo's own MODULE_MAP and listing the tables + views it consumes from the shared Supabase. Add a §0 preface acknowledging the dual-repo architecture. Reason: without this, GLOBAL_MAP claims to be "project-wide" while describing only one repo. Rule 21 (No Orphans, No Duplicates) says a cross-repo pointer belongs here, not duplicated content.

6. **[REWRITE]** `docs/GLOBAL_SCHEMA.sql` — add view definitions (`v_storefront_products`, `v_storefront_brands`, `v_public_tenant`, and siblings) and missing storefront tables (`storefront_leads`, `cms_leads`, etc.) either in-file or via dedicated view-declaration section. This is also TECH_DEBT #6, which should be referenced. Reason: the schema file is structurally blind to every cross-repo contract right now; Rule 13 (views-only external reads) is unenforceable without this.

7. **[DELETE]** `docs/FILE_STRUCTURE.md:96` — remove "(TBD — Phase 0)" annotation next to `AUTONOMOUS_MODE.md`. Phase 0 shipped. One-line cleanup.

8. **[REWRITE]** `docs/TROUBLESHOOTING.md` — add entries for TECH_DEBT #5 (information_schema blind spot), #6 (zero declared views), and a Phase 0 rails category with entries on verify.mjs flow, pre-commit hook failures, schema-diff fallback probing. Reason: "Check TROUBLESHOOTING first" protocol is empty for every known Phase 0 issue right now.

9. **[FLAG-FOR-DECISION]** `C:prizma.claudelaunch.json` (repo root, 146 bytes, 2026-03-21) — malformed filename starts with `C:` (Windows drive-prefix leak). Not referenced by any other foundation file. Likely a stray artifact from early repo setup or a cross-platform scripting accident. Decision needed: (a) delete outright, (b) inspect content first to rule out secrets/config, (c) rename. Recommend (b) then (a): read-once to confirm it's garbage, then delete in a targeted commit.

10. **[FLAG-FOR-DECISION]** `TECH_DEBT.md` item #7 — decide whether the warnings-exit harmonization (commit `305b22e`) has landed consistently in both repos. If yes, move #7 to Resolved Debt with the commit hash and date. If only one repo was harmonized, re-scope the item to track the remaining half. Reason: right now the item's state is ambiguous and creates a trust gap between PHASE_0_PROGRESS.md and TECH_DEBT.md.

11. **[SPLIT]** Extract a `docs/Templates/MAIN_STRATEGIC_CHAT_PROMPT.md` (layer 1) and a `docs/Templates/SECONDARY_CHAT_PROMPT.md` (layer 3) alongside the existing `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` (layer 2). Reason: only one of the three chat-layer templates currently exists. Adding the two peers makes the 4-layer hierarchy a deployable pattern instead of documentation.

---

## End of Report
**Report file size:** to be measured post-write
**Generated by:** Claude Code under Phase 1A of Module 3.1
**Total files read:** 15 full + 1 stat-only
**Total time:** ~40 minutes
