# SPEC — M3_LIGHTHOUSE_NIGHTLY_CRON

**Module:** 3 — Storefront (monitoring infra)
**Repo:** This ERP repo (`opticalis/opticup`) — workflow + scripts + reports live here, NOT in storefront
**Status:** Draft, awaiting Daniel approval
**Author:** opticup-strategic (Foreman + Site Overseer hat)
**Source:** REC-SITE-013 in `roles/site-overseer/SITE_OVERSEER_HANDOFF.md`

---

## §1 Goal

Stand up automated nightly + weekly Lighthouse + axe-core monitoring of the public storefront. Today, perf/SEO/accessibility scores are checked manually, sporadically; regressions are caught only when someone notices. The fix: GitHub Actions cron runs Lighthouse + axe-core against a curated page list, stores reports under `docs/guardian/lighthouse-reports/`, and surfaces ONLY regressions to `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel's existing alert surface). Daniel wakes up to either silence (good) or a focused alert (acts).

## §2 Background — measured 2026-05-09

**Current state:**
- 0 automated perf/a11y monitoring exists. Only `scripts/verify.mjs` (CI verify on push) and `scripts/visual-regression.mjs` (DOM-hash, not perf).
- Production sitemap: 254 `<loc>` entries, 253 unique URLs (1 duplicate). Page distribution: ~85 unique base routes × 3 langs.
- GitHub Actions: 1 existing workflow (`verify.yml`). No cron-based workflow yet. Free GitHub Actions allowance for private repos: 2,000 minutes/month.
- Guardian infrastructure: `docs/guardian/{GUARDIAN_ALERTS.md,DAILY_SUMMARY.md,GUARDIAN_REPORT.md,probe.md}` exists and is the canonical alert surface (Sentinel writes there).
- `roles/site-overseer/tools/` does NOT exist yet — REC-SITE-013 explicitly names this as the install location.

**Why now (Daniel's directive 2026-05-09):**
- 3 RECs closed today (017, 018, 014); REC-SITE-013 is the next high-value item per the open-RECs list.
- Production is LIVE (post-cutover 2026-05-03); regressions in perf/a11y now affect real customers.
- Site Overseer Mode B operating procedure (per HANDOFF) explicitly lists Lighthouse as the missing tool that gates targeted Mode-B perf audits.

### Already-done discovery contingency

- **Item:** `roles/site-overseer/tools/` directory creation. Step 0 confirms: directory does NOT exist. If executor finds it pre-existing → SKIP creation, REUSE.
- **Item:** Lighthouse / lhci npm packages. Step 0 confirms: NOT in any `package.json`. If executor finds them already installed (e.g. global) → REUSE.
- **Item:** GitHub Actions workflow `lighthouse.yml`. Step 0 confirms: only `verify.yml` exists today. If executor finds it pre-existing → STOP and surface (someone else added it independently).

## §3 Success Criteria (measurable)

After the fix:

### Daily run (Tier 1, 10 pages × 3 langs = 30 pages, ~15 min budget)

1. `.github/workflows/lighthouse-daily.yml` exists, runs at 03:00 IDT (00:00 UTC) every day, on `develop` branch.
2. Workflow runs Lighthouse against the 10-page Tier 1 list (defined in §8) for HE + EN + RU, total 30 page-runs.
3. Each run produces a JSON report saved to `docs/guardian/lighthouse-reports/daily/YYYY-MM-DD/<lang>-<slug>.json`.
4. A summary file `docs/guardian/lighthouse-reports/daily/YYYY-MM-DD/SUMMARY.md` lists all 30 page scores in a table (perf / a11y / SEO / best-practices, plus axe-core violation count).
5. The workflow auto-commits the day's reports to `develop` (committer: `OpticaLis [bot]`, no force-push).
6. **Regression detection:** if any page's perf score drops by ≥5 points OR falls below 80 OR a11y drops by ≥3 points OR axe-core surfaces any new violation vs. the previous-day baseline → workflow appends a **REGRESSION** entry to `docs/guardian/GUARDIAN_ALERTS.md` with: page URL, metric, prior value, new value, link to the new JSON report.
7. If no regressions: workflow appends a one-line "ALL CLEAR" entry to GUARDIAN_ALERTS.md (so the silent case is also visible) and exits 0.

### Weekly run (full sweep, ~85 pages × 3 langs = ~255 pages, ~2 hr budget)

8. `.github/workflows/lighthouse-weekly.yml` exists, runs at 03:00 IDT every Sunday on `develop` branch.
9. Workflow scrapes the live `sitemap-dynamic.xml`, deduplicates, runs Lighthouse against EVERY URL.
10. Reports saved to `docs/guardian/lighthouse-reports/weekly/YYYY-WW/`. Summary table in same SUMMARY.md format.
11. Regression detection compares against the prior week's summary (same URL → same metrics). Any ≥5-pt perf drop / ≥3-pt a11y drop / new axe violations → REGRESSION entry in GUARDIAN_ALERTS.md.
12. Reports + summary auto-committed.

### Tooling install

13. `roles/site-overseer/tools/lighthouse/` directory exists with a local `package.json` declaring `lighthouse` + `@axe-core/cli` as dependencies. NOT a project-root install.
14. `roles/site-overseer/tools/lighthouse/run-tier1.mjs` and `run-full.mjs` are the two executable scripts. Both: take a list of URLs, run Lighthouse + axe-core in headless Chrome, write JSON + summary, return 0/1 exit code based on regression detection.
15. `roles/site-overseer/tools/lighthouse/README.md` documents the setup + manual-run command.

### Verification

16. After first daily run lands → manually inspect `docs/guardian/lighthouse-reports/daily/2026-05-10/SUMMARY.md`. Should show 30 rows, 4 metric columns + axe count, all numbers populated.
17. Manually trigger workflow via `gh workflow run lighthouse-daily.yml` (or GitHub UI) to confirm it works on-demand, not only on cron.
18. Both workflows succeed (exit 0) on first manual + first cron-scheduled run.
19. GUARDIAN_ALERTS.md has either a "ALL CLEAR" or "REGRESSION" entry from the first daily run.
20. `git status` clean after all infra commits.

**SQL-equivalent for SCs:** N/A (no DB involvement; HTTP/script-only).

## §4 Autonomy Envelope

**Executor MAY without asking:**
- Create `roles/site-overseer/tools/lighthouse/` + `package.json` + `package-lock.json` + scripts + README.
- Create `.github/workflows/lighthouse-daily.yml` and `.github/workflows/lighthouse-weekly.yml`.
- `npm install lighthouse @axe-core/cli` inside the tools directory (NOT root). Commit `package-lock.json`.
- Add the workflow files with cron triggers + manual-trigger (`workflow_dispatch`).
- Create `docs/guardian/lighthouse-reports/{daily,weekly}/.gitkeep` so the dirs are committed.
- Wire the regression-detection logic into the run scripts (compare today's JSON vs. yesterday's).
- Auto-commit reports on workflow run using `OpticaLis [bot]` committer (existing pattern).
- Use Lighthouse v12+ and axe-core v4+ — latest stable.
- Run Chrome in headless via `chrome-launcher` (Lighthouse's built-in pattern).
- Skip pages that return 404 or 5xx during the workflow — log them in the summary as `SKIP_404` / `SKIP_5XX` rather than failing the workflow.
- Test the workflow locally before pushing using `act` or by manually running the Node script with the same env vars.

**Executor MUST stop and report on:**
- Lighthouse v12+ requires Node 18+. If CI runner has older Node → STOP, surface — Daniel decides upgrade scope.
- Existing `lighthouse-daily.yml` or `lighthouse-weekly.yml` discovered (not expected per Step 0). STOP — someone added it independently.
- npm install pulls more than 200 MB of deps (likely Chromium download). STOP — surface trade-off (cache vs reinstall every run).
- GitHub Actions usage exceeds 50% of monthly free tier in dry-run estimate. STOP — surface.
- Adding a workflow that auto-pushes to `main` (must NEVER happen — only `develop`).

## §5 Stop-on-Deviation Triggers

- npm install fails or produces vulnerabilities at HIGH/CRITICAL severity.
- Workflow first run fails with non-recoverable error (e.g. Chrome can't launch in CI).
- Lighthouse run takes >5x the §3 time budget (15 min daily, 2 hr weekly) — STOP, optimize.
- ANY change to storefront code or DB. This SPEC is monitoring infra ONLY.
- ANY change to existing `verify.yml` workflow. The new workflows are additive, not replacing.
- New workflow attempts to write outside `docs/guardian/lighthouse-reports/` or `docs/guardian/GUARDIAN_ALERTS.md`.

## §6 Rollback Plan

- All changes are additive (new files only, no modifications to existing files except possibly root `.gitignore` to add report-noise lines if needed).
- Rollback = `git revert <commit>` of each phase commit. Workflow files removed → cron stops; tools dir removed → npm packages gone.
- No DB state. No production code touched. No PR to main needed.

### Backup format guidance for DB-DELETE SPECs

N/A — this SPEC has no DB DELETE.

## §7 Out of Scope (explicit)

- **Performance OPTIMIZATION** — this SPEC measures, doesn't fix. Any regressions found become NEW SPECs.
- **The 4 perf cherry-picks waiting in `perf-post-dns-reverted` tag** — those are a separate post-launch queue item.
- **Modifying Lighthouse defaults** — use stock thresholds + categories. Custom budgets are a follow-up SPEC.
- **Slack/email notification of regressions** — alerts go to GUARDIAN_ALERTS.md only. Slack integration is a separate SPEC.
- **Notification when ALL CLEAR runs accumulate** — Daniel may want a weekly digest later; not now.
- **Lighthouse-CI dashboards (lhci-server)** — too heavyweight for v1; raw JSON + Markdown summaries are enough.
- **AI-summarized weekly digest** — Daniel mentioned Sonnet earlier as cost-saving; this SPEC ships raw + alerts ONLY. The Sonnet summary layer is a clean follow-up SPEC if Daniel wants it after seeing the raw output for 2 weeks.
- **Modifying the storefront repo** — pure ERP-repo work.
- **Replacing or extending `verify-sitemap.mjs`** — Lighthouse runs in parallel, not replacing existing checks.
- **`scripts/visual-regression.mjs`** — not touched; complementary tool.

### Subset relationships (not applicable)

This SPEC has no predicate-vs-route subset relationship — it's pure new infra. No tension expected between §4 and §7.

## §8 Expected Final State

### New files (in this ERP repo)

```
.github/workflows/
  lighthouse-daily.yml          (cron 03:00 IDT, 30-page sweep, ~15 min)
  lighthouse-weekly.yml         (cron 03:00 IDT Sundays, ~255-page sweep, ~2 hr)

