# Project Structure Audit — 2026-05-09

**Auditor:** Claude Code (Opus 4.7), opticup-strategic skill loaded.
**Mode:** Read-only. Repo state unchanged from start to end of audit.
**Scope:** Entire `opticalis/opticup` repo from root down. Storefront repo not in scope.
**Method:** 10 audit passes — root inventory, modules/, docs/, __LAUNCH_PLAN_DRAFT__/, outputs/, archive/, campaigns/, .claude/, root HTML, cross-cutting. Five sub-agents parallelised, results cross-checked by orchestrator.

---

## Section 1 — Executive Summary

**Overall health: 🟡 YELLOW.** The project is structurally functional and shipped Prizma to production six days ago — the core architecture (CLAUDE.md, MASTER_ROADMAP, GLOBAL_MAP, GLOBAL_SCHEMA, modules/Module N) is intact and current. But after Module 4's marathon close-out, accumulated session detritus and an incomplete cleanup pass earlier today have left a layer of organisational noise that will quietly raise the cost of every future session if not flattened.

**Top 3 critical issues:**

1. **The Module 1 duplicate is real but inverted from the obvious read.** `modules/Module 1 - Inventory Management/` (created Apr 19, 36 files at last static count, last commit 2026-05-06) holds the canonical module documentation — `MODULE_SPEC.md`, `MODULE_MAP.md`, `db-schema.sql`, `CHANGELOG.md`, `SESSION_CONTEXT.md`, all the `PHASE_*_SPEC.md` files. `modules/Module 1 - Inventory/` (created Apr 26, file count smaller, last commit 2026-04-27) holds **only** a `docs/specs/` subfolder with 9 SPECs from Apr 26–27 that were authored in the wrong location. The remediation is "merge the 9 stray SPECs into the canonical module, then delete the stray dir" — not the reverse. **Five subagents and the Pass 1+2 agent initially recommended the opposite direction**; verifying inside both folders before acting is the difference between recovery and data loss.

2. **`_archive/root-deprecated/` was staged today but never committed forward.** Seven root-level files (`DANIEL_QUICK_REFERENCE.md`, `STRATEGIC_CHAT_ONBOARDING.md`, `MODULE_DOCUMENTATION_SCHEMA.md`, `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md`, `UNIVERSAL_SECONDARY_CHAT_PROMPT.md`, `PHASE_0_PROGRESS.md`, `handoff-next-session.md`) were copied into `_archive/root-deprecated/` during today's Cowork session; the originals were never deleted. The result is seven byte-identical duplicates living at root and in the staged archive. Until Daniel decides "commit forward (delete root)" or "abort (delete _archive/)", every future session sees the duplicates and re-asks the same question.

3. **`docs/FILE_STRUCTURE.md` is stale enough to mislead.** Per CLAUDE.md §7 it is the authoritative repo file tree. Today's reorg (`__LAUNCH_PLAN_DRAFT__/_archive/`, `__LAUNCH_PLAN_DRAFT__/architecture-briefs/`, `__LAUNCH_PLAN_DRAFT__/handoffs/`, root `_archive/`, the M12 brief close, the `decisions/` subfolder under the architect skill) is invisible in it — zero hits when grepped for `__LAUNCH_PLAN_DRAFT__`, `_archive`, or `M12`. Anyone who reads it as "current" will be wrong about where things live. This is the worst kind of staleness: a document that *looks* authoritative.

**Total estimated remediation effort:** ~6–9 hours across all stages, distributed:
- Stage A (low-risk wins): 60–90 min
- Stage B (modules/ + Module 1 fix): 90–150 min
- Stage C (cleanup polish): 60–90 min
- Stage D (post-LIVE only): deferred — not in this estimate

This is a small fraction of a single day's work; the cost of *not* doing it is paid in confusion across every future session, indefinitely.

**Things that are actually fine and should not be touched:**
- The flat dirs under `modules/` (inventory, crm, storefront, admin, brands, debt, etc.) co-existing with `Module N - Name` dirs **is intentional**. Flat dirs are JS/CSS implementation loaded by root HTML pages; "Module N - Name" dirs hold documentation/specs/SESSION_CONTEXT. This split is documented in `docs/FILE_STRUCTURE.md` and `MODULE_DOCUMENTATION_SCHEMA.md`. It is not a Rule 21 violation. Pass 10's flag here is a false positive.
- The 18 root HTML files cannot move without breaking GitHub Pages and `js/shared.js` redirect logic. Leave them alone.
- `campaigns/` at root is intentionally separate from Module 4 — Campaign Overseer is a distinct operational role with its own cadence. Keep at root.

---

## Section 2 — Findings by Pass

### Pass 1 — Repo root inventory

