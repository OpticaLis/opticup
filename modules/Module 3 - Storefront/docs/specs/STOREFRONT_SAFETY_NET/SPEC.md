# SPEC — STOREFRONT_SAFETY_NET

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_SAFETY_NET/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-18
> **Module:** 3 — Storefront
> **Phase:** Stabilization Phase 1
> **Author signature:** Cowork session laughing-compassionate-knuth

---

## 1. Goal

Build a comprehensive automated test suite for the Optic Up storefront that
catches page failures, block rendering errors, redirect breakage, and
performance regressions — so that every future change can be validated with
a single command before merge.

---

## 2. Background & Motivation

The storefront is live at `prizma-optic.co.il` since 2026-04-18 (DNS switch).
It serves 76 published pages across 3 languages (HE/EN/RU) with 8 CMS block
types and 1,671 WordPress redirects.

Current testing infrastructure:
- `full-test.mjs` — 18 tests (basic health checks)
- Pre-commit hooks — file-size, frozen-files, rule-23-secrets, rule-24-views-only
- `npm run build` — catches compile errors only

What's missing:
- No per-page HTTP health check (a page can 404 without anyone knowing)
- No block rendering validation (a broken block type = broken pages)
- No redirect integrity verification (a broken regex in vercel.json = SEO damage)
- No PageSpeed regression detection (the 89→47 regression was caught manually)
- No single "run everything" command

This SPEC builds the safety net that all future agent work depends on.
See `modules/Module 3 - Storefront/docs/STABILIZATION_ROADMAP.md` Phase 1.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| SC-1 | Branch state at start | On `develop`, clean | `git status` → "nothing to commit" |
| SC-2 | `scripts/safety-net.mjs` exists | File present, executable | `ls scripts/safety-net.mjs` → exit 0 |
| SC-3 | `scripts/checks/` directory | Contains ≥5 check modules | `ls scripts/checks/*.mjs \| wc -l` ≥ 5 |
| SC-4 | Page health check | Tests all published pages from sitemap | Check reads `sitemap.xml` or DB page list, verifies HTTP 200 for each |
| SC-5 | Block type coverage | All 8 block types have render test | Check validates: `hero_luxury`, `brand_strip`, `tier1_spotlight`, `story_teaser`, `tier2_grid`, `events_showcase`, `optometry_teaser`, `visit_us` |
| SC-6 | Redirect integrity | Top 30 redirects verified | Check has hardcoded list of 30 critical WordPress URLs + expected targets |
| SC-7 | PageSpeed baseline | Lighthouse CI scores stored + threshold check | Check runs Lighthouse CLI on homepage, fails if mobile Performance < 75 |
| SC-8 | Console/build errors | Zero errors on `npm run build` | `npm run build` → exit 0, 0 errors in output |
| SC-9 | Frozen file detection | Changes to frozen files flagged | Check lists frozen files, warns if any are in staged changes |
| SC-10 | `--quick` mode | Fast subset for pre-commit (< 10 seconds) | `node scripts/safety-net.mjs --quick` completes in < 10s |
| SC-11 | `--full` mode | Complete suite including network checks | `node scripts/safety-net.mjs --full` runs all checks including HTTP + Lighthouse |
| SC-12 | Exit code semantics | Exit 0 = all pass, exit 1 = failures | Intentionally break something → run → exit 1 with clear error message |
| SC-13 | `npm run test` wired | `package.json` has `"test": "node scripts/safety-net.mjs --full"` | `npm test` → runs full suite |
| SC-14 | CI-ready output | Machine-parseable summary line | Last line of output: `PASS: X/Y checks passed` or `FAIL: X/Y checks passed, Z failed` |
| SC-15 | Documentation | README section explaining the safety net | `README.md` or `scripts/README.md` has usage instructions |
| SC-16 | Storefront build passes | Zero regressions from this SPEC | `npm run build` → exit 0 after all changes |
| SC-17 | Commits on develop | 1-2 commits, pushed | `git log origin/develop..HEAD --oneline` |
| SC-18 | Existing tests preserved | `full-test.mjs` 18 tests still pass | `node scripts/full-test.mjs --no-build` → 18/18 PASS |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the storefront repo
- Create new files under `scripts/` and `scripts/checks/`
- Edit `package.json` to add the `"test"` script
- Add documentation to `README.md` or `scripts/README.md`
- Run `npm run build`, `full-test.mjs`, and the new safety-net scripts
- Install dev dependencies via `npm install --save-dev` (e.g., `lighthouse`)
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- Modifying any existing `.astro`, `.ts`, `.css` source file (this SPEC adds
  tests, not features)
