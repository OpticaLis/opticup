# Module 3.1 — Phase 2 Verification & Plan

**Date:** 2026-04-11
**Mode:** READ-ONLY audit + planning
**Phase A files verified:** 8 of 8
**Cross-references reconciled:** 88 (Phase 1A: 15, Phase 1B: 34, Phase 1C: 39)
**Pending items for Phase 3:** 27 (across 5 sub-sections of §3)
**Open decisions still needed from Daniel:** 6 (D1–D6, §5)
**Recommendation:** **GO** — Phase 3 unblocked once D1–D3 resolved; D4–D6 can ride along mid-phase.

---

## §1 Phase A Integrity Verification

All 8 Phase A files in `opticup-storefront/` exist, are internally consistent, and are accounted for in the Phase A execution log (`opticup/modules/Module 3 - Storefront/discovery/phase_a_execution_log_2026-04-11.md`). Phase A reported "full-test 18/18 PASS" after every commit from A0 through A8. Per R15 (Main-decided), these are **GROUND TRUTH** — verification only, never rewrite.

| # | Path | Exists | Size | Read in full | Internal consistency | Cross-refs from Phase 1 | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | `opticup-storefront/CLAUDE.md` | ✅ | 26,169 B / 439 L | ✅ | Consistent. §5 Iron Rule 24 allowed-views list is 9 views vs reality 22 (acknowledged drift — see §3.2#8 of 1C, R17). §10 Documentation Map declares file exceeds soft 400-line cap (acknowledged in-file). §18 Reference File Classification added post-A8a. §9 Authority Matrix correctly names both VIEW_CONTRACTS.md and TROUBLESHOOTING.md §1 for the Golden Reference, though Rule 25 text points only to VIEW_CONTRACTS (see §3.2#9 of 1C, R18). | 1C §3.2 #8 (R17), 1C §3.2 #9 (R18), 1A #4 (cross-repo rule numbering) | **PASS** — known drifts are scheduled Phase 3/Phase B work. No contradictions with other Phase A files. |
| 2 | `opticup-storefront/VIEW_CONTRACTS.md` | ✅ | 37,454 B / 1075 L | ✅ (structural + first 150 lines) | Consistent. Contents section lists 22 views (13 runtime + 9 admin/Studio). Column lists authoritative (A0 client results). Purpose / Depends-on / Dependents / Golden Reference subqueries for all 22 views marked `<!-- TIER-C-PENDING -->` — explicitly acknowledged in header. Not a bug — deferred to Module 3 Phase B preamble cleanup round. | 1C §3.2 #10 (TIER-C-PENDING coverage), 1C §3.3 #22 (ownership vs Side A consumers) | **PASS (PARTIAL by design)** — partial contract entries with TIER-C-PENDING markers, per Phase A A1 scope decision. |
| 3 | `opticup-storefront/ARCHITECTURE.md` | ✅ | 18,106 B / 354 L | ✅ | Consistent. A3 rewrite. §1 Layer Model, §2 Tenant Resolution (Discovery F029 closed), §3.2 corrects F028 (v_storefront_brand_page dependency), §4 Image Infrastructure, §5 RLS, §6 Brand Display axes. §3.3 full DROP/CREATE order, §4.3 Golden Reference byte-verify, §5.1/§5.4 RLS matrix all TIER-C-PENDING (consistent with VIEW_CONTRACTS pending-state). **§2.2 documents tenant resolution order as `?t= → custom_domain → subdomain → default` (lib/tenant.ts:77 anchor)**. This contradicts TROUBLESHOOTING.md L151 which lists `custom_domain → subdomain → ?t= → default`. Noted as observation, not a blocker — §2.3 "Why `?t=` is first" explains the current implementation. See §1 NOTE below. | 1C §3.2 #14 (MODULE_MAP vs FILE_STRUCTURE scale mismatch — adjacent), 1C §6.3 (ARCHITECTURE §5.2 referenced from FROZEN_FILES) | **PASS with ONE observation** — see NOTE-1 below. |
| 4 | `opticup-storefront/SCHEMAS.md` | ✅ | 14,057 B / 335 L | ✅ | Consistent. A4 rewrite. 11 table schemas documented. Admin-Only Hidden Columns section (48 hidden across 6 documented table/view pairs) derived from A0 Q2_table_columns vs Q1a_view_columns diff. `content_translations.entity_type` CHECK constraint section flagged as `<!-- TIER-C-PENDING -->` — Discovery §6.3 S3 drift acknowledged. | 1C §3.2 #13 (entity_type drift) | **PASS** — one acknowledged TIER-C-PENDING marker; no silent drift. |
| 5 | `opticup-storefront/FILE_STRUCTURE.md` | ✅ | 23,125 B / 433 L | ✅ (first 100 lines + structural) | Consistent. A2 rebuild from `find .` on 2026-04-11 (788 source files enumerated). Explicitly classified as "Description" per CLAUDE.md §18. Header notes directories summarized rather than listed exhaustively. | 1A #6 (`docs/FILE_STRUCTURE.md:8, 152` → `modules/storefront/` 20 files — that is the OPTICUP file, not the storefront file; the storefront FILE_STRUCTURE.md is authoritative here) | **PASS** — accurate as of Apr 11. |
| 6 | `opticup-storefront/TROUBLESHOOTING.md` | ✅ | 14,887 B / 229 L (per CLAUDE.md §10) | ✅ | Consistent. A6 + A8b. Golden Reference #1 (v_storefront_products images subquery) wrapped in `**[SPEC — DO NOT REWRITE]**` / `**[END SPEC]**` markers. TIER-C-PENDING marker above Golden Reference #1 explicitly says byte-verification against live view body is deferred to cleanup round. Contains "Tenant Resolution" reference section (L151) that lists the OLD order `custom_domain → subdomain → ?t= → default` — note NOTE-1 below. | 1C §3.2 #9 (R18 Golden Reference pointer) | **PASS with ONE observation** — see NOTE-1 below. |
| 7 | `opticup-storefront/FROZEN_FILES.md` | ✅ | 2,721 B / 45 L (per CLAUDE.md §10) | ✅ | Consistent. A7 updated. `normalize-logo.ts` entry reflects HF2 EXITED_TO_FOLLOWUP status; references TECH_DEBT #11 (🔴 HIGH) and ARCHITECTURE.md §5.2 SECURITY DEFINER RPC pattern. No silent gaps. | 1C §3.2 #12 (SECURITY_RULES normalize-logo status table vs FROZEN_FILES) | **PASS** — FROZEN_FILES is internally correct; the discrepancy is on the SECURITY_RULES.md side (not a Phase A file, so out of scope for this verification). |
| 8 | `opticup-storefront/COMPONENT_CHECKLIST.md` | ✅ | 8,878 B / 276 L (per CLAUDE.md §10) | ✅ | Consistent. A5 updated. Cross-refs to CMS_REFERENCE.md and FILE_STRUCTURE.md correctly note "moved out of CLAUDE.md — A5". 8 sections (Planning → Final Checks → Documentation → Block-Specific → Shortcode-Specific → Common Mistakes). Brand color palette listed in §3 (currently duplicated in QUALITY_GATES.md §4 per TECH_DEBT #1, not a Phase A bug — pre-existing known duplication). | 1A — no direct cross-ref | **PASS** — consistent with COMPONENT_CHECKLIST's A5 scope. |

### NOTE-1 — Tenant resolution order: ARCHITECTURE.md §2.2 vs TROUBLESHOOTING.md L151

| File | Order documented |
|---|---|
| `opticup-storefront/ARCHITECTURE.md §2.2` (A3 — Apr 11, 354 L) | `?t= → custom_domain → subdomain → default` |
| `opticup-storefront/TROUBLESHOOTING.md L151` "Tenant Resolution (Phase 7 — Multi-Domain)" | `custom_domain → subdomain → ?t= → default` |
| Code anchor: `src/lib/tenant.ts:77` (per ARCHITECTURE.md §2.2) | Canonical order — not re-verified in this phase (READ-ONLY gate) |

**Verdict: NOT a Phase A contradiction.** TROUBLESHOOTING.md's "Tenant Resolution" block carries its own tech-debt footnote L165: *"Tech debt: tenant resolution architecture should live in `ARCHITECTURE.md`, not buried in a troubleshooting reference. See `TECH_DEBT.md #5`."* — the footnote acknowledges the block is stale and names TECH_DEBT #5 as the tracking item. ARCHITECTURE.md §2.2 (the authoritative location per Phase A) is where the current order lives, with §2.3 "Why `?t=` is first" explaining the reason in detail.

**This is a pre-existing documented tech-debt drift, not a Phase A verification failure.** Phase A rewrote ARCHITECTURE.md (A3) and touched TROUBLESHOOTING.md (A6/A8b), but A6's scope was the F040 #3→#10 renumber fix and the TIER-C-PENDING marker above Golden Reference #1 — not the "Tenant Resolution" reference block at L149–165. Phase B's preamble cleanup is the natural home for reconciling this block to the current order OR deleting it entirely (since ARCHITECTURE.md §2 now owns the topic).

**Action for Phase 3:** No new decision. Note as an existing Phase B cleanup item in §3.5 (Deferred to Module 3 Phase B).

### NOTE-2 — No other Phase A file contradicts any other Phase A file

Cross-checked:
- CLAUDE.md §9 Authority Matrix vs every other Phase A file → every listed authority points at a real, verified section.
- VIEW_CONTRACTS.md 22-view list vs ARCHITECTURE.md §1 Layer Model 22-view claim → match.
- SCHEMAS.md table list (11 tables) vs VIEW_CONTRACTS.md view-to-table mapping → consistent (every view corresponds to a documented table).
- FROZEN_FILES.md `inventory`/`brands`/`tenants` frozen-tables list vs ARCHITECTURE.md §1 "⚠ DO NOT MODIFY FROM MODULE 3 ⚠" block → match.
- TROUBLESHOOTING.md Golden Reference #1 subquery format `'/api/image/' || img.storage_path` vs CLAUDE.md §5 Rule 25 text `"using the Golden Reference subquery in VIEW_CONTRACTS.md"` → Rule 25 points at the wrong file (should be TROUBLESHOOTING.md §1 per §9 Authority Matrix) — this is **Phase 1C R18**, logged, not silent.
- COMPONENT_CHECKLIST.md §3 brand palette `#c9a555` + readable variant `#9e7e3a` vs TROUBLESHOOTING.md "Why this matters" prose → match.

**No escalation trigger fires.** Phase 2 verification PASSES 8/8.

---

## §2 Cross-Reference Reconciliation Table

Every cross-reference encountered while reading the three Phase 1 audit reports. Status legend:

- **R-A** — Resolved by Phase A's 8 sealed files
- **R-1A** / **R-1B** / **R-1C** — Resolved by another Phase 1 report
- **R-Main** — Resolved by a Main Strategic Chat decision (R13, R15, or the "supplements, never replaces" principle)
- **P3** — Pending, work item for Phase 3 of Module 3.1
- **P-M3B** — Deferred to Module 3 Phase B (TIER-C-PENDING cleanup round, or explicit Phase B scope)
- **OOS** — Out of scope for Module 3.1 entirely (with reason)

### 2.1 From Phase 1A (Foundation Audit) — §6 Cross-references

Phase 1A emitted 15 explicit cross-reference hooks for Phases 1B/1C and synthesis.

| # | Source | Target | Status | Reconciliation note |
|---|---|---|---|---|
| 1A-01 | `opticup/CLAUDE.md:24` (First Action Protocol) | `modules/Module X/docs/SESSION_CONTEXT.md` for Modules 1, 1.5, 2 | **R-1B** | 1B §2 confirms all three SESSION_CONTEXT.md files exist. Module 1's is SUSPECT (counts drift — 1B §3.1), 1.5's is ALIVE, 2's is ALIVE. |
| 1A-02 | `opticup/CLAUDE.md:41` | `opticalis/opticup-storefront` repo declared | **R-1C** | 1C §1.2 confirms repo exists; §2.2 enumerates 15 root reference docs. |
| 1A-03 | `opticup/docs/GLOBAL_MAP.md:701-914` (Module Registry) | `modules/inventory/*`, `modules/debt/*`, `modules/admin-platform/*`, etc. | **R-1B** + **P3** | 1B §2 confirms the Module 1/1.5/2 code paths exist. However, 1A's own finding #2 (Module 3/Storefront absent from GLOBAL_MAP) is **P3** — Foundation rewrite (see §3.1). |
| 1A-04 | `opticup/docs/GLOBAL_SCHEMA.sql` | per-module `db-schema.sql` files | **R-1B** + **P3** | 1B confirms `db-schema.sql` exists in Modules 1 / 1.5 / 2 (§1 inventory). However, Module 1.5 SESSION_CONTEXT L94 flags live-DB drift on roles/permissions RLS — promotes to **P3** foundation rewrite with **DB inspection prerequisite** (see §3.1 and D3). |
| 1A-05 | `opticup/docs/DB_TABLES_REFERENCE.md:120-129` → `opticup-storefront/CLAUDE.md` (`cms_leads` vs `storefront_leads`) | Cross-repo ref for CMS/storefront leads distinction | **R-A** | Side B `SCHEMAS.md` L71–L93 documents both `cms_leads` and `storefront_leads` tables + the "DO NOT CONFUSE THESE TWO TABLES" banner at L146–148. Phase A A4 closes this reference. |
| 1A-06 | `opticup/docs/FILE_STRUCTURE.md:8, 152` | `modules/storefront/` 20 Studio files in ERP repo | **R-1C** + **P3** | 1C §2.1 confirms Side A has Studio files; Discovery report says the real count is 32 files / 14,084 L. The **opticup/docs/FILE_STRUCTURE.md** side (Phase 1A scope) says "20 files" — wrong count. **P3 foundation rewrite** — R4 in Phase 1A + R4 in Phase 1C. |
| 1A-07 | `opticup/docs/TROUBLESHOOTING.md:21` | `css/inventory.css`, `css/employees.css`, etc. | **R-1B** | Module-owned CSS exists per 1B §1 inventory (no explicit grep but implied by MODULE_MAP.md sizes). No action needed in Phase 3 — TROUBLESHOOTING.md rewrite in **P3** will re-verify when executed. |
| 1A-08 | `opticup/CLAUDE.md:235` | `modules/Module 1.5 - Shared Components/scripts/clone-tenant.sql`, `cleanup-tenant.sql` | **R-1B** | Not in 1B's inventory table (scripts/ folder not inventoried), but 1B confirms Module 1.5's docs/db-schema.sql (6171 B) is ALIVE. Non-blocking. Phase 3 foundation rewrite will re-verify reference accuracy. |
| 1A-09 | `opticup/MASTER_ROADMAP.md:172-208` | `modules/Module 1.5 - Shared Components/` (6-task plan) | **R-1B** | 1B verdict: Module 1.5 is ALIVE / minor cosmetic drift only. MASTER_ROADMAP's 172–208 description of Module 1.5 as a "future" task is stale (it's DONE) — part of **P3** foundation rewrite of MASTER_ROADMAP. |
| 1A-10 | `opticup/MASTER_ROADMAP.md:212-220` | `modules/Module 2 - Platform Admin/` | **R-1B** | Same as 1A-09. Module 2 is DONE per 1B; MASTER_ROADMAP treats it as future. **P3**. |
| 1A-11 | `opticup/STRATEGIC_CHAT_ONBOARDING.md:89` → `PROJECT_GUIDE.md` | Dangling reference | **R-1B** | 1B "bonus findings" — `PROJECT_GUIDE.md` doesn't exist, but the 2026-03-08 Miro extraction (`docs/OPTIC_UP_PROJECT_GUIDE_v1.1.md` + `docs/SPEC.md`, inside Module 1 folder) is almost certainly the thing that was renamed. 1B recommends promoting to project-level `docs/ORIGINAL_PRODUCT_VISION.md`. **P3** foundation/housekeeping. **Daniel decision D2 required**. |
| 1A-12 | `docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md:210-220` | Level 1/2/3 SQL autonomy + `optic_readonly` DB role | **R-1A** (internal) | Phase 1A did not fault the UNIVERSAL template on SQL autonomy. **ALIVE** per 1A §2. Phase 1C did not re-verify (out of scope). No Phase 3 action. |
| 1A-13 | `opticup/PHASE_0_PROGRESS.md:64-87` | `.github/workflows/verify.yml` in BOTH repos | **R-1C** (partial) | 1C did not explicitly verify the storefront workflow, but 1C §2.2 treats QUALITY_GATES.md + SESSION_CONTEXT.md + PHASE_0_PROGRESS cross-references as ALIVE. CI existence itself is out of 1C's doc-scope. **OOS-verified-by-Phase-0**. |
| 1A-14 | `opticup/PHASE_0_PROGRESS.md:49-57` | `opticup-storefront/scripts/visual-regression.mjs` + baseline JSONs | **OOS-verified-by-Phase-0** | Phase 0 closed (per CLAUDE.md §11 "Phase 0 status: ✅ Complete April 2026"). Not a Module 3.1 scope. |
| 1A-15 | `opticup/TECH_DEBT.md#11` | Storefront-side items (normalize-logo.ts, submit.ts, etc.) | **R-1C** | 1C §2.2 confirms Side B TECH_DEBT.md exists (24,542 B). Side B `TECH_DEBT.md #11` IS the normalize-logo item (🔴 HIGH). Cross-repo tracking is **P3** item — the ERP TECH_DEBT.md should reference Side B TECH_DEBT.md #11 as the tracking anchor (see §3.1). |

