# SPEC — M3_TIER1_CATEGORY_SLUG_FIX

**Module:** 3 — Storefront (Lighthouse cron config)
**Repo:** This ERP repo (`opticalis/opticup`) only
**Status:** Draft, awaiting Daniel approval
**Author:** opticup-strategic (Foreman + Site Overseer hat)
**Source:** REC-SITE-019 in `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — Daniel verified 2026-05-10 that the routes EXIST under different slugs.

---

## §1 Goal

The Lighthouse cron's Tier 1 page list cited `/categories/sunglasses/` and `/categories/eyeglasses/` (plural + trailing slash). Live HTTP probe (Daniel-driven, 2026-05-10) revealed the actual routes are **`/category/sunglasses` and `/category/eyeglasses`** (singular, no trailing slash). All 6 (× 3 langs) return 200. Replace the 2 entries in `tier1-pages.json` so the cron starts capturing real data instead of SKIP_404.

## §2 Background — measured 2026-05-10

**The naming error:** REC-SITE-019 was opened on the (correct-at-the-time) finding that the originally-named slugs returned 404. The author-time URL probe done in M3_LIGHTHOUSE_NIGHTLY_CRON's SPEC was cursory — it confirmed 404 on the SPEC-named slugs but didn't probe the storefront's `/categories/` index for the correct names. Daniel discovered the real routes (`/category/{slug}`, singular) by clicking through the live site.

**Live URL probe (per Step 0 URL existence verification, 2026-05-10):**

| URL | Status |
|---|---|
| `https://www.prizma-optic.co.il/category/sunglasses` | 200 |
| `https://www.prizma-optic.co.il/category/eyeglasses` | 200 |
| `https://www.prizma-optic.co.il/category/sunglasses/` (with trailing /) | 200 |
| `https://www.prizma-optic.co.il/en/category/sunglasses` | 200 |
| `https://www.prizma-optic.co.il/ru/category/sunglasses` | 200 |
| `https://www.prizma-optic.co.il/en/category/eyeglasses` | 200 |
| `https://www.prizma-optic.co.il/ru/category/eyeglasses` | 200 |

All 6 work. Cron config just needs a 2-line edit.

**Bonus discovery during probe:** the `/categories/` index page also lists `/product-category/משקפי-שמש/` and `/product-category/מסגרות-ראייה/` (Hebrew slugs, WP-era). These are SEPARATE legacy URLs that may also be live; Out of scope for this SPEC but logged here for visibility.

### Already-done discovery contingency

- **Item:** the `tier1-pages.json` file may have been hand-edited since M3_LIGHTHOUSE_NIGHTLY_CRON closed. Step 0 confirms the current `/categories/sunglasses/` + `/categories/eyeglasses/` literals are present. If already modified to `/category/{slug}` → SKIP, report no-op.
- **Item:** REC-SITE-019 may have been closed via another path (e.g. building actual `/categories/` routes). Step 0 confirms HANDOFF still shows REC-SITE-019 OPEN.

## §3 Success Criteria (measurable)

After the fix:

1. `roles/site-overseer/tools/lighthouse/config/tier1-pages.json` — the 2 routes object literals have `"path": "/category/sunglasses"` and `"path": "/category/eyeglasses"` (singular, NO trailing slash to match production canonical).
2. The 2 entries' `tier1_reason` fields rewritten to remove the "current 404 logged in M3-DATA-03 finding — script will SKIP_404 until route exists" suffix; replace with the rationale Daniel chose (e.g. "Daniel-verified 2026-05-10 — actual route is `/category/{slug}` singular").
3. `node roles/site-overseer/tools/lighthouse/scripts/run-tier1.mjs` (manual local re-run) returns 30 URLs probed, **0 SKIP_404 in the 6 category cells** (down from 6 in the pre-fix baseline). All 30 OK.
4. SUMMARY.md for the new run shows 30 OK rows, 0 SKIP entries, perf+a11y+seo+best+axe-violations populated for all 30.
5. GUARDIAN_ALERTS.md gets either an ALL CLEAR or REGRESSION entry (the new baseline differs from yesterday's because 6 cells changed from SKIP to numbers — depending on detect-regressions.mjs logic, may surface as REGRESSION on first run; that's expected and not a real regression).
6. Pre-commit hooks pass.
7. `git status` clean post-commit.
8. No other change in the cron infra (scripts, workflow YAMLs, thresholds, README).

**SQL-equivalent for SCs:** N/A (no DB).

## §4 Autonomy Envelope