- Modifying `vercel.json`
- Modifying any existing test in `full-test.mjs`
- Any DB query (read or write) — this SPEC is code-only
- Any schema change
- Any merge to `main`
- Any test failure that cannot be diagnosed in a single retry
- Any step where actual output diverges from §3 expected value

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `npm run build` fails at ANY point during execution → STOP
- If existing `full-test.mjs` tests break after any change → STOP (SC-18)
- If Lighthouse CLI is not installable or runnable in the environment → STOP,
  report, and propose alternative (e.g., skip PageSpeed check, mark SC-7
  as UNVERIFIED)
- If the page list source (sitemap or DB) returns fewer than 50 pages → STOP
  (expected: 76+ pages — a low count suggests wrong data source)

---

## 6. Rollback Plan

This SPEC only ADDS files — no existing files are modified except `package.json`
(one line: `"test"` script). Rollback:

```bash
git revert HEAD  # or HEAD~1 if 2 commits
```

No DB changes. No config changes. Clean revert.

---

## 7. Out of Scope (explicit)

- Modifying any Astro component, page, or layout
- Modifying `vercel.json` redirects
- Modifying CSS or Tailwind config
- Modifying any existing pre-commit hook
- Running tests against production (`prizma-optic.co.il`) — all tests run
  against `localhost:4321` or use `npm run build` output
- GitHub Actions CI setup (future SPEC)
- Branch protection / CODEOWNERS setup (manual, see STABILIZATION_ROADMAP §Phase 4)

---

## 8. Expected Final State

### New files
- `scripts/safety-net.mjs` — main entry point with `--quick` and `--full` modes
- `scripts/checks/page-health.mjs` — HTTP 200 check for all published pages
- `scripts/checks/block-render.mjs` — validates all 8 block types render
- `scripts/checks/redirect-integrity.mjs` — verifies top 30 WordPress redirects
- `scripts/checks/pagespeed-baseline.mjs` — Lighthouse CI threshold check
- `scripts/checks/frozen-files.mjs` — flags changes to protected files
- `scripts/checks/build-check.mjs` — wraps `npm run build` with error parsing (MAY be inlined in safety-net.mjs if simpler)

### Modified files
- `package.json` — add `"test": "node scripts/safety-net.mjs --full"` to scripts
- `README.md` or `scripts/README.md` — usage documentation for the safety net

### Deleted files
- None

### DB state
- No changes

### Docs updated (MUST include)
- Module 3 `SESSION_CONTEXT.md` — new section for this SPEC execution
- Module 3 `CHANGELOG.md` — entry for safety net addition

---

## 9. Commit Plan

- **Commit 1:** `feat(storefront): add safety-net test suite with page health, block render, redirect, and PageSpeed checks`
  — All new files under `scripts/`, `package.json` update
- **Commit 2:** `docs(storefront): add safety-net documentation and update SESSION_CONTEXT`
  — README update, SESSION_CONTEXT, CHANGELOG

---

## 10. Dependencies / Preconditions

- **Repo:** `opticalis/opticup-storefront` must be mounted / accessible
- **Branch:** `develop`, clean working tree
- **Node.js:** available (for script execution)
- **npm packages:** `lighthouse` CLI must be installable (or SC-7 marked UNVERIFIED)
- **Dev server:** `npm run dev` must be runnable on `localhost:4321` for HTTP checks,
  OR checks can use `npm run build` + `npm run preview` as alternative.
  **Executor decides** the best approach for the environment.
