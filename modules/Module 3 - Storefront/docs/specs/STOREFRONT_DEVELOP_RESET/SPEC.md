# SPEC — STOREFRONT_DEVELOP_RESET

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_DEVELOP_RESET/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-18
> **Module:** 3 — Storefront
> **Phase:** POST-DNS (cleanup)
> **Author signature:** Cowork session awesome-cool-faraday
> **Depends on:** STOREFRONT_REPO_STATE_SNAPSHOT (closed, commit `c36a8b3`)

---

## 1. Goal

Reset the `opticup-storefront` develop branch to match main (production), preserving the reverted perf work as a tagged reference. After this SPEC, develop = main = production, and new work can begin from a clean base.

---

## 2. Background & Motivation

The POST_DNS_PERF_AND_SEO SPEC (2026-04-18) applied 18 perf/SEO changes to develop, merged to main, caused a PageSpeed regression (89→47), and was reverted on main (`8c362c1`). develop still contains the perf commits. The STOREFRONT_REPO_STATE_SNAPSHOT diagnostic (commit `c36a8b3`) confirmed:

- develop is a commit-graph ancestor of main (0 unique commits)
- develop's **tree** differs from main's tree by 48 files (+398/-105)
- One uncommitted file (`SESSION_CONTEXT.md`) with real post-regression docs that must be preserved
- Build passes, no other dirty state

This SPEC executes Option C Step 1 from the snapshot report: commit the uncommitted work, tag the perf work, reset develop to main.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch | On `develop` at end | `git branch --show-current` → `develop` |
| 2 | Uncommitted SESSION_CONTEXT.md | Committed before reset | Exists in git log |
| 3 | Tag created | `perf-post-dns-reverted` exists | `git tag -l perf-post-dns-reverted` → 1 result |
| 4 | Tag pushed | Tag on origin | `git ls-remote --tags origin perf-post-dns-reverted` → 1 result |
| 5 | develop tip = main tip | Same commit hash | `git rev-parse develop` = `git rev-parse main` |
| 6 | develop pushed | In sync with origin | `git status` → "up to date with origin/develop" |
| 7 | Working tree clean | No modified/untracked | `git status` → "nothing to commit, working tree clean" |
| 8 | Build passes | Exit 0 | `npm run build` → exit 0 |
| 9 | Critical files intact | vercel.json, tsconfig.json, global.css, index.astro all present | `ls` each → exit 0 |
| 10 | main NOT modified | Same hash as before SPEC started | `git rev-parse main` unchanged |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in both repos
- Run read-only git commands
- `git add` + `git commit` the uncommitted `SESSION_CONTEXT.md` on develop (Step 1)
- `git tag` to create the preservation tag (Step 2)
- `git push origin <tag>` to push the tag (Step 2)
- `git reset --hard origin/main` on develop (Step 3) — **this is the core destructive action, pre-approved**
- `git push --force-with-lease origin develop` (Step 4) — **pre-approved for this SPEC only**
- `npm run build` to verify (Step 5)
- Write retrospective files to the ERP repo SPEC folder
- Commit + push retrospective to ERP develop

### What REQUIRES stopping and reporting
- If `git status` at the start shows MORE than just `SESSION_CONTEXT.md` modified → STOP (unexpected state change since snapshot)
- If any other machine has unpushed commits on develop that aren't on origin → STOP (the `--force-with-lease` will fail, which is correct — report it)
- If `npm run build` fails after reset → STOP
- If `git rev-parse main` changes during execution → STOP (someone pushed to main)
- Any operation on `main` branch — never checkout main, never push to main

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If develop has ANY commits not on origin/develop at start → STOP (another machine may have pushed)
- If origin/main hash ≠ `b1a7312` → STOP (production changed since snapshot)
- If the force-push is rejected by the server → STOP and report (means another machine pushed to develop)
- If post-reset `vercel.json` has fewer than 5000 lines → STOP (truncation)

---

## 6. Rollback Plan

If anything goes wrong after the reset:

```bash
# The tag preserves develop's pre-reset state
git checkout develop
git reset --hard perf-post-dns-reverted
git push --force-with-lease origin develop
```

The tag `perf-post-dns-reverted` is created BEFORE the reset specifically so this rollback is possible. If the tag wasn't created (failure in Step 2), develop's pre-reset state is still at `origin/develop` until Step 4 pushes.

---

## 7. Out of Scope (explicit)

- **DO NOT cherry-pick any perf changes** — that is Step 2, a separate SPEC
- **DO NOT touch main** — no checkout, no push, no merge
- **DO NOT run `npm install` or `npm ci`** — the reset brings main's `package-lock.json` which should be compatible
- **DO NOT modify any file in the ERP repo** except the SPEC folder + SESSION_CONTEXT.md
- **DO NOT touch any other branch** — no feature branches, no cleanup branches

---

## 8. Expected Final State

### Storefront repo (`opticup-storefront`)
- `develop` branch tip = `b1a7312` (same as `main`)
- Tag `perf-post-dns-reverted` pointing to `0a04ccf` (old develop tip)
- Working tree clean
- Build passes
- All critical files present (vercel.json 8650 lines, tsconfig.json, global.css, etc.)