**Executor MAY without asking:**
- Edit `roles/site-overseer/tools/lighthouse/config/tier1-pages.json` — 2 path strings + 2 reason strings.
- Optionally re-run `node scripts/run-tier1.mjs` locally to verify SC #3-#5 immediately. If run, commit the new baseline reports.
- Update HANDOFF + DECISIONS_LOG to mark REC-SITE-019 closed (NEW_SPEC route NOT taken; replacement option chosen instead).
- Single commit OR two commits (config edit + retro). Foreman's call.

**Executor MUST stop and report on:**
- The 2 entries already changed (Step 0 SKIP path).
- More than 1 file modified in production code path.
- Re-run of run-tier1.mjs surfaces NEW SKIP_404 entries (would mean a different category route changed).
- Any change beyond the config + retro/state docs.
- M3_LIGHTHOUSE_NIGHTLY_CRON's `tier1-pages.json` `_meta.rationale` mentions Daniel's directive verbatim — preserve the directive line; only update the per-route `tier1_reason` cells and the `_meta.rationale` if it specifically calls out the wrong slugs.

## §5 Stop-on-Deviation Triggers

- 2 file edits (excluding HANDOFF/DECISIONS_LOG).
- Re-run produces unexpected new SKIP_404s elsewhere.
- Build / hooks fail.
- Lighthouse score for the 2 newly-OK pages comes in below 50 (would suggest the page is broken even though it 200s — STOP, surface).

## §6 Rollback

`git revert <hash>` of single commit. Trivial.

### Backup format guidance for DB-DELETE SPECs

N/A — no DB.

## §7 Out of Scope (explicit)

- The legacy `/product-category/{Hebrew-slug}/` URLs discovered during probe — separate question, separate REC if Daniel wants Lighthouse to also probe them.
- The `/categories/` (plural, index) page — already monitored implicitly via homepage if linked; not in Tier 1.
- Adding MORE Tier 1 pages beyond the existing 10 — separate SPEC.
- Building dedicated `/categories/sunglasses/` (plural) routes — was Option A in REC-SITE-019; we're choosing Option B (replace with existing equivalents) instead. The plural-form routes do NOT need to exist.
- Re-running the weekly full sweep — daily run is sufficient for verification. Weekly sweep will pick up the change on its next scheduled Sunday run.
- Modifying the GitHub Actions workflows — config-only fix; workflows already point at the same config file.

### Subset relationships (not applicable)

No predicate. Direct slug replacement.

## §8 Expected Final State

### Modified files

- `roles/site-overseer/tools/lighthouse/config/tier1-pages.json`:
  - Line ~14: `"path": "/categories/sunglasses/"` → `"path": "/category/sunglasses"`
  - Line ~14 reason: replace "current 404 logged in M3-DATA-03 finding — script will SKIP_404 until route exists" → "Daniel-verified 2026-05-10 — actual route is /category/{slug} singular per REC-SITE-019 closure"
  - Line ~15: same change for `eyeglasses` (path + reason)
  - Net diff: 4 lines.

### Optional regenerated files (if executor re-runs locally)

- `docs/guardian/lighthouse-reports/daily/2026-05-10/SUMMARY.md` — overwritten with new 30-OK baseline.
- 6 new JSONs replace the 6 prior SKIP_404 placeholders (or new files appear; depends on script behavior).
- `docs/guardian/GUARDIAN_ALERTS.md` — new section appended.

If executor chooses NOT to re-run locally, the next nightly cron at 03:00 IDT will produce these naturally.

### Build-side-effect file expectations

- Re-running `run-tier1.mjs` produces new JSON reports + updates SUMMARY.md. Tightly-coupled side-effect — commit them if running locally.
- No `package-lock.json` regeneration (no npm install).
- No other build-side-effects.

### Docs updated (MUST include)

- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — REC-SITE-019 marked (closed) with closure rationale (Option B chosen — replace, not build); 2026-05-10 row added in recent-decisions table.
- `roles/site-overseer/DECISIONS_LOG.md` — entry "rec019-tier1-slug-fix".

## §9 Commit Plan

One commit (single-concern, bundle config + retro + state-doc updates):

```
fix(tools/lighthouse): correct category slugs to /category/{slug} singular (REC-SITE-019)

Tier 1 list cited /categories/{slug}/ but actual storefront routes are
/category/{slug} (singular, no trailing slash). Daniel verified live
2026-05-10 — all 6 (× 3 langs) return 200.

Replaces M3-DATA-03's "build new routes" recommendation with the
trivial config fix. Lighthouse cron starts capturing real perf/a11y
data for the 6 cells starting next nightly run.

Closes REC-SITE-019 (Option B per FOREMAN_REVIEW disposition).
SPEC: M3_TIER1_CATEGORY_SLUG_FIX.
```