### 2.2 From Phase 1B (Modules 1/1.5/2 Audit) — §6 Cross-references

Phase 1B emitted 34 cross-reference hooks across §6.1 (Phase 1A scope) and §6.2 (Phase 1C scope).

| # | Source | Target | Status | Reconciliation note |
|---|---|---|---|---|
| 1B-01 | `Module 1/SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md:89-91` | `docs/GLOBAL_MAP.md`, `GLOBAL_SCHEMA.sql` (GLOBAL docs) | **R-1A** | 1A confirms both files exist; both SUSPECT due to Module 3 blindness. **P3** foundation rewrite. |
| 1B-02 | `Module 1/SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md:192-194` | GLOBAL_MAP, GLOBAL_SCHEMA, CLAUDE.md | **R-1A** | Same reconciliation; **P3**. |
| 1B-03 | `Module 1/STRATEGIC_CHAT_OPENING_PROMPT.md` (stale) | CLAUDE.md + `docs/` conventions | **P3** (housekeeping) | 1B recommends **DELETE** (module complete, template never updated). **Daniel decision D5**. |
| 1B-04 | `Module 1/MY_CHEATSHEET.md:46` | CLAUDE.md | **R-1A** | CLAUDE.md is ALIVE per 1A. Drift in MY_CHEATSHEET itself (refers to renamed file) — **P3** housekeeping. |
| 1B-05 | `Module 1/docs/SESSION_CONTEXT.md:118-121` | "Module 3 — Storefront planning" | **R-1C** | Module 3 exists; 1C audited it. No action. |
| 1B-06 | `Module 1/docs/MODULE_SPEC.md` header | GLOBAL_SCHEMA + CLAUDE.md | **R-1A** | Existence confirmed. No action. |
| 1B-07 | `Module 1/docs/MODULE_SPEC.md:763-768` | Planned Views for Phase 6 Supplier Portal | **OOS-deferred** | Phase 6 deferred to Module 17. Not Module 3.1 scope. |
| 1B-08 | `Module 1/docs/PHASE_3.75_SPEC.md` | GLOBAL_MAP.md + GLOBAL_SCHEMA.sql Integration Ceremony | **R-1A** | Integration ceremony references are **P3** foundation rewrite targets. |
| 1B-09 | `Module 1/docs/PHASE_5.75_SPEC.md:88-93` | Future GLOBAL_MAP.md contracts (communications RPCs) | **OOS-deferred** | Forward references to deferred work. |
| 1B-10 | `Module 1/docs/PHASE_7_SPEC_UPDATED.md:6` | GLOBAL_MAP.md (shared component APIs) | **R-1A** (same) | **P3** foundation rewrite. |
| 1B-11 | `Module 1/docs/SPEC.md` + `OPTIC_UP_PROJECT_GUIDE_v1.1.md` | Miro board ("Optic Up Project New") | **R-1B** (logged) | 1B's own FLAG-FOR-DECISION. **Daniel decision D2 required**. **P3** housekeeping. |
| 1B-12 | `Module 1.5/ROADMAP.md:58-62` | Module 3 (Storefront) design tokens | **R-1C** | Confirmed: no direct dependency, design tokens share. No action. |
| 1B-13 | `Module 1.5/MODULE_1_5_COMPLETION_SUMMARY.md:282` | Module 3 (Storefront) design tokens | Same as 1B-12 | **R-1C**. |
| 1B-14 | `Module 1.5/MODULE_1.5_SECONDARY_CHAT_TEMPLATE.md:59-61` | GLOBAL_MAP.md, GLOBAL_SCHEMA.sql | **R-1A** | **P3**. |
| 1B-15 | `Module 1.5/MODULE_1.5_STRATEGIC_CHAT_PROMPT.md:180-186` | Storefront (future) | **R-1C** | Historical template; Module 3 now exists. No action. |
| 1B-16 | `Module 1.5/docs/SESSION_CONTEXT.md:88` | MASTER_ROADMAP | **R-1A** | **P3** foundation rewrite. |
| 1B-17 | `Module 1.5/docs/SESSION_CONTEXT.md:94` | **GLOBAL_SCHEMA.sql live-DB drift flag** (roles/permissions RLS) | **R-1A** (CRITICAL) + **P3** | 1A confirmed "live-DB drift, not just doc rot". **This is the highest-priority foundation rewrite item** — needs live-DB inspection to reconcile. See §3.1 and **decision D3**. |
| 1B-18 | `Module 1.5/docs/MODULE_1.5_PHASE_0_SPEC.md` | Created GLOBAL_MAP.md + GLOBAL_SCHEMA.sql | **R-1A** | Both files still exist (1A inventory). No action. |
| 1B-19 | `Module 1.5/docs/PHASE_4_SPEC.md:11` | GLOBAL_MAP.md | **R-1A** | **P3**. |
| 1B-20 | `Module 1.5/docs/PHASE_5_SPEC.md` | CLAUDE.md + GLOBAL docs | **R-1A** | **P3**. |
| 1B-21 | `Module 2/ROADMAP.md:18` | Storefront | **R-1C** | No direct dependency. |
| 1B-22 | `Module 2/ROADMAP.md:364-417` (Phase 5) | `storefront_config` for Module 3 | **R-1C** | `storefront_config` is in GLOBAL_SCHEMA (per 1A §2 "only `storefront_config` stub table, line 2339"). Side B `SCHEMAS.md` + `ARCHITECTURE.md §2.1` both reference it. No action. |
| 1B-23 | `Module 2/ROADMAP.md:500-544` | `checkPlanLimit`, `isFeatureEnabled`, `resolveTenant` contracts for Module 3 | **R-1C** | Contracts exist per Module 2. Side B `ARCHITECTURE.md §2.2` confirms `resolveTenant()` is used in `src/lib/tenant.ts:77`. No action. |
| 1B-24 | `Module 2/MODULE_2_COMPLETE_SUMMARY.md:231-236` | Module 3 handoff | **R-1C** | Documented handoff. |
| 1B-25 | `Module 2/MODULE_2_COMPLETE_SUMMARY.md:205-206` | B2B tables deferred to Module 3 | **OOS-M3-scope** | `shared_resources` and `resource_access_log` were deferred — Side B `SCHEMAS.md` does NOT currently list them; they remain deferred. Not a Module 3.1 blocker. Note in project memory. |
| 1B-26 | `Module 2/docs/SESSION_CONTEXT.md:44-48` | B2B tables + `storefront_config` (Phase 1C verify) | **R-1C** | 1C verified: `storefront_config` present (via views); B2B tables still deferred. |
| 1B-27 | `Module 2/docs/SESSION_CONTEXT.md:51-52` | Module 3 planning | **R-1C** | Happened — Module 3 exists. |
| 1B-28 | `Module 2/docs/PHASE_5_SPEC.md` entire doc | Module 3 Storefront throughout | **R-1C** | Integration done. |
| 1B-29 | `Module 2/docs/PHASE_5_SPEC.md:378-415` | `storefront_config` schema for Module 3 | **R-1C** | Verified via Side B SCHEMAS.md. |
| 1B-30 | `Module 2/MODULE_2_SECONDARY_CHAT_TEMPLATE.md:50-61` | GLOBAL_MAP, GLOBAL_SCHEMA, Modules 1 + 1.5 MODULE_MAPs | **R-1A** + **R-1B** | Template reference. **P3** foundation. |
| 1B-31 | `Module 2/MODULE_2_STRATEGIC_CHAT_PROMPT.md:182-184` | ROADMAP, CLAUDE.md | **R-1A** | **P3**. |
| 1B-32 | `Module 2/docs/MODULE_MAP.md:15-25` | `admin.html` loads `shared/css/` (8 files) + `shared/js/` (Toast/Modal/Wizard/TableBuilder) from Module 1.5 | **R-1B** | Cross-module dep documented. No action. |
| 1B-33 | `Module 2/docs/MODULE_SPEC.md:101-113` | Dependency on Module 1.5 Modal/Toast/TableBuilder | **R-1B** | Same as 1B-32. |
| 1B-34 | `Module 1/STRATEGIC_CHAT_OPENING_PROMPT.md`, `Module 1/docs/PHASE_3.75_SPEC.md`, etc. | All stale references to pre-completion state of Modules 1/1.5/2 | **P3** (housekeeping) | Rolled into §3.2 Module 1 housekeeping. |