- **Previous SPEC:** No dependency — this is the first stabilization SPEC

---

## 11. Lessons Already Incorporated

- FROM `STOREFRONT_S2S3_QA/FOREMAN_REVIEW.md` → **A-2 (mount preconditions):**
  APPLIED — §10 lists the storefront repo as explicit precondition with STOP
  instruction if not accessible.
- FROM `STOREFRONT_S2S3_QA/FOREMAN_REVIEW.md` → **E-1 (enumerate mounted dirs):**
  APPLIED — executor must verify storefront repo access in First Action before
  any work.
- FROM `DNS_SWITCH_READINESS_QA/FOREMAN_REVIEW.md` → **A-2 (two-tier stop triggers):**
  APPLIED — §5 uses graduated triggers (STOP for build failure vs. STOP+report
  for Lighthouse unavailability).
- FROM `STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md` → **E-2 (SC precision audit):**
  APPLIED — every SC in §3 has an exact expected value and verify command.
- FROM `POST_DNS_PERF_AND_SEO/REVERT_POST_MORTEM.md` → **"one change per commit
  with measurement":** APPLIED as architectural principle — the safety net IS
  the measurement tool that enables safe single-change iterations.

---

## 12. Architecture Notes for Executor

### Page list source
The test suite needs a list of all published pages. Two approaches:

**Option A (preferred):** Parse the built sitemap (`dist/sitemap*.xml`) after
`npm run build`. This guarantees the list matches what's actually deployed.

**Option B (fallback):** Query `v_storefront_pages` via Supabase anon key for
`status='published'` pages. Use this only if sitemap parsing is impractical.

Executor chooses. Document the choice in EXECUTION_REPORT.

### Block type validation
The 8 block types have Astro renderers at:
```
src/components/blocks/HeroLuxuryBlock.astro
src/components/blocks/BrandStripBlock.astro
src/components/blocks/Tier1SpotlightBlock.astro
src/components/blocks/StoryTeaserBlock.astro
src/components/blocks/Tier2GridBlock.astro
src/components/blocks/EventsShowcaseBlock.astro
src/components/blocks/OptometryTeaserBlock.astro
src/components/blocks/VisitUsBlock.astro
```

Validation approach: ensure `npm run build` produces output that includes
rendered content from each block type (grep built HTML for block-specific
class names or identifiers). This catches a block renderer that crashes or
produces empty output.

### Redirect verification
The top 30 redirects should be selected by SEO importance — high-traffic
WordPress URLs. Executor should examine `vercel.json` and select 30
representative entries covering:
- Homepage redirect (with/without `www`)
- Blog post redirects (5-10)
- Product category redirects (5-10)
- Landing page redirects (5-10)
- Edge cases (Hebrew URLs, query parameters)

Verification: parse `vercel.json`, confirm source pattern exists and
destination is a valid path in the built site.

### Frozen files list
These files must NEVER be modified without Daniel's explicit approval:
- `vercel.json` — 1,671 redirects, regex rules
- `src/lib/supabase.ts` — DB connection, anon key
- `src/pages/api/image/[...path].ts` — image proxy with service_role key
- `astro.config.mjs` — site URL, integrations
- `.env` / `.env.production` — secrets

### Quick mode vs Full mode
- `--quick`: build check + frozen files + existing full-test.mjs (< 10 seconds)
- `--full`: everything in --quick + page health HTTP + block render + redirects + PageSpeed

---

## 13. Dispatch Instructions

This SPEC executes in the **`opticup-storefront`** repo (NOT the ERP repo).

**Dispatch to:** Claude Code on the Windows desktop machine, working directory
`C:\Users\User\opticup-storefront`.

**First Action override:** The executor's First Action should verify `git remote -v`
shows `opticalis/opticup-storefront` (not `opticalis/opticup`). If wrong repo → STOP.

**After execution:** Executor writes `EXECUTION_REPORT.md` + `FINDINGS.md` to
THIS folder (`modules/Module 3 - Storefront/docs/specs/STOREFRONT_SAFETY_NET/`)
in the ERP repo. Then commits both repos.
