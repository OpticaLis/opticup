# Post-Merge Production QA — 2026-05-09

> **Scope:** Read-only QA of the ~40 commits merged from `develop` to `main` today, including 3 structural SPECs (PROJECT_STRUCTURE_CLEANUP + MODULES_HOME_UNIFICATION + STRUCTURE_PROTECTIONS), M11 + M12 architecture briefs, ~9 closed M3 storefront SPECs, new pre-commit hook, new Sentinel Mission 10. Main branch deployed to GitHub Pages → app.opticalis.co.il (Prizma production).
>
> **Reviewer:** opticup-reviewer (Claude Code on Windows desktop, develop branch as reference; main HEAD = develop HEAD = `966eb5b`)
> **Date:** 2026-05-09
> **Duration:** ~35 minutes
> **Repo state:** Read-only QA. End state matches start state (only this report file added, no other modifications).

---

## Section 1 — Executive Summary

**Health verdict:** Production deployment is **healthy**. The structural cleanup of 2026-05-09 (3 SPECs, ~99 files relocated, `__LAUNCH_PLAN_DRAFT__/` retired, new pre-commit hook installed) **did not break any code references**, and all 7 ERP HTML entrypoints (root + admin + crm + inventory + settings + storefront-studio + landing + error) return 200 with correct Hebrew titles when fetched via app.opticalis.co.il. The new pre-commit hook (`scripts/checks/check-root-discipline.mjs`) was live-smoke-tested end-to-end: it blocks a disallowed root file (exit 1) and warns on a new root directory (exit 2). All 4 verification scripts (`verify:integrity`, `verify`, `test:integrity-gate`, `test:root-discipline`) pass. main HEAD and develop HEAD are in sync.

The QA did surface **3 LOW-severity findings worth quick action** and several pre-existing-debt observations not caused by today's merge. None are production-blocking; none are at HIGH/CRITICAL severity.

**Top 3 critical findings:**

1. **🟡 LOW — Stray `-p/` empty directory at repo root.** Created today around 20:02 (during a SPEC execution window) — almost certainly an accidentally-created literal `-p` dir from a misfired `mkdir -p` shell parse. Not git-tracked (empty dir, hence absent from `git status`). Not on the allowlist; Sentinel Mission 10 Check 10.1 would fire on it. Resolution: `rmdir -p/` (1 second).
2. **🟡 LOW — `.gitignore` line 34 duplicate `.claude/` (third occurrence).** Already documented in `PROJECT_STRUCTURE_CLEANUP/FINDINGS.md` F2 + `MODULES_HOME_UNIFICATION/FINDINGS.md` F2 + `STRUCTURE_PROTECTIONS/FINDINGS.md` F2. The duplicate ignore overrides the negation rules above it; new files in `.claude/skills/opticup-*/` need `git add -f`. Recommended `GITIGNORE_CLEANUP` SPEC overdue.
3. **🟡 LOW — Recursive nested backup at `modules/Module 3 - Storefront/backups/2026-03-30_pre-phase4a/opticup-erp-snapshot/...`** — path repeats itself indefinitely (the snapshot included its own `backups/` dir, which then snapshots itself, etc.). Local-disk-only (gitignored via `**/backups/`), not in git, doesn't reach production. But it bloats the filesystem and slows tools that walk it (caused 87KB of empty-dir output from a single `find` invocation).

**Total time taken:** ~35 minutes.

---

## Section 2 — Findings by Layer

