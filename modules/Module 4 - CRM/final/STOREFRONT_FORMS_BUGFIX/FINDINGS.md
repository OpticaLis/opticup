# FINDINGS — STOREFRONT_FORMS_BUGFIX

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_BUGFIX/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `crm-automation-engine.js` crosses Rule 12 soft target (314 lines)

- **Code:** `M4-DEBT-CRM-ENGINE-SIZE`
- **Severity:** LOW
- **Discovered during:** Pre-commit hook output on commit `6008bd9`.
- **Location:** `modules/crm/crm-automation-engine.js` (314 lines total after fix).
- **Description:** The file now sits between Rule 12's soft target (300) and hard max (350). The +8-line bugfix did not cause this — the file was already at 306 lines pre-fix. It's worth a planned split the next time someone touches the file, not an emergency refactor.
- **Reproduction:**
  ```
  wc -l modules/crm/crm-automation-engine.js
  314
  ```
- **Expected vs Actual:**
  - Expected (soft): ≤ 300 lines.
  - Actual: 314 lines.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Still under the hard limit (350). Splitting now would violate "one concern per task" and expand this surgical bugfix into a refactor. Log it; address during the next Module 4 work that touches this file.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — ACTIVATION_PROMPT states wrong branch for storefront repo

- **Code:** `M4-SPEC-STOREFRONT-BRANCH-01`
- **Severity:** LOW
- **Discovered during:** First Action step 2 in the storefront repo (Bug 2 pre-flight).
- **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_BUGFIX/ACTIVATION_PROMPT.md` line ~50 ("git branch # must be main (already merged)").
- **Description:** The ACTIVATION_PROMPT assumed the storefront repo had merged STOREFRONT_FORMS to `main`. Actual state on 2026-04-24: the feature commit (`ebe87d8 feat(crm): add event-register + unsubscribe storefront pages`) is HEAD of `develop`, and `main` lives behind. The executor proceeded on `develop` (where the code lives) but a less-careful executor could have either checked out `main` (near-violation of Iron Rule 9.7) or wasted time debating.
- **Reproduction:**
  ```
  cd /c/Users/User/opticup-storefront
  git branch --show-current   # -> develop
  git log --oneline -3        # ebe87d8 = STOREFRONT_FORMS feature commit, on develop not main
  ```
- **Expected vs Actual:**
  - Expected per prompt: storefront HEAD is on `main` with feature merged.
  - Actual: storefront HEAD is on `develop`; `main` does not yet contain the feature commit.
- **Suggested next action:** DISMISS (no code issue)
- **Rationale for action:** This is a SPEC-authoring precision issue, not a project bug. The takeaway — improve ACTIVATION_PROMPT templates to ask the executor to confirm which branch the feature lives on rather than hard-coding a branch name — is captured in EXECUTION_REPORT §8 Proposal 1 (skill improvement). No separate SPEC needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Legacy `registration_form_url` rows still exist in `crm_events` (intentional, but unmeasured)

- **Code:** `M4-DATA-LEGACY-URL-AUDIT`
- **Severity:** INFO
- **Discovered during:** Root-cause analysis of Bug 1 before writing the fix.
- **Location:** `public.crm_events.registration_form_url` column (data, not schema).
- **Description:** The SPEC §3 explicitly keeps these legacy URLs in the DB as "legacy fallback for events that predate the new system" (out-of-scope item). The new filter in `buildVariables` ignores them, which is the correct fix. However, there is no documented count of how many such rows exist, whether any are still being actively referenced by any code path other than `buildVariables`, and whether they should eventually be archived to a sidecar column (e.g. `registration_form_url_legacy`) so the active column can be cleaned. Today the data is harmless (filter catches it), but it's a quiet dependency that could trip someone later.
- **Reproduction:**
  ```sql
  SELECT COUNT(*) FROM crm_events
   WHERE registration_form_url LIKE '%r.html%'
      OR registration_form_url LIKE '%app.opticalis%';
  ```
  (Not executed during this SPEC — read-only and out of scope, but worth running at the next Module 4 housekeeping pass.)
- **Expected vs Actual:**
  - Expected (architectural hygiene): legacy data is either renamed, quarantined, or dated.
  - Actual: legacy data is in-place alongside current data, with only code-side filtering keeping them apart.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Not urgent — the filter is sufficient for correctness. But the "filter in code, forever" pattern is exactly what hygiene Rule 21 ("No Orphans") warns against; a future SPEC should either (a) archive the legacy values into a `registration_form_url_legacy` column and NULL the active one, or (b) document in `db-schema.sql` that the column is allowed to contain legacy URLs indefinitely.
- **Foreman override (filled by Foreman in review):** { }
