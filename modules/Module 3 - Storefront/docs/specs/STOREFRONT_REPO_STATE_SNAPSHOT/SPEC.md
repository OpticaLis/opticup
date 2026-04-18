# SPEC — STOREFRONT_REPO_STATE_SNAPSHOT

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-18
> **Module:** 3 — Storefront
> **Phase:** POST-DNS (diagnostic)
> **Author signature:** Cowork session awesome-cool-faraday

---

## 1. Goal

Produce a comprehensive read-only snapshot of the `opticup-storefront` repo's current state — covering git status, branch divergence, file integrity, and build health — so we can make informed cleanup decisions without risking any data loss.

---

## 2. Background & Motivation

After the DNS switch (2026-04-18) and the POST_DNS_PERF_AND_SEO revert, the storefront repo on the Windows desktop is in a messy state:

- **Staged deletions** of critical files (`vercel.json`, `tsconfig.json`, `global.css`, RU pages)
- **~250+ modified files** (unstaged) — unclear if real changes or line-ending artifacts
- **Untracked files** that mirror the staged deletions
- **develop is ahead of main** with reverted perf commits that must NOT be merged blindly

The POST_DNS_PERF_AND_SEO revert was done on `main` directly (commit `8c362c1`). develop still contains the original perf commits. We need a full picture before deciding how to clean up.

**This SPEC produces ZERO changes.** It is a read-only diagnostic. The cleanup will be a separate SPEC authored after reviewing this snapshot's output.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch | On `develop` | `git branch --show-current` → `develop` |
| 2 | No commits produced | 0 new commits | `git log --oneline -1` hash unchanged from start |
| 3 | No files modified by executor | 0 files touched | `git diff --name-only` before vs after identical |
| 4 | SNAPSHOT_REPORT.md written | File exists in SPEC folder | `ls modules/Module 3 - Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/SNAPSHOT_REPORT.md` |
| 5 | Report contains all 8 missions | 8 section headers present | `grep -c '^## Mission' SNAPSHOT_REPORT.md` → `8` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in both repos (`opticup` and `opticup-storefront`)
- Run any read-only git command (`git status`, `git diff`, `git log`, `git show`, etc.)
- Run `npm run build` (read-only test — produces output in `dist/`, already gitignored)
- Run `node scripts/full-test.mjs --no-build` (read-only verification)
- Write ONLY to the SPEC folder: `SNAPSHOT_REPORT.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`

### What REQUIRES stopping and reporting
- **Any `git checkout`, `git restore`, `git reset`, `git stash`, `git clean`** — this is a read-only SPEC
- **Any file edit outside the SPEC folder**
- **Any `git add`, `git commit`, `git push`** (except the final retrospective commit)
- **Any DB query or modification**
- **Any npm install or package changes**

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `git branch --show-current` is not `develop` → STOP (do not switch branches)
- If any mission command returns an error that suggests repo corruption → STOP and report raw error
- If the report exceeds 500 lines → split into SNAPSHOT_REPORT.md + SNAPSHOT_APPENDIX.md

---

## 6. Rollback Plan

No rollback needed — this SPEC produces no changes to the repo or DB. The only output is the report file in the SPEC folder. If something goes wrong, delete `SNAPSHOT_REPORT.md` and re-run.

---

## 7. Out of Scope (explicit)

- **DO NOT clean up, restore, stash, or fix anything** — report only
- **DO NOT run `git add`, `git restore`, `git checkout`** on any working tree file
- **DO NOT modify `.gitattributes` or git config** (even if line-ending issues are found)
- **DO NOT touch the ERP repo** (except reading `SESSION_CONTEXT.md` for cross-reference)
- **DO NOT run any destructive npm commands** (`npm ci`, `npm prune`, etc.)
- **DO NOT merge, rebase, or cherry-pick anything**

---

## 8. Expected Final State

### New files
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/SNAPSHOT_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/FINDINGS.md`

### Modified files
- None

### Deleted files
- None

### DB state
- No DB access in this SPEC

### Docs updated
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — append snapshot close-out entry (ERP repo)

---

## 9. Commit Plan

- **Commit 1 (only commit):** `docs(m3): STOREFRONT_REPO_STATE_SNAPSHOT diagnostic report`
  - Files: `SNAPSHOT_REPORT.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, updated `SESSION_CONTEXT.md`
  - This commit goes to the ERP repo (`opticup`), NOT the storefront repo
  - The storefront repo must remain completely untouched

---

## 10. Dependencies / Preconditions

- Both repos accessible: `opticup` (ERP) and `opticup-storefront`
- Must be on the Windows desktop machine (where the dirty state exists)
- No `npm install` or `npm ci` should run before the diagnostic (it would change `node_modules` and obscure the current state)

---

## 11. Lessons Already Incorporated

- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → "Expected final state should model branch outcomes" → APPLIED: this is a read-only SPEC with no branching outcomes, but the explicit "ZERO changes" contract prevents scope creep.
- FROM `DNS_SWITCH_READINESS_QA/FOREMAN_REVIEW.md` → "Two-tier stop triggers" → APPLIED: stop triggers are narrowly scoped to any write operation.
- FROM `POST_DNS_PERF_AND_SEO` post-mortem → "Never batch changes" → APPLIED by design: this SPEC deliberately separates diagnosis from cleanup into two SPECs.
- Cross-Reference Check completed 2026-04-18 against GLOBAL_SCHEMA: 0 collisions (no new DB objects, functions, or files created outside SPEC folder).

---

## 12. The 8 Missions

The executor must run these missions IN ORDER and log each result into `SNAPSHOT_REPORT.md`.

