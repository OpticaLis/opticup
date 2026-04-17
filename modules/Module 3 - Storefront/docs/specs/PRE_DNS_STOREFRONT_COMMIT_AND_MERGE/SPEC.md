# SPEC — PRE_DNS_STOREFRONT_COMMIT_AND_MERGE

> **Location:** `modules/Module 3 - Storefront/docs/specs/PRE_DNS_STOREFRONT_COMMIT_AND_MERGE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-17
> **Module:** 3 — Storefront
> **Author signature:** Cowork session `admiring-vigilant-edison`

---

## 1. Goal

Commit all 565 uncommitted changes in the `opticup-storefront` repo into clean,
logically grouped commits on `develop`, push to origin, then prepare for
Daniel-authorized `develop → main` merge so Vercel deploys the full storefront.

---

## 2. Background & Motivation

Over the past 2 weeks (April 3–17, 2026), Module 3 executed 10+ SPECs across
multiple Cowork and Claude Code sessions. Most SPECs landed code via commits,
but a significant body of work accumulated as uncommitted changes:

- **140 src/ files** — components, pages, layouts, lib (luxury redesign, header,
  contact form, about pages, i18n, display_mode fix, tenant name hardening)
- **147 sql/ files** — migration documentation (migrations 067–125+)
- **136 docs/ files** — audit reports, discovery docs, export CSVs, changelogs
- **96 scripts/ files** — SEO scripts, visual regression, translation tools,
  verification scripts, audit scripts
- **46 other files** — config (.env.example, vercel.json, package.json),
  db-audit, .claude, root-level reference docs

The DNS_SWITCH_READINESS_QA (2026-04-16) diagnosed that EN/RU routing 404s
on Vercel production are caused by `main` being 20+ commits behind `develop` —
a merge gap, not a code bug. All 58 tested pages return HTTP 200 on localhost
`develop`. The remedy is: commit everything → push → merge develop→main →
Vercel auto-deploys.

**Dependency:** BRAND_GALLERY_MEDIA_CONSOLIDATION SPEC is closed (executor
retrospective committed 2026-04-17). No open SPECs block this work.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch | `develop` | `git branch` |
| 2 | Pre-work state | 565 modified, 0 untracked (excluding temp) | `git status --short \| grep -cE '^ M '` → 565 ±5 |
| 3 | Commits produced | 6–10 logical commits | `git log --oneline` count of new commits |
| 4 | Post-commit state | Clean working tree | `git status` → "nothing to commit, working tree clean" |
| 5 | Push successful | All commits on origin/develop | `git push origin develop` → exit 0 |
| 6 | No secrets committed | Zero .env, credentials, API keys in staged content | `git diff --cached \| grep -iE 'sk-\|secret_key\|password=' \| wc -l` → 0 (checked per commit) |
| 7 | package-lock.json included | Lock file committed with package.json | Both in same commit |
| 8 | Build passes | `npm run build` exit 0 | Run AFTER all commits, before push |
| 9 | SESSION_CONTEXT.md updated | Reflects "all uncommitted work landed" | Manual read |

**Alternative outcome (deploy-branch model, per FOREMAN_REVIEW A-1 from
STOREFRONT_LANG_AND_VIDEO_FIX):** If `git status` shows significantly fewer
or more files than expected (±50 from 565), STOP and report the discrepancy.
Daniel may have committed some files manually between sessions.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- `git add` files by explicit name (never `git add -A` or `git add .`)
- `git commit` with descriptive English messages in project convention
- `git push origin develop`
- Run `npm run build` to verify
- Group files into logical commits at executor's discretion (see §9 guidance)
- Skip files that appear auto-generated or temporary (e.g., `.claude/` workspace
  files that are not project config)

### What REQUIRES stopping and reporting
- Any file that looks like it contains secrets (`.env` without `.example`, tokens, keys)
- Any merge to `main` — this SPEC only covers commits + push to `develop`
- `git status` showing significantly different file count than expected (±50)
- `npm run build` failure after committing
- Any file that is a DELETE (tracked file removed from disk) — report before committing the deletion

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If any `.env` file (not `.env.example`) appears in the uncommitted changes → STOP
- If `npm run build` fails after all commits → STOP (do not push broken build)
- If any commit introduces a file >350 lines that wasn't already >350 lines → STOP
- If `git diff` of any file shows the addition of hardcoded tenant data
  (literal "prizma", literal UUIDs) that wasn't already present → STOP

---

## 6. Rollback Plan

- All changes are currently uncommitted. If the executor makes a mistake
  mid-commit, `git reset HEAD~1` undoes the last commit while preserving files.
- If the full commit sequence is wrong: `git reset --soft {START_COMMIT}` returns
  all files to staged state for re-grouping.
- No DB changes in this SPEC. Rollback = git only.
- START_COMMIT: record the current HEAD hash before first commit.

---

## 7. Out of Scope (explicit)

- **Merge to `main`** — Daniel-only, after this SPEC closes and Vercel project
  is recreated
- **Vercel project recreation** — separate manual task, guided in Cowork
- **Resend DNS records** — added during DNS switch day, not now
- **Any code changes or bug fixes** — this SPEC is commit-only. If the executor
  notices a bug while reviewing diffs, log it in FINDINGS.md. Do not fix it.
- **ERP repo (`opticalis/opticup`) merge to main** — separate action, deferred
- **`/optometry/` draft status** — deferred by Daniel
- **opticup-storefront `.claude/` workspace files** — these are session artifacts,
  not project files. Include only if they contain meaningful project config.

---

## 8. Expected Final State

### Repo state
- `develop` branch, clean working tree, 0 uncommitted changes
- `origin/develop` up to date with local
- `npm run build` passes

### Commit grouping (target 6–10 commits, see §9 for details)

The 565 files should be grouped into logical commits roughly following this
categorization:

1. **Infrastructure & config** (~15 files) — `.env.example`, `package.json`,
   `package-lock.json`, `vercel.json`, `.github/`, `.husky/`, `.mcp.json`
2. **Source code — components** (~61 files) — `src/components/`
3. **Source code — pages & layouts** (~39 files) — `src/pages/`, `src/layouts/`
4. **Source code — lib & i18n & styles** (~32 files) — `src/lib/`, `src/i18n/`,
   `src/styles/`, `src/data/`, `src/cms-safelist.html`
5. **SQL migrations** (~147 files) — `sql/`
6. **Scripts & tooling** (~96 files) — `scripts/`
7. **Documentation — reference docs** (~16 root-level .md files) — `CLAUDE.md`,
   `SESSION_CONTEXT.md`, `QUALITY_GATES.md`, etc.
8. **Documentation — audits & reports** (~136 files) — `docs/`, `db-audit/`
9. **Deprecated code** (~7 files) — `src/_deprecated/`

The executor MAY merge groups 2+3+4 into fewer commits or split large groups
if it makes logical sense. The guiding principle: each commit should be a
coherent unit that a reviewer can understand from the commit message alone.

### Docs updated
- `SESSION_CONTEXT.md` (storefront repo) — updated to reflect all work landed
- Module 3 `SESSION_CONTEXT.md` (ERP repo) — NOT updated in this SPEC (ERP
  repo is a separate concern)

---

## 9. Commit Plan

Commit messages in English, present-tense, scoped per project convention.
Suggested messages (executor may adjust based on actual content):

- Commit 1: `chore(config): update package.json, vercel.json, env example, CI workflow`
- Commit 2: `feat(storefront): luxury block renderers, header redesign, tenant name hardening`
- Commit 3: `feat(storefront): page templates, layouts, i18n, about/optometry pages`
- Commit 4: `feat(storefront): lib helpers, data, styles, CMS safelist`
- Commit 5: `docs(sql): add migration documentation files 067-125`
- Commit 6: `chore(scripts): add SEO, audit, translation, verification scripts`
- Commit 7: `docs(storefront): update reference docs (CLAUDE, SESSION_CONTEXT, QUALITY_GATES, etc.)`
- Commit 8: `docs(storefront): audit reports, discovery docs, export CSVs, changelogs`
- Commit 9: `chore(storefront): archive deprecated components`
- Commit 10: `chore(spec): close PRE_DNS_STOREFRONT_COMMIT_AND_MERGE with retrospective`

**Secret-check rule:** Before every `git commit`, run:
```
git diff --cached | grep -iE '(sk-|secret_key|password=|SUPABASE_SERVICE_ROLE|anon_key)' | head -5
```
If any output → unstage the offending file, report in FINDINGS.md.

---

## 10. Dependencies / Preconditions

- Executor session must be on the Windows desktop machine (`C:\Users\User\opticup-storefront`)
- `opticup-storefront` repo must be accessible with git configured
- Node.js + npm available for `npm run build`
- No other session actively modifying the storefront repo simultaneously

---

## 11. Lessons Already Incorporated

- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → A-1 (deploy-branch
  outcome modeling): APPLIED — §3 includes alternative outcome if file count
  diverges significantly.
- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → A-2 (LITERAL vs
  INTENT criteria): APPLIED — all SC items are LITERAL (exact counts/exit codes).
- FROM `STOREFRONT_S2S3_QA/FOREMAN_REVIEW.md` → A-1 (rollback plan mandatory
  for SQL SPECs): NOT APPLICABLE — no SQL changes in this SPEC.
- FROM `STOREFRONT_S2S3_QA/FOREMAN_REVIEW.md` → A-2 (mount preconditions):
  APPLIED — §10 specifies Windows desktop machine, no session-specific paths.
- FROM `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md` → A-1 (pre-SPEC
  reality grep): APPLIED — file counts verified via actual `git status` before
  authoring, not assumed from memory.
- FROM `BRAND_GALLERY_MEDIA_CONSOLIDATION/EXECUTION_REPORT.md` → E-1 (git lock
  file handling): NOTED — if git lock files appear, report the exact `del`
  commands for Daniel to run. Do not retry indefinitely.
- Cross-Reference Check completed 2026-04-17 against current repo state:
  0 collisions (this SPEC creates no new DB objects, functions, or files —
  it commits existing uncommitted work only).
