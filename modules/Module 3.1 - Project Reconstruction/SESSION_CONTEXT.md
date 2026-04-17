# Module 3.1 — SESSION_CONTEXT (Master)

> **Owner:** Strategic Chat of Module 3.1
> **Status of this file:** This is the **master** session context for Module 3.1. The 3 parallel audit phases each maintain their own `SESSION_CONTEXT_PHASE_1[A/B/C].md` file. This master file is updated by the strategic chat when each parallel phase completes.
> **Created:** 2026-04-11
> **Last updated:** 2026-04-11 (Phase 2 complete; Phase 3 BLOCKED on 3 decisions D1/D2/D3)

---

## Module 3.1 — Project Reconstruction & Documentation Audit

**Purpose:** Restore documentation accuracy, define a working standard for the new 4-layer hierarchy, and unblock Module 3 Phase B.

**Roadmap reference:** `MODULE_3.1_ROADMAP.md` in this folder.

**5 mandatory final artifacts** (per ROADMAP §4):
1. ⬜ Updated `MASTER_ROADMAP.md` reflecting April 2026 reality
2. ⬜ `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` (verified version exists, may need updates)
3. ⬜ `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` (does not yet exist; Module 3.1 produces it)
4. ⬜ `MODULE_DOCUMENTATION_SCHEMA.md` (does not yet exist)
5. ⬜ `DANIEL_QUICK_REFERENCE.md` (does not yet exist)

