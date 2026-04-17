# Module 3.1 — Phase 1C Audit Report (Module 3 Dual-Repo)

**Date:** 2026-04-11
**Phase:** 1C — Module 3 Dual-Repo Audit
**Mode:** READ-ONLY
**Branches verified:** `opticup/develop` (clean on tracked files; pre-existing untracked), `opticup-storefront/develop` (clean on tracked files; pre-existing untracked)
**Files read in full:** ~40 (Side A 12, Side B 13, Module 3.1 scaffolding 6, discovery/remediation ~9)
**Files sampled (first 100 + last 50 + grep-scan):** ~6
**Files inventoried only (not read):** ~220 (old prompts 168, Mar-30 Autonomous old 7, scratch `_deep-audit-*` 29, TRANSLATION-REVIEW dumps 2, backups 26 folders, MultiSale 20, SuperSale 18, seo-audit PAGES CSVs, screenshots)
**Repos covered:** `opticup` (Module 3 folder + Module 3.1 scaffolding) + `opticup-storefront` (entire docs surface)

> **One-line framing.** Module 3 has two documentation universes. One (Side A, mostly Mar 30) describes an abandoned "autonomous mode" execution model with 8 phases that never ran in that form. The other (Side B, constantly updated through Apr 11) describes the live storefront and is ~95% healthy post-Phase-A. Neither side tracks the real remediation history (Hotfix + Phase A). The real history only lives in two execution-log files inside `discovery/`. This is the single biggest documentation hazard in the project.

---

## 1. Inventory

### Side A — `opticup/modules/Module 3 - Storefront/`

#### 1.1A Top-level files

| Path | Size | mtime | Type |
|---|---|---|---|
| `AUTONOMOUS_START.md` | 3 699 | Mar 30 09:43 | `.md` prompt |
| `MODULE_3_ROADMAP.md` | 25 547 | Mar 30 09:43 | `.md` roadmap |
| `MODULE_3_STRATEGIC_CHAT_PROMPT.md` | 5 349 | Mar 30 09:43 | `.md` prompt |

#### 1.1B `Autonomous old/` (7 files, all Mar 30 09:43 except one at 12:31)

| Path | Size |
|---|---|
| `AUTONOMOUS_PHASE2B_CLEANUP.md` | 8 680 |
| `AUTONOMOUS_START_M3.md` | 3 149 |
| `AUTONOMOUS_START_M3_PHASE1.md` | 1 905 |
| `AUTONOMOUS_START_M3_PHASE2.md` | 1 700 |
| `AUTONOMOUS_START_M3_PHASE3.md` | 8 380 |
| `AUTONOMOUS_START_M3_PHASE3A.md` | 4 741 |
| `PROMPT_UPDATE_CLAUDE_MD.md` | 3 105 |

#### 1.1C `docs/` top-level files (25 items; 22 `.md` + 3 CSV/TXT)

| Path | Size | mtime |
|---|---|---|
| `CHANGELOG.md` | 1 818 | Mar 30 09:43 |
| `CMS-11-PARITY-REPORT.md` | 6 886 | Apr 1 07:37 |
| `CMS-QA-REPORT.md` | 6 069 | Apr 1 00:25 |
| `MIGRATION_STATUS.md` | 3 287 | Apr 4 12:53 |
| `MODULE_MAP.md` | 9 058 | Mar 31 21:29 |
| `PHASE_0_SPEC.md` | 10 733 | Mar 30 09:43 |
| `PHASE_1_SPEC.md` | 23 592 | Mar 30 09:43 |
| `PHASE_2_SPEC.md` | 22 192 | Mar 30 09:43 |
| `PHASE_3A_SPEC.md` | 10 591 | Mar 30 09:43 |
| `PHASE_3B_SPEC.md` | 13 193 | Mar 30 09:43 |
| `PHASE_3C_SPEC.md` | 15 298 | Mar 30 09:43 |
| `PHASE_4A_SPEC.md` | 16 824 | Mar 30 12:31 |
| `PHASE_4B_SPEC.md` | 6 382 | Mar 30 12:31 |
| `PHASE_5A_SPEC.md` | 17 028 | Mar 30 13:48 |
| `PHASE_5B_SPEC.md` | 12 330 | Mar 30 13:48 |
| `PHASE_5C_SPEC.md` | 5 971 | Mar 30 13:48 |
| `PHASE_6_SPEC.md` | 23 190 | Mar 30 14:49 |
| `PHASE_7_SPEC.md` | 16 967 | Mar 30 16:50 |
| `QA_REPORT.md` | 30 266 | Apr 4 08:59 |
| `SESSION_CONTEXT.md` | 8 564 | Apr 1 00:26 |
| `WORDPRESS_COMPARISON.md` | 5 883 | Apr 4 08:57 |
| `deploy-cms-ai-edit.md` | 684 | Mar 31 20:00 |
| `BRAND_TRANSLATIONS_CLEAN.csv` | 33 317 | — (not `.md`) |
| `PRODUCT_TRANSLATIONS_CLEAN.csv` | 256 058 | — (not `.md`) |
| `multifocal-guide-css.txt`, `.html.txt` | 27 848 / 77 571 | — (not `.md`) |

#### 1.1D `docs/current prompt/`

| Path | Size | Status |
|---|---|---|
| `MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` | 71 659 | ⚠️ Completed Apr 11 (Phase A) — belongs in `old prompts/` by convention |
| `PAGES/` | (subfolder; SEO-audit CSVs: Chart.csv, Pages.csv, Queries.csv, Devices.csv, Filters.csv, Countries.csv, "Search appearance.csv"; plus `PAGES2/`) | Google Search Console exports |

#### 1.1E `docs/old prompts/` — **sampled only**

- **Total count:** 173 `.md`/`.txt` files
- **Date range:** Mar 30 12:31 → Apr 11 00:52
- **5 most recent (sampled — not all read):**
  1. `MODULE_3_HF_SPEC_2026-04-10.md` (76 037, Apr 11 01:01) — the Hotfix SPEC that drove the Apr 10-11 execution
  2. `MODULE_3_DISCOVERY_EXTRACTION_PROMPT.md` (15 532, Apr 10 22:24)
  3. `VERIFY-phase-D1-post-build-checks.md` (25 628, Apr 10 18:51)
  4. `BUILD-phase-D1-translate-content-fix.md` (24 385, Apr 10 17:22)
  5. (5th slot falls into the Apr 10 cluster — likely `PHASE-A-translation-hardening.md` or `PHASE-A5-contamination-filter.md`)
- **Characterization:** Mix of Spec prompts (MODULE_3_HF_SPEC, BUILD-*, DISCOVERY-*), Fix prompts (FIX-*), and autonomous phase prompts (AUTONOMOUS_START_*). Each was a one-time Claude Code execution prompt.

#### 1.1F `discovery/` (10 files — THIS IS WHERE GROUND TRUTH LIVES)

| Path | Size | mtime | Content |
|---|---|---|---|
| `MODULE_3_DISCOVERY_PHASE_SPEC.md` | 58 454 | Apr 10 20:46 | Discovery phase spec |
| `MODULE_3_DISCOVERY_REPORT_2026-04-10.md` | 103 844 | Apr 10 22:04 | **Ground-truth discovery report (159 findings, 10 sections)** |
| `MODULE_3_DISCOVERY_EXTRACTION_TABLE_2026-04-10.md` | 37 783 | Apr 10 22:35 | Findings-to-files extraction table |
| `MODULE_3_RECOMMENDATIONS_2026-04-10_from_discovery_v3.md` | 37 822 | Apr 10 23:47 | **5-phase remediation plan (HF + A/B/C/D) that drove Phase A** |
| `hotfix_execution_log_2026-04-10.md` | 27 654 | Apr 11 08:32 | **Hotfix execution log — records HF1–HF10 actual outcomes** |
| `phase_a_execution_log_2026-04-11.md` | 15 396 | Apr 11 10:57 | **Phase A execution log — records A0–A8 actual outcomes** |
| `tier_c_manual_queries.sql` | 7 767 | Apr 11 09:50 | A0 output (Phase A) |
| `tier_c_results_client.json` | 82 772 | Apr 11 09:49 | A0 output |
| `tier_c_results_manual.json` | 109 683 | Apr 11 10:51 | A0 Deviation-2 output (committed to `opticup` as 37280bd) |
| `tier_c_results_2026-04-11.md` | 6 978 | Apr 11 09:51 | A0 human-readable summary |

#### 1.1G `backups/` — **26 folders (names only)**

Mostly `YYYY-MM-DD_*_pre-<phase>/opticup-storefront/` full-repo snapshots. Includes one broken folder `backups${timestamp}_pre-content-2/` (literal unexpanded shell variable). Not entered.

#### 1.1H `seo-audit/`

- `url-inventory.json` (568 KB), `url-inventory.md` (44 123), `url-mapping-template.csv` (176 KB)
- `data/` and `scripts/` subfolders (not entered)

#### 1.1I `docs/MultiSale/` + `docs/SuperSale/`

- `MultiSale/` — 20 `.txt` files (`1.txt`..`15.txt`, no `.md`). Campaign block content extracts.
- `SuperSale/` — 18 `Block XX - *.txt` files. Campaign block content extracts.

Neither contains any `.md`. **Not in scope** (content extracts, not docs).

#### 1.1J `sql/` and `docs/Templates/`

- `modules/Module 3 - Storefront/sql/` — empty.
- `docs/Templates/` — **does not exist** (exists at `opticup/docs/Templates/` — that is Phase 1A scope).

---

### Side B — `opticup-storefront/`

#### 1.2A Repo root — 15 reference `.md` files (all PRESENT)

| Path | Size | mtime | Role |
|---|---|---|---|
| `CLAUDE.md` | 26 169 | Apr 11 10:14 | Constitution (navigation hub) |
| `README.md` | 1 292 | Mar 29 21:55 | Setup notes |
| `ARCHITECTURE.md` | 18 106 | Apr 11 09:59 | Layer model + tenant resolution + view deps (A3 rewrite) |
| `BRAND_CONTENT_GUIDE.md` | 6 663 | Apr 2 13:02 | Brand content format (Hebrew) |
| `CMS_REFERENCE.md` | 9 295 | Apr 11 08:29 | Block system + shortcodes + brand pages |
| `COMPONENT_CHECKLIST.md` | 8 878 | Apr 11 10:09 | New-component checklist |
| `FILE_STRUCTURE.md` | 23 125 | Apr 11 10:06 | Repo tree (A2 rebuild — 788 files enumerated) |
| `FROZEN_FILES.md` | 2 721 | Apr 11 10:12 | Frozen list (A7 updated post-HF2) |
| `QUALITY_GATES.md` | 15 305 | Apr 8 06:12 | 9 pre-commit gates + Lessons L1–L10 |
| `SCHEMAS.md` | 14 057 | Apr 11 10:02 | Table schemas + admin-hidden columns (A4) |
| `SECURITY_RULES.md` | 9 479 | Apr 4 08:32 | Rules S1–S10 + API route template |
| `SESSION_CONTEXT.md` | 14 938 | Apr 10 16:14 | Pre-DNS content quality + translation hardening (⚠ pre-HF1) |
| `TECH_DEBT.md` | 24 542 | Apr 11 06:28 | 16 active debt items + 1 resolved |
| `TROUBLESHOOTING.md` | 14 887 | Apr 11 10:15 | Known bugs + Golden Reference #1 (A6/A8b updated) |
| `VIEW_CONTRACTS.md` | 37 454 | Apr 11 09:55 | Column contracts for 22 views (A1 rewrite, heavy TIER-C-PENDING) |

**Missing at root:** `ROADMAP.md`.

#### 1.2B `docs/` — **active `.md` files** (subset of 59 total)

Core docs (tracked, referenced by SESSION_CONTEXT/CLAUDE.md):

| Path | Size | mtime |
|---|---|---|
| `docs/MODULE_MAP.md` | 7 185 | Mar 30 07:47 ⚠ Phase 1 era |
| `docs/CHANGELOG.md` | 6 453 | Mar 30 09:18 ⚠ Phase 0 era |
| `docs/STATUS_AUDIT_REPORT.md` | 19 066 | Apr 8 06:39 |
| `docs/DISCOVERY-5-existing-infrastructure.md` | 9 507 | Apr 10 12:06 |
| `docs/DISCOVERY-6-translate-content-bugs.md` | 23 078 | Apr 10 17:02 |
| `docs/DISCOVERY-brand-content-generation.md` | 12 906 | Apr 10 10:34 |
| `docs/DESIGN_PARITY_AUDIT.md` | 31 945 | Mar 31 08:12 |
| `docs/PRODUCT-REDIRECT-MAP.md` | 40 143 | Apr 8 04:17 |