| Item | Class | Last commit | Verdict |
|------|-------|-------------|---------|
| `CLAUDE.md` | ✅ canonical | 2026-04-29 | Source of truth for Iron Rules. Keep. |
| `MASTER_ROADMAP.md` | ✅ canonical | 2026-05-04 (later edits today, untracked) | Source of truth for cross-module state. Keep. |
| `README.md` | ✅ canonical | 2026-04-11 | Project overview. Keep. |
| `TECH_DEBT.md` | ✅ canonical | 2026-04-16 | Living debt register. Keep. |
| `package.json` / `package-lock.json` | ✅ canonical | 2026-04-27 | Active dependencies. Keep. |
| `.gitignore` | ✅ canonical | 2026-05-02 | Recently maintained. Keep. |
| `.mcp.json`, `.nojekyll`, `.husky/`, `.github/`, `.vscode/`, `CNAME`, `favicon.ico` | ✅ infra | various | Standard repo infrastructure. Keep. |
| `index.html` and 17 other root `*.html` | ✅ canonical | various | GitHub Pages requires root location. Keep (Pass 9 detail). |
| `js/`, `css/`, `shared/`, `scripts/`, `migrations/`, `supabase/`, `tests/` | ✅ canonical | recent | Active code/infra. Keep. |
| `node_modules/`, `watcher-deploy/node_modules/` | ✅ ignored | n/a | Both correctly gitignored. Keep. |
| `serve.js` | ⚠️ ambiguous | 2026-03-19 | Local dev HTTP server. In `.gitignore` line 13 — the FILE itself is ignored. Tracked in git history from before that ignore. Low-risk; keep. |
| `opticup-skills.plugin` (51,847 bytes) | 🗄️ build artifact | 2026-04-14 (per filename) | Cowork plugin build output. **Already gitignored** (.gitignore line 24) but file present at root — was tracked before ignore added. Untracked-ignored is fine. |
| `DANIEL_QUICK_REFERENCE.md` | ❓ ambiguous (also at `_archive/root-deprecated/`) | 2026-04-11 | See top-3 issue #2. Daniel decision needed. |
| `STRATEGIC_CHAT_ONBOARDING.md` | ❓ ambiguous (also at `_archive/root-deprecated/`) | 2026-04-11 | Same. |
| `MODULE_DOCUMENTATION_SCHEMA.md` | ❓ ambiguous (also at `_archive/root-deprecated/`) | 2026-04-11 | Same — but this one is referenced by name from `docs/FILE_STRUCTURE.md` and CLAUDE.md narrative. If archived, those references break. |
| `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md` | ❓ ambiguous | 2026-04-11 | Same. Referenced from `MASTER_ROADMAP.md` Decisions Log entry "Module 3.1 Project Reconstruction closed". |
| `UNIVERSAL_SECONDARY_CHAT_PROMPT.md` | ❓ ambiguous | 2026-04-11 | Same. |
| `PHASE_0_PROGRESS.md` | 🗄️ legacy (also staged) | 2026-04-10 | Phase 0 completion summary. Pure history. Safe to archive. |
| `handoff-next-session.md` | 🗄️ legacy (also staged) | 2026-04-21 | Single-session handoff (Hebrew, CRM B6 era). Safe to archive — but logically belongs in `__LAUNCH_PLAN_DRAFT__/handoffs/` not `_archive/`. |
| `archive/` (11 files, all 2026-03-14) | 🗄️ legacy | 2026-03-14 | `CLAUDE10-3.md`, old `MASTER_ROADMAP.md`, 10× `index_V*.html` versions. Pure history; not referenced anywhere. **In `.gitignore` line 31** so untracked-ignored, but tracked from before. |
| `data/` (11 files, all 2026-03-14) | 🗄️ legacy | 2026-03-14 | Seed/test JSON files (`contacts_data`, `customers_data`, `frames_data`, `schema.json`, etc.) from project bootstrap. **Zero references** from `js/`, `shared/`, or root HTML. Safe to archive. |
| `---QA---/` (2 files, 2026-03-14) | 🗄️ legacy | 2026-03-13 | `QA.md` + Hebrew duplicate `בדיקת קוד.md`. From project genesis. Awkward dir name (triple-dash). Not referenced. Safe to archive. |
| `watcher-deploy/` | ✅ infra | 2026-03-22 | Daniel's local Watcher service installer. Has its own `node_modules/`, `package.json`, `setup.bat`. Intentional standalone — runs only on the Windows desktop. Keep. |
| `.DS_Store` | 🗑️ stale | 2026-03-21 | macOS metadata file at repo root. Already in `.gitignore` line 60 but tracked from before. **Three .DS_Store files committed** (root + `modules/` + `modules/Module 1.5 - Shared Components/`). Untrack with `git rm --cached`. |
| `_archive/` (root, 7 files) | ❓ staging | 2026-05-09 | Created today. Holds the 7 root-deprecated copies + a placeholder. Untracked. Decision pending (top-3 #2). |
| `__LAUNCH_PLAN_DRAFT__/` | ✅ canonical (post-reorg) | 2026-05-09 | Pre-LIVE planning artefacts. Reorganised today. Mostly clean (Pass 4 detail). |
| `outputs/` (52 .md + 2 image subdirs) | 🗄️ ignored | 2026-05-02 | Per-session prompts/handoffs. **In `.gitignore` line 48** as "transient" but already tracked from earlier sessions. Zero references from anywhere. Candidate for `git rm --cached outputs/`. |
| `MODULE_DOCUMENTATION_SCHEMA.md` (root) | see above | — | — |
| `campaigns/` (1 subdir `supersale/`, 135 files) | ✅ canonical | 2026-05-03 | Campaign Overseer working area. Keep. (Pass 7 detail.) |

**Pass 1 verdict:** Root is mostly canonical, but accumulates debris. Five distinct categories of root debris are present: (a) historical archive (`archive/`, `data/`, `---QA---/`), (b) staged-but-not-committed archive (`_archive/`), (c) tracked but ignored (`outputs/`, `.DS_Store`), (d) ambiguous-status onboarding docs, (e) build artefact (`opticup-skills.plugin`). All five are reachable by Stage A or Stage C decisions.

### Pass 2 — `modules/` deep dive (the most important pass)

**The two-scheme reality.** `modules/` contains 22 entries:
- **6 "Module N - Name" dirs** (Module 1, 1.5, 2, 3, 3.1, 4) — these hold **documentation, specs, ROADMAP, MODULE_SPEC, MODULE_MAP, db-schema, CHANGELOG, SESSION_CONTEXT, and the `docs/specs/{SLUG}/` SPEC folders.**
- **15 flat dirs** (`access-sync`, `admin`, `admin-platform`, `audit`, `brands`, `crm`, `debt`, `goods-receipts`, `inventory`, `permissions`, `purchasing`, `settings`, `shipments`, `stock-count`, `storefront`) — these hold **the actual JS/CSS/HTML implementation that root HTML pages load.**

**This split is intentional.** It is documented in `docs/FILE_STRUCTURE.md` and `MODULE_DOCUMENTATION_SCHEMA.md`. Verification: `grep "modules/inventory\|modules/crm\|modules/storefront"` returns hits in `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md`, `opticup-executor/SKILL.md`, and others — the convention is known to the executor skill. Pass 10's call to "consolidate" the flat dirs into Module N folders would break every root HTML page on next reload. **DO NOT consolidate.** What's missing is a one-line note inside each "Module N - Name" README pointing at the implementation flat dir, but that's a documentation polish item, not a structural fix.

**Module 1 duplicate — the real issue:**

| Path | Created | Files | Last commit | Contents |
|------|---------|-------|-------------|----------|
| `modules/Module 1 - Inventory Management/` | 2026-04-19 | ~36 + nested | 2026-05-06 | **Canonical.** `docs/MODULE_SPEC.md`, `docs/MODULE_MAP.md`, `docs/db-schema.sql`, `docs/CHANGELOG.md`, `docs/SESSION_CONTEXT.md`, `ROADMAP.md`, all the `PHASE_*_SPEC.md` from old layout, plus 1 new SPEC at `docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/`. |
| `modules/Module 1 - Inventory/` | 2026-04-26 | smaller, only docs/specs/ | 2026-04-27 | **Stray.** Holds only a `docs/specs/` subfolder with 9 SPECs from 2026-04-26 / 2026-04-27 (M1_DEBT_VAT_FALLBACK_GUARD, M1_FIXES_2026_04_26, M1_RECEIPT_PO_COMPARE_SHRINK, PERMISSIONS_AUDIT_PHASE1_2026_04_27, PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27, PERMISSIONS_PHASE2_FIX_2026_04_27, PERMISSIONS_PHASE3_CSS_GATING_2026_04_27, STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27, STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27). No MODULE_SPEC, no MODULE_MAP, no SESSION_CONTEXT, no db-schema. |

**Verdict:** "Module 1 - Inventory Management" is canonical. The 9 SPECs in the stray folder must be moved INTO `Module 1 - Inventory Management/docs/specs/` (preserving folder names), then the stray dir deleted. The fact that the May 6 SPEC was correctly placed in Inventory Management proves the convention is known — the Apr 26–27 SPECs are an isolated drift, not the new normal.

**Pass 2 modules/ table** — every entry classified, recommended action:

| Item | Type | Active? | Recommendation |
|------|------|---------|----------------|
| `Module 1 - Inventory` | docs (stray) | No | **Stage B**: move 9 specs into `Module 1 - Inventory Management/docs/specs/`, then `git rm -r` the dir. |
| `Module 1 - Inventory Management` | docs (canonical) | Yes | Keep. Receive the 9 stray specs. |
| `Module 1.5 - Shared Components` | docs | Yes | Keep. |
| `Module 2 - Platform Admin` | docs | Yes | Keep. |
| `Module 3 - Storefront` | docs | Yes | Keep. |
| `Module 3.1 - Project Reconstruction` | docs (closed) | Closed | Keep — historical. |
| `Module 4 - CRM` | docs | Yes | Keep. |
| `inventory/` (flat) | impl JS | Yes — loaded by inventory.html | Keep at flat location. **Documentation polish:** add a one-line pointer from `Module 1 - Inventory Management/MODULE_MAP.md`. |
| `crm/` (flat) | impl JS | Yes — loaded by crm.html | Keep. Same docs polish. |
| `storefront/` (flat) | impl JS | Yes — loaded by storefront-*.html (Studio/CMS) | Keep. Same docs polish. |
| `admin/` (flat, 2 files) | impl JS | Loaded by admin.html | Keep. Tiny — verify no dead code inside. |
| `admin-platform/` (flat, 10 files) | impl JS | Loaded by admin.html (Platform Admin features) | Keep. Verify naming clarity vs `admin/`. |
| `audit/` | impl JS | Used by Sentinel/audit reports | Keep. |
| `brands/` | impl JS | Loaded by storefront brand pages | Keep. |
| `debt/` | impl JS | Loaded by suppliers-debt.html | Keep. |
| `goods-receipts/` | impl JS | Inventory feature, recently active (May 6) | Keep. |
| `permissions/` | impl JS | Permissions UI | Keep. |
| `purchasing/` | impl JS | Purchasing flow | Keep. |
| `settings/` | impl JS | Loaded by settings.html | Keep. |
| `shipments/` | impl JS | Loaded by shipments.html | Keep. |
| `stock-count/` | impl JS | Stock count feature | Keep. |
| `access-sync/` | impl/scripts | Daniel's Access DB sync | Keep. |

**Pass 2 verdict:** One real defect (Module 1 stray + 9 SPECs), zero structural violations of the documented two-scheme pattern. The popular intuition "flat dirs are wrong" is incorrect — they are the implementation half of an explicitly designed split.

### Pass 3 — `docs/` directory

| File | Lines | Last commit | Verdict |
|------|-------|-------------|---------|
| `GLOBAL_MAP.md` | — | 2026-05-06 | ✅ Current (M4 close integrated). |
| `GLOBAL_SCHEMA.sql` | — | 2026-05-06 | ✅ Current. |
| `FILE_STRUCTURE.md` | — | 2026-05-06 12:20 | 🚩 **Stale — pre-reorg.** 0 mentions of `__LAUNCH_PLAN_DRAFT__`, `_archive`, `M12`, `decisions/`. |
| `DB_TABLES_REFERENCE.md` | — | 2026-04-17 | ⚠️ 22 days old — verify against M4 close additions. |
| `CONVENTIONS.md` | — | 2026-04-17 | ⚠️ 22 days old — likely still valid (conventions change slowly), but worth a pass. |
| `TROUBLESHOOTING.md` | — | 2026-04-26 | ⚠️ 13 days old — should pick up post-cutover lessons. |
| `AUTONOMOUS_MODE.md` | — | 2026-04-17 | ✅ Static reference; OK. |
| `LEARNINGS.md` | — | (untracked from canonical list) | ❓ Not in CLAUDE.md §12. Zero references from elsewhere in repo. Orphan. |
| `IMPROVEMENT_LOG.md` | — | (same) | ❓ Same — orphan. |
| `PROJECT_VISION.md` | — | (same) | ❓ Same — orphan. |
| `guardian_test.tmp` | empty | n/a | 🗑️ Test artefact. Delete. |
| `guardian/` (subdir) | varies | 2026-05-09 | ✅ Sentinel auto-writes. `GUARDIAN_ALERTS.md` regenerated today (09:22). The directory is in `.gitignore` (lines 44–45) so files are local-only. OK. |

**Pass 3 verdict:** 7/7 canonical files present; FILE_STRUCTURE.md is stale and is the immediate fix; 3 orphan docs (LEARNINGS, IMPROVEMENT_LOG, PROJECT_VISION) need a Daniel decision (keep+document, or archive).

### Pass 4 — `__LAUNCH_PLAN_DRAFT__/` post-reorg verification

Tree as of audit:
```
__LAUNCH_PLAN_DRAFT__/
├── README.md (created 2026-05-09) ✅ accurate
├── MASTER_LIVE_PLAN.md (deprecated header, points to /MASTER_ROADMAP.md)
├── _archive/MASTER_LIVE_PLAN_v1.md (1 file)
├── access-audit/ (3 reports + 71+ data/tool files, pre-existing)
├── architecture-briefs/
│   ├── M5 - Customers/ ... M15 - Queue/ (8 module folders)
│   └── _archive/ (6 older HTML mockup iterations)
├── campaign-overseer/ (4 files, pre-existing)
├── handoffs/ (M12_HANDOFF.md, M13_HANDOFF.md)
├── site-overseer/ (5 files, updated today)
└── supervisor-system/ (2 legacy files)
```

**README accuracy:** ~90%. Folder map is correct; `campaign-overseer/`, `site-overseer/` mentioned in Authority Map but missing from the directory tree visualisation. Minor.

**Issue: handoff duplication.** M12 and M13 handoff files exist in BOTH `handoffs/` AND `architecture-briefs/<MODULE>/` — byte-identical copies. The README declares `handoffs/` canonical for new modules; older M5–M11 handoffs live inside their architecture-briefs folder. Convention is "transitional" — needs explicit decision and a single sweep to apply consistently.

**Rename `__LAUNCH_PLAN_DRAFT__` to something better?** `grep -rn "__LAUNCH_PLAN_DRAFT__"` shows ~5 documentation references (README, MODULE_BRIEF_TEMPLATE, decisions/M11.md, MASTER_ROADMAP.md §2.5 + §2.5 footer, plus the README itself). No code references. Rename cost = 5 doc edits. Feasible. Suggested name: `planning/` (lowercase, short, accurate). Defer to Stage C — not urgent.

### Pass 5 — `outputs/`

52 `.md` files (~1.3 MB) + 2 image subdirs (mockups, screenshots). Everything from 2026-04-26 bulk commit (e326532, 826ab87, d24a3b8) plus 2 newer files from 2026-05-02. **In `.gitignore` line 48** but tracked from before. **Zero references** from anywhere in the repo (no `outputs/` mentions in `.md`, `.json`, `.mjs`, `.js`).

**Recommendation:** `git rm --cached -r outputs/` — stop tracking, keep ignored. Files remain on disk, history preserved in git, working tree gets cleaner. Stage C item.

### Pass 6 — `archive/` (root-level, the OLD one)

11 files all from 2026-03-14: `CLAUDE10-3.md`, `MASTER_ROADMAP.md` (Hebrew, March-era), `index_backup.html`, `index_V1.1A.html`–`index_V1.7A.html`, `index_V1.2A.test.html`. Pure project genesis history. **In `.gitignore` line 31** as `**/archive/` but tracked from before.

**Three archive locations now:** `archive/` (root, March legacy) + `_archive/` (root, today's staging) + `__LAUNCH_PLAN_DRAFT__/_archive/` (today, MASTER_LIVE_PLAN_v1). Sub-agent (Pass 5+6+7) recommended consolidating to a single `_archive/` with subfolders (`index-versions/`, `project-snapshots/`, `shared-templates/`, `launch-plan-versions/`). I agree in principle — but only Stage C, not Stage A. Reason: the `archive/` dir is in `.gitignore` already so it has no daily cost; consolidation is cosmetic, not functional.

### Pass 7 — `campaigns/`

`campaigns/supersale/` is the sole subfolder. 135 files, ~3 MB. Has its own `CLAUDE.md`, `FLOW.md`, `CRM_SCHEMA_DESIGN.md`, `DATA_DISCOVERY_REPORT.md`, `migrations/`, `scripts/`, `make/`, `monday/`, `messages/`, `mockups/`, `exports/`. Referenced from:
- `modules/Module 4 - CRM/docs/MODULE_MAP.md`
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `docs/guardian/MISSION_3_SAAS_READINESS.md`
- `.claude/worktrees/jovial-lewin-b61073/...` (stale worktree)

**Why not inside Module 4?** Campaign Overseer is a separate operational role from Module 4 development; separation enables independent cadence. Confirmed correct.

**Issue found:** `campaigns/supersale/migrations/001_crm_schema.sql` and `modules/Module 4 - CRM/migrations/` may overlap. Sub-agent flagged duplicate; the canonical home is Module 4 (per Authority Matrix). Add a one-line README at `campaigns/supersale/migrations/` saying "snapshot from data discovery; canonical schema lives in Module 4". Polish, not crisis.

**Missing:** `campaigns/README.md` at the campaigns/ root explaining the separation rationale and how to add a future campaign.

### Pass 8 — `.claude/` and skills

| Skill | Lines | Last commit | Verdict |
|-------|-------|-------------|---------|
| opticup-executor | 649 | 2026-05-06 | ✅ Active |
| opticup-strategic | 1008 | 2026-05-06 | ✅ Active (could trim — overlaps with architect) |
| opticup-architect | 543 | 2026-05-06 | ✅ Active, reorganised today |
| opticup-campaign-overseer | 352 | 2026-05-04 | ✅ Active |
| opticup-guardian | 325 | 2026-04-14 | ✅ Active |
| opticup-reviewer | 231 | 2026-04-14 | ✅ Active |
| opticup-sentinel | 177 | 2026-04-14 | ✅ Active |

**opticup-architect post-reorg is clean** — `references/decisions/` has 7 per-module files (CROSS, M5–M8, M11, M12), DECISIONS_LOG.md is an INDEX (~9.4 KB), Module Close Ceremony documented.

**Orphan files:**
- `.claude/skills/opticup-strategic/test_write` (empty, 2026-04-29) — delete.
- `.claude/worktrees/jovial-lewin-b61073/` — stale worktree from late April, full repo copy. **The worktree contains stale duplicates of every root file** which makes grep results noisier across the audit. `git worktree prune` cleans this; if that doesn't work, `rm -rf` on the worktree dir directly (it's not a real git ref anymore).

### Pass 9 — Root HTML files

All 18 are active, no orphans. `r.html` is a tiny redirect helper (event registration). `landing.html` and `error.html` are the tenant code-entry and error pages respectively. **`js/shared.js` hard-codes redirects to `/landing.html` and `/error.html`** — moving these breaks login flow. **Verdict: no root HTML can move without code changes.** That work is post-LIVE only (Stage D), if ever — there's no real benefit to moving them.

`inventory.html` at 1,046 lines (in 66,877 bytes) is the largest and a refactor candidate, but that's a Module 1 maintenance task, not a structural cleanup item. Out of scope here.

### Pass 10 — Cross-cutting checks

**Duplicate-content markdown:** 7 files identical in root and `_archive/root-deprecated/` (the staging issue from top-3 #2).

**`.gitignore` audit:**
- ✅ Well-structured: node_modules, env files, build artefacts, session hygiene, test scratch all covered.
- 🚩 **3 .DS_Store files committed** (root + modules/ + Module 1.5) despite line-60 ignore. One-time `git rm --cached`.
- ⚠️ `outputs/` tracked despite line-48 ignore. Same fix.
- ⚠️ `archive/` tracked despite line-31 `**/archive/` ignore. Same fix.
- ✅ Negation rules for `.claude/skills/opticup-*/` correctly preserve project skills while ignoring local Claude config.

**`package.json` scripts:** 100% valid. All paths resolve.

**Iron Rule 21 — actual structural duplications (after correcting Pass 10's false positives):**

1. **Module 1 - Inventory vs Inventory Management** (real, top-3 #1).
2. **`MASTER_ROADMAP.md` (root) vs `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md`** — partial: MASTER_LIVE_PLAN was deprecated today and now has a deprecation header pointing at MASTER_ROADMAP. The deprecated copy still exists; per its own header it will be "removed in a future cleanup pass." That cleanup is Stage A.
3. **`archive/MASTER_ROADMAP.md` (March legacy) vs `MASTER_ROADMAP.md` (root, current)** — this is a March snapshot and intentionally left in `archive/`. Not a real duplication; archive is an explicit history vault.
4. **5 onboarding docs at root** (`DANIEL_QUICK_REFERENCE`, `STRATEGIC_CHAT_ONBOARDING`, `MODULE_DOCUMENTATION_SCHEMA`, `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT`, `UNIVERSAL_SECONDARY_CHAT_PROMPT`) — purpose overlap. STRATEGIC_CHAT_ONBOARDING (Hebrew) and UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT cover similar ground; DANIEL_QUICK_REFERENCE is a separate cheatsheet. A single `docs/onboarding/` consolidation would help, but each file does have a distinct audience. Stage C.
5. **3 archive locations** (`archive/`, `_archive/`, `__LAUNCH_PLAN_DRAFT__/_archive/`) — true fragmentation. Stage C.
6. **CRM schema in two places** (Module 4 migrations, campaigns/supersale/migrations) — minor, doc-link fix.

Pass 10's flag of "Module 2 admin / admin-platform vs Module 2 - Platform Admin" and "modules/storefront vs Module 3 - Storefront" and "modules/crm vs Module 4 - CRM" are **NOT** Rule 21 violations (the two-scheme split is intentional, see Pass 2).

**`node_modules` sanity:** Two trees by design — root for ERP, watcher-deploy for the Windows service. Both ignored. Correct.

---

## Section 3 — Remediation Plan

Each stage is independently shippable. Each item lists the SPECIFIC commands a future executor would run. **Do not run any of these now** — this report is read-only.

### Stage A — Low-risk, high-impact (60–90 min)

These are the wins that take minutes and unlock clarity for every future session.

**A.1 — Resolve the `_archive/root-deprecated/` staging.** *Daniel decision required first* (Open Question Q1). Two paths:

> **Path 1 — Commit forward (archive the originals):**
> ```
> git rm "DANIEL_QUICK_REFERENCE.md" "STRATEGIC_CHAT_ONBOARDING.md" "MODULE_DOCUMENTATION_SCHEMA.md" "UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md" "UNIVERSAL_SECONDARY_CHAT_PROMPT.md" "PHASE_0_PROGRESS.md" "handoff-next-session.md"
> git add _archive/root-deprecated/
> # Then update CLAUDE.md (any refs), MASTER_ROADMAP.md (Module 3.1 closure entry), and FILE_STRUCTURE.md to point at _archive/root-deprecated/ for the moved docs.
> git commit -m "chore(repo): archive 7 superseded root onboarding/handoff docs to _archive/root-deprecated/"
> ```
> **Risk:** Medium — those docs are referenced from the strategic chat onboarding flow. References must be updated in the same commit.
>
> **Path 2 — Abort (delete the staging copies):**
> ```
> rm -rf _archive/root-deprecated/
> # If _archive/ is now empty: rmdir _archive/
> ```
> **Risk:** Low — `_archive/root-deprecated/` is untracked so this affects nothing in git.

I lean **Path 2 (abort)** — three of the seven files (`MODULE_DOCUMENTATION_SCHEMA`, `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT`, `UNIVERSAL_SECONDARY_CHAT_PROMPT`) are referenced from MASTER_ROADMAP and are still load-bearing for new Module Strategist sessions. Path 1 means doing 5+ doc edits in lockstep, with rollback risk if a reference is missed. Path 2 leaves things as they are at root, removes the duplicate, and the question can be revisited per-file later if any of the 7 truly are dead. Open Q1.

**A.2 — Deprecate-then-delete `__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md`.** Its header already says "kept temporarily for safe transition and will be removed in a future cleanup pass." Today + 7 days is enough transition. Stage A:
```
git rm "__LAUNCH_PLAN_DRAFT__/MASTER_LIVE_PLAN.md"
git commit -m "chore(planning): remove deprecated MASTER_LIVE_PLAN.md (history at __LAUNCH_PLAN_DRAFT__/_archive/MASTER_LIVE_PLAN_v1.md)"
```
Risk: very low. The deprecated header has been live for hours; the v1 archive is preserved.

**A.3 — Untrack the 3 `.DS_Store` files.** Already in `.gitignore`; they're tracked from before.
```
git rm --cached .DS_Store modules/.DS_Store "modules/Module 1.5 - Shared Components/.DS_Store"
git commit -m "chore(repo): untrack 3 .DS_Store files (already gitignored)"
```
Risk: zero.

**A.4 — Untrack `outputs/`.**
```
git rm -r --cached outputs/
git commit -m "chore(repo): untrack outputs/ session-prompt directory (already gitignored, 52 files transient)"
```
The files stay on disk; future sessions stop seeing them as "modified" in git. Risk: zero.

**A.5 — Untrack `archive/` (root-level historical).** Already gitignored.
```
git rm -r --cached archive/
git commit -m "chore(repo): untrack archive/ project-genesis history (already gitignored)"
```
Risk: zero.

**A.6 — Delete `docs/guardian_test.tmp`.** Empty test artefact.
```
rm docs/guardian_test.tmp
```
Risk: zero. (File is untracked anyway.)

**A.7 — Delete the empty test_write file in opticup-strategic.**
```
rm .claude/skills/opticup-strategic/test_write
```
Risk: zero.

**A.8 — Refresh `docs/FILE_STRUCTURE.md`.** This is the highest-value Stage A item. Add the new top-level entries:
- `__LAUNCH_PLAN_DRAFT__/` (with subtree summary including `_archive/`, `architecture-briefs/`, `handoffs/`, `campaign-overseer/`, `site-overseer/`, `access-audit/`, `supervisor-system/`)
- `_archive/` (root, if Path 1 of A.1 chosen) or remove from any "future state" section (if Path 2)
- `campaigns/` clarification ("Campaign Overseer working area; not a module")
- `.claude/skills/opticup-architect/references/decisions/` subfolder

Edit pass; ~30 min careful read.

**A.9 — Prune the stale `.claude/worktrees/jovial-lewin-b61073/`.**
```
git worktree prune
# If the dir still remains:
rm -rf .claude/worktrees/jovial-lewin-b61073/
```
Risk: low. Worktrees are local-only; nothing in develop branch depends on it.

### Stage B — Moderate risk, careful per-item investigation (90–150 min)

**B.1 — Module 1 stray fix.** *This is the single most consequential item.* Before action, verify each of the 9 stray SPECs has not been duplicated into `Module 1 - Inventory Management/docs/specs/` already:
```
for spec in M1_DEBT_VAT_FALLBACK_GUARD M1_FIXES_2026_04_26 M1_RECEIPT_PO_COMPARE_SHRINK PERMISSIONS_AUDIT_PHASE1_2026_04_27 PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27 PERMISSIONS_PHASE2_FIX_2026_04_27 PERMISSIONS_PHASE3_CSS_GATING_2026_04_27 STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27 STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27; do
  if [ -d "modules/Module 1 - Inventory Management/docs/specs/$spec" ]; then
    echo "COLLISION: $spec already exists in canonical — manual merge needed"
  else
    echo "SAFE: $spec can move"
  fi
done
```
Then for each "SAFE" SPEC:
```
git mv "modules/Module 1 - Inventory/docs/specs/<SPEC_NAME>" "modules/Module 1 - Inventory Management/docs/specs/<SPEC_NAME>"
```
After all 9 moved, verify the source dir is empty and remove:
```
ls "modules/Module 1 - Inventory/docs/specs/"   # expect: empty
ls "modules/Module 1 - Inventory/docs/"           # expect: empty (or 'specs' empty)
ls "modules/Module 1 - Inventory/"                # expect: only docs/
git rm -r "modules/Module 1 - Inventory"
```
Single commit:
```
git commit -m "chore(modules): move 9 stray Apr-26 SPECs into canonical Module 1 - Inventory Management; remove stray Module 1 - Inventory dir"
```
Risk: medium. The 9 SPECs reference each other and may reference the stray dir's path string in their bodies. Run `grep -rn "Module 1 - Inventory/" --include="*.md"` BEFORE the move to catch any hard-coded refs that need updating in the same commit.

**B.2 — Document the flat-vs-Module-N convention.** Currently implicit in `MODULE_DOCUMENTATION_SCHEMA.md` and `FILE_STRUCTURE.md`. Add a short, explicit section to CLAUDE.md §8 Navigation Table or to a new `docs/MODULES_LAYOUT.md`:

> **Two-scheme modules layout.** `modules/Module N - Name/` holds documentation, specs, and SESSION_CONTEXT for module N. `modules/<feature>/` (flat) holds the JS/CSS implementation that root HTML pages load. Both are canonical. Each Module N's MODULE_MAP.md must point at its implementation flat dir.

Cross-link from each `Module N - Name/MODULE_MAP.md` to the corresponding flat dir(s). E.g., Module 1 → `modules/inventory/`; Module 4 → `modules/crm/`. ~30 min.

**B.3 — Resolve Module 3 / Module 4 implementation pointer.** Module 3's MODULE_MAP needs to reference `modules/storefront/`. Module 4's MODULE_MAP needs to reference `modules/crm/`. Module 2's MODULE_MAP — note that it references BOTH `modules/admin/` and `modules/admin-platform/`; explain the split (admin = tenant-side superuser UI; admin-platform = cross-tenant Platform Admin features). If the split is unclear or accidental, that's a B.3 sub-task.

**B.4 — Handoff convention sweep in `__LAUNCH_PLAN_DRAFT__/`.** Decide: does every module's HANDOFF live in `handoffs/` (new convention) or inside `architecture-briefs/<MODULE>/`? Move M5/M7/M8/M11 to match whichever wins. ~20 min once decided.

### Stage C — Low-priority cleanup, polish (60–90 min)

**C.1 — Consolidate the 3 archive locations.** Single root `_archive/` with subfolders:
```
_archive/
├── README.md
├── root-deprecated/      ← if Stage A chose Path 1 (else delete)
├── index-versions/       ← from old archive/
├── project-snapshots/    ← from old archive/
└── launch-plan-versions/ ← from __LAUNCH_PLAN_DRAFT__/_archive/
```
Specific commands depend on Stage A.1 outcome.

**C.2 — Add `campaigns/README.md`.** ~10 min: explain why campaigns isn't inside Module 4, how to add a future campaign, and that the `migrations/` snapshot inside `campaigns/supersale/migrations/` is a copy — Module 4 migrations are canonical.

**C.3 — Decide on the 3 orphan docs/ files.** `LEARNINGS.md`, `IMPROVEMENT_LOG.md`, `PROJECT_VISION.md` — read each, decide keep+document-in-CLAUDE-§12 or move to `_archive/`. Open Q3.

**C.4 — Decide on the 5 onboarding docs at root.** Open Q2.

**C.5 — Consider renaming `__LAUNCH_PLAN_DRAFT__` → `planning/`.** ~5 doc edits across the repo. Open Q4.

**C.6 — Untrack `opticup-skills.plugin` if still tracked.** It's already in `.gitignore`. Verify with `git ls-files | grep opticup-skills.plugin` — if tracked, `git rm --cached`.

### Stage D — Post-LIVE only (deferred)

**D.1 — Root HTML file relocation.** Cannot do without breaking `js/shared.js` redirects + GitHub Pages routing. Open in a future cleanup pass (or never; the cost vs benefit is currently zero).

**D.2 — `inventory.html` refactor.** 1,046 lines is over the 350 max in Iron Rule 12 by a lot. Module 1 maintenance task, not structural.

---

## Section 4 — Risk Register

### Risks of doing the cleanup wrong

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Deleting the wrong Module 1 dir destroys SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, db-schema for the entire ERP. | 🔴 CRITICAL | Verify "Inventory Management" has the canonical files (it does, per Pass 2 verification) BEFORE any rm. The B.1 procedure moves SPECs first, then deletes the empty stray. |
| R2 | Moving a stray SPEC overwrites a same-named SPEC in the canonical dir. | 🟡 MEDIUM | Run the collision check loop in B.1 before any `git mv`. |
| R3 | Updating `_archive/root-deprecated/` references inconsistently breaks new Module Strategist sessions (they paste UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT.md by name). | 🟡 MEDIUM | A.1 Path 2 (abort) avoids this entirely. If Path 1 chosen, do every doc edit in the same commit and verify with grep before committing. |
| R4 | Renaming `__LAUNCH_PLAN_DRAFT__` mid-session corrupts an in-flight chat that has the path memorised. | 🟡 MEDIUM | C.5 only after a clean session boundary; do all 5 doc edits in one commit. |
| R5 | Removing `outputs/` from tracking with `git rm --cached` creates a huge "deletion" commit that can mask real changes in PR review. | 🟢 LOW | Single-purpose commit message ("chore(repo): untrack outputs/ ..."). |
| R6 | `git rm -r --cached archive/` does the same. | 🟢 LOW | Same. |
| R7 | Stale `.claude/worktrees/jovial-lewin-b61073/` polluted Pass 2's grep results. Future audits hit the same noise. | 🟢 LOW | A.9 prune. |
| R8 | Refreshing FILE_STRUCTURE.md introduces drift if the same edit happens elsewhere first. | 🟢 LOW | Single-author, single-commit edit. |

### Risks of NOT doing the cleanup

| ID | Risk | Severity | Mitigation if deferred |
|----|------|----------|------------------------|
| R9 | Future strategic chats keep asking "which Module 1 is real?" or hand work to the wrong dir → SPECs continue scattering. | 🟠 HIGH | At minimum, B.1 must happen this week. |
| R10 | New chats grep `FILE_STRUCTURE.md` for canonical paths and get stale answers. | 🟠 HIGH | A.8 must happen alongside B.1. |
| R11 | The 7 root-deprecated duplicates remain confusing every new session that opens to a dirty `git status`. | 🟡 MEDIUM | A.1 in either direction kills this. |
| R12 | Cosmetic noise in repo (untracked `.DS_Store`, tracked `outputs/`, three archive dirs) gradually makes "is this clean?" expensive to answer. | 🟢 LOW | Stage A items knock these out in one sweep. |
| R13 | The flat-vs-Module-N convention being implicit means another sub-agent (or human) will eventually propose consolidation again, costing a new round of audit. | 🟡 MEDIUM | B.2 documents the convention so future agents stop tripping on it. |

---

## Section 5 — Open Questions for Daniel

Each question lists my recommendation and the reasoning, but the decision is yours.

**Q1 — `_archive/root-deprecated/` staging: commit forward or abort?**
- **Recommendation: ABORT (Path 2).** Three of the seven files are still load-bearing for new Module Strategist sessions (referenced by name in MASTER_ROADMAP.md and in the chat onboarding flow). Path 1 is doable but risks subtle reference breakage. Path 2 is `rm -rf _archive/root-deprecated/` and we move on. We can revisit per-file later if any of the 7 truly are dead.
- **Why this needs you:** the staging implies someone (you or a Cowork agent) intended to archive these. Clarify intent.

**Q2 — Five root onboarding docs: keep at root, consolidate to `docs/onboarding/`, or trim?**
- **Recommendation: KEEP, but add explicit role in CLAUDE.md §12.** Each doc has a distinct audience: `DANIEL_QUICK_REFERENCE` is for you (Hebrew, cheatsheet); `STRATEGIC_CHAT_ONBOARDING` is the Hebrew protocol when you spin up a Strategic Chat; `MODULE_DOCUMENTATION_SCHEMA` is the dual-repo doc-ownership rulebook (architectural); `UNIVERSAL_MODULE_STRATEGIC_CHAT_PROMPT` and `UNIVERSAL_SECONDARY_CHAT_PROMPT` are paste-into-chat templates. Trimming to 3 is conceivable (merge the two universal prompts; let the strategic onboarding live inside CLAUDE.md narrative) but each merge is a 60-min careful edit and the upside is small.
- **Why this needs you:** which of these do you actually paste into chats today? Anything you don't paste is a candidate for archive.

**Q3 — `docs/LEARNINGS.md`, `IMPROVEMENT_LOG.md`, `PROJECT_VISION.md`: keep, document, or archive?**
- **Recommendation: read each, decide one of (a) move to `_archive/`, (b) add to CLAUDE.md §12 as canonical, (c) keep but add a one-line `>** This doc is informal; not part of canonical reference set.**` header.** Currently they're invisible — no incoming references — which means "they exist" is the only signal of their value.

**Q4 — Rename `__LAUNCH_PLAN_DRAFT__/` to `planning/`?**
- **Recommendation: YES, but in Stage C, not now.** The folder has outgrown "draft" — it's the active planning hierarchy with Architecture Briefs for half the future modules. Rename cost = 5 doc edits. Wait until M13 brief is sealed so the rename doesn't collide with active work.

**Q5 — Three archive locations: consolidate now or wait?**
- **Recommendation: Stage C, post-Stage-A.** Functionally harmless; cosmetic. Do it once Stage A has settled the `_archive/` staging question.

**Q6 — `outputs/` history: keep tracked or `git rm --cached`?**
- **Recommendation: `git rm --cached`.** Files stay on disk, ignored as today's `.gitignore` already says, but `git status` stops showing them as part of the working tree. History is preserved.

**Q7 — Module 2's `admin/` vs `admin-platform/` — split rationale clear?**
- **Recommendation: investigate as part of B.3, you decide based on findings.** If the split is intentional (tenant-side admin vs cross-tenant Platform Admin), document it. If accidental, merge. I didn't dig deep enough to call this from where I sit; I want to read both dirs end-to-end before recommending.

---

## Section 6 — Files Investigation Log

Files I (orchestrator) opened directly during this audit:

- `C:\Users\User\opticup\MASTER_ROADMAP.md` (full)
- `C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\README.md` (full)
- `C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\MASTER_LIVE_PLAN.md` (top 40 lines)
- `C:\Users\User\opticup\.gitignore` (full)
- `C:\Users\User\opticup\package.json` (full)
- `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\M3_PHONE_TEMPLATING_AND_CLEANUP\SPEC.md` (top 5 lines)
- `C:\Users\User\opticup\docs\FILE_STRUCTURE.md` (top 20 lines + grep)

Directories I listed:
- `C:\Users\User\opticup\` (root, full)
- `C:\Users\User\opticup\modules\` (top level)
- `C:\Users\User\opticup\modules\Module 1 - Inventory\`, `Module 1 - Inventory\docs\`, `Module 1 - Inventory\docs\specs\`
- `C:\Users\User\opticup\modules\Module 1 - Inventory Management\`, `...\docs\`, `...\docs\specs\`
- `C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\`
- `C:\Users\User\opticup\campaigns\`
- `C:\Users\User\opticup\.claude\`
- `C:\Users\User\opticup\docs\`
- `C:\Users\User\opticup\_archive\`, `_archive\root-deprecated\`
- `C:\Users\User\opticup\archive\`
- `C:\Users\User\opticup\data\`
- `C:\Users\User\opticup\shared\`
- `C:\Users\User\opticup\---QA---\`
- `C:\Users\User\opticup\watcher-deploy\`

Greps run:
- `grep "outputs/" --include="*.md"` (zero hits outside outputs itself)
- `grep "STRATEGIC_CHAT_ONBOARDING|UNIVERSAL_*|MODULE_DOCUMENTATION_SCHEMA|DANIEL_QUICK_REFERENCE|PHASE_0_PROGRESS|handoff-next-session"` (mostly zero outside `_archive/root-deprecated/` and the worktree)
- `grep "modules/inventory|crm|storefront|admin"` (hits in skills + worktree only)
- `grep "__LAUNCH_PLAN_DRAFT__"` (5 doc references — see Pass 4)

Files written by sub-agents (intermediate findings, on disk in `__LAUNCH_PLAN_DRAFT__/architecture-briefs/`):
- `_pass3_4_findings.md` (written by sub-agent acfaca0ae90da246e)
- `_pass8_9_findings.md` (written by sub-agent aec688be6d6ee38e7)
- `_pass10_findings.md` (written by sub-agent a6ff615c790c20dc8)

Sub-agents that returned findings inline (read-only stance refused to write the scratch file; I captured content in-conversation):
- Pass 1+2 (a446309fe8f8c80bd) — Pass 1 root inventory, Pass 2 modules. **Note: this agent's Module 1 verdict was inverted; orchestrator corrected via direct verification.**
- Pass 5+6+7 (a24acf9ba44bef5b6) — outputs/, archive/, campaigns/.

Repo state at end of audit: identical to start (`git status --short` matches baseline of 34 lines saved at start). No tracked file modified. The only files added during audit are `_pass3_4_findings.md`, `_pass8_9_findings.md`, `_pass10_findings.md`, and this report — all under `__LAUNCH_PLAN_DRAFT__/architecture-briefs/`, a directory that was already untracked before audit start.

---

*End of audit. Recommended next step: Daniel reviews Section 5 Open Questions (especially Q1 — `_archive/root-deprecated/` direction) so Stage A can be dispatched as a single SPEC to opticup-executor.*