**Additional artifacts the strategic chat may add** (per ROADMAP §4, with Daniel's approval):
- TBD after Phase 1 audit reports come in

---

## Phase Tracking

| Phase | Name | Status | Owner | Started | Completed | Artifact |
|---|---|---|---|---|---|---|
| **1A** | Foundation Audit | ✅ Complete | Secondary Chat A | 2026-04-11 | 2026-04-11 | `audit-reports/PHASE_1A_FOUNDATION_AUDIT_REPORT.md` |
| **1B** | Modules 1, 1.5, 2 Audit | ✅ Complete (YELLOW) | Secondary Chat B | 2026-04-11 | 2026-04-11 | `audit-reports/PHASE_1B_MODULES_1_2_AUDIT_REPORT.md` |
| **1C** | Module 3 Dual-Repo Audit | ✅ Complete (5 CRITICALs) | Secondary Chat C | 2026-04-11 | 2026-04-11 | `audit-reports/PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md` |
| **2** | Verification & Synthesis | ✅ Complete (GO) | Secondary Chat | 2026-04-11 | 2026-04-11 | `audit-reports/PHASE_2_VERIFICATION_AND_PLAN.md` (569 lines) |
| **3+** | Artifact Production | 🔴 Blocked on D1 + D2 + D3 (Daniel decisions) | TBD | — | — | The 5 mandatory artifacts (+ possibly 1-2 more) |
| **QA** | Final Verification | 🔴 Blocked | Strategic Chat | — | — | Module closure |

Status legend: ⬜ Not started · 🟡 In progress · ✅ Complete · 🔴 Blocked · ⏸️ Paused

---

## Parallel Execution Status — Phase 1

Phase 1 runs as **3 parallel audit chats**. Each chat is independent and writes only to its own files:

| Chat | SPEC file | Output report | SESSION_CONTEXT file | Current status |
|---|---|---|---|---|
| **A** | `docs/PHASE_1A_FOUNDATION_AUDIT_SPEC.md` | `docs/audit-reports/PHASE_1A_FOUNDATION_AUDIT_REPORT.md` | `docs/SESSION_CONTEXT_PHASE_1A.md` | ✅ Complete (15 files audited, 11 recommendations, ~40 min) |
| **B** | `docs/PHASE_1B_MODULES_1_2_AUDIT_SPEC.md` | `docs/audit-reports/PHASE_1B_MODULES_1_2_AUDIT_REPORT.md` | `docs/SESSION_CONTEXT_PHASE_1B.md` | ✅ Complete (YELLOW verdict, 69/70 files, 14 discrepancies, 7 recommendations) |
| **C** | `docs/PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_SPEC.md` | `docs/audit-reports/PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_REPORT.md` | `docs/SESSION_CONTEXT_PHASE_1C.md` | ✅ Complete (~40 files in full + ~6 sampled + ~220 inventoried, 32 discrepancies, 21 recommendations, 5 CRITICALs, 7 FLAG-FOR-DECISION) |

**Synthesis trigger:** All 3 phases complete, but synthesis is **BLOCKED on two strategic decisions from Daniel**: R13 (relocation principle) and R15 (Module 3.1 vs Module 3 Phase A scope relationship). Phase 1C explicitly warned: "do not synthesize until R13 and R15 are decided." Strategic chat is honoring that warning.

---

## Phase 1A Summary (Foundation Audit — complete)

**Files audited:** 15 in full + 1 stat-only
**Time:** ~40 minutes
**Verdict:** Foundation layer has significant doc rot but no critical structural problems. UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md validated as ALIVE — first of the 5 mandatory artifacts confirmed ready.

### Top findings (priority for Phase 2)

1. **`MASTER_ROADMAP.md` — severely stale.** 14+ specific line ranges identified for rewrite. Still describes Module 1 in Phase 5.75/5.9, Module 2 as "future חלק 8", Module 3 as "not started", "next step = Phase 5.9 shipments". Decisions table has zero April 2026 entries. This file primes every new strategic chat with a wrong mental model.

2. **`docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` are blind to Module 3 / Storefront / dual-repo.** Zero mentions of opticup-storefront, zero `CREATE VIEW` statements, only one `storefront_config` stub table. **This may be more than a doc problem** — Iron Rule 13 ("views-only for external reads") is unenforceable from foundation docs as they stand. Phase 2 needs to determine if this is doc rot or a real DB-level gap. Cross-check with Phase 1C report when it lands.

3. **`README.md` still describes the project as a single-tenant Prizma inventory system.** Pre-rebrand framing. Quick-win rewrite candidate for early Phase 2.

4. **3 conflicting chat-hierarchy naming systems coexist** across `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` (canonical 4-layer), `STRATEGIC_CHAT_ONBOARDING.md` + `MASTER_ROADMAP.md` ("צ'אט מפקח"/Supervisor), and `CLAUDE.md` (no documentation of hierarchy). Iron Rules numbering also splits: CLAUDE.md = 1–23, UNIVERSAL_PROMPT = 1–30. **Strategic decision needed in Phase 2:** pick canonical naming, harmonize all 3 docs.

### 11 recommendations (full list in audit report §7)

REWRITE: MASTER_ROADMAP, README, STRATEGIC_CHAT_ONBOARDING, CLAUDE.md §4-§6, GLOBAL_MAP, GLOBAL_SCHEMA, TROUBLESHOOTING.md
DELETE: FILE_STRUCTURE.md:96 (stale TBD annotation)
FLAG-FOR-DECISION: `C:prizma.claudelaunch.json` malformed file, TECH_DEBT.md #7 status
SPLIT: docs/Templates/ — create Main Strategic + Secondary Chat templates as peers

### Notable validation: First Action Protocol caught a real mistake

The Claude Code session that started Phase 1A was initially attached to `opticup-storefront` instead of `opticup`. The First Action Protocol's `git remote -v` check (CLAUDE.md §1) caught the mismatch before any file was touched. **This is the first real-world validation of the protocol.** Worth documenting in the eventual TROUBLESHOOTING.md / CLAUDE.md rewrites as a banked lesson.

### Cross-references waiting on Phases 1B/1C

The Phase 1A report contains 15 explicit cross-reference hooks. The strategic chat will reconcile them against 1B/1C reports during Phase 2 synthesis. Critical items to verify:
- (For 1C) Iron Rules 24-30 actually present in `opticup-storefront/CLAUDE.md`
- (For 1C) Storefront views and tables (`v_storefront_products`, `v_public_tenant`, `cms_leads`, `storefront_pages`) declared somewhere in storefront repo
- (For 1B) Per-module `db-schema.sql` files exist and are merged into `docs/GLOBAL_SCHEMA.sql` ✅ **Resolved by 1B** — see Phase 1B summary below
- (For 1B) Module 1.5 deliverables vs MASTER_ROADMAP §7 reality ✅ **Resolved by 1B**
- (For 1B/1C) Whether `PROJECT_GUIDE.md` exists anywhere or is dead ✅ **Resolved by 1B** — found, misplaced inside Module 1

---

## Phase 1B Summary (Modules 1, 1.5, 2 Audit — complete)

**Files audited:** 69 of 70 (1 .docx skipped as BROKEN)
**Discrepancies:** 14
**Recommendations:** 7
**Verdict:** **YELLOW** — Modules 1.5 and 2 are clean. Module 1 needs targeted housekeeping, not rewrite. **Phase 2 does not need a Modules 1-2 track.**

### Strategic impact: Phase 2 scope just shrank

The YELLOW verdict with the explicit "no Modules 1-2 track needed" message means Phase 2 can focus entirely on (a) Module 3 cleanup based on 1C findings and (b) production of the 5 mandatory artifacts. Module 1 housekeeping is small enough to roll into the QA phase or treat as a side-track in Phase 3.

### Top 3 findings

1. **`SPEC.md` + `OPTIC_UP_PROJECT_GUIDE_v1.1.md` inside Module 1 are NOT module-level docs** — they are the **original 28-module Miro vision** of the entire project (eye exams, CRM, lab, POS, WhatsApp). They are misplaced, not deletable. **Strategic decision needed in Phase 2:** these belong at the project level, not buried inside a module folder. Tentative recommendation: promote to `opticup/docs/PROJECT_VISION.md` and update referrers (this also resolves the orphaned `PROJECT_GUIDE.md` reference flagged in 1A from `STRATEGIC_CHAT_ONBOARDING.md:89`).

2. **Direct evidence that `GLOBAL_SCHEMA.sql` has live-DB drift, not just doc rot.** `Module 1.5/SESSION_CONTEXT.md:94` explicitly states GLOBAL_SCHEMA.sql is stale vs the live DB on roles/permissions RLS. **This confirms Phase 1A's suspected issue #2.** GLOBAL_SCHEMA fix is no longer "rewrite the doc to match reality" — it's "audit the live DB, reconcile with the doc, possibly fix migrations." Promoted from doc-track to potential code/DB-track in Phase 2 planning.

3. **`tenants` and `employees` tables are defined in pieces across 3 module schemas.** Module 1 creates them, Module 1.5 ALTERs them, Module 2 ALTERs them with 10 more columns. Additive (not conflicting), but no single source of truth exists. This pattern reinforces why GLOBAL_SCHEMA must be the authoritative source — and **becomes a project-wide rule for `MODULE_DOCUMENTATION_SCHEMA.md`** (one of the 5 mandatory artifacts): "shared tables across modules → defined in GLOBAL_SCHEMA + extension docs in each module that ALTERs them."

### What this means for Phase 2 planning

- **Module 1 housekeeping** (small): the 7 recommendations from 1B are bounded fixes — not a rewrite track. Probably handled by a single secondary chat with a focused SPEC, possibly in Phase 3 alongside artifact production.
- **GLOBAL_SCHEMA reconciliation** (medium): now confirmed to require live-DB inspection, not just doc rewriting. Needs its own SPEC in Phase 2 with read-only DB queries first to determine the actual gap.
- **PROJECT_VISION promotion** (small but strategic): one rename + reference updates. Becomes a deliverable of Phase 3 most likely.
- **Schema-in-pieces convention** (rule, not work): goes into MODULE_DOCUMENTATION_SCHEMA.md as a project rule.

---

## Phase 1C Summary (Module 3 Dual-Repo Audit — complete, with strategic blocker discovered)

**Files:** ~40 read in full + ~6 sampled + ~220 inventoried-only
**Discrepancies:** 32 (16 cross-repo + 9 Side-B-internal + 7 Side-A-internal)
**Recommendations:** 21 (8 H-priority, 7 FLAG-FOR-DECISION)
**Report length:** 797 lines, 86 KB
**Verdict:** No simple verdict — Module 3 documentation lives in two parallel universes that don't see each other. The bigger issue is what 1C uncovered about Module 3 Phase A.

### ⚠️ THE BIG DISCOVERY — synthesis is blocked

Module 3 Strategic Chat has been running its **own remediation effort in parallel with Module 3.1**, possibly without coordination:

- A `discovery/` folder in `Module 3 - Storefront/` contains 10 files (~440 KB) of investigation work from April 10-11, **two days before Module 3.1 started**, including a discovery report with 159 code/DB-level findings
- A SPEC file `MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` already executed as Module 3 "Phase A" (commits 50523b3 → 97846e8) and **rewrote 8 critical doc files in Side B**: VIEW_CONTRACTS, ARCHITECTURE, SCHEMAS, FILE_STRUCTURE, CLAUDE.md, TROUBLESHOOTING, FROZEN_FILES, COMPONENT_CHECKLIST
- These are exactly the files Module 3.1 was supposed to verify and potentially rewrite
- **Strategic question for Daniel (R15):** is Module 3.1 supplementing, replacing, or running parallel to this Phase A work? The answer determines 70% of Phase 2 scope.

Until Daniel answers R15, Phase 2 synthesis is held.

### 5 CRITICAL findings

1. **Execution model contradiction** (Cross-repo #17): Side A docs prescribe "git add -A && commit && push" autonomous mode; Side B `CLAUDE.md §8` Bounded Autonomy prescribes "stop on deviation, never wildcard git, never push to main". Hotfix and Phase A actually used Bounded Autonomy. Side A docs are not marked as superseded — every new reader gets the wrong model.

2. **Both `SESSION_CONTEXT.md` files are stale** (Cross-repo #21): Side A stuck at "CMS-10 ✅ COMPLETE" from April 1; Side B from April 10 still lists `translate-content` wrapper bug as a CRITICAL blocker. Neither knows about HF1 (which deleted the Edge Function), HF4, HF10, or A0-A8. CLAUDE.md §1 of both sides instructs "read this first" → every new session gets the wrong picture.

3. **`MODULE_MAP.md` files don't see cross-repo reality** (Cross-repo #19): Side A describes ~4 Studio files; Side B describes ~7 components from Phase 1. **Reality**: 32 JS files in `opticup/modules/storefront/` (14,084 lines) + 125 src/ files in storefront repo (~15,550 lines). No MODULE_MAP acknowledges that Module 3 has code on both sides.

4. **7 of 8 Edge Functions have no documented source location** (Cross-repo #24, R20): Only `translate-content` was in `opticup-storefront/supabase/functions/` (and was deleted by HF1). The other 7 (`generate-ai-content`, `generate-blog-post`, `generate-brand-content`, `generate-landing-content`, `generate-campaign-page`, `cms-ai-edit`, `fetch-google-reviews`) have no documented source. **Critical infrastructure with zero ownership and zero versioning.** Phase 1A may find them under `opticup/supabase/functions/` — open question for synthesis.

5. **Scope overlap with Module 3 discovery + Phase A** (Cross-repo #27, #28, R15): Already explained in the BIG DISCOVERY section above. This is the #1 blocker.

### Decisions waiting on Daniel (per 1C's explicit warning)

**R13 (HIGH) — Relocation principle for dual-repo docs** (becomes mandatory artifact #4 `MODULE_DOCUMENTATION_SCHEMA.md`)
1C wrote a complete 4-rule formulation and recommends adopting it as-is. Strategic chat agrees in principle, wants to add a small 5th rule on pointer-stub format. **Awaiting Daniel approval to adopt as the basis.**

**R15 (HIGH) — Module 3.1 vs Module 3 Phase A scope relationship**
Three options:
- (a) Both authoritative in their domain (1C's recommendation, minimum work)
- (b) Module 3.1 replaces Module 3 Phase A doc work (treats Phase A as throwaway)
- (c) Module 3.1 redoes everything (most wasteful)

**Strategic chat cannot make this decision alone — it depends on history Daniel owns.** Specifically: did Daniel know about Phase A when Module 3.1 was opened? Was Module 3.1 meant to validate Phase A or did it open without that knowledge?

### Other items in 1C report (handled in Phase 2 once R13/R15 decided)

- **R14:** Side B layout — keep root vs move to `docs/`. 1C recommends keeping current layout (no churn). Strategic chat agrees.
- **R16:** Move executed Phase A SPEC from `current prompt/` to `old prompts/`. Bundled with R15 decision.
- **R20:** Edge Function ownership — depends on what Phase 1A finds for `opticup/supabase/functions/` AND on R15.
- **R21:** DNS switch checklist consolidation — defer to Phase 2 once R13 sets the relocation rules.
- **R8:** What to do with 12 stale PHASE_*_SPEC.md from March 30 — 1C recommends archiving with marker. Strategic chat agrees.

### Items that need attention beyond R13/R15

- **§3.2 #8:** Iron Rule 24 in `opticup-storefront/CLAUDE.md` lists only 9 allowed views, but reality (per VIEW_CONTRACTS.md) is 22. Phase A A5 was supposed to fix this and missed. R17 (MEDIUM rewrite).
- **§5 C:** Daniel's 6 brand content rules live ONLY in `opticup-storefront/strategic chat/STRATEGIC_CHAT_CONTINUATION_v9.md` lines 119-168 (single point of failure for content IP). R19 recommends MERGE to `BRAND_CONTENT_GUIDE.md` and to `generate-brand-content` Edge Function styleGuide.
- **§5 C:** The `Cross-Module Safety Protocol §14` from `MODULE_3_RECOMMENDATIONS_2026-04-10_from_discovery_v3.md` is the single most important learning from all of Module 3. It should flow into `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` or `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` rather than stay buried.
- **§5 D:** TIER-C-PENDING markers in VIEW_CONTRACTS, ARCHITECTURE, SCHEMAS, TROUBLESHOOTING are NOT problems — they're scheduled work for Module 3 Phase B "preamble cleanup round". Module 3.1 should NOT touch them. But MODULE_DOCUMENTATION_SCHEMA.md should mention the convention.

### Phase B dual-gate

Module 3 Phase B is blocked on TWO independent gates:
1. Module 3.1 closure (Module 3.1 ROADMAP §1)
2. TIER-C-PENDING cleanup round in Phase B's own preamble

The MODULE_3_ROADMAP rewrite in Phase 2 must acknowledge this dual-gate.

---

## Decision Log

| Date | Decision | Made by | Rationale |
|---|---|---|---|
| 2026-04-11 | Module 3.1 opens with 3 parallel Phase 1 audit chats instead of sequential | Strategic Chat (with Daniel + Main approval) | Daniel has limited time, parallel execution gives full picture faster, audits are read-only so no merge conflicts on production code |
| 2026-04-11 | Each parallel phase writes its own SESSION_CONTEXT file (option 2 from strategic discussion) | Strategic Chat | Avoids git merge conflicts on a shared file. Master SESSION_CONTEXT (this file) is updated by strategic chat after parallel phases complete. |
| 2026-04-11 | Module 3.1 does not get its own CLAUDE.md | Strategic Chat | Secondary chats inherit `opticup/CLAUDE.md` (and `opticup-storefront/CLAUDE.md` for Phase 1C). No need to duplicate. |
| 2026-04-11 | Folder structure: `Module 3.1 - Project Reconstruction\docs\` for SPECs, `\docs\current prompt\` for active prompts, `\docs\old prompt\` for archived prompts, `\backups\` for phase backups | Daniel | Standardizes the structure for all future modules. |
| 2026-04-11 | Phase 1A complete. Verdict: foundation has significant doc rot, no critical structural issues. UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md validated as ALIVE (1 of 5 mandatory artifacts confirmed). Cross-references parked for Phase 2 synthesis. | Strategic Chat | Phase 1A handback verified, findings high-quality, no need to re-audit. |
| 2026-04-11 | Cross-references from Phase 1A NOT forwarded to running 1B/1C chats mid-execution | Strategic Chat | Preserves audit autonomy, prevents context contamination of parallel chats, synthesis at Phase 2 will reconcile naturally. If 1B/1C miss something critical, Phase 2 catches it. |
| 2026-04-11 | Phase 1B complete. Verdict: YELLOW. Modules 1.5 and 2 clean, Module 1 needs targeted housekeeping only. Phase 2 will NOT include a Modules 1-2 track. | Strategic Chat | YELLOW + explicit "no track needed" message from 1B handback. 7 bounded recommendations rollable into Phase 3 alongside artifact production. |
| 2026-04-11 | GLOBAL_SCHEMA.sql gap promoted from "doc rot suspected" to "live-DB drift CONFIRMED" | Strategic Chat | Direct evidence from 1B (Module 1.5 SESSION_CONTEXT line 94 explicitly states drift on roles/permissions RLS). Phase 2 SPEC for this fix must include read-only live-DB inspection, not just doc rewrites. |
| 2026-04-11 | Phase 1C complete. **Major discovery: Module 3 has been running its own remediation in parallel (Phase A) without Module 3.1 knowing.** Phase 2 synthesis BLOCKED on R13 + R15 decisions from Daniel. | Strategic Chat | Honoring 1C's explicit "do not synthesize until R13/R15 decided" warning. R15 is a history question only Daniel can answer; R13 is an architectural question with a solid recommendation from 1C. |
| 2026-04-11 | **R15 RESOLVED by Main Strategic Chat:** Module 3 Phase A was started under Daniel's direction and intentionally PAUSED to wait for Module 3.1's mapping. Phase A's 10 commits (50523b3 → 97846e8) and the 8 output files in `opticup-storefront` are GROUND TRUTH. They passed an 18/18 sanity check and Main tagged them PASS. Module 3.1 supplements; it does not replace. | Main Strategic (via Daniel) | Removes the parallel-execution conflict. Module 3.1 verifies Phase A's outputs once, does not rewrite them. Phase 2 SPEC must include explicit "do not rewrite" boundaries. |
| 2026-04-11 | **R13 RESOLVED by Main Strategic Chat:** Phase 1C's 4-rule formulation for dual-repo doc relocation is approved as the basis for `MODULE_DOCUMENTATION_SCHEMA.md`. Strategic chat will add a 5th rule on pointer-stub format in Phase 3. Final wording happens during artifact production, not now. | Main Strategic (via Daniel) | Unblocks artifact #4. |
| 2026-04-11 | **Broader principle locked by Main:** "Module 3.1 does not duplicate work that has already been done in Module 3." Applies to all of Module 3's sealed work products: Hotfix execution log, Phase A execution log, deviation reports, the discovery folder, and any future Module 3 SPECs that are tagged closed. Module 3.1's job is verification + mapping + identifying gaps + creating the 5 new artifacts + updating MASTER_ROADMAP. Not rewriting sealed work. | Main Strategic (via Daniel) | This is the project-wide rule going forward, not just for this module. Goes into `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` rewrite as a permanent constraint. |
| 2026-04-11 | Phase 2 SPEC drafted by Strategic Chat. ONE secondary chat, ONE long Claude Code run, produces ONE planning document. Explicit "do not rewrite" boundaries locked into §2 of the SPEC per Main's instructions. Awaiting Daniel review before launching the secondary chat. | Strategic Chat | Per Main's two review criteria: (1) boundaries explicit, (2) concrete enough to execute without open questions. |
| 2026-04-11 | Secondary chat template fully rewritten (310 → 171 lines). New design: activation-first, sequential file loading, exact-format first response, explicit forbidden behaviors list. | Strategic Chat | Three previous chats (1A, 1B, 2) all triggered the "what role am I playing" antipattern with the old template. Three failures in a row = template defect, not chat caution. New version tested on Phase 2 retry — succeeded. |
| 2026-04-11 | **Phase 2 complete. Verdict: GO for Phase 3.** All 8 Phase A files PASS integrity verification. 88 cross-references reconciled (zero skipped). Zero escalations. 27 work items distributed across 4 proposed Phase 3 sub-phases. 6 decisions surfaced (D1-D6); 3 are hard blockers (D1, D2, D3) and 3 can ride along mid-phase (D4, D5, D6). | Strategic Chat | Phase 2 secondary chat handback verified. Strategic chat trusts the synthesis and is moving directly to Daniel decisions on D1/D2/D3. |

---

## Issues & Open Questions

| # | Issue | Status | Notes |
|---|---|---|---|
| 1 | Should canonical chat-hierarchy naming be "Secondary Chat" or "צ'אט מפקח"? | OPEN — for Phase 2 | Strategic chat's tentative recommendation: **Secondary Chat** (matches UNIVERSAL_PROMPT, has EN/HE consistency). To be confirmed with Daniel before Phase 3. |
| 2 | Is `docs/GLOBAL_SCHEMA.sql` missing view declarations a doc-rot issue or a real DB-level gap? | ✅ **CONFIRMED — real drift, not just doc rot** | 1B confirmed via Module 1.5 SESSION_CONTEXT line 94. 1C confirmed Side B has 22 views per VIEW_CONTRACTS but `opticup-storefront/CLAUDE.md` Iron Rule 24 only lists 9. Phase 2 SPEC must include live-DB inspection. |
| 3 | Iron Rules 24-30 actually present in `opticup-storefront/CLAUDE.md`? | ✅ **Resolved by 1C — present, but Iron Rule 24 (allowed views list) is internally inconsistent** | Phase A A5 was meant to fix the views list and missed. R17 (MEDIUM rewrite) handles in Phase 2. |
| 4 | `C:prizma.claudelaunch.json` malformed file at repo root | OPEN — FLAG-FOR-DECISION | Daniel needs to inspect-then-delete. Likely Windows path leak from a previous tool. |
| 5 | TECH_DEBT.md #7 status — is it resolved or active? | OPEN — FLAG-FOR-DECISION | Daniel to confirm; PHASE_0_PROGRESS.md says commit 305b22e harmonized it but TECH_DEBT.md still lists it as Active. |
| 6 | Where should `OPTIC_UP_PROJECT_GUIDE_v1.1.md` + `SPEC.md` (currently in Module 1 folder) live? They are the original 28-module project vision, not Module 1 docs. | OPEN — for Phase 2 | Strategic chat's tentative recommendation: promote to `opticup/docs/PROJECT_VISION.md`. Awaiting Daniel approval. |
| 7 | Schema-in-pieces pattern (`tenants` and `employees` tables defined across 3 module schemas via additive ALTERs) — needs project-wide convention | OPEN — for `MODULE_DOCUMENTATION_SCHEMA.md` artifact | Becomes a documented rule rather than a fix. Goes into the deliverable artifact in Phase 3. |
| **8** | **R13 — Adopt 1C's 4-rule relocation principle for dual-repo doc ownership?** | ✅ **RESOLVED — APPROVED by Main as basis. 5th rule on pointer-stubs added in Phase 3.** | Becomes the basis for `MODULE_DOCUMENTATION_SCHEMA.md` (artifact #4). |
| **9** | **R15 — Module 3.1's relationship to Module 3 Phase A remediation work** | ✅ **RESOLVED — Phase A was paused intentionally to wait for Module 3.1. Phase A's 8 files are GROUND TRUTH, sealed (PASS sanity 18/18). Module 3.1 supplements, never replaces.** | Phase 2 SPEC reflects this as locked boundary. |
| 10 | 7 of 8 Edge Functions have no documented source location | OPEN — needs Phase 1A re-check | Phase 1A's scope didn't drill into `opticup/supabase/functions/`. Need to check if the 7 functions live there or are deployed-only from Supabase Dashboard. If deployed-only: critical risk, may justify a new artifact `DEPLOYED_EDGE_FUNCTIONS.md` (artifact #6 of Module 3.1). |
| 11 | 6 brand content rules live only in one strategic-chat continuation file | OPEN — for Phase 3 | Single point of failure for content IP. R19 recommends MERGE to `BRAND_CONTENT_GUIDE.md` and to `generate-brand-content` Edge Function styleGuide. Strategic chat agrees. |
| 12 | Cross-Module Safety Protocol §14 from a Module 3 recommendations doc — should flow into a universal artifact | OPEN — for Phase 3 | The single most important learning from Module 3, currently buried. Should land in `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` or `UNIVERSAL_SECONDARY_CHAT_PROMPT.md`. |

---

## Lessons banked from Phase 1A

1. **First Action Protocol works as designed** — caught a wrong-repo session attachment before any file was touched. Worth documenting in CLAUDE.md / TROUBLESHOOTING.md rewrites.
2. **Secondary chat activation** — When the template is attached as a file rather than pasted as message text, secondary chats become overly cautious about their role. Template was hardened with a 🚨 opening block on 2026-04-11 between Phase 1A and 1B/1C launches to address this. The pattern (template-as-text, SPEC-as-attachment) should be canonized in `UNIVERSAL_SECONDARY_CHAT_PROMPT.md`.
3. **READ-ONLY audit pattern is viable** — Phase 1A produced ~600+ lines of structured findings in 40 minutes with zero file mutations and zero ambiguous results. The pattern is safe to reuse for any future audit work.

## Lessons banked from Phase 1C closure

4. **Stop-and-ask before assuming on parallel work.** Phase 1C discovered apparent overlap with Module 3 Phase A. Strategic chat stopped, asked Daniel, escalated to Main. Took ~15 minutes total to resolve. The cost of asking was tiny; the cost of assuming would have been a Phase 2 SPEC built on a wrong premise. **Project-wide rule for `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`:** when an audit finds something that contradicts the strategic chat's mental model of the project, escalate before proceeding.
5. **Strategic chat must ask one question at a time.** Daniel noted (correctly, on the third reminder) that batching questions in tables makes responses harder. **Project-wide rule for `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`:** "When the strategic chat needs information from Daniel, it asks ONE question at a time, waits for the answer, then asks the next. No tables of multiple questions. No (1)(2)(3) lists. One question, one response, repeat."
6. **Module 3.1 does not duplicate already-sealed Module 3 work.** Locked principle from Main on 2026-04-11. Applies to Phase A files, the discovery folder, the Hotfix execution log, and any future sealed Module 3 outputs. **Project-wide rule for `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`:** when a meta/audit module operates on a project that has active feature modules, the meta module verifies and supplements but never rewrites sealed work products of the feature modules.

---

## Notes for Next Update

When Phases 1B and 1C reports arrive:
1. Update phase tracking table (mark them ✅)
2. Add summary sections similar to 1A's
3. Reconcile cross-references — match Phase 1A's 15 hooks against findings in 1B/1C
4. Issue #2 (GLOBAL_SCHEMA.sql gap) and issue #3 (Iron Rules 24-30 location) should resolve based on 1C content
5. Begin drafting Phase 2 SPEC: synthesis & cleanup plan
6. Decide whether the 5 mandatory artifacts can be produced in a single Phase 3 or need to be split

---

*This file is the strategic chat's working memory across the lifetime of Module 3.1. Keep it lean — detailed findings live in the audit reports, not here.*