| Layer | Status | Summary |
|---|---|---|
| **L1 — Production deployment health** | ✅ PASS | All 7 entrypoints return 200 with correct Hebrew titles. main HEAD = develop HEAD = `966eb5b` (in sync). No visible JS errors on logged-out fetches. |
| **L2 — Reference integrity** | ✅ PASS | 0 references to moved paths (`__LAUNCH_PLAN_DRAFT__/`, `data/`, `archive/`, `---QA---/`, `outputs/`, root onboarding files) in code (`.js` / `.html` / `.ts` / `.mjs` / `.cjs`). The structural cleanup did NOT break any code references. |
| **L3 — New infrastructure verification** | ✅ PASS w/ 1 LOW | All 4 verify scripts exit 0. Allowlist valid JSON, matches CLAUDE.md §0.5 line-for-line. Pre-commit hook live-smoke-tested: blocks disallowed file (exit 1), warns on new dir (exit 2), allows clean adds (exit 0). One stray `-p/` directory at root (Finding L3-1, see Section 3). |
| **L4 — Sentinel Mission 10 dry-run** | ✅ PASS | Check 10.1 would fire on `-p/` (same as L3-1). Checks 10.2 (in-design briefs), 10.3 (single archive), 10.4 (roles/ integrity), 10.5 (close-ceremony backlog) all clean. |
| **L5 — Module structure integrity** | ✅ PASS w/ 1 LOW + INFO | `_archive/` has 7 expected subfolders + README. `_archive/spec-history/` has all 3 SPEC subfolders (PROJECT_STRUCTURE_CLEANUP, MODULES_HOME_UNIFICATION, STRUCTURE_PROTECTIONS). All 6 live modules have `docs/`. Finding L5-1: M3.1 has `SESSION_CONTEXT.md` at module root vs convention (others use `docs/SESSION_CONTEXT.md`). INFO: legacy "stray" files at module roots predate today's merge. |
| **L6 — Recent commits sanity** | ✅ PASS | Last 20 commits all intentional, scoped, well-named. Merge commits clean (#56 hotfix, #55 develop merge). f552b7e is normal main→develop sync. 696 files changed across last 50 commits, no junk patterns. |
| **L7 — Migrations integrity** | ✅ PASS w/ 3 pre-existing LOW | Recent migrations all intentional. Explicit revert pair `20260503180000_realtime_crm_leads_broadcast_insert.sql` + `20260503190000_revert_*.sql` — clean rollback documented. Pre-existing: number collision `031_*` × 2 (L7-1), no systematic rollback paths for forward-only migrations (L7-2), mixed numbered+unnumbered naming (L7-3). |
| **L8 — TECH_DEBT obsolescence** | ✅ PASS w/ 2 LOW | TECH_DEBT.md well-maintained. Finding L8-1: #3 baseline references `archive/` paths now at `_archive/project-genesis/` — stale references. Finding L8-2: `verify:full` reports 5,975 violations (vs baseline 417) due to `.claude/worktrees/` (91MB, 2 stale worktrees) double-counting via rule-21-orphans — pre-existing exclusion gap, acknowledged in PROJECT_STRUCTURE_CLEANUP §8. |
| **L9 — Skill files sanity** | ✅ PASS | All 7 skills present with valid frontmatter (`---` open + `name:` field). `decisions/` has all 7 expected per-module files (CROSS, M5, M6, M7, M8, M11, M12). Skills are large (opticup-strategic 1008 lines) but Iron Rule 12 doesn't apply to `.md`. |
| **L10 — Anything else worth flagging** | ⚠️ FINDINGS | Recursive nested backup at M3 (L10-1), 2 tracked files matching gitignore patterns (L10-2), `.claude/worktrees/` 91MB stale (L10-3, acknowledged), no duplicate content between archive+live, no broken markdown links in live docs. |

---

## Section 3 — Detailed findings

### L3-1 / L4-10.1 — Stray `-p/` empty directory at repo root

- **Severity:** 🟡 LOW
- **Evidence:** `ls -la /-p` returns an empty directory created today around 20:02. `git ls-files -- "-p"` returns nothing (empty dir, untracked). NOT in `scripts/checks/root-allowlist.json`. NOT in `git status` because empty directories aren't tracked.
- **Cause:** Almost certainly an accidentally-created literal `-p` directory from a misfired `mkdir -p` shell command during a SPEC execution between 20:00 and 20:02 (matches my own STRUCTURE_PROTECTIONS execution window).
- **Impact:** Minimal. Not deployed (empty + untracked). Sentinel Mission 10 Check 10.1 would fire on it once the daily run executes. The pre-commit hook (`check-root-discipline.mjs`) would block any file added inside `-p/` because it's not on the allowlist (exit 1) — but it warns rather than blocks new dirs (exit 2). Since there's nothing in it yet, it's invisible to git.
- **Recommendation:** `rmdir -p/` (or `rm -rf -p/` if it acquires content somehow). 1 second. Verify Mission 10 then reports clean.
- **Suggested follow-up SPEC:** None needed — single-shell-command fix.

### L5-1 — `modules/Module 3.1 - Project Reconstruction/SESSION_CONTEXT.md` at module root

- **Severity:** 🟡 LOW
- **Evidence:** Other live modules (M1, M2, M3, M4, M1.5) have `SESSION_CONTEXT.md` inside `docs/`. M3.1 has it at module root.
- **Cause:** Pre-existing convention deviation, predates today's merge.
- **Impact:** Convention mismatch. CLAUDE.md §7 Authority Matrix and FILE_STRUCTURE.md document the convention (`docs/SESSION_CONTEXT.md`). M3.1 is the odd one out.
- **Recommendation:** Either move to `docs/` (one `git mv`) OR document the M3.1 exception in the README/CLAUDE.md. Owner = Module 3.1 lead.
- **Suggested follow-up SPEC:** None — fold into next M3.1 maintenance.

### L7-1 — Migration number collision: two `031_*` files in `migrations/`

- **Severity:** 🟡 LOW (pre-existing)
- **Evidence:** `migrations/031_stock_count_filter_criteria.sql` + `migrations/031_tenants_update_policy.sql`. Both numbered 031.
- **Cause:** Concurrent feature work created the collision before either landed; neither was renumbered at merge time.
- **Impact:** If migrations are ever applied in a strict numeric order (e.g., a fresh DB rebuild from these files), order between the two 031s is undefined. Live DB has both applied; production is fine. Future bootstrap risk only.
- **Recommendation:** Rename one to a fresh number (e.g., `031b_tenants_update_policy.sql` → `069_tenants_update_policy.sql`) to remove the collision. Optional — only matters if anyone bootstraps from `migrations/` directly.
- **Suggested follow-up SPEC:** None blocking. Could fold into a `MIGRATIONS_HYGIENE` SPEC alongside L7-2/L7-3.

### L7-2 — No systematic rollback paths for migrations

- **Severity:** 🟡 LOW (pre-existing pattern)
- **Evidence:** `grep -lE "ROLLBACK|DROP TABLE" migrations/0*.sql` returns only 2 matches (063 + 064). The other 71 numbered migrations are forward-only with no `_down.sql` siblings.
- **Cause:** Project pattern is forward-only migrations (small SaaS, single tenant, atomic deploys via Supabase Dashboard). Not a regression.
- **Impact:** If a migration needs to be reverted, reversing the change requires hand-written SQL. Acceptable for this scale; would need rethinking if scaling to N tenants with rolling deploys.
- **Recommendation:** Document the forward-only convention explicitly in `migrations/README.md` (if doesn't exist) so it's an intentional posture, not an accidental gap.
- **Suggested follow-up SPEC:** None — documentation tweak.

### L7-3 — Mixed migration naming (numbered + unnumbered)

- **Severity:** 🟡 LOW (pre-existing)
- **Evidence:** `migrations/` has 73 files: 68 numbered (`002_logs_and_soft_delete.sql` … `068_receipt_items_sort_order.sql`) and 5 unnumbered (`add_inventory_access_exported.sql`, `add_pending_sales_product_columns.sql`, `add_sync_log_export_source.sql`, `add_sync_log_handled_status.sql`, `fix_supplier_returns_columns.sql`, `phase5_*.sql`, `supabase_schema.sql`). Plus 12 timestamp-prefixed in `supabase/migrations/`.
- **Cause:** Pattern evolved over time. Different developers used different conventions.
- **Impact:** Cosmetic — but for someone bootstrapping order matters.
- **Recommendation:** Rename the unnumbered files to use the next available numbers in chronological order. Optional.
- **Suggested follow-up SPEC:** Fold into `MIGRATIONS_HYGIENE`.

### L8-1 — TECH_DEBT.md #3 has stale path references

- **Severity:** 🟡 LOW
- **Evidence:** TECH_DEBT.md #3 says: "Nearly all violations are file-size on historical `archive/` HTML files (`archive/index_V1.*A.html`, 10+ files at 1700–2500 lines each)…". The path `archive/` no longer exists at root — those files moved to `_archive/project-genesis/index_V1.*A.html` during PROJECT_STRUCTURE_CLEANUP.
- **Cause:** TECH_DEBT.md #3 was written before today's cleanup. The file paths inside it were not updated when the move happened.
- **Impact:** Anyone reading the debt entry would look for `archive/index_V1.*A.html` and not find them. Minor.
- **Recommendation:** Update TECH_DEBT.md #3 paths to `_archive/project-genesis/index_V1.*A.html` (sed-style edit). Also update the violation count if anyone wants a current snapshot — but per L8-2 below, the current full-scan number is misleading because of `.claude/worktrees/` pollution.
- **Suggested follow-up SPEC:** None — single-file edit.

### L8-2 — `verify:full` violation count inflated by `.claude/worktrees/` (5,521 of 5,975 are rule-21-orphans from worktree duplicates)

- **Severity:** 🟡 LOW (pre-existing exclusion gap, acknowledged)
- **Evidence:** `npm run verify:full` reports 5,975 violations, 161 warnings, 4,815 files. Breakdown: 5,521 rule-21-orphans, 267 rule-15-rls, 213 file-size, 84 rule-14-tenant-id, 27 rule-18-unique-tenant, 24 rule-23-secrets. Top offending paths include `.claude/worktrees/pensive-tesla-4a5ab3/modules/...` (148) and `.claude/worktrees/jovial-lewin-b61073/modules/...` (64) — that's 2 stale Claude isolation worktrees containing full repo copies, weighing 91 MB total.
- **Cause:** `scripts/verify.mjs` `WALK_EXCLUDE` array is `['node_modules', '.git', 'backups', '.husky']` — does NOT include `.claude/worktrees/`. Each worktree is a complete repo copy, so every function name is reported as duplicated by rule-21-orphans (real definition in `modules/...` + worktree copy in `.claude/worktrees/.../modules/...`). The 5,521 orphan count is mostly cross-worktree noise.
- **Impact:** `verify:full` is unusable as a baseline metric — its number is dominated by worktree pollution rather than real code health. The pre-commit hook (`verify --staged`) is unaffected (only scans staged files). The integrity gate is unaffected (uses git-tracked files only).
- **Recommendation:** Two options: (a) add `.claude/worktrees/` to `WALK_EXCLUDE` (minimal change in `scripts/verify.mjs`); (b) `git worktree prune` to remove the 91 MB of stale worktrees (acknowledged in PROJECT_STRUCTURE_CLEANUP §8 Out-of-Scope: "Daniel can prune at any time"). Both are recommended; (a) is structural and prevents recurrence, (b) is a one-time cleanup.
- **Suggested follow-up SPEC:** Trivial — single-line `verify.mjs` edit + `git worktree prune`. Could fold into next miscellaneous-cleanup SPEC.

### L10-1 — Recursive nested backup at `modules/Module 3 - Storefront/backups/2026-03-30_pre-phase4a/opticup-erp-snapshot/`

- **Severity:** 🟡 LOW (local-only, untracked)
- **Evidence:** `find . -type d -empty` produced 87 KB of output from a single `find` invocation, dominated by paths like `modules/Module 3 - Storefront/backups/2026-03-30_pre-phase4a/opticup-erp-snapshot/modules/Module 3 - Storefront/backups/_pre-phase4a/opticup-erp-snapshot/modules/Module 3 - Storefront/backups/_pre-phase4a/opticup-erp-snapshot/...` repeating indefinitely. This is a recursive snapshot that included its own `backups/` directory at snapshot time.
- **Status:** `git ls-files modules/Module 3 - Storefront/backups/` returns 0 — the backup is **not tracked** (gitignored via `**/backups/` rule). Local disk only. Does NOT reach production.
- **Impact:** Local filesystem clutter. Slow `find`, `ls -R`, and any tool that walks the filesystem (verify:full is OK because `WALK_EXCLUDE` includes `'backups'` as exact-name match, so directories named `backups` are skipped at any depth — confirmed by reading the verify.mjs code). Could grow further if anyone re-runs the snapshotting script that created it.
- **Recommendation:** `rm -rf "modules/Module 3 - Storefront/backups/2026-03-30_pre-phase4a/"` (untracked, safe). Then audit whatever script created the snapshot to add an exclusion of `backups/` from its source list (so snapshot of M3 doesn't include M3's backup dir). One-time cleanup.
- **Suggested follow-up SPEC:** None blocking. Fold into miscellaneous cleanup.

### L10-2 — 2 tracked files match gitignore patterns (should be untracked)

- **Severity:** 🟡 LOW (pre-existing)
- **Evidence:**
  - `_archive/access-audit/_data_fe/optic_temp.accdb` — tracked. `.gitignore` doesn't have an explicit `*.accdb` rule (untracked-but-known leave-alone applies to root `tests/optic*.accdb`), so this might have been inherited from before the move out of `__LAUNCH_PLAN_DRAFT__/access-audit/`.
  - `watcher-deploy/daemon/opticupsyncwatcher.wrapper.log` — tracked. `.gitignore` line 14 covers `.out.log` only, not `.wrapper.log`. Documented as F3 in `PROJECT_STRUCTURE_CLEANUP/FINDINGS.md` (LOW). Modified between sessions by the watcher service.
- **Impact:** The `.accdb` tracked at `_archive/...` is acceptable for archive purposes — it's intentionally preserved historical data. The `.wrapper.log` is the previously-flagged daily-noise file.
- **Recommendation:** Defer to `GITIGNORE_CLEANUP` SPEC (already pending — see Section 5). For `optic_temp.accdb`, consider whether archive content should be excepted from a future `*.accdb` rule.
- **Suggested follow-up SPEC:** `GITIGNORE_CLEANUP` (already recommended).

### L10-3 — `.claude/worktrees/` 91 MB stale (acknowledged)

- **Severity:** 🟢 INFO (already acknowledged)
- **Evidence:** `du -sh .claude/worktrees/` = 91 MB. 2 worktrees: `jovial-lewin-b61073` + `pensive-tesla-4a5ab3`.
- **Status:** Acknowledged in PROJECT_STRUCTURE_CLEANUP §8 Out-of-Scope: "Worktree pruning... — local-only, Daniel can prune at any time with `git worktree prune`."
- **Impact:** Inflates verify:full numbers (see L8-2). Wastes disk space. Not deployed.
- **Recommendation:** `git worktree prune`. One-line cleanup.
- **Suggested follow-up SPEC:** None.

---

## Section 4 — Production deployment verdict

**🟢 GREEN — safe for Prizma to keep using app.opticalis.co.il.**

Specific evidence:

1. **All 7 ERP HTML entrypoints (`/`, `/admin.html`, `/crm.html`, `/inventory.html`, `/settings.html`, `/storefront-studio.html`, `/landing.html`, `/error.html`) load via app.opticalis.co.il** with correct Hebrew titles and no visible JavaScript errors on logged-out fetches. (storefront-studio's "טוען..." loading state is expected for an unauthenticated request — the page authenticates via PIN before populating.)
2. **0 references to moved paths in code (`.js`/`.html`/`.ts`/`.mjs`/`.cjs`).** The 99-file reference rewrite in MODULES_HOME_UNIFICATION SPEC Commit 6 was complete and accurate. No broken imports, no broken `<script src=>`, no broken `fetch()` paths from the cleanup.
3. **main HEAD (`966eb5b`) = develop HEAD (`966eb5b`).** No drift between branches. The merge to main was clean and complete.
4. **All 4 verification scripts pass:** `verify:integrity` exit 0, `verify` (default = staged) exit 0, `test:integrity-gate` exit 0, `test:root-discipline` exit 0 with 4/4 cases passing. The new infrastructure (Sentinel Mission 10, pre-commit hook, bootstrap auto-check) is functional.
5. **Live smoke test of pre-commit hook PASSED:** I staged a `FORBIDDEN_TEST.md` at root, ran `node scripts/verify.mjs --staged`, observed exit code 1 + clear violation message, then unstaged + cleaned up. The hook correctly blocks new disallowed root files. (Tree restored to clean state — no residue.)
6. **No security issues surfaced.** The 24 rule-23-secrets violations from `verify:full` are all in `.claude/worktrees/` copies (worktree pollution per L8-2), not in real production source. The redacted JWT tokens at `_archive/session-outputs/PROMPT_FB_SCENARIO_*.md` (carry-forward from PROJECT_STRUCTURE_CLEANUP) remain redacted at their archived locations.
7. **No data-isolation regressions.** Reference integrity check (L2) confirms no tenant_id, RLS, or canonical-pattern code was disturbed by the structural cleanup — those moves were doc-only, not code.

The 11 LOW-severity findings (3 fresh from today, 8 pre-existing) are all bookkeeping / hygiene items. None affect runtime behavior, none affect tenant isolation, none affect data integrity.

---

## Section 5 — Recommended next actions for Daniel

Ordered by priority (highest = do first).

| # | Action | Why | Estimated time |
|---|---|---|---|
| 1 | **`rmdir -p/`** at repo root | Removes the stray `-p/` directory (Finding L3-1). Sentinel Mission 10 will then report clean on its first run. | 5 seconds |
| 2 | **`git worktree prune`** + (optionally) **add `.claude/worktrees/` to `verify.mjs WALK_EXCLUDE`** | Recovers 91 MB local disk, reduces `verify:full` noise from 5,975 → realistic baseline (~400-500). The exclusion add prevents recurrence. | 5 minutes |
| 3 | **Run `GITIGNORE_CLEANUP` SPEC** (already recommended in 3 prior FINDINGS) | Resolves: (a) `.gitignore` line 34 duplicate `.claude/` (forces `git add -f` for new opticup-* skill files), (b) `wrapper.log` not in `.gitignore`, (c) 2 tracked files matching gitignore patterns. ~5 line `.gitignore` edit + `git rm --cached` for the 2 stragglers. | 15 minutes |
| 4 | **Decide on the recursive M3 backup** | `rm -rf "modules/Module 3 - Storefront/backups/2026-03-30_pre-phase4a/"` (untracked, safe) — recovers local disk and unsticks `find`/`ls -R` walks. Also audit whatever script created the recursive snapshot to add `backups/` exclusion (one-line change in the snapshotter). | 10 minutes |
| 5 | **Update TECH_DEBT.md #3 path references** from `archive/` to `_archive/project-genesis/` | Keeps the debt register accurate post-cleanup. | 5 minutes |
| 6 | **(Optional) Decide M3.1 SESSION_CONTEXT.md location** | Either `git mv "modules/Module 3.1 - Project Reconstruction/SESSION_CONTEXT.md" "modules/Module 3.1 - Project Reconstruction/docs/"` to match other modules, OR document the exception. | 5 minutes |
| 7 | **(Optional) `MIGRATIONS_HYGIENE` SPEC** — fix the 031 number collision + rename unnumbered migrations + document the forward-only convention | Cosmetic but prevents future bootstrap-from-files confusion. | 30-45 minutes |

**Total time for actions 1-5:** ~35 minutes (small batch; could be one cleanup session).
**Total time for actions 1-7:** ~90 minutes.

**Critical:** None of the above is production-blocking. Prizma is safe on app.opticalis.co.il today. These are health-and-hygiene items that, if accumulated, could cause friction in 2-4 weeks.

---

*End of QA report. Read-only verification complete; no source files modified except this report.*
