# SPEC — ARCHITECT_SESSION_2026_05_14_CLEANUP

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/ARCHITECT_SESSION_2026_05_14_CLEANUP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-14
> **Module:** 1.5 — Shared Components
> **Phase (if applicable):** N/A — cross-module housekeeping
> **Author signature:** Claude Code Windows desktop session, 2026-05-14

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14 (`modules/Module 1.5 - Shared Components/architecture-brief/ARCHITECT_SESSION_2026_05_14_CLEANUP_BRIEF.md`).
- `git status --porcelain` captured at SPEC-author time. Cross-checked all 13 §1 paths against actual repo state:
  - **11 of 11 untracked Briefs / Activation Prompts present** as `??` entries (verified via `ls` per architecture-brief folder).
  - **OPEN_TASKS.md** present as `M` (modified).
  - **`roles/site-overseer/FUNNEL_ROADMAP.md` is NOT dirty** (`git status --porcelain` returns empty for that path; last commit `7841055`). Per Brief §2 step 2, missing §1 path is allowed — Executor will skip + log in EXECUTION_REPORT.
- Pre-existing untracked files surveyed: ~40+ untracked paths from prior sessions (other M3/M4/M7/M9/M13 SPECs, role draft folders, `_archive`-style trees, etc.). All explicitly out-of-scope per Brief §1. Selective `git add` by filename throughout — no wildcards.
- Lessons applied from prior `FOREMAN_REVIEW.md` files in this module:
  - `MIGRATION_3_CRM/FOREMAN_REVIEW.md` (and 3 subsequent SPECs) — codified §0 pre-existing-untracked survey + selective `git add` by filename → APPLIED in §3 success criteria + §5 stop triggers.
  - `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 — heading convention `## N. Title`, no `§` prefix → APPLIED throughout.
- This SPEC has zero new DB objects, zero new functions, zero new files in code paths → **Cross-Reference Check (Step 1.5) is N/A** (Rule 21 not engaged; only governance Brief files + 1 governance doc edit are touched). Confirmed.

### Baselines (referenced by §3 Success Criteria)

| Symbol | Value | Source |
|---|---|---|
| `BASE_S1_DIRTY` | 12 | Count of §1 paths actually present as dirty in `git status --porcelain` (11 untracked Briefs + 1 modified OPEN_TASKS.md). FUNNEL_ROADMAP.md not dirty → drops out per Brief §2 step 2. |
| `BASE_OOS_DIRTY` | 73 | Count of `git status --porcelain` lines NOT on the §1 list at SPEC-author time (8 modified files + 65 untracked items, including the cleanup-Brief itself). Must be unchanged after the SPEC closes. |

---

## 1. Goal

Commit the 12 dirty paths from the architect-session 2026-05-14 work batch (11 untracked Briefs + Activation Prompts + post-merge health report, plus 1 modified governance doc) in a single explicit-`git add`-by-filename commit, leaving every other dirty file in the repo untouched. Closes the gap left by the prior 5 SPECs which each ran selective `git add` on their own SPEC folder + migration only.

## 2. Background & Motivation