roles/site-overseer/tools/lighthouse/
  package.json                  (lighthouse + @axe-core/cli + chrome-launcher)
  package-lock.json
  README.md                     (manual-run instructions, regression rules, troubleshooting)
  config/
    tier1-pages.json            (10 base routes × 3 langs = 30 URLs)
    thresholds.json             (perf/a11y drop thresholds per SC #6 + #11)
  scripts/
    run-tier1.mjs               (daily script — fixed URL list)
    run-full.mjs                (weekly script — scrapes live sitemap)
    detect-regressions.mjs      (compares today vs. yesterday/last-week)
    write-summary.mjs           (generates SUMMARY.md from JSON reports)
    append-alert.mjs            (writes to docs/guardian/GUARDIAN_ALERTS.md)

docs/guardian/lighthouse-reports/
  daily/.gitkeep
  weekly/.gitkeep
```

### Modified files

- `.gitignore` — add `roles/site-overseer/tools/lighthouse/node_modules/` (npm deps not committed).

### DB state

No DB changes.

### Build-side-effect file expectations

- `npm install` inside `roles/site-overseer/tools/lighthouse/` regenerates `package-lock.json`. **Tightly-coupled side-effect** — commit it. (Lock file is the entire point of reproducible installs.)
- No other build-side-effects expected. If executor sees additional drift, log as finding and restore.

### Tier 1 page list (the 10 base routes per SC #2)

Per Daniel's 2026-05-09 directive ("עמוד מותגים, עמוד משקפי שמש ומסגרות ראייה לפחות העמוד הראשון, סופרסייל, התקנונים"):

| # | Base path | Why Tier 1 |
|---|---|---|
| 1 | `/` | Homepage — LCP element, top-of-funnel |
| 2 | `/brands/` | Brand index — Daniel-named |
| 3 | `/categories/sunglasses/` | Sunglasses category page 1 — Daniel-named (verify exact slug in Step 0) |
| 4 | `/categories/eyeglasses/` | Eyeglass frames page 1 — Daniel-named (verify exact slug) |
| 5 | `/supersale/` | SuperSale landing — Daniel-named, high-traffic |
| 6 | `/terms/` | Terms — legal page, Daniel-named ("התקנונים") |
| 7 | `/privacy/` | Privacy — legal page, Daniel-named |
| 8 | `/multi-takanon/` | Multifocal terms — third legal page, ties to "התקנונים" |
| 9 | `/about/` | About — informational anchor |
| 10 | `/branches/ashkelon/` | First live branch — Schema.org JSON-LD validation |

Each × 3 langs (HE, EN, RU) where the page exists. Step 0 verifies each URL returns 200 in all 3 langs; if a lang's variant 404s, log it (but do NOT block — that's a content gap for a separate SPEC).

### Docs updated (MUST include)

- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — REC-SITE-013 marked (closed), recent decisions row added.
- `roles/site-overseer/DECISIONS_LOG.md` — entry "lighthouse-cron" added.
- `roles/site-overseer/SITE_OVERSEER_SKILL.md` — bump to v0.5; add "tools/lighthouse" to the knowledge map.
- `TECH_DEBT.md` — only if executor finds new debt while wiring (e.g. an existing 404 on a Tier 1 URL).

## §9 Commit Plan

Up to 5 commits, each single-concern:

1. `chore(tools): scaffold roles/site-overseer/tools/lighthouse/ + package.json + npm install` (lock file + .gitignore)
2. `feat(tools): add Lighthouse + axe-core run scripts (tier1, full, regressions, summary, alert)`
3. `feat(ci): add lighthouse-daily.yml + lighthouse-weekly.yml workflows + .gitkeep stubs`
4. `feat(monitoring): first manual run baseline (commit reports + initial GUARDIAN_ALERTS.md ALL_CLEAR entry)`
5. `chore(spec): close M3_LIGHTHOUSE_NIGHTLY_CRON with retrospective + HANDOFF + DECISIONS_LOG + SKILL bump`

If first manual run reveals issues that warrant fixing scripts → fold into commit #2 instead of new commits.

## §10 Pre-Merge Checklist

### Browser readiness pre-flight

**Pre-flight (executor):** SPEC's QA is HTTP/CI/script-based — no developer-machine browser required (Chrome runs headless inside CI). Skip Chrome readiness check.

### Step 0 (executor MUST run BEFORE any change)

```bash
cd opticup
git status                                                # clean
ls .github/workflows/                                     # only verify.yml expected
ls roles/site-overseer/tools/ 2>/dev/null || echo "GONE"  # GONE expected
ls docs/guardian/lighthouse-reports/ 2>/dev/null || echo "GONE"  # GONE expected
node --version                                            # >= 18 required for Lighthouse v12+
gh auth status                                            # for SC #17 manual workflow trigger
```

### Step 0 — verify Tier 1 URLs are alive across all 3 langs

```bash
for lang in '' 'en/' 'ru/'; do
  for path in '' 'brands/' 'categories/sunglasses/' 'categories/eyeglasses/' 'supersale/' 'terms/' 'privacy/' 'multi-takanon/' 'about/' 'branches/ashkelon/'; do
    url="https://www.prizma-optic.co.il/${lang}${path}"
    code=$(curl -sI -o /dev/null -w "%{http_code}" "$url")
    echo "$code  $url"
  done
done
# Any 404 → log into the SPEC folder as a finding; do NOT block (likely a Daniel content choice or a real issue for a separate SPEC).
```

### Execution order

1. Step 0 + Tier 1 URL probe; commit findings if any URL 404s.
2. Scaffold tools dir + package.json + npm install + .gitignore (commit 1).
3. Write the 5 run scripts (commit 2).
4. Write both workflow YAML files + .gitkeep stubs (commit 3).
5. Manually trigger `lighthouse-daily.yml` once (`gh workflow run lighthouse-daily.yml`); wait for completion; verify SUMMARY.md format (commit 4 if scripts auto-committed reports successfully; otherwise debug + iterate inside commit 2).
6. Update HANDOFF, DECISIONS_LOG, SKILL bump (commit 5 — retro).

## §11 Lessons Already Incorporated

- **Step 0 — Reproduce-The-Bug-First:** Verified live infra (`verify.yml` only workflow; no `tools/`; no `lighthouse-reports/`; sitemap-dynamic.xml has 254 entries / 253 unique). Tier 1 URL list grounded in Daniel's literal directive 2026-05-09.
- **Already-done discovery contingency** (per A1 from M3_REC014_ORPHAN_CLEANUP, applied to SPEC_TEMPLATE 2026-05-09 commit `ab7884d`): explicit per-item branches in §2.
- **Build-side-effect declaration** (per A2 from M3_SITEMAP_BRAND_404_CLEANUP, applied 2026-05-09 commit `74922cd`): `package-lock.json` regeneration declared as tightly-coupled side-effect (commit it).
- **Browser readiness skip-line** (per A2 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER, applied 2026-05-09 commit `74922cd`): explicit skip — CI Chrome is headless, executor's browser irrelevant.
- **Backup format guidance** (per A2 from M3_REC014_ORPHAN_CLEANUP, applied 2026-05-09 commit `ab7884d`): N/A explicitly stated.
- **Subset relationships** (per A1 from M3_SITEMAP_BRAND_404_CLEANUP, applied 2026-05-09 commit `74922cd`): N/A explicitly stated.
- **SQL-equivalent for SCs** (per A1 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER, applied via convention): N/A — no DB.
- **Cross-Reference Check (Rule 21):** No new functions/tables/views/RPCs introduced. New files all under `roles/site-overseer/tools/lighthouse/` or `.github/workflows/`. 0 collisions possible.
- **Iron Rules respected:** Rule 13/29 (no view changes), Rule 25 (no image-handling changes), Rule 23 (no secrets — workflow uses default `GITHUB_TOKEN`).
- **5-commit ceiling on §9:** prevents scope creep. If executor finds a 6th commit needed, it's a finding.
- **AI summarization out of scope per Daniel directive:** explicit in §7. Sonnet/Haiku integration deferred to a clean follow-up SPEC after raw output is observed for ≥2 weeks.

## §12 Cross-Repo Note for Executor

This SPEC's commits all land in `opticalis/opticup` (this ERP repo). Zero changes in `opticup-storefront`. The workflows monitor the LIVE storefront over HTTP, but don't write to its repo.

No PR to main needed — workflows run on `develop`, reports commit to `develop`, alerts read from `develop`. Production code unaffected.