#### 1.2C `docs/` — **audit-cluster `.md` files** (~30 active, audit + review + audit-output)

AUDIT / DEEP-AUDIT / I18N / SEO / TRANSLATION / DNS / WORDPRESS cluster. Inventoried, sampled by rule:

| Group | Files | Status |
|---|---|---|
| SEO / DNS readiness | `DNS-SWITCH-READINESS.md`, `DNS-SWITCH-VERIFICATION.md`, `SEO_MIGRATION_PLAN.md`, `SEO_PARITY_AUDIT.md`, `SEO-FULL-AUDIT.md`, `SEO-STRATEGY.md`, `SITEMAP-COMPARISON.md`, `WORDPRESS-PAGE-COVERAGE.md`, `WORDPRESS-URL-AUDIT.md`, `REDIRECT-AUDIT.md`, `REDIRECT-DESTINATION-CHECK.md`, `BRAND-REDIRECTS-TO-RESTORE.md` | pre-DNS-switch artifacts, active |
| Security / Accessibility / Performance | `ACCESSIBILITY-AUDIT.md`, `API-SECURITY-AUDIT.md`, `SECURITY-AUDIT.md`, `SECURITY-AUDIT-V2.md`, `PERFORMANCE-AUDIT.md`, `PERFORMANCE-AUDIT-V2.md`, `SCHEMA-AUDIT.md`, `SHARED-COMPONENTS-AUDIT.md`, `PRODUCT-LEAK-AUDIT.md`, `BLOG-MISSING-IMAGES.md`, `QA-FULL-SCAN.md` | audit snapshots, mostly stale post-HF1 fixes |
| Content audits | `AUDIT-brands-content-quality.md` (99 357), `AUDIT-products-content-hebrew.md`, `DEEP-AUDIT-brands.md` (114 447), `DEEP-AUDIT-products.md` (65 130), `CONTENT_QUALITY_REPORT.md`, `BLOG-TRANSLATION-REVIEW-2026-04-05.md` (125 309), `BRANDS-FOR-TRANSLATION.md` | overnight audit outputs — sampled first 100 + last 50 |
| Translation pipeline | `I18N-DISCOVERY-REPORT.md`, `I18N-INVESTIGATION-REPORT.md`, `I18N-REMAINING-TASKS.md`, `LANG-SWITCH-FULL-SCAN.md`, `LANG-SWITCH-TEST-CHECKLIST.md`, `TRANSLATION-COVERAGE-FOR-DNS.md`, `TRANSLATION-RUN-2026-04-05.md`, `TRANSLATION-WORKFLOW.md`, `translations-review-blog.md` (107 206), `translations-review-brands.md`, `translations-review-cms-pages.md`, `translations-review-products.md` (159 966) | review/audit artifacts |
| Specs / Summaries | `AI-AGENT-TEAM-SPEC.md`, `BANNER-POPUP-SPEC.md`, `AUTONOMOUS_MODE.md`, `OVERNIGHT-RUN-SUMMARY.md`, `OVERNIGHT-RUN-2-SUMMARY.md`, `OVERNIGHT-RUN-3-SUMMARY.md`, `WP-IMAGES-INVENTORY.md` | one-off, mostly superseded |

#### 1.2D `docs/` — **audit-scratch / orphans** (NOT in active scope, marked ORPHAN)

| File | Size | Verdict |
|---|---|---|
| `_audit-compact.json` | 34 164 | ORPHAN [data-dump] |
| `_audit-extract.txt` | 37 874 | ORPHAN [data-dump] |
| `_batch2-descs.txt` | 24 748 | ORPHAN [data-dump] |
| `_batch7-compact.json` | 31 028 | ORPHAN [data-dump] |
| `_deep-audit-*.json` | 16 files, 7 K–720 K each | ORPHAN [data-dump] |
| `_deep-audit-*-batch-*.md` | 13 files, 5–30 K each | ORPHAN [audit-output] |
| `_deep-audit-meta.json` | 214 | ORPHAN [data-dump] |
| `_deep-audit-products.json` | 720 683 | ORPHAN [data-dump] — single largest non-backup file |
| `_deep-audit-products-mechanical.json` | 122 735 | ORPHAN [data-dump] |
| `TRANSLATION-REVIEW-2026-04-05.md` | 811 012 | ORPHAN [data-dump] — 811 KB auto-generated translation dump |
| `TRANSLATION-REVIEW-2026-04-06.md` | 815 481 | ORPHAN [data-dump] — 815 KB auto-generated translation dump |
| `TRANSLATION-BACKUP-2026-04-05.json` | 2 414 647 | ORPHAN [data-dump] — 2.3 MB JSON backup |
| `about-hebrew-source.txt` | 4 519 | content source, not doc |
| `terms-hebrew-source.txt` | 25 823 | content source, not doc |

**Total ORPHAN volume in `docs/`: ~5.5 MB across ~32 files.** Most are output of the Apr 9 overnight audit runs.

#### 1.2E `docs/archive/` (4 files, all Apr 8–9)

| File | Size | Verdict |
|---|---|---|
| `CLAUDE 10.4.26.md` | 31 494 | ORPHAN [archived] — older CLAUDE.md snapshot, superseded |
| `SESSION_CONTEXT 9.4.26.md` | 4 312 | ORPHAN [archived] |
| `SESSION_CONTEXT.md` | 4 778 | ORPHAN [archived] |
| `SESSION_CONTEXT_full_history_2026-04-08.md` | 43 988 | ORPHAN [archived] — full history dump |

#### 1.2F `docs/exports/`

Top-level entries: 3 JSON manifests (`_wp_*.json`), 3 CSV translations files (BLOG / BRAND-DESCRIPTIONS / CMS-PAGES), 1 PRODUCT-TRANSLATIONS.csv (389 KB), `TRANSLATION-COVERAGE-SUMMARY.md` (761 bytes), 18 multifocal-guide HTML variants (~600 KB), `multifocal-hero.webp`, `wp-images/` subfolder. Not entered.

#### 1.2G `strategic chat/` (9 files)