If executor opts to re-run locally and bundles the new reports:
- Single commit with all changes.

## §10 Pre-Merge Checklist

### Browser readiness pre-flight

**Pre-flight (executor):** SPEC's QA is HTTP/script-based — no browser required. Skip Chrome readiness check.

### gh CLI readiness check

SPEC's commit lands on develop, no PR to main (this is monitoring config, not production code). gh auth not required.

### Step 0 (executor MUST run BEFORE any change)

```bash
cd opticup
git status                    # clean
grep -n "categories/sunglasses\|categories/eyeglasses" roles/site-overseer/tools/lighthouse/config/tier1-pages.json
# Expected: 2 matches, both inside the routes array.

# Confirm REC-SITE-019 still OPEN in HANDOFF
grep -n "REC-SITE-019" roles/site-overseer/SITE_OVERSEER_HANDOFF.md | head -3
# Expected: row exists with severity MEDIUM (not "(closed)").

# Re-confirm the 6 URLs
for path in 'category/sunglasses' 'category/eyeglasses'; do
  for lang in '' 'en/' 'ru/'; do
    url="https://www.prizma-optic.co.il/${lang}${path}"
    code=$(curl -sI -o /dev/null -w "%{http_code}" "$url")
    echo "$code  $url"
  done
done
# Expected: all 6 → 200.
```

### Execution steps

1. Step 0 status confirmation.
2. Edit `tier1-pages.json` — 4 line changes (2 paths + 2 reasons).
3. Optional: `cd roles/site-overseer/tools/lighthouse && node scripts/run-tier1.mjs` to verify SC #3-#5.
4. Update HANDOFF (REC-SITE-019 → closed) + DECISIONS_LOG.
5. Commit per §9.
6. Push to develop.
7. Write EXECUTION_REPORT.md + FINDINGS.md.

## §11 Lessons Already Incorporated

- **Step 0 — Reproduce-The-Bug-First (per opticup-strategic mandate):** Probed all 6 URLs live; all return 200. Author-time fact-check before SPEC, not after.
- **URL existence verification (per A1 from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW, applied 2026-05-10 commit `0b00c9c`):** This SPEC's §2 contains the FULL probe table — exactly the discipline that was missing in the parent M3_LIGHTHOUSE_NIGHTLY_CRON SPEC (which is precisely why this SPEC exists). Self-validating: the new rule paid off on the very next URL-naming SPEC.
- **Already-done discovery contingency (per A1 from M3_REC014_ORPHAN_CLEANUP, applied `ab7884d`):** §2 explicit. Pre-authorizes executor to skip if file already edited.
- **Subset relationships:** N/A explicit.
- **Backup format guidance:** N/A explicit.
- **Browser readiness pre-flight:** Skip line explicit.
- **gh CLI readiness check (per Executor #1 from M3_LIGHTHOUSE_NIGHTLY_CRON, applied `0b00c9c`):** Skip line explicit (no gh commands in this SPEC).
- **Build-side-effect declaration:** Optional re-run of run-tier1.mjs declared as tightly-coupled (commit reports if generated).
- **Cross-Reference Check (Rule 21):** No new functions / files / classes. Pure config string replacement. 0 collisions.
- **One-commit ceiling on §9:** prevents scope creep.

## §12 Cross-Repo Note

This SPEC is ERP-repo only. Zero changes in storefront repo. No PR to main needed.

## §13 Meta — How This SPEC Closes the Loop

This SPEC is the immediate proof that A1 from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW (URL existence verification MANDATORY at author time, applied 2026-05-10 commit `0b00c9c`) is paying off:

- **What went wrong:** M3_LIGHTHOUSE_NIGHTLY_CRON SPEC named 6 URLs without probing the storefront's `/categories/` index for the correct slugs. The probe done was "do these specific URLs return 200?" instead of "what are the actual category URLs?". Result: 6 SKIP_404 entries forever + a follow-up REC.
- **What the new rule prevents:** had the rule been in force for M3_LIGHTHOUSE_NIGHTLY_CRON, the author would have probed `/categories/` (the index) discovered `/category/{slug}` (singular) at author time, and shipped Lighthouse with the correct slugs from day 1.
- **What this SPEC validates:** the same rule applied to THIS SPEC produced an exhaustive §2 probe table and pre-resolved every potential ambiguity — zero AskUserQuestion expected at execution.

Worth a one-line note in the next FOREMAN_REVIEW: "A1 paid off in 1 SPEC (M3_TIER1_CATEGORY_SLUG_FIX); the rule is converging."
