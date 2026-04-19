# Storefront Repo State Snapshot — 2026-04-18

> **Executor:** opticup-executor
> **Machine:** 🖥️ Windows desktop
> **Storefront path:** `C:\Users\User\opticup-storefront`
> **ERP path:** `C:\Users\User\opticup`
> **Run mode:** Read-only — ZERO modifications to the storefront repo.

---

## Top-Level Finding — State Differs from Dispatch Brief

**The "messy state" described in the dispatch prompt (250+ modified files, staged deletions of `vercel.json`, `tsconfig.json`, `global.css`, multiple RU pages) is no longer present.** Between the Cowork session's observation and this snapshot, the storefront working tree has been cleaned.

Current actual state (as of this run):
- **Staged changes:** 0
- **Unstaged modifications:** 1 (`SESSION_CONTEXT.md`)
- **Untracked files:** 0 (aside from the one modified file above)
- **Build health:** ✅ passes (Astro build complete in 4.82s)
- **Critical files:** all present and non-truncated

The remaining question — "is develop safe to merge to main?" — is still valid and answered below in Mission 5 + Mission 8.

---

## Mission 1 — Git Identity & Branch State

```
origin  https://github.com/OpticaLis/opticup-storefront.git (fetch)
origin  https://github.com/OpticaLis/opticup-storefront.git (push)

* develop
  main
  remotes/origin/HEAD -> origin/main
  remotes/origin/develop
  remotes/origin/main

local develop        = 0a04ccf fix(cache): diagnostic markers + page-level Cache-Control fallback
local main           = b1a7312 fix(branding): restore eye favicon with transparent background
origin/develop       = 0a04ccf fix(cache): diagnostic markers + page-level Cache-Control fallback
origin/main          = b1a7312 fix(branding): restore eye favicon with transparent background
```

**Summary:** Correct repo (`opticup-storefront`). On `develop`. Local branches fully in sync with origin. Two local branches: `develop` and `main`.

---

## Mission 2 — Staged Changes Analysis

```
$ git diff --staged --stat
(empty)

$ git diff --staged --name-status
(empty)
```

**Classification:** **No staged changes exist.** The dispatch brief's claim that `vercel.json`, `tsconfig.json`, `src/styles/global.css`, multiple RU pages, `search.astro`, `בלוג.astro` were staged for deletion is no longer true as of this run. Either:
- (a) A prior session executed a `git reset` or `git restore --staged` to clear the index, OR
- (b) The Cowork observation captured a transient state during a partial operation that has since resolved.

All files the dispatch brief listed as "staged-deleted" are present on disk (see Mission 7).

---

## Mission 3 — Unstaged Modifications Classification

```
$ git diff --stat
warning: in the working copy of 'SESSION_CONTEXT.md', CRLF will be replaced by LF the next time Git touches it
 SESSION_CONTEXT.md | 18 ++++++++++++++----
 1 file changed, 14 insertions(+), 4 deletions(-)

$ git diff --name-only
SESSION_CONTEXT.md
```

### Step A — Line-ending test

Not applicable — only one file modified, it contains real content changes (verified below).

### Step B — Real content changes

The diff to `SESSION_CONTEXT.md` is substantive: adds a new "POST_DNS_PERF_AND_SEO — Regression & Revert" section and updates the header status to reflect post-regression state. Sample:

```diff
-> Last updated: April 18, 2026
-> Storefront Branch: develop
-> DNS Switch Readiness: ✅ 100/100 — READY FOR DNS SWITCH. Iteration on shipped luxury homepage in progress.
-> Pending git commit by Daniel: Header.astro, BaseLayout.astro, ContactForm.astro, submit.ts, he.json, .env.example, package.json, index.astro x3
+> Last updated: April 18, 2026 (evening)
+> Storefront Branch: develop (ahead of main — contains reverted perf commits, DO NOT merge)
+> Production state: main = commit `62ebe0e` tree + eye favicon (`b1a7312`). PageSpeed ~89 baseline.
+> ⚠️ develop has POST_DNS_PERF_AND_SEO commits that caused 89→47 regression. DO NOT merge develop→main without cherry-picking individual changes with before/after PageSpeed testing.
```

**This is real post-regression documentation work that should be preserved** (commit it on develop). It is not a line-ending artifact.

### Step C — .gitattributes & autocrlf

```
$ cat .gitattributes
* text=auto eol=lf
*.astro text eol=lf
*.ts text eol=lf
*.js text eol=lf
*.mjs text eol=lf
*.json text eol=lf
*.md text eol=lf
*.css text eol=lf
*.html text eol=lf
*.svg text eol=lf
*.yml text eol=lf
*.yaml text eol=lf

$ git config core.autocrlf
true
```

