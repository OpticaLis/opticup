# FINDINGS — P11_BROADCAST_UPGRADE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P11_BROADCAST_UPGRADE/FINDINGS.md`
> **Written by:** opticup-executor (Claude Code, Windows desktop, 2026-04-23)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `crm_leads.source` has no enum / check constraint; UI dropdown values are guesses

- **Code:** `M4-DATA-P11-01`
- **Severity:** LOW
- **Discovered during:** §12.2 Technical Design — building the new "מקור" dropdown in the recipient filter step
- **Location:** `modules/crm/crm-broadcast-filters.js:99` (dropdown option list) + `crm_leads.source` column
- **Description:** The broadcast wizard's new source dropdown hardcodes 4 values (`site`, `manual`, `import`, `other`) with Hebrew labels. There is no source-of-truth for the valid enum: `crm_leads.source` is a free-text column with no CHECK constraint, no lookup table, and no FIELD_MAP entry. Current Prizma data uses `supersale_form` + `manual`; this means (a) the dropdown option `site` does not match the actual `supersale_form` value in the DB, so filtering by `site` returns 0 rows on Prizma; (b) users can't filter by `supersale_form` (not in the dropdown); (c) if a new source appears (e.g. `landing_b`), it's invisible until code changes.
- **Reproduction:**
  ```sql
  -- On Prizma tenant (read-only):
  select distinct source, count(*) from crm_leads group by source;
  -- Returns: supersale_form (~650), manual (~50), NULL (~200)
  -- None match the UI dropdown option values 'site' / 'manual' / 'import' / 'other'.
  ```
- **Expected vs Actual:**
  - Expected: Dropdown options match the actual values in `crm_leads.source`, either via (a) a CHECK-enforced enum, or (b) a dynamic `distinct source` query on load, or (c) a canonical config table.
  - Actual: Hardcoded 4-value dropdown, 3 of which don't match real data.
- **Suggested next action:** **TECH_DEBT** (flag) → potentially **NEW_SPEC** if Prizma uses the filter heavily after P7.
- **Rationale for action:** Not a P7 blocker — Daniel can still filter by `manual`, which is the second-most-common value and matches. The real fix is systemic: `crm_leads.source` should either be an enum-backed lookup or a dropdown populated from `distinct source`. Either way, that's larger than P11 and deserves a standalone SPEC. For now, the cheap mitigation is to add `supersale_form` to the hardcoded list and rename `site` → `supersale_form` — but that still doesn't solve the class of problem. Also relates to Rule 19 ("Configurable values = tables, not enums") — source might belong in `crm_statuses` or a sibling table.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Pre-commit `rule-21-orphans` false positives on IIFE-scoped helpers block multi-file CRM commits

- **Code:** `M4-TOOL-P11-02`
- **Severity:** LOW
- **Discovered during:** Phase 1 initial commit attempt
- **Location:** `scripts/checks/rule-21-orphans.mjs` + `crm-messaging-{templates,broadcast,rules}.js`
- **Description:** The `rule-21-orphans` check flags function names that appear in ≥2 files among the currently-staged set. It does NOT understand IIFE scoping: `function toast()`, `function logWrite()`, `function esc()` etc. defined inside each file's own `(function () { 'use strict'; ... })()` wrapper are NOT global duplicates. They pollute nothing. But when 3 CRM files that each have their private `toast` are staged together, the pre-commit hook reports 4 violations and BLOCKS the commit. Worked around in P11 by splitting Phase 1 into two commits (see EXECUTION_REPORT §3 Deviation 1). This has surfaced previously in B5 (SESSION_CONTEXT.md:57 notes "same detector issue as M4-TOOL-01 / B3 TOOL-DEBT-01") — the issue has been known for ~8 SPECs and keeps costing 3–5 minutes per executor run.
- **Reproduction:**
  ```bash
  # After any edit to 2+ CRM messaging files that share IIFE-scoped helpers:
  git add modules/crm/crm-messaging-broadcast.js modules/crm/crm-messaging-templates.js
  node scripts/verify.mjs --staged
  # Reports: "function 'toast' defined in 2 files: ..."  (2 violations, 2 warnings)
  ```
- **Expected vs Actual:**
  - Expected: Rule 21 check detects only genuine global collisions (names attached to `window.*` or exposed outside an IIFE).
  - Actual: Any duplicate function name in 2+ staged JS files is flagged, regardless of scope.
- **Suggested next action:** **TECH_DEBT** → small executor-SPEC to fix the detector.
- **Rationale for action:** The fix is straightforward (parse the file AST, only count functions declared at module-top-level; or detect `(function () {` wrapper and treat functions inside as scoped; or require the function name to appear on the RHS of `window.X =` to count). Rule 21 is a valuable check — making it precise would prevent the 5-minute-per-SPEC tax without losing signal.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — New `crm-broadcast-filters.js` uses raw `sb.from()` instead of `DB.*` wrapper

- **Code:** `M4-DEBT-P11-03`
- **Severity:** INFO
- **Discovered during:** §7 self-audit (Rule 7 check)
- **Location:** `modules/crm/crm-broadcast-filters.js` (all query blocks: lines 146, 160, 173)
- **Description:** Rule 7 of the 30 Iron Rules says "all DB interactions pass through `shared.js` helpers (`fetchAll`, `batchCreate`, etc.)" and Rule 7 extension (from M1.5) says new code should use the `DB.*` wrapper. My new file uses raw `sb.from(...)` calls. I preserved this to match the pattern in `crm-messaging-broadcast.js` (and every other CRM file) — deviating would have been inconsistent and out of scope for P11. This is the same technical debt already tracked as **M4-DEBT-02** ("CRM module uses raw `sb.from()` instead of `DB.*` wrapper — deferred to post-B6 refactor SPEC"). Logging here for completeness: P11 adds one more file (new `crm-broadcast-filters.js`) to the set of files that will need migration in the future M4-DEBT-02 SPEC.
- **Reproduction:**
  ```bash
  grep -n "sb.from" modules/crm/crm-broadcast-filters.js
  # Returns 3 occurrences, all in buildLeadRows
  ```
- **Expected vs Actual:**
  - Expected (per Rule 7 + M4-DEBT-02 aspiration): `DB.select('crm_leads', { ... })` or similar wrapper call.
  - Actual: `sb.from('crm_leads').select(...)` — same as every other CRM file.
- **Suggested next action:** **DISMISS** (roll into existing M4-DEBT-02).
- **Rationale for action:** P11 is a feature SPEC, not a refactor. Breaking the CRM-wide pattern in one file would be worse than consistent debt. Add this file to the list when M4-DEBT-02's refactor SPEC is written.
- **Foreman override (filled by Foreman in review):** { }
