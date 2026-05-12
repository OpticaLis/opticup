# FINDINGS — M3_LIGHTHOUSE_NIGHTLY_CRON

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — 6 of 30 Tier 1 URLs return 404 (no route)

- **Code:** `M3-DATA-03`
- **Severity:** MEDIUM
- **Discovered during:** Step 0b URL probe (before any code change)
- **Location:** Live storefront on prizma. URLs:
  - `https://www.prizma-optic.co.il/categories/sunglasses/` → 404
  - `https://www.prizma-optic.co.il/en/categories/sunglasses/` → 404
  - `https://www.prizma-optic.co.il/ru/categories/sunglasses/` → 404
  - `https://www.prizma-optic.co.il/categories/eyeglasses/` → 404
  - `https://www.prizma-optic.co.il/en/categories/eyeglasses/` → 404
  - `https://www.prizma-optic.co.il/ru/categories/eyeglasses/` → 404
- **Description:** SPEC §8 Tier 1 page list named these slugs based on Daniel's 2026-05-09 directive "עמוד מותגים, עמוד משקפי שמש ומסגרות ראייה לפחות העמוד הראשון". Live HTTP probe confirms the routes don't exist today. The `/products/` index returns 200 and is listed in sitemap, suggesting filterable product listing is the intended UX, but `/categories/sunglasses/` (and the EN/RU equivalents) are not built. Per SPEC §10 Step 0 instruction this is LOG-don't-block. The Lighthouse cron will SKIP_404 these on every run, generating 6 SKIP entries per daily run with no Lighthouse data.
- **Reproduction:**
  ```bash
  for path in 'categories/sunglasses' 'categories/eyeglasses'; do
    for lang in '' 'en/' 'ru/'; do
      url="https://www.prizma-optic.co.il/${lang}${path}/"
      code=$(curl -sI -o /dev/null -w "%{http_code}" "$url")
      echo "$code  $url"
    done
  done
  # All 6 return 404.
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §3): each Tier 1 URL exists in HE + EN + RU and serves 200.
  - Actual: 24 of 30 serve 200; 2 routes × 3 langs = 6 serve 404.
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** Daniel intended to monitor these surfaces. Three options:
  1. Build dedicated category landing pages (`/categories/sunglasses/`, `/categories/eyeglasses/`) — best for SEO + customer UX.
  2. Replace Tier 1 slugs with existing equivalents (e.g. `/products/?category=sunglasses` if such filtering exists).
  3. Accept SKIP_404 indefinitely — wastes 6 SKIP entries/day, but zero customer harm.
  Daniel should decide. Recommend option 1 (build the routes) as a cleanly-scoped follow-up SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — chrome-launcher `destroyTmp()` throws EPERM on Windows during chrome.kill()

- **Code:** `M3-EXEC-DEBT-04`
- **Severity:** LOW
- **Discovered during:** First local baseline run on Windows (post-LH loop, during cleanup)
- **Location:** `chrome-launcher/dist/chrome-launcher.js` — `Launcher.destroyTmp()` calls `rmSync()` on the temp profile dir; Windows holds locks on Chrome's profile files briefly after process exit, causing EPERM.
- **Description:** All 30 URLs ran successfully via Lighthouse, but the cleanup step `chrome.kill()` at the END of the run threw EPERM and crashed the Node process before SUMMARY.md / GUARDIAN_ALERTS.md were written. This is a chrome-launcher-on-Windows known-pattern issue, not a script bug. Linux CI (ubuntu-latest) does not hit this — different filesystem semantics.
- **Reproduction:**
  ```bash
  cd roles/site-overseer/tools/lighthouse
  node scripts/run-tier1.mjs
  # On Windows after the LH loop completes:
  # [run-tier1] FATAL Error: EPERM, Permission denied: \\?\C:\Users\User\AppData\Local\Temp\lighthouse.XXXXXXXX
  #   at rmSync (node:fs:1221:18)
  #   at Launcher.destroyTmp (...chrome-launcher.js:367:9)
  ```
- **Expected vs Actual:**
  - Expected: `chrome.kill()` cleanly terminates Chrome and removes its temp profile.
  - Actual: terminate succeeds; temp removal throws EPERM; main process crashes.
- **Suggested next action:** DISMISS (already fixed in this SPEC)
- **Rationale for action:** Resolved within this SPEC by adding `safeKillChrome()` to `_lib.mjs` (try/catch around `chrome.kill()`, downgrades to a `console.warn` for the EPERM case; OS reaps the temp dir on logoff). Documented in commit 4 message. Both run-* scripts use the helper. Linux CI never sees this; Windows local runs are now resilient. No follow-up needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `process.argv[1]` undefined in `node -e` import context

- **Code:** `M3-EXEC-DEBT-05`
- **Severity:** LOW
- **Discovered during:** Manually completing the post-LH steps (writeSummary + appendAlert) via `node -e` after the chrome.kill() crash
- **Location:** `roles/site-overseer/tools/lighthouse/scripts/{write-summary,detect-regressions,append-alert}.mjs` — the "is this script being run directly?" check at module bottom: `if (import.meta.url === \`file://${process.argv[1].replace(/\\/g, '/')}\`)`.
- **Description:** When a module is imported via `node -e "import('./scripts/X.mjs').then(...)"`, `process.argv[1]` is undefined (no script file in argv). The original guard pattern then crashed with `TypeError: Cannot read properties of undefined (reading 'replace')`. The fix is a one-character `&&` guard.
- **Reproduction:**
  ```bash
  cd roles/site-overseer/tools/lighthouse
  node -e "import('./scripts/write-summary.mjs').then(m => console.log(typeof m.writeSummary))"
  # Pre-fix: TypeError ... process.argv[1] is undefined.
  # Post-fix: "function"
  ```
- **Expected vs Actual:**
  - Expected: importable as ES module, no top-level execution side-effects when imported.
  - Actual (pre-fix): the auto-detect-main check at module bottom crashed when imported via `-e`.
- **Suggested next action:** DISMISS (already fixed in this SPEC)
- **Rationale for action:** Fix already applied in commit 4. Pattern (`if (process.argv[1] && import.meta.url === ...)`) is now consistent across all 3 callable modules.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Sentinel vs Cron coexistence on `GUARDIAN_ALERTS.md` is informal

- **Code:** `M3-INFRA-04`
- **Severity:** LOW
- **Discovered during:** Reasoning about how `appendAlert.mjs` should handle the existing 113-line Sentinel-written file
- **Location:** `docs/guardian/GUARDIAN_ALERTS.md` — single file with two writers: (a) Sentinel (regenerates the whole file each scan, runs locally on dev machines); (b) Lighthouse cron (appends below a marker, runs in CI on develop).
- **Description:** The cron's `appendAlert.mjs` uses a marker pattern (`<!-- LIGHTHOUSE-CRON-APPEND-MARKER -->`) to coexist with Sentinel: cron writes only below the marker, Sentinel can re-generate above the marker. In practice this works for the cron because `develop` HEAD's file is cron-controlled. But:
  1. Sentinel's local regenerations don't reach git unless committed (Sentinel runs locally on dev machines and writes to working tree; the user previously had `docs/guardian/` gitignored to keep these out of git).
  2. The `.gitignore` was changed in this SPEC to un-ignore `GUARDIAN_ALERTS.md` so the cron can commit it. Future Sentinel runs will now produce dirty working trees on dev machines (the regenerated content will be M-state).
  3. If a future Sentinel scan ever pushes its regenerated content (intentionally or by accident), the cron's accumulated entries above the marker line could be lost OR the marker itself could be deleted.
- **Reproduction:** N/A — observation, not a current bug.
- **Expected vs Actual:** Coexistence works for the cron (single-writer below marker), but is informal for the Sentinel side.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Worth a small follow-up: either (a) update Sentinel to also respect the marker (only write above it), or (b) split into two files: `GUARDIAN_ALERTS.md` (Sentinel's, gitignored) + `LIGHTHOUSE_ALERTS.md` (cron's, committed). Both are ~1-hour SPECs. Severity LOW because the marker-based design is robust against routine drift; this is about formalizing what is currently a convention.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — Rule 21 hook false-positives on shared helper-function names across sibling scripts

- **Code:** `M3-EXEC-DEBT-06`
- **Severity:** INFO
- **Discovered during:** First commit-2 attempt (pre-commit hook blocked)
- **Location:** Pre-commit hook `verify.mjs --staged` `[rule-21-orphans]` rule — flags identical function names across staged JS files.
- **Description:** When `run-tier1.mjs` and `run-full.mjs` both defined `async function main()`, `const round = ...`, `const totalElapsed = ...`, the hook flagged 4 violations even though the functions were module-scoped (each script's main is locally referenced; ESM modules don't share global scope). The hook is a pure name-match check without scope analysis. The CRM-commit-split-anticipation rule (executor SKILL `#### CRM-module commit-split anticipation`) describes the same pattern but uses commit-splitting as the workaround. For a NEW directory of sibling scripts (this SPEC's scripts/), pre-emptive helper extraction into `_lib.mjs` is cleaner.
- **Reproduction:** Stage two .mjs files in the same directory each defining `async function main()`. Run `node scripts/verify.mjs --staged`. Hook flags duplicate.
- **Expected vs Actual:**
  - Expected: hook understands ESM module scope and ignores private/module-scoped functions.
  - Actual: hook is regex-based name-only check.
- **Suggested next action:** DISMISS (workflow-level, not a hook bug)
- **Rationale for action:** The hook's broad-net is intentional (catches real duplicates 99% of the time). Pre-emptive extraction into `_lib.mjs` + unique entry-point names is the right pattern when creating multi-script tools. Codified as Proposal 2 in EXECUTION_REPORT §9 to update the executor SKILL's CRM-specific rule into a generalized one.
- **Foreman override (filled by Foreman in review):** { }

---