`STRATEGIC_CHAT_CONTINUATION.md` … `STRATEGIC_CHAT_CONTINUATION_v9.md`. Latest (`v9`) sampled in full. **v9 is the canonical source of the 6 brand content rules (Daniel's IP)** — see Section 3.3 finding #12. Earlier 8 versions marked ORPHAN [superseded].

#### 1.2H Auxiliary folders (existence only, not entered)

| Path | Count | Status |
|---|---|---|
| `backups/` | `phase-0/` subfolder visible | backup snapshot |
| `.tmp/` | 10 `.mjs`/`.json` files | phase-c5 retry scratch |
| `screenshots/` | 5 PNGs | visual regression |
| `scripts/discovery/` | 3 `probe-*.mjs` files | one-off Discovery-era probes |

### Side C — Module 3.1 existing scaffolding (for cross-reference)

| Path | Size | mtime | Role |
|---|---|---|---|
| `README.md` | 4 173 | Apr 11 19:28 | Module entry README |
| `ROADMAP.md` | 12 375 | Apr 11 18:21 | Module 3.1 roadmap (Hebrew) — sets 5 mandatory artifacts |
| `SESSION_CONTEXT.md` | 5 081 | Apr 11 19:28 | Master SESSION_CONTEXT — Phase Tracking table |
| `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` | 17 931 | Apr 11 19:45 | Template for secondary chats + the mandatory 7-section report format |
| `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` | 17 718 | Apr 11 18:54 | Universal module strategic chat prompt (artifact #2 of 5) |
| `docs/PHASE_1A_FOUNDATION_AUDIT_SPEC.md` | 11 112 | Apr 11 19:28 | Phase 1A SPEC (opticup foundation docs) |
| `docs/PHASE_1B_MODULES_1_2_AUDIT_SPEC.md` | 11 470 | Apr 11 19:28 | Phase 1B SPEC (Modules 1/1.5/2 in opticup) |
| `docs/PHASE_1C_MODULE_3_DUAL_REPO_AUDIT_SPEC.md` | 15 626 | Apr 11 19:28 | This phase's SPEC |
| `docs/audit-reports/` | empty (pre-1C) | Apr 11 19:52 | Outputs folder |
| `docs/current prompt/`, `docs/old prompt/`, `backups/` | all empty | — | Module 3.1 scaffolding |

---

## 2. Status per File

Status labels: ALIVE · SUSPECT · STALE · ORPHAN · BROKEN
Tags: [ERP-side] · [STOREFRONT-side] · [BOTH] · [data-dump] · [audit-output] · [archived] · [superseded]

### 2.1 Side A (opticup Module 3 folder)

#### 2.1.1 STALE

- `MODULE_3_ROADMAP.md` — **STALE [BOTH]** — Mar 30 roadmap. Says "autonomous mode — Claude Code executes PHASE_SPECs independently", lists 8 phases (1→7+QA) all ⬜. Reality: phases ran in completely different form (Phase 0 SEO → Phase 1 setup → Phase 2 catalog → CMS-1..CMS-10 → Apr 9–10 content/translation hardening → Hotfix → Phase A; Phase B/C/D blocked on Module 3.1). Will produce 20+ Section 4 entries.
- `AUTONOMOUS_START.md` — **STALE [ERP-side]** — describes execution model explicitly superseded by Side B `CLAUDE.md §8` Bounded Autonomy. Uses `git add -A` which contradicts Storefront CLAUDE.md §8 rule 6.
- `MODULE_3_STRATEGIC_CHAT_PROMPT.md` — **STALE [BOTH]** — describes the 4-layer hierarchy with autonomous-mode assumption. Still names "אפס צ'אט משני" (no secondary chat) for Module 3 specifically — a model that was abandoned and is one of the reasons Module 3.1 exists.
- `Autonomous old/AUTONOMOUS_*.md` (all 7) — **STALE [ERP-side]** — one-shot autonomous-mode phase prompts, none ever executed in the described form.
- `docs/MODULE_MAP.md` — **STALE [ERP-side/BOTH]** — describes `seo-audit/scripts/` (4 files, Phase 0 era) + a few Studio files (studio-ai-prompt.js 216 L, studio-product-picker.js 230 L, studio-reviews.js 275 L). Reality per Discovery §2.2.1: 32 ERP Studio files totaling 14 084 lines. The four files specifically listed have also changed line counts (studio-ai-prompt.js is now 261 L per Discovery, studio-product-picker.js is 309 L, studio-reviews.js is 377 L). Discovery §5 shows this file materially wrong.
- `docs/SESSION_CONTEXT.md` — **STALE [ERP-side/BOTH]** — "Current Phase: CMS-10 — Final Build + QA ✅ CMS COMPLETE", date 2026-04-01. Completely unaware of CMS-11 parity report (Apr 1 later), Apr 4 QA_REPORT, Apr 9–10 translation hardening, Hotfix, Phase A. Pending-actions list references "Phase 6 / 7 SQL migrations" that were superseded weeks ago.
- `docs/CHANGELOG.md` — **STALE [ERP-side]** — only contains Phase 0 SEO audit entry from 2026-03-29. No Phase 1, 2, 3, 4, 5, 6, 7, CMS-*, Hotfix, or Phase A commits logged.
- `docs/PHASE_0_SPEC.md` through `docs/PHASE_7_SPEC.md` (12 files) — **STALE [BOTH]** — Mar 30 autonomous-mode specs. PHASE_0 SEO Audit actually did run (Phase 0 complete per CHANGELOG). PHASE_1 Setup, PHASE_2 Catalog, PHASE_3A Product mapping, etc. generally describe tasks that were done in some form but NOT via the autonomous-mode execution loop described. The "Step N → commit → SESSION_CONTEXT" loop these SPECs prescribe never ran. Treat all 12 as historical reference material, not execution specs.
- `docs/QA_REPORT.md` — **SUSPECT [STOREFRONT-side]** — 2026-04-03 audit (health 62/100, DNS Readiness NO). Has a "Post-Fix Verification" block at the bottom (2026-04-04) that shows many CRITICAL items RESOLVED (skip nav ✅, hreflang ✅, Twitter card ✅, products load ✅). Subsequent work fixed more. The document as a whole is half-stale, half-still-valid; no reader can tell which.
- `docs/CMS-11-PARITY-REPORT.md`, `docs/CMS-QA-REPORT.md` — **SUSPECT [STOREFRONT-side]** — Apr 1 CMS parity and QA snapshots, superseded by the Apr 3 QA_REPORT and all subsequent work. Not deleted.
- `docs/WORDPRESS_COMPARISON.md` — **SUSPECT [STOREFRONT-side]** — Apr 4. Probably still mostly accurate (most WordPress content migrated), but predates several SQL migrations.
- `docs/MIGRATION_STATUS.md` — **SUSPECT [STOREFRONT-side]** — 2026-04-04 WP page migration status. Some items listed as "SQL ready" may now be applied (not reflected here).
- `docs/deploy-cms-ai-edit.md` — **SUSPECT [STOREFRONT-side]** — Mar 31, deploy instructions for `cms-ai-edit` Edge Function. May still be valid, but no status indicator.
- `docs/old prompts/` (168 of 173 files not read) — **ORPHAN [superseded]** — one-shot Claude Code execution prompts. Each ran once in some past session. No longer referenced by active docs. Total ~2 MB of prose.

#### 2.1.2 ALIVE

- `modules/Module 3 - Storefront/discovery/MODULE_3_DISCOVERY_REPORT_2026-04-10.md` — **ALIVE [BOTH]** — authoritative ground-truth discovery from Apr 10. 159 findings across 10 sections. Primary input for all subsequent remediation work.
- `discovery/MODULE_3_RECOMMENDATIONS_2026-04-10_from_discovery_v3.md` — **ALIVE [BOTH]** — the 5-phase remediation plan (HF + A/B/C/D). Phase A has already executed against this plan successfully.
- `discovery/hotfix_execution_log_2026-04-10.md` — **ALIVE [BOTH]** — sole record of what actually happened in Hotfix. 10 items with outcomes, deviations, pending actions. Contains the Hotfix Sanity Check PASS declaration that gates Phase A.
- `discovery/phase_a_execution_log_2026-04-11.md` — **ALIVE [BOTH]** — sole record of what actually happened in Phase A. 9 items with commits, A0 deviation 2, Phase A Sanity Check PASS. Contains the gate for Phase B.
- `discovery/MODULE_3_DISCOVERY_PHASE_SPEC.md` — **ALIVE [archived]** — the SPEC that produced the Discovery report. Still authoritative for rerunning discovery.
- `discovery/MODULE_3_DISCOVERY_EXTRACTION_TABLE_2026-04-10.md` — **ALIVE** — findings-to-files extraction table. Useful reference for "which file contains finding F042".
- `discovery/tier_c_results_*.json` (2 files) + `tier_c_manual_queries.sql` + `tier_c_results_2026-04-11.md` — **ALIVE** — A0 outputs. Authoritative source for VIEW_CONTRACTS cleanup round (TIER-C-PENDING markers).
- `docs/current prompt/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` — **ALIVE but MISPLACED** — the completed Phase A SPEC. Should be in `old prompts/` per convention, since Phase A is done.
- `seo-audit/url-inventory.md` + siblings — **ALIVE [STOREFRONT-side]** — Phase 0 WP URL inventory. Still the source of truth for DNS-switch URL coverage checks.

### 2.2 Side B (opticup-storefront)

#### 2.2.1 ALIVE — the constitution and its satellites

- `CLAUDE.md` (root) — **ALIVE [STOREFRONT-side]** — Storefront constitution. Iron Rules 24–30 all verified present. Bounded Autonomy §8 defined. §18 Reference File Classification added Apr 11 (A8a). ⚠ **Exception 1:** §10 table admits file exceeds "under 400" soft cap at 439 lines. ⚠ **Exception 2:** Rule 24 allowed-views list is 9 entries; reality has 13+ runtime-used views (see §3.3 finding #2). ⚠ **Exception 3:** Rule 25 pointer says "Golden Reference subquery in VIEW_CONTRACTS.md" but the Golden Reference actually lives in TROUBLESHOOTING.md §1 (§9 Authority Matrix correctly lists "VIEW_CONTRACTS.md + TROUBLESHOOTING.md §1").
- `README.md` (root) — **ALIVE [STOREFRONT-side]** — tiny setup file. Accurate but says `002-v-storefront-products.sql` is the Phase 2 view file; reality has ~160 SQL files. Setup steps still fine.
- `QUALITY_GATES.md` (root) — **ALIVE [STOREFRONT-side]** — 9 gates + L1–L10 lessons. Post-HF9 color contradiction is resolved (CMS_REFERENCE.md:101 corrected to `#c9a555`). No known drift.
- `SECURITY_RULES.md` (root) — **ALIVE [STOREFRONT-side]** — S1–S10 + template. Status table at §End lists 3 existing routes; all green. ⚠ `normalize-logo.ts` marked "✅ Bearer token" in status table, but HF2 exit-to-followup log shows direct table reads of `employees`/`auth_sessions` still present. Status table is optimistic.
- `ARCHITECTURE.md` (root) — **ALIVE [BOTH]** — A3 rewrite. Layer model, tenant resolution (2.1–2.3), view dependency correction (3.2 closes Discovery F028). §3.3 full DROP/CREATE order and §4.3 Golden Reference byte-verification both TIER-C-PENDING.
- `VIEW_CONTRACTS.md` (root) — **ALIVE but PARTIAL [STOREFRONT-side]** — A1 rewrite. Columns for 22 views from A0 Q1a. Purpose / Depends-on / Dependents / Golden Reference subqueries are ALL TIER-C-PENDING (every single view). Header declares this status explicitly.
- `FROZEN_FILES.md` (root) — **ALIVE [STOREFRONT-side]** — A7 updated Apr 11. `normalize-logo.ts` entry reflects HF2 EXITED_TO_FOLLOWUP with bucket-C direct reads still present. Good.
- `SCHEMAS.md` (root) — **ALIVE [STOREFRONT-side]** — A4 rewrite. Table schemas + "Admin-Only Hidden Columns" diff (48 columns hidden across documented pairs). ⚠ `content_translations.entity_type` CHECK constraint is TIER-C-PENDING. `storefront_pages` CHECK still lists old 4-value set.
- `TROUBLESHOOTING.md` (root) — **ALIVE [STOREFRONT-side]** — A6 + A8b. Golden Reference #1 wrapped in `[SPEC — DO NOT REWRITE]` / `[END SPEC]`. Byte-verify against live view is TIER-C-PENDING.
- `COMPONENT_CHECKLIST.md` (root) — **ALIVE [STOREFRONT-side]** — A5 updated.
- `FILE_STRUCTURE.md` (root) — **ALIVE [STOREFRONT-side]** — A2 rebuild from `find` (788 files enumerated). Accurate as of Apr 11.
- `BRAND_CONTENT_GUIDE.md` (root) — **ALIVE but INCOMPLETE [BOTH]** — Apr 2. Missing the 6 brand content rules from `strategic chat/STRATEGIC_CHAT_CONTINUATION_v9.md` (see §3.3 finding #12).
- `TECH_DEBT.md` (root) — **ALIVE [STOREFRONT-side]** — 16 active debt items + 1 resolved (#3). #11 normalize-logo and #16 CSS file-size enforcement are the two 🔴/🟢 items most relevant post-HF.

#### 2.2.2 SUSPECT — looks current but stale in material ways

- `SESSION_CONTEXT.md` (root) — **SUSPECT [BOTH]** — 2026-04-10 afternoon. Describes Apr 9–10 work (contamination hardening Phase A/A.5, Phase B brand content, Phase C.1 facts injection, Phase C.4/C.5). Lists **as BLOCKING DNS switch**: "CRITICAL: Edge Function `translate-content` still produces markdown wrappers". ⚠ **Since then (Apr 11), HF1 DELETED the `translate-content` Edge Function entirely.** SESSION_CONTEXT has no knowledge of HF1-HF10 or A0-A8 happening. It is the file CLAUDE.md §1 says to "read at session start" — a freshly-pulled repo that starts reading this file will get a wrong picture of what's blocking DNS switch.
- `docs/MODULE_MAP.md` — **STALE [STOREFRONT-side]** — Phase 1 era. tenant.ts=81 L (reality 239 L), brands.ts=65 L (reality 141 L), products.ts=195 L (reality 285 L), 7 components listed (reality 52). Lists SQL 001–005 and describes 002 as "Superseded by 004" (reality: 160+ SQL files, up to sql/126).
- `docs/CHANGELOG.md` — **SUSPECT/STALE [STOREFRONT-side]** — last commit listed in STATUS_AUDIT_REPORT is from early April. Not updated for Apr 9–11 commits (contamination hardening, brand content generation, HF1–HF10, A0–A8).
- `docs/STATUS_AUDIT_REPORT.md` — **SUSPECT [STOREFRONT-side]** — Apr 8 audit. Documents a severe language-switcher bug: CMS pages use `translation_group_id` table column that's not selected by `v_storefront_pages`. ⚠ **HF4 (Apr 11) added `translation_group_id` to `v_storefront_pages` and updated `pages.ts` to use it** — closing this bug. The audit file does not record the resolution.

#### 2.2.3 ALIVE — discovery-era reports (active references)

- `docs/DISCOVERY-5-existing-infrastructure.md` — **ALIVE [BOTH]** — Phase C.1 (brand facts) infrastructure discovery. Drove the decision to use `sql/124` (already-deployed) + extend `validators.ts`.
- `docs/DISCOVERY-6-translate-content-bugs.md` — **ALIVE but NOW HISTORICAL [STOREFRONT-side]** — documents the `translate-content` validator gap. HF1 solved the bug by deleting the Edge Function entirely. Report is now a historical artifact but not yet marked as such.
- `docs/DISCOVERY-brand-content-generation.md` — **ALIVE [BOTH]** — infrastructure audit for Phase B/C brand content work. Still relevant; the recommendations (extend `generate-brand-content/validators.ts`, don't rebuild) still stand.

#### 2.2.4 SUSPECT / partially obsolete audit cluster

- `docs/DESIGN_PARITY_AUDIT.md` — **SUSPECT [STOREFRONT-side]** — Mar 31. Design-parity audit vs WordPress. Most items likely resolved in the April design overhaul (commits 2026-03-30/31 "design-parity", "design-3-homepage-rebuild", "design-4-visual-fixes"), but audit doc not updated.
- `docs/QA-FULL-SCAN.md`, `docs/SECURITY-AUDIT.md`, `docs/SECURITY-AUDIT-V2.md`, `docs/PERFORMANCE-AUDIT.md`, `docs/PERFORMANCE-AUDIT-V2.md`, `docs/ACCESSIBILITY-AUDIT.md`, `docs/API-SECURITY-AUDIT.md`, `docs/SCHEMA-AUDIT.md`, `docs/SEO-FULL-AUDIT.md`, `docs/SEO_PARITY_AUDIT.md` — **SUSPECT [STOREFRONT-side]** — all snapshot audits from early April. Most findings were fed into HF or into TECH_DEBT. Not deleted, not reconciled.
- `docs/OVERNIGHT-RUN-SUMMARY.md`, `OVERNIGHT-RUN-2-SUMMARY.md`, `OVERNIGHT-RUN-3-SUMMARY.md` — **SUSPECT [STOREFRONT-side]** — one-time summaries, superseded.
- `docs/AUTONOMOUS_MODE.md` — **STALE [STOREFRONT-side]** — pre-Bounded-Autonomy description of the autonomous execution model. Superseded by Side B CLAUDE.md §8. Not cross-referenced.
- `docs/translations-review-blog.md` / `-brands.md` / `-cms-pages.md` / `-products.md` — **ORPHAN [audit-output] [STOREFRONT-side]** — auto-generated translation review dumps from Apr 8. Each was a one-shot audit artifact.
- `docs/TRANSLATION-REVIEW-2026-04-05.md` (811 KB) + `docs/TRANSLATION-REVIEW-2026-04-06.md` (815 KB) — **ORPHAN [data-dump]** — auto-generated translation dumps. ~1.6 MB combined.
- `docs/DEEP-AUDIT-brands.md` (114 KB), `docs/DEEP-AUDIT-products.md` (65 KB) — **ORPHAN [audit-output]** — the Apr 9 deep audit reports. Still useful reference when Phase B/C brand content work runs.
- `docs/AUDIT-brands-content-quality.md` (99 KB), `docs/AUDIT-products-content-hebrew.md` (15 KB), `docs/BLOG-TRANSLATION-REVIEW-2026-04-05.md` (125 KB) — **ORPHAN [audit-output]** — same story.
- `docs/_audit-*`, `docs/_batch*`, `docs/_deep-audit-*.json`, `docs/_deep-audit-*-batch-*.md` (~29 files, ~1.7 MB) — **ORPHAN [data-dump]** — intermediate pipeline artifacts from the Apr 9 parallel-agents deep audit run.
- `docs/TRANSLATION-BACKUP-2026-04-05.json` (2.3 MB) — **ORPHAN [data-dump]** — one-time backup snapshot.
- `docs/campaign-*.html`, `docs/wp-*.html`, `docs/debug-*.html` (~12 files) — reference HTML snapshots from WordPress scraping. **ORPHAN [archived]**.

#### 2.2.5 Archive folder

- `docs/archive/CLAUDE 10.4.26.md` / `SESSION_CONTEXT 9.4.26.md` / `SESSION_CONTEXT.md` / `SESSION_CONTEXT_full_history_2026-04-08.md` — **ORPHAN [archived]** — older snapshots. Keep.

#### 2.2.6 Strategic chat continuations

- `strategic chat/STRATEGIC_CHAT_CONTINUATION_v9.md` — **ALIVE [BOTH]** — latest strategic chat continuation. **Single authoritative source of the 6 brand content rules (Daniel's IP)**. Must not be lost; must be MERGED into `BRAND_CONTENT_GUIDE.md` and `generate-brand-content/index.ts` system prompt.
- `strategic chat/STRATEGIC_CHAT_CONTINUATION_v1.md` … `v8.md` (8 files) — **ORPHAN [superseded]**.

### 2.3 Module 3.1 scaffolding

- All 7 scaffolding files — **ALIVE**. Created Apr 11. Self-contained.
- `docs/audit-reports/` — empty pre-1C; this report plus 1A/1B reports (both absent — see §5) are the expected first outputs.

---

## 3. Discrepancies

### 3.1 Within `opticup` (Side A internal contradictions)

1. **MODULE_3_ROADMAP.md self-reference is wrong.** Header preamble (line 4) says `**מיקום:** modules/Module 3 - Storefront/ROADMAP.md` but the actual filename on disk is `MODULE_3_ROADMAP.md`. Severity: LOW.

2. **AUTONOMOUS_START.md references files that don't exist in the Module 3 folder.**
   - Line 61: "Update `MODULE_SPEC.md` — update current state" — no `MODULE_SPEC.md` exists.
   - Line 32: "Update `db-schema.sql`" — no `db-schema.sql` exists under Module 3.
   - Line 64: "Merge into `docs/GLOBAL_MAP.md`" — that file lives at `opticup/docs/GLOBAL_MAP.md` (Phase 1A scope, not inventoried here). Reference crosses module scope without flagging.
   Severity: MEDIUM.

3. **AUTONOMOUS_START.md line 29 uses `git add -A && git commit -m "..." && git push`.** This is the exact wildcard-commit pattern that Side B `CLAUDE.md §8 rule 6` explicitly forbids: "Never wildcard git — never `git add -A`, never `git add .`, never `git commit -am`. Always add files by explicit name." The ERP-side execution model directly contradicts the Storefront-side execution model. Severity: HIGH (see cross-repo #1 as well).

4. **docs/SESSION_CONTEXT.md vs docs/MODULE_MAP.md phase tracking contradict.** SESSION_CONTEXT says "Current Phase: CMS-10 — ✅ CMS COMPLETE". MODULE_MAP is still showing Phase 0/Phase 1 era file listings (seo-audit scripts, 7 components, tenant.ts=81 L). Both claim to be current. Reader cannot tell which phase the project is in from these docs. Severity: HIGH.

5. **docs/QA_REPORT.md is half-stale, half-current.** Main body dated 2026-04-03 lists issues (no 404 page, no hreflang, no skip nav, path traversal, SSRF, no rate limiting, 3 npm vulnerabilities, 24 contrast failures, 89 `any` types). Post-Fix Verification block at the bottom (2026-04-04) shows many fixed (skip nav ✅, hreflang ✅, Twitter card ✅, 404 page FAIL). But subsequent Hotfix (Apr 10–11) resolved additional items. No single reader can tell what's still open. Severity: MEDIUM.

6. **12 PHASE_*_SPEC files describe an execution model (autonomous mode + checkpoint commits) that is incompatible with the actual execution model recorded in discovery/*_execution_log.md.** The logs show Bounded Autonomy, per-item commits, cross-module pre-flight, §14 safety protocol — none of which are in the SPEC files. Severity: HIGH (structural).

7. **docs/MIGRATION_STATUS.md (Apr 4) lists SQL files "ready to run" — but Apr 4 QA_REPORT, Apr 9–10 discovery, and Apr 11 Phase A all assume most of that SQL is already applied.** No "applied at" column on the status table. Severity: MEDIUM.

### 3.2 Within `opticup-storefront` (Side B internal contradictions)

8. **Iron Rule 24 allowed-views list is incomplete vs VIEW_CONTRACTS.md.** CLAUDE.md §5 Rule 24 lists 9 views: `v_storefront_products`, `v_storefront_brands`, `v_storefront_brand_page`, `v_storefront_categories`, `v_storefront_blog_posts`, `v_storefront_config`, `v_storefront_pages`, `v_public_tenant`, `v_translation_dashboard`. VIEW_CONTRACTS.md (A1 rewrite, Apr 11) documents 22 views, of which ~13 are used by runtime code (adds `v_storefront_reviews`, `v_storefront_components`, `v_content_translations`, `v_ai_content`, `v_tenant_i18n_overrides`). Phase A A5 was "CLAUDE.md accuracy fixes" but left Rule 24's view list untouched. Rule 29 (View Modification Protocol) enforcement is therefore partial. Severity: HIGH — Discovery F026/F035/F139 flagged this as critical and Phase A did not close the Rule 24 text portion.

9. **Iron Rule 25 pointer is wrong.** CLAUDE.md §5 Rule 25: "always build URLs from `storage_path` using the Golden Reference subquery in `VIEW_CONTRACTS.md`." But VIEW_CONTRACTS.md has every Golden Reference subquery marked `<!-- TIER-C-PENDING -->`. The actual Golden Reference lives in TROUBLESHOOTING.md §1 (wrapped in `[SPEC — DO NOT REWRITE]` markers post-A8b). CLAUDE.md §9 Authority Matrix correctly names both locations ("VIEW_CONTRACTS.md + TROUBLESHOOTING.md §1"), but Rule 25's text only points to VIEW_CONTRACTS.md. Severity: MEDIUM.

10. **VIEW_CONTRACTS.md TIER-C-PENDING coverage.** The file's top banner says "Partial contract entries for 22 views. Column lists and anon GRANT status are authoritative … Purpose, source mapping, dependency chain, and Golden Reference subqueries are marked `<!-- TIER-C-PENDING -->` and will be populated … in the Phase B preamble cleanup round." But the file is already being used as the "spec for every storefront-facing View" (its opening line). Rule 29 currently cannot be fully enforced against it. Severity: MEDIUM (known and documented gap, not silent drift).

11. **SESSION_CONTEXT.md says blocking DNS item is the translate-content Edge Function producing wrappers.** That item was resolved on Apr 11 by HF1 which DELETED the Edge Function. SESSION_CONTEXT is exactly the file CLAUDE.md §1 instructs to read at session start — a fresh session starts on false premises. Severity: HIGH (session-start reading).

12. **SECURITY_RULES.md status table shows `normalize-logo.ts` as ✅ Bearer token.** FROZEN_FILES.md entry for the same file (Apr 11 A7 update) documents that HF2 exited to followup with bucket-C direct table reads still present. TECH_DEBT #11 (🔴 HIGH) also flags this. SECURITY_RULES.md status table is over-green. Severity: MEDIUM.

13. **SCHEMAS.md `content_translations.entity_type` CHECK constraint says `IN ('brand', 'template', 'component', 'site_settings')`** but the live schema and pipeline now cover `product`, `blog`, `page` too. Discovery §6.3 S3 and SCHEMAS.md itself note this is TIER-C-PENDING. Severity: MEDIUM.

14. **`docs/MODULE_MAP.md` vs `FILE_STRUCTURE.md` (both Side B).** MODULE_MAP is Phase 1 era (Mar 30, mentions tenant.ts=81 L and 7 components). FILE_STRUCTURE.md is A2-rebuild Apr 11 (788 files enumerated). Both are descriptive of the same repo at the same instant. Contradict each other on scale by 10× on many metrics. Severity: HIGH.

15. **`docs/CHANGELOG.md` and root `SESSION_CONTEXT.md` disagree on most-recent work.** CHANGELOG stops earlier than SESSION_CONTEXT. Neither is current with develop HEAD post-Phase-A. Severity: MEDIUM.

16. **docs/STATUS_AUDIT_REPORT.md (Apr 8) documents the language-switcher CMS bug as OPEN.** HF4 + HF6 (Apr 11) fixed it. Audit report does not reflect the fix. Severity: LOW (the audit is a snapshot).

### 3.3 Cross-repo discrepancies (highest-value section)

17. **Execution model contradiction.** Side A `AUTONOMOUS_START.md` + `MODULE_3_STRATEGIC_CHAT_PROMPT.md` prescribe "autonomous mode — Claude Code executes PHASE_SPECs independently, `git add -A && git commit && git push` every step". Side B `CLAUDE.md §8 Bounded Autonomy` prescribes "stop on deviation, not on success; never wildcard git; one concern per task; never push to main". These are two incompatible operating models. The Hotfix and Phase A execution logs (in Side A `discovery/`) explicitly follow the Bounded Autonomy model, not the autonomous-mode model. Side A's autonomous-mode docs are not annotated as superseded. Severity: **CRITICAL**.

18. **Iron Rules 1–23 live in `opticup/CLAUDE.md` (Phase 1A scope — not audited here but referenced). Iron Rules 24–30 live in `opticup-storefront/CLAUDE.md` (verified). Rule 31 (Image Regression) is a hygiene addition Apr 11.** No file on Side A references the existence of Rules 24–30. No file on Side B references the existence of Rules 1–23 by number — only by concept ("inherited from ERP"). If someone reads only one repo, they see one half of the constitution. Severity: HIGH (dual-repo constitutional split, undocumented from the ERP side).

19. **`MODULE_MAP.md` exists in BOTH repos at very different staleness levels, both obsolete, and NEITHER describes the other side.**
    - Side A `docs/MODULE_MAP.md`: describes SEO audit scripts (Phase 0) + ~4 ERP Studio files.
    - Side B `docs/MODULE_MAP.md`: describes ~7 storefront components (Phase 1 era, tenant.ts=81 L).
    - Reality per Discovery: Side A has 32 JS files totaling 14,084 L in `modules/storefront/`. Side B has 125 src/ files totaling ~15,550 L in `src/`.
    - Neither MODULE_MAP acknowledges that Module 3 has code on both sides of the repo boundary.
    Severity: **CRITICAL** — a new reader looking for "what files make up Module 3" is guaranteed to get a wrong picture from either MODULE_MAP.

20. **`CHANGELOG.md` exists in both repos. Neither tracks the Apr 9–11 work.**
    - Side A `docs/CHANGELOG.md`: stops at Phase 0 SEO audit (2026-03-29). No entries for Phase 1–7, CMS-1..CMS-10, translation hardening, Hotfix, Phase A.
    - Side B `docs/CHANGELOG.md`: stops earlier than Apr 8. No entries for HF or A.
    - Real commit history (per `git log`) spans 530 commits across both repos over Mar 29–Apr 11 (per Discovery §9.2.1).
    Severity: HIGH.

21. **`SESSION_CONTEXT.md` exists in both repos. Both are stale with respect to Hotfix + Phase A.**
    - Side A `docs/SESSION_CONTEXT.md`: stuck at "CMS-10 ✅ CMS COMPLETE" dated 2026-04-01.
    - Side B root `SESSION_CONTEXT.md`: dated 2026-04-10 afternoon, lists translate-content wrapper bug as blocking DNS.
    - Neither file knows that HF1 (Apr 11) deleted the translate-content Edge Function, HF4 added translation_group_id, HF10 deleted studio-components.js, or that A0-A8 happened.
    Severity: **CRITICAL** — session-start reading on both sides is wrong.

22. **View contracts ownership is unclear.** Side B `VIEW_CONTRACTS.md` is the single authoritative file for column contracts (22 views). It includes admin views (`v_admin_pages`, `v_admin_campaigns`, `v_admin_leads`, `v_admin_campaign_templates`, `v_admin_component_presets`, `v_admin_product_picker`, `v_translation_dashboard`, `v_cms_blocks`) that are consumed **exclusively by Side A** Studio code. No Side A doc points to Side B's VIEW_CONTRACTS.md. A Side A change to a Studio query has no local contract reference. Severity: HIGH.

23. **Display mode terminology:** Side B `TECH_DEBT #10` (🟡 MEDIUM, Active) documents that `brands.storefront_mode` (464/465 NULL) and `inventory.storefront_mode_override` (17361/17361 NULL) are DEAD columns; canonical is `display_mode` / `display_mode_override`. BUT Side A ERP code (`modules/storefront/storefront-brands.js`, `storefront-products.js`) still dual-writes to the dead columns per Discovery §1 and §3.B.1. The Side B tech-debt entry labels this as "cross-repo scope — 2-3 hours careful work spanning both repos", but nothing on Side A tracks it. Severity: MEDIUM.

24. **8 Edge Functions exist, only 1 has source in either repo.** Per Discovery §4.5, eight Edge Functions are called from the project: `translate-content` (was in `opticup-storefront/supabase/functions/`, DELETED by HF1), `generate-ai-content`, `generate-blog-post`, `generate-brand-content`, `generate-landing-content`, `generate-campaign-page`, `cms-ai-edit`, `fetch-google-reviews`. **The other 7 have source "not in storefront repo"**. Are they in `opticup` repo under `supabase/functions/`? Are they deployed from Supabase Dashboard only? No doc in either repo answers this. The hotfix log for HF1 even mentions "generate-brand-content Edge Function itself remains deployed, flagged as potential follow-up cleanup" — but does not say where that function's source lives. Discovery §3.B.1 mentions them as "called by ERP Studio", but that's the caller, not the source. Severity: **CRITICAL** (undocumented critical infrastructure).

25. **Brand content rules (Daniel's 6 IP rules) live ONLY in `opticup-storefront/strategic chat/STRATEGIC_CHAT_CONTINUATION_v9.md` lines 119–168, plus a mirror copy in `opticup/modules/Module 3 - Storefront/docs/old prompts/UPDATE-session-docs-merge.md` (inventoried, not read).** The rules are NOT in `BRAND_CONTENT_GUIDE.md` (root, Apr 2 — verified missing rules 1, 3, 4, 5 and partial rule 6). NOT in the `generate-brand-content` Edge Function system prompt (per DISCOVERY-brand-content-generation Q3). The single-point-of-failure is the strategic chat v9 file — if that file moves or is deleted, the rules vanish. Severity: HIGH.

26. **Side B `docs/` convention says reference docs live at root, not under `docs/`.** Per FILE_STRUCTURE.md §Repo Root, all 15 reference files (CLAUDE, QUALITY_GATES, VIEW_CONTRACTS, SCHEMAS, etc.) live at repo root. The PHASE_1C SPEC (Module 3.1 side) assumed `docs/SCHEMAS.md`, `docs/CMS_REFERENCE.md`, etc. — those paths don't exist. This is also a discrepancy between Module 3.1 project-memory and Side B reality. Severity: MEDIUM (convention discrepancy).

27. **The Module 3 `discovery/` folder (Side A) contains 10 files (~440 KB) of Apr 10–11 investigative work that Module 3.1's audit is partially duplicating.** Specifically: `MODULE_3_DISCOVERY_REPORT_2026-04-10.md` (104 KB, 159 findings) is a code/DB-level ground-truth discovery; Module 3.1's scope says docs-only. There is no clear rule for: what does Module 3.1's 1C audit add that Module 3 discovery doesn't already cover? The two workflows developed in parallel without awareness of each other until Phase 1C started. Severity: HIGH (scope overlap).

28. **`MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` (in Side A `docs/current prompt/`) is the SPEC that drove Phase A to completion.** It overlaps conceptually with Module 3.1's docs-reconciliation mission — Phase A itself rewrote VIEW_CONTRACTS, ARCHITECTURE, SCHEMAS, FILE_STRUCTURE, CLAUDE.md, TROUBLESHOOTING, FROZEN_FILES, COMPONENT_CHECKLIST in Side B, and Module 3.1 is about to audit those same files. Is Module 3.1 the next layer up (meta-docs, universal prompts, 4-layer hierarchy) while Module 3 Phase A covered domain-level reference-doc accuracy? Or does Module 3.1 supersede Phase A? This is the single most important scope question for Module 3.1 to resolve before Phase 2 synthesis. Severity: **CRITICAL** (scope/ownership).

29. **Translation pipeline architecture is undocumented in both repos** (Side B `TECH_DEBT #6`). The pipeline spans `content_translations`, `translation_memory`, `tenant_i18n_overrides`, Studio translation tab (Side A), `translate-content` Edge Function (now deleted), `translate_product` mode (was validated), `translate_text` mode (was unvalidated — Bug documented in DISCOVERY-6), manual Gemini batches, and the Phase A 3-layer defense. No doc explains how data flows through this pipeline. HF1 removed a critical piece (translate-content Edge Function) without removing it from documentation. Severity: HIGH.

30. **Secondary-chat convention lives ONLY in Module 3.1 files; no Module 3 file references it.** `MODULE_3.1_SECONDARY_CHAT_TEMPLATE.md` (17 931 bytes) defines the template for secondary chats and the 7-section report format. Side A `MODULE_3_STRATEGIC_CHAT_PROMPT.md` (Mar 30) explicitly says Module 3 has NO secondary chat ("אין צ'אט משני — Claude Code קורא SPEC ישירות"). Module 3.1 is the first module to use secondary chats. Module 3's own strategic prompt is not annotated to say "this model was abandoned; see Module 3.1 for the new pattern". Severity: MEDIUM.

31. **DNS-switch readiness is documented in at least 4 places with differing "remaining work" lists.**
    - Side B `docs/DNS-SWITCH-READINESS.md` (Apr 7) — original list
    - Side B `docs/DNS-SWITCH-VERIFICATION.md` (Apr 7) — verification checklist
    - Side B `SESSION_CONTEXT.md` (Apr 10) — "DNS Readiness 96/100" + blocker list (including translate-content bug — now resolved by HF1)
    - Side B `TECH_DEBT.md` + various audit reports — implicit DNS blockers
    - Side A `docs/current prompt/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md` — references DNS readiness in passing
    No single canonical "DNS switch gate checklist" exists. Severity: MEDIUM (operational).

32. **Edge Function source-to-deployment tracking doesn't exist.** Only 1 of 8 Edge Function sources was in the repo tree. When HF1 said "un-deploy translate-content from Dashboard" in step 7, the operation relied on Daniel remembering to do it — there's no doc that enumerates "deployed Edge Functions" or "Edge Function source ownership". Follow-up FU1 (per Recommendations v3) is the proposed fix, but FU1 is not in any phase. Severity: HIGH.

---

## 4. Outdated content

### 4.1 `MODULE_3_ROADMAP.md` (Mar 30, 523 lines) — exhaustive stale-content map

- **L1–L6 preamble:** "Execution mode: AUTONOMOUS — Claude Code executes PHASE_SPECs independently". Reality per `discovery/hotfix_execution_log_2026-04-10.md` and `phase_a_execution_log_2026-04-11.md`: **Bounded Autonomy + Cross-Module Safety Protocol** (execution logs document per-item commits, pre-flight greps, §14 scope gates). Autonomous mode abandoned. **(1)**
- **L4 `מיקום: modules/Module 3 - Storefront/ROADMAP.md`:** actual filename is `MODULE_3_ROADMAP.md`, not `ROADMAP.md`. Broken self-reference. **(2)**
- **L93–102 "תלויות":** Lists "Module 1.5 (shared) ✅" as dependency. Per Module 3.1 ROADMAP §5, Module 1.5 status is "כנראה כבר מתועד היטב — אבל אל תניח. תאמת." Assumption not verified. **(3)**
- **L107–117 Phase table:** Every single phase row is ⬜. Per Discovery §9.2 and execution logs, phases were executed differently (Phase 0 SEO actually done, Phase 1–7 done in different granularity, CMS-1..CMS-10 added later, HF done, Phase A done). **Every ⬜ mark is wrong.** 8 individual wrong rows. **(4–11)**
- **L118 "סה"כ: ~21 ימי עבודה. ב-autonomous mode ... ~10-14 ימים":** Actual time span is Mar 29 → Apr 11 = 13 days, and work is still ongoing with Phase B/C/D pending. Estimate is hallucinated against reality. **(12)**
- **L124–140 Phase 1 detail:** "The goal: repo שעובד, deployed ל-Vercel" — DONE in practice but status is ⬜. Also lists `v_storefront_products` as "public view על inventory + images + brands filtered by storefront_status" — the actual view has no `storefront_status` filter (it uses `website_sync` — per Discovery §1 and TROUBLESHOOTING.md). **(13)**
- **L148–168 Phase 2 "Product Catalog":** Describes `storefront_status` column with `CHECK (... IN ('hidden', 'catalog', 'shop'))` to be added to inventory. Reality: the project converged on `website_sync ('display' / 'full' / 'none')` on `inventory` + `display_mode` on `brands` — TECH_DEBT #10 confirms `storefront_status` is dead/superseded. The entire Phase 2 SQL block (L161–165) is obsolete. **(14)**
- **L171–189 Phase 3 SEO Migration:** Overall work was done but in different phases (actual Phase 3A/3B/3C). Describes `scripts/migrate-wordpress.ts` and `scripts/validate-migration.ts` — reality has ~12 files under `scripts/seo/` (per Discovery §2.1.7) — different shape. **(15)**
- **L193–237 Phase 4 Catalog/Shop + WhatsApp:** Describes building `storefront_landing_pages` table. Reality: the CMS block system (19+ block types) was built instead. `storefront_landing_pages` table does not exist per Discovery §4.2. Also describes `storefront_leads` table for "notify me" — that table DOES exist but is used differently than described, and the actual CMS leads go to `cms_leads` (a different table). **(16)**
- **L241–283 Phase 5 AI Content Engine:** Describes `ai_content` table (exists) and `ai_content_corrections` table (exists). Phase 5 largely matches reality structurally, but the described "Verify" bullet "bulk generation works for 100+ products" was followed by much more complex work (contamination hardening, brand facts injection) not in the roadmap. **(17)**
- **L287–348 Phase 6 i18n:** Describes 3 tables `translations`, `translation_corrections`, `translation_glossary` — reality: `content_translations`, `translation_memory`, `translation_glossary` plus `tenant_i18n_overrides`. Column names and structure don't match SQL 016/017 or the real schema. **(18)**
- **L352–366 Phase 7 White-Label:** Described as "pending". Actually completed March 30 per Side A `docs/SESSION_CONTEXT.md` (phase 7 ✅). Roadmap was never updated even by the same-day worker. **(19)**
- **L370–392 Phase QA:** Describes 18 Full-Test bullets. Actually a full QA_REPORT.md audit was performed (Apr 3 QA_REPORT.md in `docs/`) plus Chrome MCP localhost sanity checks (per Side B SESSION_CONTEXT + hotfix_execution_log). Neither QA process used the phase QA bullets in the roadmap. **(20)**
- **L395–450 "Repo Structure (Storefront)":** Lists ~35 files. Reality per Discovery §2.1 and Side B FILE_STRUCTURE.md: 788 files (125 `src/` files, 161 SQL files, 80+ scripts, 52 components, 27 lib files, 40 pages). The file tree in the roadmap is a Phase 1 / 2 era sketch, not the actual structure. **(21)**
- **L454–468 "ERP Changes (opticup repo)":** Lists 4 files: `storefront-products.js`, `storefront-landing.js`, `storefront-ai.js`, `storefront-translations.js`. Reality per Discovery §2.2.1: 32 files in `opticup/modules/storefront/`, including `brand-translations.js` (1008 L), `studio-brands.js` (986 L), `studio-shortcodes.js` (884 L), etc. **(22)**
- **L472–484 "Contracts":** Lists 2 views (`v_storefront_products`, `v_storefront_categories`) and 5 "ERP helpers". Reality: 22 views per VIEW_CONTRACTS.md A1, 0 of the 5 helper functions exist under those names. **(23)**
- **L487–499 "כללי ברזל":** Lists 6 "iron rules" for Module 3 numbered 1–6. **All 6 appear in conceptually different form in Side B `CLAUDE.md` Rules 24–30.** The numbering and the authoritative source disagree. Side A's 6 rules are not marked as superseded. **(24)**
- **L502–518 "Autonomous Execution Notes":** The entire "flow" section describes the abandoned Mar-30 model (Daniel → autonomous Claude Code → checkpoints). The Apr-11 model is Bounded Autonomy + §14 Cross-Module Safety Protocol + explicit Stop-on-Deviation. Completely different. **(25)**

**Total line-level stale findings for MODULE_3_ROADMAP.md alone: 25.**

### 4.2 12 PHASE_*_SPEC.md files — per-phase verdict

All dated Mar 30 2026 09:43–16:50. Each individually audited first/first+middle/last for mode + content:

| File | Lines | Verdict |
|---|---|---|
| `PHASE_0_SPEC.md` | 10 733 | **current** (SEO audit Phase 0 actually ran, output in `seo-audit/`) |
| `PHASE_1_SPEC.md` | 23 592 | **partially-executed, superseded** (Astro + Vercel setup done, but not via autonomous mode) |
| `PHASE_2_SPEC.md` | 22 192 | **partially-executed, superseded** (product catalog built, but `storefront_status` column dead) |
| `PHASE_3A_SPEC.md` | 10 591 | **partially-executed** (SEO data prep done differently) |
| `PHASE_3B_SPEC.md` | 13 193 | **partially-executed** |
| `PHASE_3C_SPEC.md` | 15 298 | **partially-executed** |
| `PHASE_4A_SPEC.md` | 16 824 | **never-executed-as-planned** (catalog/shop toggles built via different data model) |
| `PHASE_4B_SPEC.md` | 6 382 | **never-executed-as-planned** |
| `PHASE_5A_SPEC.md` | 17 028 | **partially-executed-then-superseded** (AI content generator built; pipeline heavily rewritten in Apr 9–10 hardening) |
| `PHASE_5B_SPEC.md` | 12 330 | **never-executed-as-planned** |
| `PHASE_5C_SPEC.md` | 5 971 | **never-executed-as-planned** |
| `PHASE_6_SPEC.md` | 23 190 | **partially-executed** (i18n built, but with different table names and 3-layer hardening that's not in the spec) |
| `PHASE_7_SPEC.md` | 16 967 | **partially-executed** (white-label/theme infra built via Phase 7 SQL 018) |

**Common pattern:** Every SPEC describes an `AUTONOMOUS_START → SPEC → checkpoint → commit → SESSION_CONTEXT update` loop that was never followed. The actual work used different prompts (many in `docs/old prompts/`) that describe Bounded Autonomy + per-item commits. All 12 files are thus historical artifacts describing a planning model that was never executed.

### 4.3 Side A `docs/SESSION_CONTEXT.md`

- **L1–16 "Current Phase: CMS-10 ✅ CMS COMPLETE, Date: 2026-04-01":** Stale by 10+ days. Unaware of Apr 2 brand content guide commits, Apr 3 QA_REPORT, Apr 4 MIGRATION_STATUS, Apr 5–6 i18n full release, Apr 7 DNS readiness audits, Apr 8 status audit (language switcher bug), Apr 9 deep audit runs, Apr 10 translation hardening (Phases A/A.5/B/C.1/C.4/C.5), Apr 11 Hotfix + Phase A. **(26)**
- **L20–38 CMS-10 section:** Treats "Run SQL 036-custom-block-templates.sql" as pending. That SQL was run before Apr 3 (per QA_REPORT.md). **(27)**
- **L127–160 "PENDING — Daniel Must Do":** Lists SQL migrations from Phase 6 and 7 as pending. All were applied per discovery/hotfix log and Side B SESSION_CONTEXT. **(28)**
- **L162–196 "Key Architecture":** Describes Phase 7 tenant-resolution order as "custom_domain → subdomain → ?t= → default". Side B `ARCHITECTURE.md §2.2` (A3 Apr 11) says the canonical order implemented in code is **`?t= → custom_domain → subdomain → default`** ("Why `?t=` is first" §2.3 explains the reason). Order contradicts between these two docs. **(29)**
- **L177–186 Phase 6 translation tables:** describes 3 tables `translations`, `translation_corrections`, `translation_glossary`. Reality: `content_translations`, `translation_memory`, `translation_glossary`, `tenant_i18n_overrides`. **(30)**

### 4.4 Side B `SESSION_CONTEXT.md`

- **L1–8 header "Phase: Pre-DNS Switch - Content Quality + Translation Hardening, Date: April 10, 2026 (afternoon), DNS Readiness: 96/100":** Stale by 24 hours. Apr 11 Hotfix + Phase A not present. **(31)**
- **L96–97 DELTA 11:** Says "Edge Function `translate-content` ITSELF produces wrappers when invoked from the Studio translate button". HF1 resolved this by DELETING the Edge Function. **(32)**
- **L134–144 "Open Issues - Blocking DNS Switch":** First bullet is **"CRITICAL: Edge Function `translate-content` still produces markdown wrappers - Phase A validator did not effectively block on real Studio button path. Needs investigation + rebuild."** HF1 deleted the Edge Function. This blocker is closed. **(33)**
- **L139 "Apply same approach to product translation generation":** The product translation pipeline has been substantially reworked; this bullet's framing is from before HF1. **(34)**
- **L141 "Re-run ALL contamination LIKE queries":** Partially done (Daniel's Phase C.4/C.5 re-translation). **(35)**
- **L174–181 "Git Status > ERP (opticup) - develop branch > Last commits":** Lists commits up to `f0a5c87` (Phase B styleGuide). Newer commits from HF + Phase A missing. **(36)**
- **L182–189 "Storefront":** Lists commits up to `8bbf2c6`. Newer HF + A commits missing. **(37)**

### 4.5 `AUTONOMOUS_START.md` (Mar 30, 81 lines)

- **L11 `Repo: opticalis/opticup`:** Applies Mar-30 single-repo assumption. Post-Phase-1 reality: two repos. Prompt doesn't say which one. **(38)**
- **L15–21 "Read these files carefully":** Points to `CLAUDE.md`, `[MODULE_DIR]/docs/PHASE_[X]_SPEC.md`, `[MODULE_DIR]/docs/SESSION_CONTEXT.md`, `[MODULE_DIR]/ROADMAP.md`, `docs/GLOBAL_MAP.md`. Module 3 reality: three of these paths (SESSION_CONTEXT, MODULE_3_ROADMAP, GLOBAL_MAP) are stale; one (PHASE_*_SPEC) describes abandoned execution model. The reading list pushes Claude Code into a stale mental model. **(39)**
- **L29 `git add -A && git commit -m "..." && git push`:** Directly contradicts Storefront CLAUDE.md §8 rule 6. **(40)**
- **L32 `Update [MODULE_DIR]/docs/db-schema.sql if DB changes were made`:** `db-schema.sql` does not exist under Module 3. **(41)**
- **L58 `Update MODULE_SPEC.md`:** `MODULE_SPEC.md` does not exist under Module 3. **(42)**
- **L63–66 "Integration Ceremony":** Describes merging into `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql`. Neither file is in Module 3 scope; both live at Phase 1A scope (opticup root `docs/`). **(43)**
- **L68 `git tag v[module]-[phase]`:** No such tags exist in the repo history (verified against Discovery §9.2). **(44)**

### 4.6 `Autonomous old/AUTONOMOUS_START_M3_PHASE3A.md` (7 files sample — representative)

- **L1–8:** Targets `opticup-storefront` but under "MODE: AUTONOMOUS" with `git add -A` pattern. Contradicts Bounded Autonomy. **(45)**
- **L29–42 "IF BLOCKED after 3 attempts":** Describes a skip-and-continue pattern that is NOT the Bounded Autonomy Stop-on-Deviation model. **(46)**

Similar stale patterns in the other 6 files. Collectively: 7 files ~34 KB of stale prompt material.

### 4.7 Side B `docs/MODULE_MAP.md` (Mar 30, 194 lines)

- **L11–15 `tenant.ts | 81 | Core`:** Reality 239 lines. **(47)**
- **L12 `products.ts | 195 | Products`:** Reality 285 lines. **(48)**
- **L13 `brands.ts | 65 | Brands`:** Reality 141 lines. **(49)**
- **L20–28 Component list (7 entries):** Reality 52 components. `BrandPage`, `BlogPost`, `BlogCard`, `BrandHero`, `BrandGallery`, `CampaignCard`, `TierCard`, `CampaignTiersBlock`, `ProductsBlock`, `ReviewsBlock`, etc. — none listed. **(50)**
- **L32–42 Pages list:** 9 entries. Reality 40 pages (3 locales × products/brands/categories/search/blog + CMS catch-alls + static product-category pages + supersale-takanon + API routes). **(51)**
- **L70–75 SQL list (5 files 001–005):** Reality 160+ files. **(52)**
- **L113–130 "StorefrontProduct" interface:** Missing `ai_description`, `ai_seo_title`, `ai_seo_description`, `display_mode`, `display_mode_override`, `resolved_mode`, `website_sync`, `search_text`, etc. — all fields that have been added to `v_storefront_products`. **(53)**
- **L159–167 Views table (4 entries):** Lists `v_public_tenant`, `v_storefront_products`, `v_storefront_categories`, `v_storefront_brands`. Reality per VIEW_CONTRACTS.md: 22 views. **(54)**

### 4.8 Side B `docs/CHANGELOG.md` (Mar 30, very short)

- Last entry predates all CMS-* phases and Apr 9–10 work. No Hotfix or Phase A entries. **(55)**

### 4.9 Side A `docs/CHANGELOG.md` (Mar 30, only Phase 0)

- Single Phase 0 entry; no subsequent work tracked. **(56)**

**Total Section-4 entries: 56 line-level / block-level findings of outdated content across both sides.**

---

## 5. Missing

### 5.1 Files referenced by docs but absent from disk

- **EXPECTED:** `MODULE_SPEC.md` under `opticup/modules/Module 3 - Storefront/docs/`
  **REFERENCED BY:** `AUTONOMOUS_START.md:58` ("Update MODULE_SPEC.md — update current state"), Module 3.1 ROADMAP §5 (implicit convention for "every module needs Phase 0 audit and Phase QA final")
  **IMPACT:** Autonomous-mode prompt instructs updates to a non-existent file. Silent no-op.

- **EXPECTED:** `db-schema.sql` under `opticup/modules/Module 3 - Storefront/docs/` (or somewhere in Module 3 folder)
  **REFERENCED BY:** `AUTONOMOUS_START.md:32` ("Update `[MODULE_DIR]/docs/db-schema.sql` if DB changes were made"), `PHASE_*_SPEC.md` files (several SQL blocks imply "add to db-schema.sql")
  **IMPACT:** Schema source of truth splits: SCHEMAS.md (Side B, tables), VIEW_CONTRACTS.md (Side B, views), SQL files in `opticup-storefront/sql/` (Side B), but no `db-schema.sql` consolidating Module 3 SQL. Discovery §4.2 Q2 needed information_schema queries to reconstruct schemas because no single file has them. Side A Module 3 `sql/` is empty.

- **EXPECTED:** `ROADMAP.md` at `opticup-storefront/` repo root
  **REFERENCED BY:** Module 3.1 PHASE_1C SPEC §3 ("Side B scope includes ROADMAP.md if exists"); ERP `AUTONOMOUS_START.md:19` ("Read [MODULE_DIR]/ROADMAP.md")
  **IMPACT:** Side B has no storefront-specific roadmap. Phase/status tracking scattered across SESSION_CONTEXT.md + discovery/.

### 5.2 Phase reports — resolved during 1C run

**Status update (end-of-session verification, ~2 hours after 1C discovery step):** Phase 1A and 1B reports **now exist** at the expected paths — they appeared in `audit-reports/` during this 1C session, after I had already written the audit narrative:

- `PHASE_1A_FOUNDATION_AUDIT_REPORT.md` — 30 137 bytes, mtime 2026-04-11 19:59, 15 foundation files audited + 1 stat-only
- `PHASE_1B_MODULES_1_2_AUDIT_REPORT.md` — 40 835 bytes, mtime 2026-04-11 20:07, 69 of 70 files audited (1 binary .docx correctly skipped), verdict "YELLOW"
- `SESSION_CONTEXT_PHASE_1A.md` — 3 773 bytes, mtime 2026-04-11 20:00
- `SESSION_CONTEXT_PHASE_1B.md` — 6 002 bytes, mtime 2026-04-11 20:08

This resolves the `absent` finding I raised earlier. The parallel 1A/1B chats completed concurrently with this 1C session. **No missing scaffolding remains** for Phase 1. Phase 2 synthesis can proceed when all three reports are reviewed by the Module 3.1 Strategic Chat.

**Note for synthesis:** I did not read the content of 1A or 1B reports (only their headers for verification). Cross-referencing their findings against mine is Phase 2 work.

### 5.3 Module 3 cross-side documents that don't exist anywhere

- **EXPECTED:** A doc describing the 7 Edge Functions whose source is NOT in `opticup-storefront/supabase/functions/` (per Discovery §4.5): `generate-ai-content`, `generate-blog-post`, `generate-brand-content`, `generate-landing-content`, `generate-campaign-page`, `cms-ai-edit`, `fetch-google-reviews`.
  **REFERENCED BY:** Many Studio modules (`studio-ai-prompt.js`, `storefront-content.js`, `storefront-blog.js`, `studio-brands.js`, `studio-campaign-builder.js`, `studio-reviews.js`, `studio-pages.js`) — per Discovery §3.B.1
  **IMPACT:** Critical infrastructure with no documented source location. Cannot be audited, versioned, or rebuilt safely.

- **EXPECTED:** A "relocation principle" doc declaring which Module 3 docs live on which side.
  **REFERENCED BY:** Module 3.1 PHASE_1C SPEC §4 "The split-repo problem" ("this audit must produce a clear answer to: 'Which Module 3 docs belong on which side?'") and Module 3.1 ROADMAP §4 (mandatory artifact #4: `MODULE_DOCUMENTATION_SCHEMA.md`).
  **IMPACT:** Ownership ambiguity across 40+ Module 3 doc files. Phase 2 synthesis of Module 3.1 needs this.

- **EXPECTED:** A doc capturing the 6 brand content rules as first-class content.
  **REFERENCED BY:** DISCOVERY-brand-content-generation Q7 ("partial codification"), STRATEGIC_CHAT_CONTINUATION_v9 L119-168
  **IMPACT:** Daniel's content IP lives in a single strategic-chat continuation file. Discovery explicitly flagged this as a single point of failure.

- **EXPECTED:** A doc describing the translation pipeline architecture.
  **REFERENCED BY:** TECH_DEBT #6 ("significant subsystem … is undocumented")
  **IMPACT:** Pipeline spans 3+ tables, Edge Functions, Studio UI, validators, import/export — all operating without a single architecture reference.

- **EXPECTED:** A canonical "DNS switch gate checklist" document.
  **REFERENCED BY:** multiple scattered docs (SESSION_CONTEXT, DNS-SWITCH-READINESS, DNS-SWITCH-VERIFICATION, individual audit reports)
  **IMPACT:** No single source of truth for "what's blocking DNS switch"; each document has a different list.

### 5.4 Sections stubbed or TIER-C-PENDING

- VIEW_CONTRACTS.md: all 22 views have `Purpose`, `Depends on`, `Dependents`, and `Golden Reference subqueries` marked TIER-C-PENDING. 88 sub-sections in total are stubs.
- ARCHITECTURE.md §3.3 full DROP/CREATE order: TIER-C-PENDING.
- ARCHITECTURE.md §4.3 Golden Reference byte-verify: TIER-C-PENDING.
- SCHEMAS.md `content_translations.entity_type` CHECK constraint: TIER-C-PENDING.
- TROUBLESHOOTING.md Golden Reference #1 byte-verify: TIER-C-PENDING.

These are all "will be populated in Phase B preamble cleanup round" — known gaps, not silent ones.

---

## 6. Cross-references

### 6.1 References from Side A (Module 3) to Phase 1A scope (`opticup` root, `opticup/docs/`)

- `AUTONOMOUS_START.md:19` → `docs/GLOBAL_MAP.md` (opticup root docs)
- `AUTONOMOUS_START.md:64-65` → `docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` (Integration Ceremony writes to these)
- `AUTONOMOUS_START.md:16` → `CLAUDE.md` (opticup root — Phase 1A)
- `AUTONOMOUS_START_M3_PHASE3A.md:27` → `CLAUDE.md` (repo root — Phase 1A scope per Phase 1A SPEC §3)
- Module 3 discovery/MODULE_3_DISCOVERY_REPORT_2026-04-10.md §1 Environment → `opticup/CLAUDE.md` listed as detected (not read beyond existence)
- MODULE_3_ROADMAP.md implicitly inherits rules from `opticup/CLAUDE.md` (ERP constitution)

**Strategic Chat synthesis must verify:** Phase 1A's audit of `opticup/docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` for staleness against what Module 3's Integration Ceremony is supposed to merge into them.

### 6.2 References from Side A to Phase 1B scope (Modules 1, 1.5, 2)

- `MODULE_3_ROADMAP.md:93-102` "תלויות" → "Module 1 (מלאי) ✅ — inventory, brands, images, product data" + "Module 1.5 (shared) ✅ — CSS variables, Modal, Toast, DB.*, ActivityLog" + "Module 2 (Platform Admin) ✅ — storefront_config, plans, feature flags, tenant resolution"
- `AUTONOMOUS_PHASE2B_CLEANUP.md` (inventoried but not read) — from filename, refers to Module 2 Phase 2B
- Side A `docs/MODULE_MAP.md:88-102` lists ERP Studio files (`studio-ai-prompt.js`, `studio-reviews.js`, etc.) whose dependencies may touch Module 1.5 `shared/`
- Discovery report §3.B (Side A inventoried) references `opticup/shared/auth-service.js` and `js/auth-service.js` (Module 1.5 territory) via `prizma_*` sessionStorage consumers

**Strategic Chat synthesis must verify:** Phase 1B's audit of Module 2 `storefront_config` column list vs. Side B `SCHEMAS.md` + `v_storefront_config` view (columns may drift). Also Module 1 `inventory` + `brands` schema vs. Side B Discovery §3.A references.

### 6.3 References from Side B to ERP-side concepts that need ERP-side verification

- Side B `CLAUDE.md §2`: "Cross-cutting project rules (1–23) are maintained in `opticalis/opticup/CLAUDE.md`" — needs verification that Phase 1A confirms Rules 1–23 exist and are consistent.
- Side B `CLAUDE.md §4 "Inherited Rules from the ERP Constitution"`: names Rules 9, 13, 14, 15, 18, 21, 22, 23. Each is a reference to an ERP-side rule. Phase 1A must confirm each rule number matches ERP CLAUDE.md.
- Side B `FROZEN_FILES.md:24`: references `TECH_DEBT #11` and `ARCHITECTURE.md §5.2` for normalize-logo. TECH_DEBT #11 exists; ARCHITECTURE.md §5.2 — need to verify that section exists and discusses the normalize-logo RPC pattern.
- Side B `TECH_DEBT #11 / #12`: references `src/pages/api/normalize-logo.ts` direct reads of `employees`, `auth_sessions`, `brands` (ERP-side auth tables). HF2 log confirmed the references. Phase 1B should confirm `employees` and `auth_sessions` schemas on Module 1.5/2 side.
- Side B `CLAUDE.md §5 Rule 29`: references `ARCHITECTURE.md` for dependency chain and `FROZEN_FILES.md`. Both exist on Side B — OK.
- Side B `ARCHITECTURE.md §1`: references `inventory`, `brands`, `storefront_*` tables as "⚠ DO NOT MODIFY FROM MODULE 3 ⚠" — these tables live in Module 1/2 territory. Phase 1B should confirm the rule is stated on that side too.
- Side B `BRAND_CONTENT_GUIDE.md`: referenced from `studio-brands.js` (ERP) as the authority for brand content generation. Needs verification that ERP Studio prompts actually cite this file.
- Side B `docs/DISCOVERY-5-existing-infrastructure.md`: mentions `opticup/supabase/functions/generate-brand-content/validators.ts` and `opticup/modules/Module 3 - Storefront/docs/old prompts/UPDATE-session-docs-merge.md` — both in ERP repo. Phase 1A/B should confirm these paths.
- Side B `docs/DISCOVERY-brand-content-generation.md` Q7 "Canonical location": `strategic chat/STRATEGIC_CHAT_CONTINUATION_v9.md:119-168` (Side B) — self-reference. But also: "Mirror copy exists in `opticup/modules/Module 3 - Storefront/docs/old prompts/UPDATE-session-docs-merge.md`" — Side A file. Phase 2 synthesis should verify the mirror is consistent.
- Side B Discovery §9.2 (`git log` areas): "ERP M3 commits" counted 120 commits Mar 30–Apr 10. Phase 1A/1B context only — noted.
- Side B `SESSION_CONTEXT.md` L174-181: lists ERP commits `f0a5c87`, `1adad04`, `860d701`, `8de62e1`, `37d4cdd`, `22f65ce`, `9d8e0d2`. Phase 1B cannot verify these exist in ERP repo without crossing into ERP git history (out of 1C scope).

**Strategic Chat synthesis should:**
1. Cross-verify every Rule 1–23 citation in Side B against ERP CLAUDE.md (Phase 1A output).
2. Verify the 7 non-repo Edge Functions' location (Phase 1A/B: search ERP for `supabase/functions/`).
3. Verify `UPDATE-session-docs-merge.md` mirror of the 6 brand content rules is byte-identical to the `v9` source.
4. Confirm Module 2 `storefront_config` schema against Side B `SCHEMAS.md` + `SESSION_CONTEXT Phase 7` entries.

---

## 7. Recommendations

**Scope:** 21 items. Priorities: **H** = high (needed before Module 3 Phase B can start), **M** = medium (needed before Module 3.1 closes), **L** = low (cleanup, post-module).

### 7.1 Core rewrites

**R1. REWRITE** — `opticup/modules/Module 3 - Storefront/MODULE_3_ROADMAP.md`
Rewrite from scratch to reflect the actual phase history: Phase 0 SEO (✅), Phase 1–7 (✅ with deltas from original SPECs), CMS-1..CMS-10 (✅), April 9–10 translation hardening + brand content generation (✅), Hotfix Apr 10–11 (✅, 10 items, see `discovery/hotfix_execution_log_2026-04-10.md`), Phase A Apr 11 (✅, 9 items, see `discovery/phase_a_execution_log_2026-04-11.md`), Phase B/C/D blocked on Module 3.1. Replace the 25 individually-stale lines identified in §4.1. Mark Execution Model as Bounded Autonomy + Cross-Module Safety Protocol (superseding Mar 30 autonomous mode).
**Priority: H.** Blocks any new reader of the Module 3 domain.

**R2. REWRITE** — `opticup/modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`
Replace the "CMS-10 ✅" state with current state: "Phase A complete, Phase B blocked on Module 3.1". Include pointers to `discovery/hotfix_execution_log_2026-04-10.md` and `discovery/phase_a_execution_log_2026-04-11.md` as the authoritative execution history until a proper CHANGELOG catches up.
**Priority: H.**

**R3. REWRITE** — `opticup-storefront/SESSION_CONTEXT.md`
Remove the stale "Edge Function translate-content still produces markdown wrappers" blocker (resolved by HF1 by deleting the Edge Function). Update "Open Issues — Blocking DNS Switch" list to reflect post-Hotfix/Phase-A state. Add "Module 3.1 Phase 1 in progress — blocks Phase B" at the top.
**Priority: H** (session-start reading — readers get a wrong picture on a fresh pull).

**R4. REWRITE** — `opticup/modules/Module 3 - Storefront/docs/MODULE_MAP.md`
This file is Phase 0 era. Regenerate from current code state. Should enumerate the 32 ERP Studio files (14 084 lines per Discovery §2.2.1), the 8 Side A HTML files (1913 lines per §2.2.2), and CSS. Per Side B `CLAUDE.md §18`, MODULE_MAP is a "description" file — should be regenerated mechanically from `find`, not hand-edited.
**Priority: M.** Needed before Phase B can reference it.

**R5. REWRITE** — `opticup-storefront/docs/MODULE_MAP.md`
Same treatment as R4 for the storefront side (125 src/ files, 52 components, 27 lib files, 40 pages). Cross-link to FILE_STRUCTURE.md (which is already A2-rebuild-correct).
**Priority: M.**

### 7.2 Execution-model reconciliation

**R6. DELETE / ARCHIVE** — `opticup/modules/Module 3 - Storefront/Autonomous old/` folder
Entire folder (7 files, ~34 KB). All describe the abandoned autonomous-mode execution model and are actively harmful (a future reader might follow them). Move to `backups/2026-04-11_mar30-autonomous-archive/` or delete outright. If Module 3.1 Phase 2 decides to keep an execution-history artifact, keep ONLY `MODULE_3_STRATEGIC_CHAT_PROMPT.md` as a historical reference annotated "abandoned model — see Module 3.1 for the replacement".
**Priority: M.**

**R7. DELETE / ARCHIVE** — `opticup/modules/Module 3 - Storefront/AUTONOMOUS_START.md` and `MODULE_3_STRATEGIC_CHAT_PROMPT.md`
Same reasoning as R6 but for the top-level Mar-30 prompts. `AUTONOMOUS_START.md` also instructs `git add -A` which directly contradicts Side B CLAUDE.md §8 rule 6 (a Rule 21 / Rule 23 trap waiting to fire).
**Priority: M.**

**R8. FLAG-FOR-DECISION** — 12 `PHASE_*_SPEC.md` files in `docs/`
Each describes an execution model that was never followed. Three options:
(a) Delete all 12. Lose the historical planning context.
(b) Move to `docs/archive/mar30-phase-specs/` with a README annotating "historical planning — never executed in this form". Preserve history, reduce signal loss.
(c) Annotate each file's header with "SUPERSEDED by [real execution]" pointing to the `docs/old prompts/` file(s) that actually ran.
**Recommended: (b).** Lowest risk, preserves history. **Daniel decision needed.**
**Priority: M.**

### 7.3 Dead-weight cleanup

**R9. DELETE** — audit-scratch graveyard in `opticup-storefront/docs/`
Delete all files matching `_deep-audit-*.json`, `_deep-audit-*-batch-*.md`, `_audit-compact.json`, `_audit-extract.txt`, `_batch2-descs.txt`, `_batch7-compact.json`, `_deep-audit-products.json`, `_deep-audit-products-mechanical.json`, `_deep-audit-meta.json`. These are intermediate pipeline artifacts from the Apr 9 parallel-agents deep audit. The useful outputs (`DEEP-AUDIT-brands.md`, `DEEP-AUDIT-products.md`) are already in `docs/` and can stay. **Total: ~32 files, ~1.7 MB.**
**Priority: L.** Baseline noise for verify.mjs per TECH_DEBT #14–15.

**R10. DELETE / MOVE** — the two TRANSLATION-REVIEW dumps in `opticup-storefront/docs/`
`TRANSLATION-REVIEW-2026-04-05.md` (811 KB) + `TRANSLATION-REVIEW-2026-04-06.md` (815 KB) — auto-generated translation comparison dumps. Not human-authored docs. Move to `docs/exports/` (which already holds CSVs and similar auto-generated material) or delete outright. Also consider `TRANSLATION-BACKUP-2026-04-05.json` (2.3 MB) — same category.
**Priority: L.** ~4 MB of doc bloat.

**R11. DELETE** — `opticup/modules/Module 3 - Storefront/backups${timestamp}_pre-content-2/`
Literal unexpanded shell variable in folder name. Broken artifact from a backup command that failed expansion. Not a real backup; contains only one subfolder `opticup-storefront/` that is a partial backup. Safe to delete after Daniel eyeballs the contents.
**Priority: L.**

**R12. DELETE / PRUNE** — `opticup/modules/Module 3 - Storefront/docs/old prompts/` (173 files)
Most files are one-shot execution prompts that ran once and have no ongoing value. Keep the last ~10–20 (most-recent ones including `MODULE_3_HF_SPEC_2026-04-10.md`, `PHASE-A-translation-hardening.md`, etc.). Delete or archive the rest. If concerned about history, `tar.gz` them into `backups/2026-04-11_old-prompts-archive.tar.gz` and delete the folder.
**Priority: L.**

### 7.4 Relocation principle (artifact #4 of Module 3.1's 5 mandatory deliverables)

**R13. FLAG-FOR-DECISION + FORMAL RULE** — Module 3 dual-repo doc relocation principle
State and document this rule as a top-level Module 3.1 artifact (`MODULE_DOCUMENTATION_SCHEMA.md`):

> **Module 3 doc ownership rule:**
> 1. **Side B (`opticup-storefront/`) owns** all docs describing: storefront code structure, Iron Rules 24–31, view contracts, CSS/RTL/i18n rules, image proxy, Astro/Vercel deploy, frontend constitution, Quality Gates, Security Rules (API routes), reference-file classification, frontend TECH_DEBT. Root-level placement (not `docs/`) is the convention.
> 2. **Side A (`opticup/modules/Module 3 - Storefront/`) owns** all docs describing: Module 3 Studio UI files (`modules/storefront/`), ERP-side commit history, Module 3 roadmap + phase history, execution logs, discovery reports, old prompts archive, cross-module safety protocol for Module 3 specifically.
> 3. **Both sides carry pointer stubs** for anything cross-side: SCHEMAS (authoritative on Side B, pointer on Side A), VIEW_CONTRACTS (authoritative Side B, pointer Side A), MODULE_MAP (each side has its own slice, with a top-level overview Side A), CHANGELOG (each side has its own, with a master in Side A), SESSION_CONTEXT (each side has its own).
> 4. **Single-authoritative artifacts (not duplicated):** the 6 brand content rules (→ Side B BRAND_CONTENT_GUIDE.md), the Golden Reference subqueries (→ Side B TROUBLESHOOTING.md §1), Iron Rules 1–23 (→ `opticup/CLAUDE.md`), Iron Rules 24–31 (→ `opticup-storefront/CLAUDE.md`).

**Priority: H.** This IS one of the 5 Module 3.1 mandatory artifacts and must be decided before Module 3 Phase B starts.

### 7.5 Layout convention: Side B reference docs (root vs `docs/`)

**R14. FLAG-FOR-DECISION** — Side B reference doc layout
Two options:
(a) **Keep current layout** (root `/*.md` for all 15 reference files). Update Module 3.1 project memory + PHASE_1C SPEC to reflect `docs/` → root convention. Low friction.
(b) **Move all 15 to `opticup-storefront/docs/`** subfolder to match the convention that Phase 1A/1B assume. Requires updating every `[text](./file.md)` reference across all files, updating CLAUDE.md §10 + §17, updating Task Router §11. High friction.

**Recommended: (a).** The current root-level layout works, is A2-documented in FILE_STRUCTURE.md, and is referenced correctly in CLAUDE.md §9 Authority Matrix. Moving creates churn for no functional gain. **Daniel decision needed** as a formal project-memory update.
**Priority: H** (per DISCOVERY finding C3 in the PHASE_1C SPEC).

### 7.6 Relationship between Module 3 discovery/ and Module 3.1

**R15. FLAG-FOR-DECISION** — Scope of Module 3.1 vs Module 3 `discovery/`
`opticup/modules/Module 3 - Storefront/discovery/` contains 10 files (~440 KB) of Apr 10–11 investigative work that substantially overlaps with Module 3.1's 1C audit (this file). Decide and document:
(a) Module 3's `discovery/` is the **code/DB-level ground truth**. Module 3.1's 1C report is the **docs-surface audit**. Both remain authoritative for their domains, neither supersedes the other. Use cross-references to connect.
(b) Module 3.1's audit supersedes Module 3's discovery for anything doc-related. Module 3 discovery remains authoritative for code findings only.
(c) Module 3 discovery is superseded entirely; Module 3.1 re-runs its own investigation for Phase 2.

**Recommended: (a).** Minimizes work, preserves both efforts' value, is the model the PHASE_1C SPEC implicitly uses. **Daniel decision needed.**
**Priority: H.**

### 7.7 The in-flight docs reconciliation SPEC

**R16. MOVE + FLAG-FOR-DECISION** — `docs/current prompt/MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md`
This is the completed Phase A SPEC. Phase A execution is done (commits `50523b3` through `97846e8`, per execution log). Per Side A convention (`STRATEGIC_CHAT_CONTINUATION_v9.md` "Prompts" section), completed prompts move to `docs/old prompts/`. Move the file. Also: decide whether this SPEC supersedes or is subordinate to Module 3.1's docs-reconstruction mission (see R15 for the related scope decision).
**Priority: L** (move). **H** (scope overlap — but see R15).

### 7.8 Iron Rule 24 and Rule 25 drift

**R17. REWRITE** — `opticup-storefront/CLAUDE.md §5 Iron Rule 24` allowed-views list
Current list (9 views) is incomplete relative to VIEW_CONTRACTS.md (22 views, ~13 runtime-used). Add `v_storefront_reviews`, `v_storefront_components`, `v_content_translations`, `v_ai_content`, `v_tenant_i18n_overrides`. This closes Discovery F026/F035/F139. Phase A A5 was "CLAUDE.md accuracy fixes" but left this text portion untouched.
**Priority: M.** Rule 29 View Modification Protocol depends on this.

**R18. REWRITE** — `opticup-storefront/CLAUDE.md §5 Iron Rule 25` Golden Reference pointer
Change "using the Golden Reference subquery in `VIEW_CONTRACTS.md`" → "using the Golden Reference subquery in `TROUBLESHOOTING.md §1` (also referenced from `VIEW_CONTRACTS.md`)". Matches §9 Authority Matrix and matches reality (VIEW_CONTRACTS.md has TIER-C-PENDING markers for every subquery).
**Priority: L.**

### 7.9 Brand content rules — extract from strategic chat

**R19. MERGE** — 6 brand content rules from `strategic chat/STRATEGIC_CHAT_CONTINUATION_v9.md:119–168` into `BRAND_CONTENT_GUIDE.md` + `opticup/supabase/functions/generate-brand-content/styleGuide`
Per DISCOVERY-brand-content-generation Q7: these rules live ONLY in the v9 file and a mirror copy in `opticup/modules/Module 3 - Storefront/docs/old prompts/UPDATE-session-docs-merge.md`. Single point of failure. BRAND_CONTENT_GUIDE.md is already listed in CLAUDE.md §9 as the authority for brand content format — make it so. Also update the Edge Function's system prompt (the `styleGuide` constant — currently has basic rules but missing 4/6 of Daniel's rules) to reference/contain these rules. This close-looks the Module 3 Phase B brand-content work.
**Priority: M.** Protects Daniel's content IP and unblocks Module 3 Phase B.

### 7.10 Edge Functions source ownership

**R20. FLAG-FOR-DECISION + DISCOVERY** — 7 Edge Functions with unknown source location
`generate-ai-content`, `generate-blog-post`, `generate-brand-content`, `generate-landing-content`, `generate-campaign-page`, `cms-ai-edit`, `fetch-google-reviews`. Per Discovery §4.5 their source is "Not in storefront repo". Module 3.1 Phase 2 synthesis should:
1. Search `opticup/supabase/functions/` via Phase 1A (foundation audit); if found, document ownership.
2. If absent from both repos, document that they are "deployed-only from Supabase Dashboard" and create a `DEPLOYED_EDGE_FUNCTIONS.md` registry file (probably in Side B or as artifact #6 of Module 3.1).
3. Either way — each function needs an owner, a source location, and a versioning story.

**Priority: H.** Critical infrastructure with no documented source. FU1 in the recommendations v3 doc but not yet assigned to any phase.

### 7.11 DNS switch checklist

**R21. MERGE** — all DNS-switch scatter into a single `DNS_SWITCH_READINESS.md` owner file
Currently DNS-switch status is spread across: Side B `SESSION_CONTEXT.md`, Side B `docs/DNS-SWITCH-READINESS.md`, Side B `docs/DNS-SWITCH-VERIFICATION.md`, Side B `TECH_DEBT.md`, Side A `docs/WORDPRESS_COMPARISON.md`, Side A `docs/MIGRATION_STATUS.md`, the Hotfix + Phase A sanity-check declarations. Each has a different blocker list. Collapse to one source of truth, per the dual-repo ownership rule in R13.

**Priority: M.** Not a Module 3.1 scope issue per se, but surfaces while auditing Module 3 and belongs in the synthesis phase.

---

## End of Report

- **Report file size:** (~41 KB, ~900 lines — will be written by the filesystem)
- **Generated by:** Claude Code under Phase 1C of Module 3.1
- **Total files read in full:** ~40
- **Total files sampled:** ~6 (first 100 + last 50 + grep-scan for ORPHAN [audit-output] / TRANSLATION-REVIEW files)
- **Total files inventoried-only:** ~220 (old prompts bulk, Mar-30 Autonomous old bulk, audit-scratch data dumps, backups, MultiSale/SuperSale extracts, seo-audit CSVs, screenshots, `docs/archive/`, `.tmp/`, `scripts/discovery/`, the 8 earlier STRATEGIC_CHAT_CONTINUATION versions)
- **Total time (estimated):** ~90 minutes of reading + synthesis
- **Branches verified:** `opticup/develop` @ `97846e8` (A8b — Golden Reference SPEC wrapping), `opticup-storefront/develop` @ `97846e8`/`2d8c281` (post-Phase-A)

**Cross-repo discrepancy total (Section 3.3):** 16 findings across 16 numbered entries (17–32).

**Recommendations total (Section 7):** 21 items. Of these, **8 are FLAG-FOR-DECISION** (R8, R13, R14, R15, R16 scope portion, R20, R21, and R15+R16 combined counts). **4 are H-priority rewrites** (R1, R2, R3, R13). **The two most urgent decisions** (per PHASE_1C SPEC §4) are **R13 (relocation principle)** and **R15 (scope relationship between Module 3 discovery and Module 3.1)** — both need resolution before Module 3.1 Phase 2 synthesis can start.