### ERP repo (`opticup`)
- New files in SPEC folder: `EXECUTION_REPORT.md`, `FINDINGS.md`
- Updated: `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — close-out entry for this SPEC

### What is preserved
- Every perf commit is reachable via `git log perf-post-dns-reverted`
- The SESSION_CONTEXT.md post-regression docs are in a commit before the reset
- The POST_DNS_PERF_AND_SEO SPEC folder in the ERP repo documents the full intent

### What is gone from develop (intentionally)
- The 48-file tree difference between develop and main
- `src/middleware.ts`, `.gitattributes`, 26 WebP brand logos, `convert-brand-logos.mjs`
- All changes from commits `3f9c567` through `0a04ccf`

---

## 9. Commit Plan

**Storefront repo (3 operations, 1 commit + 1 tag + 1 force-push):**

- **Commit 1:** `docs(storefront): preserve post-regression SESSION_CONTEXT updates`
  - File: `SESSION_CONTEXT.md`
  - Must happen BEFORE the reset (otherwise the change is lost)

- **Tag:** `perf-post-dns-reverted` at the commit AFTER Commit 1
  - `git tag perf-post-dns-reverted -m "POST_DNS_PERF_AND_SEO work — reverted from main due to PageSpeed 89→47 regression. See ERP repo docs/specs/POST_DNS_PERF_AND_SEO/ for post-mortem."`
  - Push: `git push origin perf-post-dns-reverted`

- **Reset + force-push:**
  - `git reset --hard origin/main`
  - `git push --force-with-lease origin develop`

**ERP repo (1 commit):**

- **Commit 2:** `docs(m3): STOREFRONT_DEVELOP_RESET close-out`
  - Files: `EXECUTION_REPORT.md`, `FINDINGS.md`, `SESSION_CONTEXT.md` update

---

## 10. Dependencies / Preconditions

- STOREFRONT_REPO_STATE_SNAPSHOT completed (commit `c36a8b3`) ✅
- Must be on Windows desktop machine (where the snapshot was taken)
- No other machine should have unpushed work on storefront develop (the `--force-with-lease` will reject if so — this is a safety net, not something to override)
- `origin/main` must still be at `b1a7312` (verify before starting)

---

## 11. Lessons Already Incorporated

- FROM `POST_DNS_PERF_AND_SEO/REVERT_POST_MORTEM.md` → "Never batch perf changes" → APPLIED: this SPEC deliberately separates the cleanup (reset) from the re-application (cherry-pick). Each is its own SPEC.
- FROM `STOREFRONT_REPO_STATE_SNAPSHOT/SNAPSHOT_REPORT.md` → "Tag before any destructive action" → APPLIED: tag is Step 2, reset is Step 3. Rollback path documented.
- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → "Model all branch outcomes in expected final state" → APPLIED: §8 explicitly lists what is preserved and what is gone.
- Cross-Reference Check completed 2026-04-18: 0 collisions (no new DB objects, functions, or files — this is a cleanup SPEC).

---

## 12. Step-by-Step Execution Plan

### Pre-flight (before any changes)

```bash
cd C:\Users\User\opticup-storefront
git branch --show-current          # must be: develop
git status                         # must show: only SESSION_CONTEXT.md modified
git rev-parse origin/main          # record hash — must be b1a7312...
git rev-parse origin/develop       # record hash — must be 0a04ccf...
git log origin/develop..develop --oneline  # must be empty (no unpushed commits)
```

If ANY pre-flight check fails → STOP and report.

### Step 1 — Commit the uncommitted SESSION_CONTEXT.md

```bash
git add SESSION_CONTEXT.md
git commit -m "docs(storefront): preserve post-regression SESSION_CONTEXT updates"
git push origin develop
```

Verify: `git status` → clean. `git log --oneline -1` → the commit just made.

### Step 2 — Tag the perf work

```bash
git tag perf-post-dns-reverted -m "POST_DNS_PERF_AND_SEO work — reverted from main due to PageSpeed 89→47 regression. See ERP repo docs/specs/POST_DNS_PERF_AND_SEO/ for post-mortem."
git push origin perf-post-dns-reverted
```

Verify: `git tag -l perf-post-dns-reverted` → shows the tag. `git log perf-post-dns-reverted --oneline -3` → shows the perf commits.

### Step 3 — Reset develop to main

```bash
git reset --hard origin/main
```

Verify:
- `git rev-parse HEAD` = `git rev-parse origin/main` (same hash)
- `git status` → clean working tree
- `git diff origin/main` → empty (no diff)

### Step 4 — Push the reset

```bash
git push --force-with-lease origin develop
```

If this fails → STOP. It means another machine pushed to develop between Step 1 and now. Do NOT use `--force` to override. Report the error.

Verify: `git status` → "up to date with origin/develop"

### Step 5 — Verify post-reset health

```bash
npm run build
# Expected: exit 0, "Complete!" message

# Critical file check
wc -l vercel.json          # expected: ~8650
wc -l tsconfig.json        # expected: ~5
wc -l src/styles/global.css  # expected: ~167 (main's version, may differ slightly)
ls src/pages/index.astro    # exists
ls src/layouts/BaseLayout.astro  # exists
```

If build fails → STOP. The reset brought main's tree which is known-good (PageSpeed 89), so a build failure would indicate a problem.

### Step 6 — ERP repo retrospective

```bash
cd C:\Users\User\opticup
# Write EXECUTION_REPORT.md and FINDINGS.md to the SPEC folder
# Update SESSION_CONTEXT.md
# Commit and push
```