**Note:** `core.autocrlf=true` on Windows combined with `eol=lf` in `.gitattributes` is the likely source of the Cowork session's "~250 modified files" observation — git was flagging every CRLF↔LF mismatch as a modification. When a `git add` or `git checkout` normalises the files, those phantom modifications disappear. This matches what we see now: the repo is clean except for one real content change.

---

## Mission 4 — Untracked Files Inventory

```
$ git status --porcelain -u
 M SESSION_CONTEXT.md
```

**No untracked files.** The dispatch brief's claim of "untracked files that mirror the staged deletions" is no longer true.

---

## Mission 5 — Branch Divergence Map

```
$ git log main..develop --oneline
(empty — develop has NO commits unique to itself)

$ git log develop..main --oneline
b1a7312 fix(branding): restore eye favicon with transparent background
8c362c1 revert: restore site to pre-perf-changes state (PageSpeed 89 baseline)
56ece91 Merge branch 'develop'
1cd0031 Merge branch 'develop'
947edf5 Merge branch 'develop'
a3ff2d1 Merge branch 'develop'
62ebe0e Merge branch 'develop'
(... many older Merge branch 'develop' commits ...)

$ git merge-base main develop
0a04ccfad75121b34e47421f2cc5946070418103   (= develop tip)
```

**Key insight:** `develop` is a strict commit-graph ancestor of `main`. develop has NO commits that aren't reachable from main. main has moved ahead of develop by two real commits (`8c362c1` revert, `b1a7312` favicon) plus the historical merge-commits.

### Branch diagram

```
                                           8c362c1 (revert)  b1a7312 (favicon)
                                                    \          /
main:  ... --- 62ebe0e --- [many Merge develop] --- 56ece91 --- 8c362c1 --- b1a7312  (tip)
                                                      /
develop:  ... --- 3f9c567 --- d8a1466 --- 092bd1b --- 8106116 --- 9056307 --- dd7ddcf --- 0a04ccf  (tip)
          (perf commits that caused the regression)
```

**What this means:**
- Every commit on develop is already on main (via the merges).
- main additionally contains the revert commit `8c362c1` which undoes the tree-level effects of the perf changes.
- The revert does NOT delete the commits from history — it creates a new tree that looks like `62ebe0e` + favicon.
- Therefore develop's **working tree** differs from main's **working tree**, even though develop's **history** is a subset of main's history.

---

## Mission 6 — Build Health Check

```
$ npm run build
> astro build
...
[build] Server built in 4.82s
[build] Complete!
```

Exit code: 0. Build passes cleanly on develop. Vercel adapter bundled successfully, sitemap-index.xml generated, static assets copied to `.vercel/output/static`.

(Mission 6 optional `full-test.mjs` not run — build succeeded, time not spent.)

---

## Mission 7 — Critical File Integrity

| File | Lines | Status |
|------|-------|--------|
| `vercel.json` | 8650 | ✅ Present, not truncated (expected ~5000+, has more — 1671 redirects + new SPA rewrites) |
| `tsconfig.json` | 5 | ✅ Present (small by design — extends astro config) |
| `astro.config.mjs` | 35 | ✅ Present |
| `package.json` | 42 | ✅ Present |
| `src/styles/global.css` | 167 | ✅ Present |
| `src/pages/index.astro` | 114 | ✅ Present |
| `src/layouts/BaseLayout.astro` | 231 | ✅ Present |
| `.env` | 700 bytes | ✅ Present |

