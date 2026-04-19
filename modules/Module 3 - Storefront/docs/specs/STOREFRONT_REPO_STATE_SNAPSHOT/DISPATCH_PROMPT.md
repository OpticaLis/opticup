# Dispatch Prompt — STOREFRONT_REPO_STATE_SNAPSHOT

> **Paste this entire text into a new Claude Code session on the Windows desktop.**
> **Machine:** 🖥️ Windows desktop
> **Repos needed:** `C:\Users\User\opticup` (ERP) + `C:\Users\User\opticup-storefront`
> **Estimated time:** 10–15 minutes
> **Changes produced:** ZERO to the storefront repo. Report files only in the ERP repo's SPEC folder.

---

## Context — What Happened and Why You're Here

You are running a **read-only diagnostic** on the `opticup-storefront` repo. The repo is in a messy state after a series of events today (2026-04-18):

### The timeline:
1. **DNS switch executed today** — `prizma-optic.co.il` moved from WordPress/DreamVPS to Vercel. DNS records updated, propagation complete, SSL active.
2. **POST_DNS_PERF_AND_SEO SPEC ran** — 18 performance/SEO changes were batched into one session across 4 commits on develop (`3f9c567`, `d8a1466`, `092bd1b`, `8106116`), then merged to main.
3. **PageSpeed regression** — mobile score dropped 89 → 58 → 47. Root causes: YouTube iframe on mobile (~800KB JS), broken cache middleware, batched changes masking each other.
4. **Two hotfix attempts** (`9056307`, `dd7ddcf`) made it worse.
5. **Full revert on main** — commit `8c362c1` restored main to commit `62ebe0e` (the pre-changes tree). Eye favicon added as `b1a7312`.
6. **develop was NOT reverted** — it still contains all the perf commits + hotfix commits.

### The current state we observed from a Cowork session:
- **Branch:** develop, up to date with origin/develop
- **Staged deletions of critical files:** `vercel.json`, `tsconfig.json`, `src/styles/global.css`, `src/pages/sitemap-dynamic.xml.ts`, multiple RU pages, `search.astro`, `בלוג.astro` — all staged for deletion
- **~250+ modified files (unstaged):** nearly every file in the project shows as modified — could be line-ending (CRLF/LF) artifacts (Windows machine) or real uncommitted work from prior sessions
- **Untracked files:** the same files that are staged-deleted also appear as untracked — suggests a `git mv` or `git rm` gone wrong, or a line-ending re-creation
- **Last 10 commits on develop** are the perf/SEO changes that caused the regression

### What we DON'T know (and need you to find out):
1. Are the ~250 modified files real content changes or just line-ending artifacts?
2. Why are critical files (`vercel.json`, `tsconfig.json`) staged for deletion? Was there a partial operation that went wrong?
3. Do those files still exist on disk and are they intact?
4. Is there any real uncommitted work that must be preserved before cleanup?
5. Does develop even build in its current state?
6. Exactly how many commits diverge between main and develop, and in which direction?

---

## Your Mission

**Read the SPEC and execute it.** The SPEC is at:
```
modules/Module 3 - Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/SPEC.md
```

It contains 8 read-only missions. Run them in order against the storefront repo at `C:\Users\User\opticup-storefront`. Write the results into `SNAPSHOT_REPORT.md` in the same SPEC folder.

### Critical Rules for This SPEC

1. **ZERO changes to `opticup-storefront`.** Do not run `git checkout`, `git restore`, `git stash`, `git clean`, `git add`, `git reset`, `npm install`, `npm ci`, or any command that modifies the working tree. READ ONLY.
2. **All output files go to the ERP repo** at `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\STOREFRONT_REPO_STATE_SNAPSHOT\`.
3. **The only commit you make** is in the ERP repo with the report files.
4. **If something looks broken** (repo corruption, missing .git, etc.) — STOP and report. Do not attempt to fix.

### Key Paths

- **Storefront repo:** `C:\Users\User\opticup-storefront`
- **ERP repo:** `C:\Users\User\opticup`
- **SPEC location:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\STOREFRONT_REPO_STATE_SNAPSHOT\SPEC.md`
- **Report output:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\STOREFRONT_REPO_STATE_SNAPSHOT\SNAPSHOT_REPORT.md`

### Important Commit Hashes (Reference)

| Hash | What it is | Where |
|------|-----------|-------|
| `62ebe0e` | Last known-good state (DNS switch merge) | main's base |
| `8c362c1` | Revert commit that restored 62ebe0e on main | main |
| `b1a7312` | Eye favicon addition | main (tip) |
| `3f9c567` | First perf commit (hero mobile video) | develop |
| `0a04ccf` | Last perf commit (cache diagnostic) | develop (tip?) |

### Execution Flow

```
1. Read the SPEC.md
2. Verify you're looking at opticup-storefront (git remote -v)
3. Run Mission 1 through Mission 8, logging output
4. Write SNAPSHOT_REPORT.md with all results + executive summary
5. Write EXECUTION_REPORT.md (standard retrospective)
6. Write FINDINGS.md if there are any findings
7. Update SESSION_CONTEXT.md in the ERP repo (append close-out entry)
8. Commit all report files to the ERP repo: 
   git add modules/Module\ 3\ -\ Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/SNAPSHOT_REPORT.md
   git add modules/Module\ 3\ -\ Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/EXECUTION_REPORT.md
   git add modules/Module\ 3\ -\ Storefront/docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/FINDINGS.md
   git add modules/Module\ 3\ -\ Storefront/docs/SESSION_CONTEXT.md
   git commit -m "docs(m3): STOREFRONT_REPO_STATE_SNAPSHOT diagnostic report"
   git push origin develop
```

### What Happens After You Finish

Daniel and the strategic architect will read your SNAPSHOT_REPORT.md and decide:
- Whether to stash/discard the dirty state
- How to reconcile main and develop (cherry-pick safe changes? reset develop to main? new branch?)
- Which perf changes to re-apply individually

**Your job is the diagnosis. Do not prescribe the cure — but DO include your assessment in the Executive Summary of the report.**