### Mission 1 — Git Identity & Branch State

```bash
# Run all of these, log raw output
git -C <storefront-path> remote -v
git -C <storefront-path> branch -a
git -C <storefront-path> log --oneline -1 develop
git -C <storefront-path> log --oneline -1 main
git -C <storefront-path> log --oneline -1 origin/develop
git -C <storefront-path> log --oneline -1 origin/main
```

**Purpose:** Confirm which repo we're in, what branches exist, whether local branches are behind/ahead of remote.

### Mission 2 — Staged Changes Analysis

```bash
git -C <storefront-path> diff --staged --stat
git -C <storefront-path> diff --staged --name-status
```

**Purpose:** Understand exactly what is staged. The Cowork session showed critical files (`vercel.json`, `tsconfig.json`, `global.css`) staged for deletion. We need to know:
- Are these real deletions or artifacts?
- What operation caused them to be staged?
- Is there a partial `git rm` or `git mv` that went wrong?

**Additional check:** For each file staged as "deleted" (D) or "renamed" (R), check if the file actually exists on disk:
```bash
# For each deleted file from the --name-status output:
ls -la <storefront-path>/<file>
```

### Mission 3 — Unstaged Modifications Classification

```bash
git -C <storefront-path> diff --stat  # summary
git -C <storefront-path> diff --name-only  # file list
```

Then classify the ~250 modified files:

**Step A — Line-ending test:** Pick 5 files from different categories (1 `.astro`, 1 `.ts`, 1 `.md`, 1 `.json`, 1 `.sql`) and run:
```bash
git diff <file> | head -20
```
If the diff shows ONLY `^M` (carriage return) changes with no content difference → likely a global CRLF/LF issue. Report: "Line-ending artifact — N files affected."

**Step B — Real content changes:** For any file where the diff shows actual content changes (not just line endings), log the file name and a 1-line summary of what changed.

**Step C — .gitattributes check:**
```bash
cat <storefront-path>/.gitattributes 2>/dev/null || echo "NO .gitattributes FILE"
git -C <storefront-path> config core.autocrlf
```

### Mission 4 — Untracked Files Inventory

```bash
git -C <storefront-path> status --porcelain -u | grep '^??' | sort
```

**Purpose:** List all untracked files. Cross-reference against Mission 2's deleted files — if the same file appears as both staged-deleted AND untracked, it's likely a `git mv` gone wrong or a line-ending re-creation.

### Mission 5 — Branch Divergence Map

```bash
# Commits on develop that are NOT on main
git -C <storefront-path> log main..develop --oneline

# Commits on main that are NOT on develop
git -C <storefront-path> log develop..main --oneline

# Merge base
git -C <storefront-path> merge-base main develop
```

**Purpose:** Map the exact divergence. We know main was reverted to `62ebe0e` + favicon. We need to see:
- How many commits are on develop that aren't on main (the perf regression commits + older work)
- Whether main has revert commits that develop doesn't have
- The merge-base commit (last common ancestor)

### Mission 6 — Build Health Check

```bash
cd <storefront-path>
npm run build 2>&1
echo "EXIT CODE: $?"
```

**Purpose:** Does the current develop state build? Record the full output (or last 50 lines if verbose). If it fails, record the error.

**Optional (if build passes):**
```bash
node scripts/full-test.mjs --no-build 2>&1
echo "EXIT CODE: $?"
```

### Mission 7 — Critical File Integrity

Check that the following essential files exist AND are not empty on disk (regardless of git status):

```bash
for f in vercel.json tsconfig.json astro.config.mjs package.json src/styles/global.css src/pages/index.astro src/layouts/BaseLayout.astro .env; do
  if [ -f "<storefront-path>/$f" ]; then
    echo "EXISTS ($( wc -l < "<storefront-path>/$f" ) lines): $f"
  else
    echo "MISSING: $f"
  fi
done
```

For `vercel.json` specifically (contains 1671 redirect rules — critical for SEO):
```bash
wc -l <storefront-path>/vercel.json
# Should be ~5000+ lines. If significantly shorter → truncation issue
```

### Mission 8 — Production vs Develop Delta Summary

```bash
# What's on main (production) right now
git -C <storefront-path> log main --oneline -5

# Diff stat between main and develop
git -C <storefront-path> diff main..develop --stat | tail -5
```

**Purpose:** Quantify the gap. How many files differ? How many insertions/deletions? This tells us the scale of the cleanup decision.

---

## 13. Report Format

The executor writes `SNAPSHOT_REPORT.md` with this structure:

```markdown
# Storefront Repo State Snapshot — 2026-04-18

## Mission 1 — Git Identity & Branch State
[raw output + 1-line summary]

## Mission 2 — Staged Changes Analysis
[raw output + classification: real vs artifact]

## Mission 3 — Unstaged Modifications Classification
[line-ending test result + count of real vs CRLF-only changes]

## Mission 4 — Untracked Files Inventory
[list + cross-reference with Mission 2]

## Mission 5 — Branch Divergence Map
[commit lists + merge-base + diagram if helpful]

## Mission 6 — Build Health Check
[build result + test result if applicable]

## Mission 7 — Critical File Integrity
[file existence table]

## Mission 8 — Production vs Develop Delta Summary
[stat summary + cleanup scale assessment]

---

## Executive Summary

[3-5 bullet points answering:]
- Is there real uncommitted work that must be preserved?
- Is the dirty state just line endings or something substantive?
- Can develop be safely cleaned up, or does it contain unreplicated work?
- What is the recommended cleanup approach? (options, not decisions)
- What is the risk level of each option?
```