**Every file the dispatch brief flagged as "staged for deletion" is present on disk, non-zero, and not truncated.** The `vercel.json` 8650-line figure indicates it contains the full redirect table (the dispatch's "should be 5000+ lines" threshold is exceeded).

---

## Mission 8 — Production vs Develop Delta Summary

### Main's last 10 commits (what's deployed)

```
b1a7312 fix(branding): restore eye favicon with transparent background
8c362c1 revert: restore site to pre-perf-changes state (PageSpeed 89 baseline)
56ece91 Merge branch 'develop'
0a04ccf fix(cache): diagnostic markers + page-level Cache-Control fallback
1cd0031 Merge branch 'develop'
dd7ddcf fix(middleware): override Astro's default Cache-Control instead of respecting it
947edf5 Merge branch 'develop'
9056307 perf(hotfix): Astro middleware for Cache-Control + shorter hero mobile delay + picture wrapper cleanup + .gitattributes
a3ff2d1 Merge branch 'develop'
8106116 perf,refactor(core): phase C — conditional dataLayer init + extract ProductCard CSS to global
```

### `main..develop` content diff

```
48 files changed, 398 insertions(+), 105 deletions(-)
```

Files that differ (tree-level):
- **Added on develop, not on main:** `.gitattributes`, 26 brand WebP images, `scripts/convert-brand-logos.mjs`, `src/middleware.ts`, `src/pages/[...slug].astro`
- **Modified on develop:** 19 files including `vercel.json` (+49), `src/styles/global.css` (+39), `BaseLayout.astro` (+58/-), `HeroLuxuryBlock.astro`, `BrandStripBlock.astro`, `Footer.astro`, `ProductCard.astro` (−39 — CSS extracted), all locale `index.astro` and `[barcode].astro` pages, `[...path].ts` image proxy
- **Deleted on develop vs main:** `public/favicon-512.png` (replaced by favicon regime change)

These 48 files represent the **complete scope of POST_DNS_PERF_AND_SEO's tree changes** — the changes that caused the PageSpeed 89→47 regression and were reverted on main.

### Cleanup scale assessment

- **Small enough to cherry-pick individually:** 48 files across ~9 logical perf concerns (hero mobile, CSP, WebP logos, dns-prefetch, JSON-LD, supersale h1, image dimensions, edge cache, cache middleware).
- **Large enough that a reset-develop-to-main is irreversible without tagging** the perf work first.

---

## Executive Summary

1. **Is there real uncommitted work that must be preserved?**
   Yes — exactly one file: `SESSION_CONTEXT.md` on develop, with post-regression documentation additions (+14/-4 lines). This is substantive and should be committed. Nothing else is uncommitted.

2. **Is the dirty state just line endings or something substantive?**
   **The "dirty state" described in the dispatch is gone.** What remains is one real content change (above). The Cowork session's 250+ modified files were almost certainly a `core.autocrlf=true` × `eol=lf` artifact that resolved when the index/working tree normalised. No evidence of lost work.

3. **Can develop be safely cleaned up, or does it contain unreplicated work?**
   develop's perf commits (`3f9c567` through `0a04ccf`) are the reverted POST_DNS_PERF_AND_SEO work. They ARE replicated on main (in history, via merges), but are functionally reverted by `8c362c1`. They represent real engineering investment that should be preserved as a tag/branch before any reset — not discarded. The SPEC folder at `docs/specs/POST_DNS_PERF_AND_SEO/` already documents the intent.

4. **Recommended cleanup approaches (options, not decisions):**

   | Option | Description | Risk |
   |--------|-------------|------|
   | **A. Tag + reset develop to main** | `git tag perf-sept-2026-reverted 0a04ccf && git push origin perf-sept-2026-reverted && git reset --hard origin/main && git push --force-with-lease`. Preserves perf work as a tag, resets develop to production tree. | **MEDIUM** — `--force-with-lease` push to `develop`. Other machines must re-pull. Loses the uncommitted `SESSION_CONTEXT.md` change unless committed first. |
   | **B. New branch off develop, then reset** | `git checkout -b perf-sept-2026-reverted && git push -u origin perf-sept-2026-reverted && git checkout develop && git reset --hard origin/main`. Same as A but via branch, more discoverable. | **MEDIUM** — same as A, but leaves a branch in `origin` instead of a tag. |
   | **C. Surgical cherry-pick into a new feature branch** | Commit SESSION_CONTEXT.md on develop, then cherry-pick the perf commits one-by-one into a new branch `cleanup/perf-redo`, measure each on PageSpeed, and keep the survivors. Reset develop to main afterwards. | **LOW** — no force push until last step. Most aligned with the "one commit = one measurement" lesson from the revert post-mortem. |
   | **D. Leave develop as-is; always branch from main** | Treat develop as a "lab history" branch. Any future work starts with `git checkout -b NEW_BRANCH main`, not from develop. | **LOWEST** — no destructive action. Cost: develop ≠ production becomes permanent, confusing for new sessions; violates the project's "develop = development integration" convention. |

5. **Risk level notes:**
   - Any option that involves `--force` on `develop` requires confirming no other machine (laptop, Mac) has unpushed work on develop. This snapshot confirms the Windows desktop is clean beyond `SESSION_CONTEXT.md`, but does not speak for the other two machines. Check before pushing force.
   - Option C aligns best with the POST_DNS_PERF_AND_SEO retrospective's "never batch perf changes" lesson.
   - **Do not merge develop→main under any option** — that re-introduces the regression.

---

*End of snapshot report. Executor writes no changes to `opticup-storefront`; cleanup is a separate SPEC to be authored by the Foreman.*