The 2026-05-14 Architect session dispatched 5 Pipeline runs (PRE_MAIN_MERGE_VALIDATION, M4_REGISTER_LEAD_TO_EVENT_RPC_MAP, M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX, M3_UTM_TRIPLE_LAYER_PERSISTENCE, EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK). Each ran the standard "selective `git add` on this SPEC's folder + migration only" pattern, leaving Brief files (`architecture-brief/`) and architect-level governance edits (OPEN_TASKS, FUNNEL_ROADMAP) accumulating as untracked / modified across the session. P1.2 of M3_UTM is about to start; per CLAUDE.md §9 Clean Repo at Session End, the working tree should be at a known clean baseline before the next Pipeline begins. This SPEC is the formalized "end-of-session hygiene" pass that the Brief calls out (§6 Notes).

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop` | `git branch --show-current` → `develop` |
| 2 | Staged set equals exactly the §1 dirty subset | 12 paths (`BASE_S1_DIRTY`), no more no less | `git diff --cached --name-only` → exactly the 12 paths from §8.1 |
| 3 | Commit produced | 1 commit, message `docs(architect): commit architect-session 2026-05-14 briefs + governance edits` | `git log -1 --format="%s"` matches |
| 4 | Pushed to `origin/develop` | up-to-date | `git status` → "Your branch is up to date with 'origin/develop'" |
| 5 | Out-of-scope dirty count unchanged | 73 (`BASE_OOS_DIRTY`) | `git status --porcelain` line count = 73 (12 in-scope cleared, original 85 dropped to 73) |
| 6 | No `git add -A` / `git add .` / wildcard add invocation in EXECUTION_REPORT | 0 hits | `grep -E "git add (-A|\\.|\\*|architecture-brief/)" EXECUTION_REPORT.md` → empty |
| 7 | Smoke 7/7 PASS (control) | exit 0 | `npm run smoke` → exit 0 |
| 8 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 9 | No new SPEC folders introduced at repo root | 0 | `ls *.md *_SPEC* 2>/dev/null` → no SPEC folders/files at root |

**Note on count math:** at SPEC-author time `git status --porcelain` shows 85 lines (11 modified files + 74 untracked entries — note `architecture-brief/` directories without trailing slash count as one tree each). After commit, the 11 untracked §1 Briefs become tracked + the 1 modified §1 OPEN_TASKS.md becomes clean → 12 in-scope cleared, 73 OOS lines remain. Use `git status --porcelain | wc -l` to verify.

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Run `git status`, `git diff`, `git log`, `git ls-files`
- Run the standard verify scripts (`npm run smoke`, `npm run verify:integrity`)
- Run `git add <path>` for each of the 12 §1 paths by explicit name (one path per call OR a single multi-arg call)
- `git commit` with the exact message in §3 #3
- `git push origin develop`
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) into the SPEC folder, then commit + push those as a second commit

### What REQUIRES stopping and reporting
- Any §1 path's content differs from what the Brief / earlier SPECs authored (line count surprise, mtime way off, anything suggesting concurrent edit)
- `git diff --cached --name-only` shows ANY path not in the §1 list — STOP, `git restore --staged <bad-path>`, redo
- `git push` fails for any reason — STOP, do NOT retry with `--force`
- Smoke <7/7 PASS — STOP (this SPEC changes zero code; nothing should regress)
- Integrity Gate exit 1 — STOP (Iron Rule 31 non-overridable)
- Out-of-scope dirty count after the commit ≠ 73 — STOP, investigate

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Wildcard add:** any invocation of `git add -A`, `git add .`, `git add architecture-brief/`, `git add roles/`, `git add *` → STOP, redo with explicit filenames. Most important rule.
- **OOS staging:** if `git diff --cached --name-only` returns any path not in §8.1 → STOP, unstage with `git restore --staged <path>`, redo cleanly.
- **§1 path missing OR mismatched:** if a §1 path is missing from `git status --porcelain` → log it as a Brief §2 step 2 skip (acceptable; FUNNEL_ROADMAP is the only known case). If it's present but its file content has been edited since the architect session (e.g. someone touched it mid-cleanup) → STOP, escalate.
- **Push fails:** any non-zero exit from `git push origin develop` → STOP, do NOT retry with `--force` or `--force-with-lease`. Report the error and wait.
- **Smoke OR integrity regression:** any failure → STOP. This SPEC writes zero code; a regression here is a pre-existing bug in HEAD that this SPEC must not paper over.

## 6. Rollback Plan

- `git reset --soft HEAD~1` (only if commit was made but not yet pushed; restores the staging area exactly as it was, no file content lost).
- If already pushed: `git revert <commit-sha> --no-edit && git push origin develop` (preferred, non-destructive). Do **NOT** `git reset --hard` post-push.
- DB state: no DB writes in this SPEC; nothing to roll back there.
- Notify Foreman; SPEC marked REOPEN, not CLOSED.

## 7. Destructive Operations

**None.** Pure additive `git add` + `git commit` + `git push origin develop`. Zero file deletes. Zero mass renames. Zero rebases. Zero `git reset --hard`. Zero `git push --force`. Zero SQL DDL. Zero DML. Zero EF deploys. Zero merges to main. Zero modifications of CLAUDE.md, SKILL.md, or other governance files (the §1 OPEN_TASKS.md edit is an additive task-#2-closure, NOT a section deletion).

## 8. Out of Scope (explicit)

The following are dirty in `git status` but MUST NOT be staged or modified by this SPEC:

### Modified files (8) — leave dirty:
- `.claude/skills/opticup-architect/SKILL.md`
- `.claude/skills/opticup-strategic/SKILL.md`
- `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`
- `docs/guardian/GUARDIAN_ALERTS.md`
- `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md`
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`
- `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md`
- `roles/site-overseer/DECISIONS_LOG.md`
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md`
- `roles/site-overseer/SITE_OVERSEER_SKILL.md`

### Untracked items NOT in §1 — leave untracked (selection; full set in EXECUTION_REPORT.md table):
- The cleanup SPEC's own Brief + activation prompt: `ARCHITECT_SESSION_2026_05_14_CLEANUP_BRIEF.md`, `ARCHITECT_SESSION_2026_05_14_CLEANUP_ACTIVATION_PROMPT.md`
- All other Briefs/Activation Prompts in M1.5, M4 from prior sessions (DESIGN_SYSTEM_*, FULL_AUTO_*, MIGRATION_*, SETTINGS_PERMISSIONS_CONSOLIDATION_*, SKILL_PENDING_*, M4_*_AUDIT_*, M4_OVERNIGHT_*, etc.)
- All M3 Storefront SPEC folders that landed dirty (`M3_BRAND_CATALOG_MOBILE_2COL/`, `M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md`, `M3_QUICK_REGISTER_*`, `M3_REC014_ORPHAN_CLEANUP/`, `M3_SUPERSALE_*`, `M3_TIER1_CATEGORY_SLUG_FIX/`)
- All M2/M3/M9/M13 architecture-brief directories that opened as untracked
- Module 1 mockups (`modules/Module 1 - Inventory Management/architecture-brief/mockups/`)
- `__LAUNCH_PLAN_DRAFT__/`
- `roles/site-overseer/knowledge-build/` and any other site-overseer drafts
- `tests/optic.accdr`, `tests/optic_dt.accdb`, `tests/optic_dt_all.accdb`
- M4 EVENT_24 + LEAD_INTAKE specs, M7 closure brief + center redesign retro, M9 reskin brief

### 8.1 In-scope staged set (this SPEC's commit MUST equal this list exactly):

```
modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_14_BRIEF.md
modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_14_ACTIVATION_PROMPT.md
modules/Module 1.5 - Shared Components/architecture-brief/POST_MERGE_HEALTH_REPORT.md
modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP_BRIEF.md
modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP_ACTIVATION_PROMPT.md
modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_BRIEF.md
modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX_ACTIVATION_PROMPT.md
modules/Module 4 - CRM/architecture-brief/M3_UTM_TRIPLE_LAYER_PERSISTENCE_BRIEF.md
modules/Module 4 - CRM/architecture-brief/M3_UTM_TRIPLE_LAYER_PERSISTENCE_ACTIVATION_PROMPT.md
modules/Module 1.5 - Shared Components/architecture-brief/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK_BRIEF.md
modules/Module 1.5 - Shared Components/architecture-brief/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK_ACTIVATION_PROMPT.md
OPEN_TASKS.md
```

(12 paths. `roles/site-overseer/FUNNEL_ROADMAP.md` from Brief §1 is NOT in this list — confirmed clean per `git status --porcelain "roles/site-overseer/FUNNEL_ROADMAP.md"` returning empty at SPEC-author time. Per Brief §2 step 2: skip + log.)

## 9. Expected Final State

### New files (tracked)
The 11 untracked Briefs + Activation Prompts + Post-Merge Health Report listed in §8.1 transition from `??` to tracked.

### Modified files (committed)
- `OPEN_TASKS.md` — task #2 closed, Last-updated bumped to 2026-05-14 (per Brief §1).

### Deleted files
None.

### DB state
Unchanged. This SPEC writes zero SQL.

### Docs updated
- This SPEC folder gains `SPEC.md` (this file) + `EXECUTION_REPORT.md` + `FINDINGS.md` (if any) + `FOREMAN_REVIEW.md`. These are committed in Commit 2 (the closure commit) per the Foreman/Executor folder-per-SPEC protocol — NOT in Commit 1 (the cleanup commit itself, which is exclusively the §8.1 list).
- Module 1.5 SESSION_CONTEXT — **no update needed**; this SPEC is end-of-session hygiene, does not change M1.5 phase status.
- MASTER_ROADMAP — **no update needed**; same reason.
- GLOBAL_MAP / GLOBAL_SCHEMA — **no update needed**; zero new code/schema.

## 10. Commit Plan

- **Commit 1** (Executor): `docs(architect): commit architect-session 2026-05-14 briefs + governance edits` — adds the §8.1 12 paths.
- **Commit 2** (Executor): `chore(spec): close ARCHITECT_SESSION_2026_05_14_CLEANUP with retrospective` — adds the SPEC folder contents (`SPEC.md`, `EXECUTION_REPORT.md`, `FINDINGS.md` if any).
- **Commit 3** (Foreman): `chore(spec): FOREMAN_REVIEW for ARCHITECT_SESSION_2026_05_14_CLEANUP` — adds `FOREMAN_REVIEW.md`.

Total: 3 commits. Push after each (or batch after Commit 3 — single push acceptable per CLAUDE.md §9).

## 11. Dependencies / Preconditions

- Branch is `develop`, clean integrity gate, push access to `origin/develop` available.
- No concurrent session is staging files in this repo right now (verified via the 2026-05-14 Architect's session-end check that this is the closing chat).
- The 12 §8.1 paths exist on disk (verified at §0).

## 12. Lessons Already Incorporated

- **FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1** → use `## N. Title` headings, no `§` prefix → APPLIED (this SPEC uses plain numbered headings throughout, including `## 7. Destructive Operations`).
- **FROM the standard §0 codification (4 SPECs since MIGRATION_2)** → "Pre-existing untracked files surveyed; Executor will leave them alone — selective `git add` by filename throughout." → APPLIED as the foundational design of this SPEC. The §1 list IS the entire scope; §8.1 makes the staged set explicit and copy-paste-verifiable.
- **FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2** → pin baselines as symbols → APPLIED via `BASE_S1_DIRTY` / `BASE_OOS_DIRTY` in §0 + referenced in §3 #2 + #5.
- **FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #2** → multi-form count criteria → NOT APPLICABLE (this SPEC has no token swap, no multi-form output).
- **FROM `M1_5_FULL_AUTO_PIPELINE`** → Pipeline runs end-to-end in one chat, Foreman → Executor → Reviewer → Foreman → APPLIED (this SPEC's activation prompt explicitly chains the 4 skills).

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --porcelain | wc -l` = `BASE_OOS_DIRTY` (73). The 12 in-scope paths cleared, OOS unchanged.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md written in the SPEC folder, including the §2 step 1 2-column table for ALL `git status --porcelain` lines (in-scope vs not).
- [ ] No `git add -A` / `git add .` / wildcard add anywhere in EXECUTION_REPORT.

End of SPEC.