### 2.3 From Phase 1C (Module 3 Dual-Repo Audit) — §6 Cross-references + §3.3 Cross-repo Discrepancies

Phase 1C emitted 39 cross-references across §6.1 (Side A → Phase 1A scope), §6.2 (Side A → Phase 1B scope), §6.3 (Side B → ERP-side), plus the 16 §3.3 cross-repo discrepancies (#17–#32).

| # | Source | Target | Status | Reconciliation note |
|---|---|---|---|---|
| 1C-01 | `Module 3/AUTONOMOUS_START.md:19` | `opticup/docs/GLOBAL_MAP.md` | **P3** (archive) | Whole AUTONOMOUS_START.md is stale (Mar 30 autonomous-mode). 1C R7: DELETE/ARCHIVE. |
| 1C-02 | `Module 3/AUTONOMOUS_START.md:64-65` | GLOBAL_MAP + GLOBAL_SCHEMA (Integration Ceremony) | **P3** (archive) | Same file → R7. |
| 1C-03 | `Module 3/AUTONOMOUS_START.md:16` | `opticup/CLAUDE.md` | **P3** (archive) | Same file → R7. |
| 1C-04 | `Module 3/Autonomous old/AUTONOMOUS_START_M3_PHASE3A.md:27` | `CLAUDE.md` | **P3** (archive) | Per R6: DELETE/ARCHIVE `Autonomous old/` folder. |
| 1C-05 | `Module 3/discovery/MODULE_3_DISCOVERY_REPORT_2026-04-10.md §1` | `opticup/CLAUDE.md` (listed as detected) | **R-1A** | CLAUDE.md ALIVE. No action. |
| 1C-06 | `Module 3/MODULE_3_ROADMAP.md` (implicit rules inheritance) | `opticup/CLAUDE.md` | **P3** | MODULE_3_ROADMAP.md needs complete rewrite (R1 — 25 stale findings). |
| 1C-07 | `Module 3/MODULE_3_ROADMAP.md:93-102` "תלויות" | Module 1 / 1.5 / 2 status | **R-1B** | 1B verified — all three modules DONE. ROADMAP rewrite (R1) will replace the assumed-complete claim with verified dates. |
| 1C-08 | `Module 3/AUTONOMOUS_PHASE2B_CLEANUP.md` (inventoried only) | Module 2 Phase 2B | **P3** (archive) | Per R6 → DELETE/ARCHIVE. |
| 1C-09 | Side A `docs/MODULE_MAP.md:88-102` | ERP Studio files | **R-1B** + **P3** | 1C R4: REWRITE Side A MODULE_MAP from `find`. Part of §3.2 Module 3 housekeeping rollup in Phase 3. |
| 1C-10 | `MODULE_3_DISCOVERY_REPORT §3.B` | `opticup/shared/auth-service.js` + `js/auth-service.js` (Module 1.5) | **R-1B** | 1B confirms Module 1.5's shared/js/ is ALIVE. No action. |
| 1C-11 | Side B `CLAUDE.md §2` | `opticalis/opticup/CLAUDE.md` Rules 1–23 exist and consistent | **R-1A** | 1A confirms CLAUDE.md defines Rules 1–23 (13 Iron + 7 SaaS + 3 Hygiene). |
| 1C-12 | Side B `CLAUDE.md §4` | ERP Rules 9, 13, 14, 15, 18, 21, 22, 23 exist | **R-1A** | All 8 rule numbers in 1A's inventory of CLAUDE.md. |
| 1C-13 | Side B `FROZEN_FILES.md:24` | TECH_DEBT #11 + `ARCHITECTURE.md §5.2` | **R-A** | Phase A A7 updated FROZEN_FILES.md to reference TECH_DEBT #11 and ARCHITECTURE.md §5.2 (which A3 added). Verified in §1 verdict-table row 7. |
| 1C-14 | Side B `TECH_DEBT #11 / #12` | `src/pages/api/normalize-logo.ts` direct reads of `employees`, `auth_sessions`, `brands` | **P-M3B** | HF2 EXITED_TO_FOLLOWUP → scheduled post-Phase-A HF2-followup mini-SPEC. Not a Module 3.1 item. |
| 1C-15 | Side B `CLAUDE.md §5 Rule 29` | `ARCHITECTURE.md` + `FROZEN_FILES.md` | **R-A** | Both files exist and are A3/A7 current. Rule 29 itself is present and internally correct. |
| 1C-16 | Side B `ARCHITECTURE.md §1` | `inventory`, `brands`, `storefront_*` tables (Module 1/2 territory) | **R-A** | Explicitly marked "⚠ DO NOT MODIFY FROM MODULE 3 ⚠" in A3 rewrite. |
| 1C-17 | Side B `BRAND_CONTENT_GUIDE.md` | Referenced from `studio-brands.js` (ERP) | **P3** (brand rules merge — R19) | Still incomplete — missing 4/6 of Daniel's brand content rules (see 1C §3.3 #25). |
| 1C-18 | Side B `docs/DISCOVERY-5-existing-infrastructure.md` | `opticup/supabase/functions/generate-brand-content/validators.ts` AND `UPDATE-session-docs-merge.md` | **P3** (Edge Functions registry, R20) | The 7 orphaned Edge Functions problem. **Daniel decision D4 required** (scope + home for `DEPLOYED_EDGE_FUNCTIONS.md` artifact). |
| 1C-19 | Side B `docs/DISCOVERY-brand-content-generation.md Q7` | `STRATEGIC_CHAT_CONTINUATION_v9.md:119-168` (Side B) + mirror in `UPDATE-session-docs-merge.md` (Side A) | **P3** (R19) | Single point of failure. **P3** merge into `BRAND_CONTENT_GUIDE.md`. |
| 1C-20 | Side B Discovery §9.2 | ERP `git log` area | **OOS-git-history** | Not a doc-level concern. |
| 1C-21 | Side B `SESSION_CONTEXT.md L174-181` | ERP commits `f0a5c87`, `1adad04`, `860d701`, `8de62e1`, `37d4cdd`, `22f65ce`, `9d8e0d2` | **OOS-git-history** | Not a doc-level concern. SESSION_CONTEXT rewrite (R3) will refresh commit list anyway. |
| **1C-17CR** | **§3.3 #17 Execution model contradiction** (Side A autonomous vs Side B Bounded Autonomy) | — | **P3** (archive) | R6 + R7 → DELETE/ARCHIVE Side A autonomous-mode docs; the contradiction disappears with the stale source. |
| **1C-18CR** | **§3.3 #18 Iron Rules 1–23 (opticup) vs 24–30 (storefront)** — no cross-repo acknowledgment | — | **P3** | Foundation rewrite: ERP CLAUDE.md adds short note; Phase 1A R4. |
| **1C-19CR** | **§3.3 #19 MODULE_MAP in both repos, both obsolete, neither describes cross-repo reality** | — | **P3** | Covered by R4 + R5 (regenerate from `find`). |
| **1C-20CR** | **§3.3 #20 CHANGELOG.md in both repos, both stale** | — | **P3** + **P-M3B** | Side A CHANGELOG: Phase 3 rewrite in Module 3 housekeeping rollup. Side B CHANGELOG: Module 3 Phase B responsibility (Side B is their active development chain). |
| **1C-21CR** | **§3.3 #21 SESSION_CONTEXT.md in both repos, both stale** | — | **P3** | R2 + R3 → REWRITE both. **Priority-H**. Part of Phase 3 foundation/housekeeping track. |
| **1C-22CR** | **§3.3 #22 View contracts ownership — Side B owns, Side A Studio consumes, no Side A pointer** | — | **P3** | Per R13: Side B authoritative, Side A pointer stub. MODULE_DOCUMENTATION_SCHEMA rule. |
| **1C-23CR** | **§3.3 #23 Display mode terminology — Side B TECH_DEBT #10 flags dead cols; Side A still writes** | — | **P-M3B** | Side B `TECH_DEBT #10` is the tracking anchor; Side A cleanup is cross-repo work scheduled in Phase B. Not Module 3.1 scope. |
| **1C-24CR** | **§3.3 #24 7 of 8 Edge Functions with unknown source (R20)** | — | **P3** | **Daniel decision D4 required**. See §3.3 / §4 for proposed `DEPLOYED_EDGE_FUNCTIONS.md` artifact. |
| **1C-25CR** | **§3.3 #25 6 brand content rules only in STRATEGIC_CHAT_CONTINUATION_v9.md (R19)** | — | **P3** | MERGE into `BRAND_CONTENT_GUIDE.md` + Edge Function styleGuide. |
| **1C-26CR** | **§3.3 #26 Side B `docs/` vs root convention (R14)** | — | **R-Main** (R14 decided: keep current) | Explicit Main-decided constraint. No action. Document in MODULE_DOCUMENTATION_SCHEMA. |
| **1C-27CR** | **§3.3 #27 Module 3 `discovery/` folder overlaps Module 3.1 audit (R15)** | — | **R-Main** | Resolved: Phase A + discovery are GROUND TRUTH; Module 3.1 supplements. No action. |
| **1C-28CR** | **§3.3 #28 MODULE_3_A_SPEC = completed Phase A, scope ownership (R15)** | — | **R-Main** + **P3** (archive move R16) | Per R16: MOVE `current prompt/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` → `old prompts/`. Part of §3.2 housekeeping. |
| **1C-29CR** | **§3.3 #29 Translation pipeline architecture undocumented** | — | **P-M3B** | Side B TECH_DEBT #6 is the anchor. Cross-repo doc work, not Module 3.1 scope. Note in project memory for Phase B. |
| **1C-30CR** | **§3.3 #30 Secondary-chat convention only in Module 3.1; Module 3 prompts say "no secondary chat"** | — | **P3** (archive) | Covered by R7 (archive Mar 30 Module 3 prompts). Once archived, no conflict remains. |
| **1C-31CR** | **§3.3 #31 DNS-switch readiness documented in 4+ places (R21)** | — | **P-M3B** | Operational consolidation, Phase B natural home. Note in project memory. |
| **1C-32CR** | **§3.3 #32 Edge Function source-to-deployment tracking doesn't exist** | — | **P3** (same as 1C-24CR) | Same Edge Function ownership problem. D4 + DEPLOYED_EDGE_FUNCTIONS.md. |

### 2.4 Cross-reference summary

- **88 cross-references total** across the 3 audit reports (15 + 34 + 39).
- **R-A** (resolved by Phase A sealed files): **7** — mostly Side B internal references that Phase A closed.
- **R-Main** (resolved by Main-decided R13 / R15 / "supplements only" principle): **4** — 1C-26CR (R14), 1C-27CR (R15), 1C-28CR (R15 + partial R16), and the R13 relocation principle foundation.
- **R-1A** (resolved by Phase 1A report): **14** — mostly Phase 1B/1C references that Phase 1A confirmed exist.
- **R-1B** (resolved by Phase 1B report): **12** — Phase 1A/1C references to Module 1/1.5/2 state.
- **R-1C** (resolved by Phase 1C report): **13** — Phase 1A/1B references to Module 3 / storefront-repo state.
- **P3** (Phase 3 work): **27 distinct action items** — see §3.
- **P-M3B** (deferred to Module 3 Phase B): **6** — display-mode cleanup, translation pipeline arch doc, DNS-switch consolidation, HF2-followup, Side B CHANGELOG, TIER-C-PENDING cleanup round.
- **OOS** (out of scope): **5** — Phase 6 deferred work, Phase 5.75 comms forward refs, git-history references, Phase 0 CI verification, shared resources deferred.

**Every cross-reference is accounted for.** No "skip" entries.

---

## §3 Pending Gap Inventory

This section enumerates the work remaining for Phase 3 (Module 3.1 artifact production) + auxiliary cleanup, organized into 5 sub-sections per the SPEC template.

### §3.1 Foundation rewrites (Side A `opticup/docs/` + root — NOT touched by Phase A)

Phase A worked exclusively on Side B (`opticup-storefront/`). Side A's `opticup/docs/` foundation layer is untouched and has known staleness per Phase 1A. These are **foundational** — every secondary chat that reads CLAUDE.md / MASTER_ROADMAP / GLOBAL_MAP gets a wrong mental model until these are fixed.

| # | Item | Source rec | Priority | Notes |
|---|---|---|---|---|
| F1 | **REWRITE `opticup/MASTER_ROADMAP.md`** — produce 2026-04-11 version reflecting Modules 1/1.5/2 ✅, Module 3 Phase A ✅, Module 3.1 active, Phase B blocked. | 1A R1 | **H** | 25 stale passages identified in 1A §4. This is the anchor rewrite — everything else references it. Section 11 "DB map" needs updated count (51 tables per 1A vs MASTER_ROADMAP's claim). Section 14 "decisions table" needs 2026-04 entries (Phase 0, Iron Rules 21–23, dual-repo formalization, 4-layer hierarchy). Section 15 "next step" replaces "Phase 5.9" with "Module 3.1 → Module 3 Phase B". |
| F2 | **REWRITE `opticup/README.md`** — replace Prizma single-tenant inventory framing with Optic Up SaaS identity; point to CLAUDE.md + MASTER_ROADMAP. | 1A R2 | **H** | First file anyone reads — currently contradicts every other file. |
| F3 | **REWRITE `opticup/STRATEGIC_CHAT_ONBOARDING.md`** — harmonize chat-layer terminology to "Secondary Chat" canonical (matching `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`), delete dangling `PROJECT_GUIDE.md` reference (or point at `UNIVERSAL_PROMPT` if that's the rename), update "what exists now" to April 2026. | 1A R3 | **H** | Corrupts every Main Strategic session that loads it. |
| F4 | **REWRITE `opticup/CLAUDE.md` §4–§6** — add explicit acknowledgement that Rules 24–30 live in `opticup-storefront/CLAUDE.md` (currently silent on cross-repo rule numbering per 1A #4 / 1C §3.3 #18). Add one-line pointer to STRATEGIC_CHAT_ONBOARDING / UNIVERSAL_PROMPT for hierarchy diagram. | 1A R4 | **M** | Small surgical edit. Closes cross-repo constitutional split. |
| F5 | **REWRITE `opticup/docs/GLOBAL_MAP.md`** — add §0 preface acknowledging dual-repo architecture; add §6.x "Module 3 — Storefront" entry pointing to `opticup-storefront/FILE_STRUCTURE.md` + Side B per-module slice. Add cross-repo rules section. | 1A R5 | **H** | Rule 21 (No Orphans) requires cross-repo pointers to live here. |
| F6 | **REWRITE `opticup/docs/GLOBAL_SCHEMA.sql`** — add View definitions (`v_storefront_products`, `v_storefront_brands`, etc.) OR a dedicated view-declaration section; add missing storefront tables (`cms_leads`, `storefront_pages`, `storefront_articles`, etc.). **Requires live-DB inspection FIRST** because 1B §6-§17 (Module 1.5 SESSION_CONTEXT L94) confirmed the file has live-DB drift beyond views (roles/permissions RLS). | 1A R6 + 1B SESSION_CONTEXT L94 | **H** | **Blocks on decision D3** (live-DB inspection protocol). Also intersects with §3.4 FLAG items. |
| F7 | **DELETE `opticup/docs/FILE_STRUCTURE.md:96`** — remove `(TBD — Phase 0)` annotation next to `AUTONOMOUS_MODE.md`. | 1A R7 | **L** | One-line cleanup. |
| F8 | **REWRITE `opticup/docs/TROUBLESHOOTING.md`** — add entries for TECH_DEBT #5 (information_schema blind spot), #6 (zero declared views), Phase 0 rails category (verify.mjs / pre-commit hooks / schema-diff). | 1A R8 | **M** | "Check TROUBLESHOOTING first" protocol is empty for every known Phase 0 issue. |
| F9 | **DECISION + EXECUTION on `C:prizma.claudelaunch.json`** — 146-byte malformed-filename orphan at repo root. | 1A R9 | **L** | **Daniel decision D6**: inspect-then-delete. |
| F10 | **DECISION + UPDATE on `opticup/TECH_DEBT.md #7`** — reconcile with `PHASE_0_PROGRESS.md:21` (commit `305b22e` "warnings exit harmonization"). Move to Resolved Debt section if confirmed, or re-scope. | 1A R10 | **L** | Trust gap between two foundation files. |
| F11 | **SPLIT `opticup/docs/Templates/`** — create `MAIN_STRATEGIC_CHAT_PROMPT.md` (layer 1) and `SECONDARY_CHAT_PROMPT.md` (layer 3) alongside existing `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` (layer 2). **Note:** `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` is also listed as one of Module 3.1's 5 mandatory artifacts (artifact #3 per ROADMAP §4). **Rule 21 — No Duplicates** applies: F11 and Artifact #3 must be the same file (with pointer stub in `docs/Templates/` if Templates/ remains the canonical home). See §3.3 A3 below. | 1A R11 + Artifact #3 | **H** | **Overlap with §3.3 A3**. Resolve before drafting to avoid producing two files. |

**Total Side A foundation rewrite items: 11** (of which 3 are H-priority REWRITEs of already-known-stale files, and 1 — F6 — is blocked on decision D3).

### §3.2 Module 1 housekeeping (7 bounded items from Phase 1B)

Per the Main-decided principle "YELLOW verdict + no Modules 1-2 track needed", Module 1 housekeeping rolls into Phase 3 alongside artifact production. **Bounded**, no rewrite needed. These items are all small surgical edits.

| # | Item | Source rec | Priority |
|---|---|---|---|
| H1 | **FLAG for D2:** `Module 1/docs/SPEC.md` + `Module 1/docs/OPTIC_UP_PROJECT_GUIDE_v1.1.md` — 70 KB of Miro board extraction misplaced inside Module 1. Recommendation: MOVE to project-level `opticup/docs/ORIGINAL_PRODUCT_VISION.md` (merge — they share source). **Daniel decision D2 required.** | 1B R1 | **M** (decision first) |
| H2 | **DELETE or FREEZE `Module 1/STRATEGIC_CHAT_OPENING_PROMPT.md`** — completely stale template ("Phase 3.75 ⬜ הבא"), no forward use. Recommendation: DELETE. | 1B R2 | **M** |
| H3 | **DELETE `Module 1/docs/QA_TRACKER.md`** — 448-test checklist orphaned "In Progress", canonical result is in CHANGELOG+SESSION_CONTEXT. Alternative: replace with stub pointing to CHANGELOG. | 1B R3 | **L** |
| H4 | **REWRITE `Module 1.5/ROADMAP.md` stale detail headers** (lines 363, 462, 515 — `⬜` → `✅`) + update `shared/js` count in `MODULE_SPEC.md` and `MODULE_1_5_COMPLETION_SUMMARY.md` (9 → 11 files, add `table-resize.js` and `sort-utils.js`). Three small surgical edits. | 1B R4 | **L** |
| H5 | **DELETE or ANNOTATE `Module 2/docs/create_tenant_rpc.sql`** — pre-Phase-5 10-step version of `create_tenant()`. Current 11-step version is in `phase5a-storefront-config.sql`. Alternative: add 3-line SUPERSEDED comment. | 1B R5 | **L** |
| H6 | **REWRITE `Module 2/ROADMAP.md:146-156`** — "9 columns" → "10 columns", add `last_active`. Also fix Phase 5 overview to remove or 🚫-mark `shared_resources` / `resource_access_log` references. | 1B R6 | **L** |
| H7 | **DECISION on Module 1 SESSION_CONTEXT drift** — counts admin.html / error.html / landing.html and Module 2 RPCs as part of "Module 1's state". Options: (a) freeze Module 1 SESSION_CONTEXT pre-Module-2 + create project-level `PROJECT_STATE.md`, (b) accept blurred scope. No blocker. **Rolled into D1 — Phase 3 chat structure.** | 1B R7 | **M** (decision first) |

### §3.3 Module 3.1 mandatory artifacts (the 5 deliverables + additions discovered during audit)

Per ROADMAP §4, Module 3.1 must produce **5 mandatory artifacts**. During Phase 1 we also discovered candidates for 2 additional artifacts (#6 and #7 below) — both flagged for Daniel approval per ROADMAP §4 "additional artifacts may be added with approval".

| # | Artifact | Current state | Phase 3 work |
|---|---|---|---|
| **A1** | **`opticup/MASTER_ROADMAP.md` (rewritten)** | ⬜ — 1A documents 25 stale passages | Full rewrite. **Overlaps with F1** — same file, same work. Delivered in Phase 3A (Foundation Rewrite). |
| **A2** | **`UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` (verified/updated)** | ✅ (per 1A §2 and master SESSION_CONTEXT "verified ALIVE"). Currently at `opticup/modules/Module 3.1 - Project Reconstruction/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` **AND** `opticup/docs/Templates/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` — **two copies exist**. | **Rule 21** — resolve duplication. Canonical home = `opticup/docs/Templates/`. Module 3.1 folder should have a pointer stub or delete-and-reference. Also merge in §14 Cross-Module Safety Protocol from Module 3's recommendations doc (per 1C §5.3 + master SESSION_CONTEXT issue #12) and the "one question at a time" + "stop-and-ask" lessons banked during Phase 1 (per master SESSION_CONTEXT "Lessons banked 4, 5, 6"). |
| **A3** | **`UNIVERSAL_SECONDARY_CHAT_PROMPT.md`** | ⬜ — does not yet exist. Closest existing artifact: `Module 3.1/MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` (17,931 B) which is Module-3.1-specific. Phase 1A R11 also proposes splitting `docs/Templates/` to add `SECONDARY_CHAT_PROMPT.md`. | Derive from `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` + 1B module-level `SECONDARY_CHAT_TEMPLATE_UNIVERSAL.md` (Module 1) + 1B module-level `MODULE_2_SECONDARY_CHAT_TEMPLATE.md`. **Overlap with F11** — same file. Resolve duplication: put authoritative file in `opticup/docs/Templates/SECONDARY_CHAT_PROMPT.md` (or name it `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` to match the mandatory-artifact name — **decision D1 sub-item**). |
| **A4** | **`MODULE_DOCUMENTATION_SCHEMA.md`** | ⬜ — does not exist. Phase 1C R13 provides the 4-rule basis + Main-approved. | Draft from 1C R13's 4 rules + 5th rule on pointer-stub format (per SESSION_CONTEXT R13 resolution). Must also document: TIER-C-PENDING convention, schema-in-pieces rule (cross-module `ALTER` — per 1B finding #3), TIER-C markers for scheduled cleanup rounds, where live DB inspections fit in the Integration Ceremony. Canonical location: `opticup/docs/` (the project-level home). |
| **A5** | **`DANIEL_QUICK_REFERENCE.md`** | ⬜ — does not exist | 1–2 page cheat sheet per ROADMAP §4. Location TBD. Pulls content from A2/A3 + CLAUDE.md Section 1 (First Action Protocol) + navigation tables. |
| **A6 (candidate)** | **`DEPLOYED_EDGE_FUNCTIONS.md`** | ⬜ — new artifact, not in original 5. Justified by 1C §3.3 #24 (7 Edge Functions with no documented source). | **Daniel decision D4 required** (should this be Module 3.1 scope, or is it ownership + versioning in Module 3 Phase B?). If accepted: enumerate all 8 Edge Functions; for each, record source location (or "deployed from Dashboard only"), owner, last-known version. Phase 3 deliverable would be the document skeleton + data-gathering from `opticup/supabase/functions/` and Supabase Dashboard. |
| **A7 (candidate)** | **`opticup/docs/PROJECT_VISION.md`** (promoted from Module 1 `SPEC.md` + `OPTIC_UP_PROJECT_GUIDE_v1.1.md`) | ⬜ — 1B R1. | **Daniel decision D2 required.** Merge the two 2026-03-08 Miro extractions into one project-level historical reference. Not strictly one of the 5 mandatory Module 3.1 artifacts, but resolves H1 and 1A's dangling `PROJECT_GUIDE.md` reference in one move. |

**Total mandatory artifacts: 5 core + 2 candidates = up to 7.**
**Rule 21 / no-duplicate deduplication events: A1↔F1 (same rewrite), A3↔F11 (same file), A4 project-level location. Must be resolved in Phase 3A/3B planning.**

### §3.4 FLAG-FOR-DECISION items (R-items requiring Daniel approval before execution)

Per master SESSION_CONTEXT Issues & Open Questions + Phase 1 reports.

| ID | Issue | Source | State | Phase 2 recommendation |
|---|---|---|---|---|
| **D1** | **Phase 3 chat structure** — one secondary chat vs. multiple parallel chats; which sub-phases (3A/3B/3C/3D) run in parallel vs sequentially? (Includes naming decision for A3 = `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` vs `SECONDARY_CHAT_PROMPT.md`.) | Strategic Chat request | OPEN | **See §4 for proposed breakdown.** |
| **D2** | `SPEC.md` + `OPTIC_UP_PROJECT_GUIDE_v1.1.md` (Module 1) → promote to `opticup/docs/PROJECT_VISION.md`? | 1B R1 / master SC issue #6 | OPEN — tentative YES | Recommend (a) MERGE to project-level; alternative is DELETE (lose historical ambition context) — **NOT recommended**, as Module 4+ planning will reference it. |
| **D3** | `opticup/docs/GLOBAL_SCHEMA.sql` fix — **requires live-DB inspection**. How does Module 3.1 Phase 3 get read-only DB access? The `tier_c_manual_queries.sql` pattern from Phase A A0 used Daniel's Supabase Dashboard session. Can Phase 3 reuse that, or does it need a service_role prompt? | 1A R6 + 1B SESSION_CONTEXT L94 + master SC issue #2 | OPEN — **CONFIRMED live-drift**, not doc rot | Recommend: reuse A0 pattern — Phase 3 writes a `tier_foundation_queries.sql` file, Daniel runs in Dashboard, commits output JSON, Phase 3 reads and writes. Same proven flow as Phase A A0. |
| **D4** | 7 Edge Functions with unknown source — is this Module 3.1 scope (new artifact A6)? | 1C R20 + master SC issue #10 | OPEN — no prior Main decision | Recommend: YES, becomes A6. Skeleton + known columns in Phase 3, data gathering (locate in ERP `supabase/functions/` or confirm Dashboard-only) as part of same sub-phase. |
| **D5** | Module 1 stale templates (`STRATEGIC_CHAT_OPENING_PROMPT.md`, `MY_CHEATSHEET.md`) — DELETE or FREEZE with banner? | 1B R2 + adjacent 1B findings | OPEN — tentative DELETE | Recommend DELETE. Module 1 is complete; frozen templates are never updated; current readers are guaranteed to be misled. |
| **D6** | `C:prizma.claudelaunch.json` — read-once-then-delete, or keep? | 1A R9 | OPEN | Recommend: inspect contents first (1 line tool), then delete in a targeted commit. Low-risk. |

**Additional items flagged by Phase 1A that Main may already consider settled:**

- **TECH_DEBT.md #7 reconciliation** (1A R10 — F10 above) — framed as "decision" but really just a surgical edit after verification. Fold into F10 without escalating.
- **`docs/Templates/` split into 3 templates** (1A R11 — F11 above) — no blocker; execute in Phase 3A as part of A2/A3 resolution.

**Rolled-up decisions needed before Phase 3 can start: D1, D2, D3** (3 blockers). D4 and D5 can happen early in Phase 3 (not day-0 blockers but should be resolved during Phase 3 planning). D6 can be a post-commit cleanup any time.

### §3.5 Deferred to Module 3 Phase B (do NOT trespass)

These items surfaced during Phase 1 but Module 3.1 must **not** touch them. They are Module 3 Phase B's work.

| ID | Item | Anchor |
|---|---|---|
| B1 | **TIER-C-PENDING cleanup round** — VIEW_CONTRACTS.md (88 sub-sections: Purpose / Depends on / Dependents / Golden Reference subqueries for 22 views) + ARCHITECTURE.md §3.3 (full DROP/CREATE order) + ARCHITECTURE.md §4.3 (Golden Reference byte-verify) + SCHEMAS.md `content_translations.entity_type` CHECK + TROUBLESHOOTING.md §1 Golden Reference byte-verify + ARCHITECTURE.md §5.1/§5.4 RLS matrix. All populated from `discovery/tier_c_results_manual.json`. | 1C §5.4 + Phase A A0 output |
| B2 | **HF2-followup mini-SPEC** — `normalize-logo.ts` bucket-C direct table reads (`employees`, `auth_sessions`, `brands`) replaced with SECURITY DEFINER RPC per ARCHITECTURE.md §5.2 pattern. Scheduled post-Phase-A. | 1C §2.2.1 Side B SECURITY_RULES status + FROZEN_FILES L24 + TECH_DEBT #11 |
| B3 | **Iron Rule 24 allowed-views list** — update from 9 to ~13 runtime-used views (`v_storefront_reviews`, `v_storefront_components`, `v_content_translations`, `v_ai_content`, `v_tenant_i18n_overrides` added). Phase A A5 missed this text portion. **NOTE:** this is Phase A A5's closure, not Phase B — Module 3 Phase B's preamble should pick it up alongside TIER-C cleanup. Flag in MODULE_DOCUMENTATION_SCHEMA (A4) as an example of "A-phase closure items". | 1C R17 + §3.2 #8 |
| B4 | **Iron Rule 25 Golden Reference pointer fix** — "VIEW_CONTRACTS.md" → "TROUBLESHOOTING.md §1 (+ VIEW_CONTRACTS.md)". | 1C R18 |
| B5 | **Display-mode dead-column cleanup** (`brands.storefront_mode`, `inventory.storefront_mode_override`) — cross-repo, 2–3 hours careful work. Side B TECH_DEBT #10 is tracking anchor; Side A Studio still dual-writes. | 1C §3.3 #23 |
| B6 | **Translation pipeline architecture doc** — spans `content_translations`, `translation_memory`, `tenant_i18n_overrides`, Studio translation tab, manual Gemini batches, glossary. Side B TECH_DEBT #6. | 1C §3.3 #29 |
| B7 | **DNS-switch consolidation** — single canonical `DNS_SWITCH_READINESS.md` replacing 4+ scattered docs. | 1C R21 |
| B8 | **Side A + Side B `docs/CHANGELOG.md` catch-up** — neither repo's CHANGELOG reflects Apr 9–11 work. Side A catch-up is natural fit for Module 3 housekeeping; Side B catch-up is Module 3 Phase B's natural pace. (Small intersection with §3.2 below — Side A portion is Phase 3 scope; Side B portion is NOT.) | 1C §3.3 #20 |
| B9 | **TROUBLESHOOTING.md L149–165 "Tenant Resolution" stale block** — ARCHITECTURE.md §2 now owns this topic. Block should be shortened to a 2-line pointer, or the whole block deleted, during Phase B preamble. | NOTE-1 in §1 of this report |

**Module 3.1 explicitly does NOT touch these 9 items.** They are Module 3 Phase B's problem. Module 3.1's artifact A4 (MODULE_DOCUMENTATION_SCHEMA.md) should document the TIER-C-PENDING convention itself (as a pattern for future modules), without trying to solve any specific TIER-C-PENDING marker.

### §3 Summary — totals

- **§3.1 Foundation rewrites: 11 items** (9 Side A foundation, 1 decision-gated, 1 dup-with-F11)
- **§3.2 Module 1 housekeeping: 7 items** (bounded, rollable into one sub-phase)
- **§3.3 Mandatory artifacts: 5 core + 2 candidates** (up to 7 deliverables; 3 deduplications)
- **§3.4 FLAG-FOR-DECISION: 6 items** (D1–D6; D1–D3 are Phase 3 day-0 blockers)
- **§3.5 Deferred to Module 3 Phase B: 9 items** (do-not-touch)

---

## §4 Phase 3 Work Breakdown

Recommended Phase 3 structure assumes D1 is resolved as "multiple parallel sub-phases with explicit no-overlap" (the model Phase 1 used successfully). Each proposed sub-phase is a secondary chat with its own SPEC + SESSION_CONTEXT.

### Proposed Phase 3 sub-phases

**Phase 3A — Foundation Rewrite (ERP Side A `opticup/docs/` + root)**

| Field | Value |
|---|---|
| Scope | F1, F2, F3, F4, F5, F6 (blocked on D3), F7, F8, F10, F11 (= A3 overlap). Mandatory artifact A1 = F1 (MASTER_ROADMAP.md rewrite). Artifact A2 = verify existing UNIVERSAL_PROMPT, resolve duplication with `Module 3.1/UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`, merge in §14 + lessons banked. |
| Inputs | Phase 1A report (full), Phase 2 plan (this file), access to live DB (pending D3). |
| Output | A1 (MASTER_ROADMAP.md) + A2 (UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md refined) + all F-items except F9 (D6). Per Rule 21, NO NEW FILES that duplicate existing ones. |
| Files touched | `opticup/MASTER_ROADMAP.md`, `opticup/README.md`, `opticup/STRATEGIC_CHAT_ONBOARDING.md`, `opticup/CLAUDE.md` (§4–§6 surgical), `opticup/docs/GLOBAL_MAP.md`, `opticup/docs/GLOBAL_SCHEMA.sql`, `opticup/docs/FILE_STRUCTURE.md` (1 line), `opticup/docs/TROUBLESHOOTING.md`, `opticup/TECH_DEBT.md` (#7), `opticup/docs/Templates/` (split). |
| Effort | **L** (large). 9 foundation files + template split + full-chat synthesis writing. |
| Dependencies | **D3 must be resolved** before touching `GLOBAL_SCHEMA.sql`. Other files can proceed in parallel. |
| Daniel decisions needed | D3 (live-DB inspection), D5 (Module 1 stale templates — only affects cross-references in the files being rewritten), D6 (`C:prizma.claudelaunch.json` cleanup is a separate commit). |

**Phase 3B — Mandatory Artifacts Production (the 3 new universal docs)**

| Field | Value |
|---|---|
| Scope | A3 (UNIVERSAL_SECONDARY_CHAT_PROMPT.md), A4 (MODULE_DOCUMENTATION_SCHEMA.md), A5 (DANIEL_QUICK_REFERENCE.md). Plus A6 (DEPLOYED_EDGE_FUNCTIONS.md) IF D4 = YES. |
| Inputs | Phase 2 plan, all 3 Phase 1 reports, SPECs + templates from Modules 1/1.5/2 (existing secondary-chat templates), `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` (17 KB, already exists as starting point for A3), Main-approved R13 4-rule formulation + 5th rule on pointer stubs. |
| Output | 3 new mandatory files + optionally 1 candidate file. Canonical location: `opticup/docs/` (A3 ends up in `docs/Templates/` alongside the others). |
| Files touched | NEW files only. May require small surgical pointer-stub edits in `opticup/docs/Templates/` + (for A4) references from `opticup/CLAUDE.md §12 Reference Files Index` and `opticup-storefront/CLAUDE.md §9 Authority Matrix`. |
| Effort | **M-L** (medium-to-large). Writing 3 universal documents + A6 skeleton. |
| Dependencies | **Should run AFTER Phase 3A completes** — A4 and A3 both reference MASTER_ROADMAP and the rewritten GLOBAL_MAP. Alternatively: run in parallel with explicit pointer stubs that get filled in at Phase 3 close. Main-approved R13 resolved (✅); needs D1 (naming for A3), D4 (for A6 inclusion). |
| Daniel decisions needed | D1 (A3 naming + sub-phase structure), D4 (A6 inclusion). |

**Phase 3C — Module 1 Housekeeping + Side-A Module 3 Archive**

| Field | Value |
|---|---|
| Scope | H1–H7 (Phase 1B's 7 bounded items) + 1C R1 (Module 3 ROADMAP rewrite) + 1C R2 (Side A SESSION_CONTEXT rewrite) + 1C R4 (Side A MODULE_MAP rewrite from `find`) + 1C R6 (archive Autonomous old/) + 1C R7 (archive AUTONOMOUS_START.md + MODULE_3_STRATEGIC_CHAT_PROMPT.md) + 1C R8 (archive 12 stale PHASE_*_SPEC.md — Main-approved "archive with marker") + 1C R16 (MOVE `current prompt/MODULE_3_A_SPEC` → `old prompts/`). **Daniel decisions D2 (PROJECT_VISION.md promotion) and D5 (Module 1 stale templates DELETE) required.** Also F9 (C:prizma.claudelaunch.json). |
| Inputs | Phase 1B report (full), Phase 1C report §7 (Module 3 sections), Phase 2 plan (this file), `discovery/hotfix_execution_log_2026-04-10.md`, `discovery/phase_a_execution_log_2026-04-11.md`, Phase A's 8 output files (as GROUND TRUTH reference, never modified). |
| Output | H1–H7 executed + Module 3 Side A cleaned up + H7 decision implemented. **A7 candidate artifact** (PROJECT_VISION.md) produced as a side effect IF D2 approves. |
| Files touched | `modules/Module 1 - Inventory Management/**` (7 housekeeping items), `modules/Module 3 - Storefront/MODULE_3_ROADMAP.md` (rewrite), `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` (rewrite), `modules/Module 3 - Storefront/docs/MODULE_MAP.md` (rebuild from `find`), `modules/Module 3 - Storefront/Autonomous old/` (archive), `modules/Module 3 - Storefront/AUTONOMOUS_START.md` (archive), `modules/Module 3 - Storefront/MODULE_3_STRATEGIC_CHAT_PROMPT.md` (archive), `modules/Module 3 - Storefront/docs/PHASE_*_SPEC.md` 12 files (archive with marker), `modules/Module 3 - Storefront/docs/current prompt/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` → `old prompts/`, `opticup/C:prizma.claudelaunch.json` (delete). |
| Effort | **M** (medium). Many files but all surgical or archive moves. |
| Dependencies | D2, D5, D6. Can run in parallel with Phase 3A once those three are decided. Must NOT touch Side B / Phase A files (R-Main hard constraint). |
| Daniel decisions needed | D2, D5, D6. |

**Phase 3D — QA + Integration Ceremony + Closure**

| Field | Value |
|---|---|
| Scope | Final verification of all 5 (or 7) mandatory artifacts present, MASTER_ROADMAP updated, Module 3.1 ROADMAP §10 closure steps executed (unblock Module 3 Phase B). Run schema-diff.mjs against freshly-rewritten GLOBAL_SCHEMA.sql + live DB (if D3 path chosen). Merge Module 3.1's own docs into `docs/GLOBAL_MAP.md`. |
| Inputs | All Phase 3A/3B/3C outputs. |
| Output | Module 3.1 closure commit + git tag `v3.1.closure`. Message to Module 3 Strategic Chat that Phase B can start. |
| Files touched | `opticup/MASTER_ROADMAP.md` (final closure entry), `modules/Module 3.1 - Project Reconstruction/ROADMAP.md` (✅ all phases), `modules/Module 3.1 - Project Reconstruction/docs/SESSION_CONTEXT.md` (final), backup folder, tag. |
| Effort | **S** (small, ceremonial). |
| Dependencies | All of 3A + 3B + 3C complete. |
| Daniel decisions needed | None (or just a final review approval). |

### Work breakdown summary table

| Sub-phase | Effort | Parallelizable with | Blockers (Daniel decisions) | Key outputs |
|---|---|---|---|---|
| 3A — Foundation Rewrite | **L** | 3C | **D3** (hard — GLOBAL_SCHEMA.sql), + D5, D6 | A1 (MASTER_ROADMAP), A2 refined, F1–F11 |
| 3B — Mandatory Artifacts | **M-L** | — (runs after 3A, or in parallel with explicit pointer stubs) | **D1** (structure/naming), **D4** (A6) | A3, A4, A5, optionally A6 |
| 3C — Housekeeping + Side A M3 archive | **M** | 3A | **D2**, **D5**, **D6** | H1–H7, Side A M3 cleanup, candidate A7 |
| 3D — QA + Closure | **S** | — (runs after 3A + 3B + 3C) | None | Module 3.1 closure, Phase B unblock |

### Alternative structure: Sequential vs parallel

If D1 prefers **sequential** execution (single secondary chat, one sub-phase at a time):
- 3A → 3B → 3C → 3D
- Pro: no coordination overhead, each sub-phase has complete prior context
- Con: slower; foundation rewrites delay artifact production

If D1 prefers **parallel** execution (multiple secondary chats, similar to Phase 1):
- 3A ∥ 3C (both touch disjoint files, run concurrently)
- 3B starts when 3A's MASTER_ROADMAP + GLOBAL_MAP skeleton drafts are committed (can be mid-3A)
- 3D runs after all three are `✅`
- Pro: faster throughput
- Con: higher coordination cost, partial-state gotchas (e.g., A4 referencing not-yet-rewritten MASTER_ROADMAP)

**Phase 2 recommendation:** parallel 3A ∥ 3C, with 3B staged so its first pass starts after 3A's "skeleton commit" (= MASTER_ROADMAP + GLOBAL_MAP first-draft committed). This is the fastest safe path. Requires strategic-chat coordination between 3A and 3B hand-off.

---

## §5 Open Decisions Still Needed from Daniel

Blockers only. Each has an ID (D1–D6), the question, the options, the recommendation, and the reason it blocks.

### D1 — Phase 3 structure & A3 naming

**Question:** Run Phase 3 as a single secondary chat (sequential 3A → 3B → 3C → 3D) or multiple parallel chats (3A ∥ 3C, 3B staged)? And: is A3's canonical filename `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` (ROADMAP §4 name) or `SECONDARY_CHAT_PROMPT.md` (1A R11 name)?

**Options:**
- **(a)** Sequential single secondary chat
- **(b)** Parallel — 3A ∥ 3C, 3B staged
- **(c)** Hybrid — 3A alone, then 3B ∥ 3C

**Recommendation:** (b) — matches the Phase 1 success pattern (3 parallel chats, minimal merge conflict thanks to explicit scope boundaries per chat). For A3 name: `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` (matches ROADMAP §4 nomenclature; file goes into `opticup/docs/Templates/`).

**Why it blocks:** Phase 3 SPEC writing cannot start without knowing the structure. Second-order: affects how Phase 3 secondary chats access DB (one shared query file vs three independent ones).

---

### D2 — Module 1 `SPEC.md` + `OPTIC_UP_PROJECT_GUIDE_v1.1.md` promotion

**Question:** Do we promote these two Miro board extractions to project-level `opticup/docs/PROJECT_VISION.md` (merging — they share source), or delete them as historical artifacts that Modules 4+ don't need?

**Options:**
- **(a)** MERGE to `opticup/docs/PROJECT_VISION.md` (1B + Phase 2 recommendation)
- **(b)** Keep where they are inside Module 1 with a "HISTORIC — see PROJECT_VISION.md" header
- **(c)** DELETE both (lose historical product ambition context)

**Recommendation:** (a) — MERGE to project-level. This is the only record of the full 28-module ambition and will be needed for Modules 4+. Also resolves 1A's dangling `PROJECT_GUIDE.md` reference (1A #11) in the same move.

**Why it blocks:** Phase 3C includes or excludes this file move based on this decision. Also affects artifact candidate A7.

---

### D3 — Live-DB inspection protocol for `GLOBAL_SCHEMA.sql` rewrite

**Question:** How does Phase 3A get read-only DB access to reconcile `opticup/docs/GLOBAL_SCHEMA.sql` with live-DB drift (confirmed by 1B Module 1.5 SESSION_CONTEXT L94 on roles/permissions RLS + 1A finding #2 on missing views)?

**Options:**
- **(a)** Reuse A0 pattern (Phase A Phase 0 item): Phase 3A writes `tier_foundation_queries.sql`, Daniel runs in Supabase Dashboard, commits output JSON, Phase 3A reads and rewrites file.
- **(b)** Service-role credentials path via Edge Function or MCP
- **(c)** Defer the GLOBAL_SCHEMA drift fix to a standalone mini-SPEC post-Phase-3, with Phase 3A only adding view declarations for Module 3 (the doc-rot portion) and leaving the live-DB-drift portion as a TIER-C-PENDING marker for the standalone fix.

**Recommendation:** (a) — reuse A0 pattern. Proven safe, Daniel-controlled, matches existing Main-approved workflow. Phase 3A writes a minimal query file (column lists for `roles`, `permissions`, `role_permissions` + views for `v_storefront_*` series + any missing storefront tables), Daniel runs once, Phase 3A reads output once and commits the rewritten GLOBAL_SCHEMA.sql.

**Why it blocks:** Phase 3A's GLOBAL_SCHEMA.sql rewrite (F6) cannot start without this decision. Note: if (c), Phase 3A can start the non-DB portion (views additions are derivable from Side B VIEW_CONTRACTS.md without live DB).

---

### D4 — `DEPLOYED_EDGE_FUNCTIONS.md` artifact inclusion

**Question:** Is a new `DEPLOYED_EDGE_FUNCTIONS.md` artifact in Module 3.1's scope (becomes A6), or is Edge Function ownership + versioning Module 3 Phase B's FU1 responsibility?

**Options:**
- **(a)** Module 3.1 scope — Phase 3B produces A6 as a 6th mandatory artifact, with data-gathering from `opticup/supabase/functions/` + Supabase Dashboard enumeration.
- **(b)** Module 3 Phase B scope — Phase 3 only documents the gap in MODULE_DOCUMENTATION_SCHEMA.md (A4); Phase B produces the actual registry.
- **(c)** Separate mini-SPEC after Module 3.1 closes but before Module 3 Phase B starts — standalone 2-hour piece of work.

**Recommendation:** (a) — Module 3.1 scope. Reason: it's a single-file deliverable, takes <2 hours, and unblocks Module 3 Phase B's ability to audit Edge Functions as their source code is a prerequisite for anything Phase B touches in the content pipeline. Doing it in Phase B is circular.

**Why it blocks:** Phase 3B SPEC scope depends on this.

---

### D5 — Module 1 stale templates disposition

**Question:** Module 1's `STRATEGIC_CHAT_OPENING_PROMPT.md` (says "Phase 3.75 is next") and `MY_CHEATSHEET.md` (references renamed file + stale line counts) — DELETE, or FREEZE with "DO NOT USE — module complete" banner?

**Options:**
- **(a)** DELETE both (Phase 2 + 1B recommendation)
- **(b)** FREEZE with banner (historical preservation)
- **(c)** Keep as-is (no action)

**Recommendation:** (a) — DELETE. Module 1 is complete; no new strategic chat will be opened for it. Every current reader would be misled. Historical context lives in CHANGELOG + SESSION_CONTEXT.

**Why it blocks:** Phase 3C H2/H3 execution depends on this.

---

### D6 — `C:prizma.claudelaunch.json` cleanup

**Question:** Read-once-then-delete, or keep as-is?

**Options:**
- **(a)** Inspect contents (1 `cat`), then DELETE in a targeted commit
- **(b)** Keep as-is

**Recommendation:** (a). 146 bytes, not referenced anywhere, filename is a Windows drive-prefix leak. Zero risk.

**Why it blocks:** Not a hard blocker — can be done in Phase 3C or as a standalone cleanup any time. Included here for tracking.

---

**Phase 2 Go/No-Go gate:** **D1, D2, D3 are hard blockers. D4 can be a Phase 3 day-1 question. D5 and D6 can be Phase 3 mid-run questions.**

---

## §6 Open Risks and Watch Items (non-blocking)

Items that are not Phase-3-blockers but should be tracked so they don't become silent failures.

### R1 — The 7 orphaned Edge Functions (already D4, but the underlying risk)

Critical infrastructure with no documented source. If Supabase Dashboard drops them, they're gone. If a security scan flags them, nobody knows who to wake up. If Phase B needs to version them, the delta is invisible.

**Mitigation:** D4 resolution. Until then, treat Side B `docs/DISCOVERY-5-existing-infrastructure.md` as the single source of truth (it at least names them).

### R2 — The 6 brand content rules live in one place

`opticup-storefront/strategic chat/STRATEGIC_CHAT_CONTINUATION_v9.md:119-168`. If that file is moved or deleted, Daniel's content IP is gone. The mirror copy in `opticup/modules/Module 3 - Storefront/docs/old prompts/UPDATE-session-docs-merge.md` is **not guaranteed byte-identical** (not verified in Phase 1C, not verified in Phase 2).

**Mitigation:** Phase 3B artifact A4 (MODULE_DOCUMENTATION_SCHEMA.md) should flag this as an example of "single-point-of-failure doc" that requires Rule 21 consolidation. The actual fix (MERGE into `BRAND_CONTENT_GUIDE.md`) is 1C R19 and belongs to Phase 3 or early Module 3 Phase B. Phase 2 recommends doing it in Phase 3B (same chat that writes A4 can execute the merge as a side effect), but flagging here as a risk until it's done.

### R3 — Cross-Module Safety Protocol §14 is buried

The single most important learning from Module 3's remediation (forbidden cross-module file list, pre-flight greps, post-phase verification, B6-style high-risk-item isolation sub-SPECs) currently lives in `modules/Module 3 - Storefront/discovery/MODULE_3_RECOMMENDATIONS_2026-04-10_from_discovery_v3.md` §14. It should flow into `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` or `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` for project-wide reuse.

**Mitigation:** Phase 3B, when refining A2 + drafting A3, should merge §14 in as a project-wide rule.

### R4 — Schema-in-pieces pattern is undocumented

Module 1 creates `tenants` + `employees`; Module 1.5 ALTERs them; Module 2 ALTERs them again. No single source of truth for the final state. This is per 1B finding #3. Main-decided that `GLOBAL_SCHEMA.sql` is the merged canonical.

**Mitigation:** Artifact A4 (MODULE_DOCUMENTATION_SCHEMA.md) should document this as a rule: "Shared tables across modules: defined in GLOBAL_SCHEMA + extension docs in each module that ALTERs them."

### R5 — `Module 1.5/SESSION_CONTEXT.md` line 94 is a LIVE-DB DRIFT flag

Direct evidence that `GLOBAL_SCHEMA.sql` documents `USING(true)` on roles/permissions/role_permissions but live DB has tenant-isolation RLS. Live DB is correct. This is **not** a Module 3.1 concern (it's F6 in Phase 3A), but it is a reminder that the foundation docs can have silent drift beyond what Phase 0 schema-diff catches.

**Mitigation:** Phase 3A F6 executes the fix via D3 workflow. Phase 0 schema-diff should be re-run post-fix.

### R6 — Phase A did not close R17 (Iron Rule 24 view list)

A5 was "CLAUDE.md accuracy fixes" but left Rule 24's text-portion view list at 9 views. Phase 1C documented this. Main-approved the work being deferred to Phase B preamble.

**Mitigation:** B3 in §3.5. Module 3 Phase B's preamble absorbs it.

### R7 — Cross-repo drift discovery is reactive

Phase 1 discovered all this drift by reading docs. If future phases don't run an audit, drift will accumulate again. The audit pattern is effective but labor-intensive.

**Mitigation:** MODULE_DOCUMENTATION_SCHEMA (A4) should codify which docs need re-audit cadence. Phase 0's `schema-diff.mjs` could be extended with a `doc-drift.mjs` sibling — flagged as tech debt for future, not Phase 3.

### R8 — Phase 2 Strategic Chat-level assumption drift

**New risk discovered during Phase 2:** Phase 1C explicitly noted Module 3 Strategic Chat was running a parallel effort (discovery → HF → Phase A) that Module 3.1's Strategic Chat was unaware of until 1C surfaced it. Main resolved the specific case (R15). But the underlying risk — two strategic chats working on overlapping concerns without awareness of each other — is the same thing that can happen again between Module 3.1 and any other module running strategic chat work on the same deadline.

**Mitigation:** Artifact A4 should include a "strategic-chat coordination protocol" section. Artifact A2 (UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md) should codify the "stop-and-ask before assuming on parallel work" lesson banked during Phase 1C closure (master SESSION_CONTEXT "Lessons banked 4").

### R9 — Phase 2 file-count drift vs Phase 1 claims

**New observation during Phase 2 verification:**
- Phase 1C reports `opticup-storefront/` has "173 old prompts" in `Module 3 - Storefront/docs/old prompts/` (Phase 1C §1.1E). Phase 2 `ls -la | wc -l` reports **176 entries** (which is 173 files + 3 metadata lines for `total`, `.`, `..`) — matches, no drift.
- Phase 1C reports `FILE_STRUCTURE.md A2` enumerates 788 files (Apr 11). Not re-verified in Phase 2.
- Phase 1C's top-level Side B reference file count (15 files) matches Phase 2 `ls`: CLAUDE, README, QUALITY_GATES, SECURITY_RULES, ARCHITECTURE, VIEW_CONTRACTS, COMPONENT_CHECKLIST, CMS_REFERENCE, SCHEMAS, FROZEN_FILES, BRAND_CONTENT_GUIDE, FILE_STRUCTURE, TROUBLESHOOTING, TECH_DEBT, SESSION_CONTEXT = 15. Match.

**No drift detected.** Phase 1 report counts are stable as of Phase 2.

### R10 — The `ROADMAP.md` vs `MODULE_3.1_ROADMAP.md` naming issue

Phase 2 SPEC §3 asks to read `opticup/modules/Module 3.1 - Project Reconstruction/MODULE_3.1_ROADMAP.md`, but the actual file is `opticup/modules/Module 3.1 - Project Reconstruction/ROADMAP.md` (no `MODULE_3.1_` prefix). Minor spec inaccuracy, not a missing file. This is a pattern echo of the Module 3 Side A issue where `MODULE_3_ROADMAP.md` documents itself as `ROADMAP.md` (1C §3.1 #1). Both modules have the "what do we call the roadmap file?" inconsistency.

**Mitigation:** Artifact A4 should codify a single naming convention. Proposed: `ROADMAP.md` at module root (no `MODULE_X_` prefix — the folder name is the qualifier). Fold into A4 as a project-wide rule.

---

## §7 Recommendation: Go / No-Go for Phase 3

**Verdict: GO.**

**Reasoning:** Phase 2 verified all 8 Phase A files as PASS with no contradictions between them; all 88 cross-references from the 3 Phase 1 reports are accounted for (either resolved by prior audit/Phase A/Main decision, or filed as an explicit Phase 3 / Phase B work item); the pending gap inventory maps cleanly to 4 proposed Phase 3 sub-phases (3A foundation + 3B mandatory artifacts + 3C housekeeping + 3D closure); and the open decisions are bounded and tractable (D1–D3 are hard blockers, D4–D6 are mid-phase questions).

Phase 3 is ready to launch once **D1 (structure), D2 (PROJECT_VISION promotion), and D3 (live-DB inspection protocol)** are resolved. The other three decisions (D4, D5, D6) can ride along without blocking Phase 3A kickoff.

Module 3.1's **5 mandatory artifacts** are in reach:
- **A1** (MASTER_ROADMAP rewrite) = Phase 3A deliverable
- **A2** (UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT refined) = Phase 3A deliverable
- **A3** (UNIVERSAL_SECONDARY_CHAT_PROMPT new) = Phase 3B deliverable
- **A4** (MODULE_DOCUMENTATION_SCHEMA new) = Phase 3B deliverable
- **A5** (DANIEL_QUICK_REFERENCE new) = Phase 3B deliverable

Plus 2 candidates requiring Daniel decisions: **A6** (DEPLOYED_EDGE_FUNCTIONS — D4) and **A7** (PROJECT_VISION from Miro extractions — D2).

**No escalation triggers fired during Phase 2.** Phase 2 did not discover any architectural decision crossing the Module 3 ↔ Module 3.1 boundary that wasn't already anticipated by Main (R13, R15, "supplements never replaces"). No Phase A file is missing or contradicted. No Phase 1 audit claim was materially wrong when re-verified (stability check R9).

**Phase B unblocking path:** Phase 3D closure commits the Module 3.1 ROADMAP §10 steps (backup, tag, MASTER_ROADMAP decisions entry, message to Module 3 Strategic Chat). Module 3 Phase B's dual-gate requirements (per 1C §Phase B dual-gate) remain: (1) Module 3.1 closure **(this path resolves)**, (2) TIER-C-PENDING cleanup round in Phase B's own preamble **(not Module 3.1's job)**.

**One paragraph, plain-language:** Phase 2 found no contradictions in the sealed Phase A files, cleared every cross-reference from the three Phase 1 audits, and produced a Phase 3 work breakdown with 3 hard decision blockers, 4 proposed sub-phases, and 5+2 mandatory artifacts. Phase 3 can start once Daniel decides D1–D3. This is a GO.

---

**Document size:** (computed on write)
**Total files read:** 25 (8 Phase A files in full + 3 Phase 1 audit reports in full + 4 Module 3.1 session-context files in full + 5 Module 3 discovery files head-sampled + 1 Module 3 current-prompt head-sampled + 4 inventory passes)
**Total files inventoried (no read):** ~176 (Module 3 `old prompts/` via `ls -lt | head`) + ~30 Module 3 `discovery/` content (the 10 files + the subfolder structure) + ~180 (opticup-storefront untracked scratch)
**Total time (estimated):** ~75 minutes
**Generated by:** Claude Code under Phase 2 of Module 3.1 (secondary chat)
