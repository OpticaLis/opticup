# Lighthouse + axe-core monitoring

> **SPEC:** [`M3_LIGHTHOUSE_NIGHTLY_CRON`](../../../../modules/Module%203%20-%20Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/SPEC.md)
> **REC:** REC-SITE-013
> **Owner:** Site Overseer (Mode B)

## What this does

Two GitHub Actions cron jobs run Lighthouse + axe-core against the public storefront and write reports to `docs/guardian/lighthouse-reports/`:

| Workflow | Cadence | URL set | Time budget |
|---|---|---|---|
| `lighthouse-daily.yml` | 03:00 IDT every day (00:00 UTC) | Tier 1 (10 base routes × 3 langs = 30 URLs) | ~15 min |
| `lighthouse-weekly.yml` | 03:00 IDT every Sunday | Full sitemap (~85 base routes × 3 langs ≈ 255 URLs) | ~2 hr |

Each run produces:
1. Per-URL JSON reports: `docs/guardian/lighthouse-reports/{daily,weekly}/{date}/{lang}-{slug}.json`
2. A summary table: `…/{date}/SUMMARY.md` (perf / a11y / SEO / best-practices / axe-violations per URL)
3. A regression check vs. the previous run: any ≥5-pt perf drop, ≥3-pt a11y drop, or new axe-core violation appends a **REGRESSION** entry to `docs/guardian/GUARDIAN_ALERTS.md`. No regressions → one-line **ALL CLEAR** entry.
4. Auto-commit: workflow commits the new reports + alert entry as `OpticaLis [bot]`.

## Manual run (local)

```bash
cd roles/site-overseer/tools/lighthouse
npm install                  # Lighthouse + chrome-launcher + @axe-core/cli, ~14s on first run
npm run tier1                # 30 URLs, ~10-15 min on a laptop
npm run full                 # ~255 URLs, ~2 hr
```

Both scripts write to the same paths the workflows do (so a manual run produces a baseline indistinguishable from a CI run).

## Manual workflow trigger (GitHub UI)

```bash
gh workflow run lighthouse-daily.yml --ref develop
gh run watch
```

Or via GitHub UI: Actions → "Lighthouse — daily Tier 1" → Run workflow → Branch: `develop`.

## Files

```
roles/site-overseer/tools/lighthouse/
  package.json            — declares lighthouse, chrome-launcher, @axe-core/cli
  package-lock.json       — committed (reproducible installs across machines + CI)
  README.md               — this file
  config/
    tier1-pages.json      — the 10-base-route × 3-lang Tier 1 list
    thresholds.json       — regression thresholds (perf -5, a11y -3, new-axe-violation)
  scripts/
    run-tier1.mjs         — daily entry-point (reads config/tier1-pages.json, runs LH + axe, writes JSON + SUMMARY)
    run-full.mjs          — weekly entry-point (scrapes sitemap-dynamic.xml, dedupes, runs LH + axe)
    detect-regressions.mjs — compares today's SUMMARY vs. yesterday's; emits REGRESSION entries
    write-summary.mjs     — generates SUMMARY.md from per-URL JSON files
    append-alert.mjs      — appends ALL CLEAR / REGRESSION blocks to GUARDIAN_ALERTS.md
```

## node_modules size

`npm install` produces ~222 MB under `node_modules/` (Lighthouse + headless-chromium dependency cache). Local installs use the npm cache; CI uses `actions/cache` keyed on `package-lock.json` hash so re-installs after the first run are ~5 seconds.

`node_modules/` is gitignored (root `.gitignore` rule `node_modules/` covers all subdirectories).

## Out of scope (per SPEC §7)

- **Performance optimization** — this is measurement, not fixes. Regressions surface as new SPECs.
- **Slack/email notifications** — alerts land in GUARDIAN_ALERTS.md only.
- **Lighthouse-CI dashboards (`lhci-server`)** — too heavyweight for v1; raw JSON + Markdown summaries are enough.
- **AI-summarized digests** — separate follow-up SPEC after ≥2 weeks of raw output.

## Troubleshooting

- **Chrome can't launch in CI:** ensure the workflow `runs-on: ubuntu-latest` (Chromium is preinstalled) and `chrome-launcher` doesn't try to download. If headless still fails, add `--no-sandbox --disable-dev-shm-usage` Chrome flags.
- **Lighthouse times out on a single URL:** the 60s default per-page is generous; if hitting the wall, the URL itself probably has issues. Skip via SKIP_404/SKIP_5XX detection in run-*.mjs (only activates on non-200 status).
- **Regression false positives:** if a perf drop looks like CDN-edge variance, re-run the workflow manually. Persistent drops are real; transient ones disappear on the next cron tick.
