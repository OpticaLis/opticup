# FINDINGS — P19_SHARED_JS_SPLIT

> **Location:** `modules/Module 4 - CRM/go-live/specs/P19_SHARED_JS_SPLIT/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `shared/tests/table-test.html` does not load `shared.js`

- **Code:** `M4-DOC-P19-01`
- **Severity:** LOW
- **Discovered during:** §2 Track A3 — sweeping HTML files for the script tag.
- **Location:** `shared/tests/table-test.html:30` (a comment, not a `<script>` tag).
- **Description:** The SPEC §2 Track A3 lists three test files to update:
  `shared/tests/activity-log-test.html`, `db-test.html`, `table-test.html`.
  Only the first two actually load `shared.js`. `table-test.html` matches the
  Grep only because of an inline comment that *mentions* `shared.js` ("escapeHtml
  standalone — shared.js requires Supabase lib, not needed for this test").
  Adding `<script src="../../js/shared-field-map.js"></script>` there would be
  a noise script tag for a global the file never uses.
- **Reproduction:**
  ```
  grep -n "shared\.js" shared/tests/table-test.html
  # → 30:/* escapeHtml standalone — shared.js requires Supabase lib, not needed for this test */
  ```
- **Expected vs Actual:**
  - Expected (per SPEC): 18 HTML files updated (15 main + 3 test).
  - Actual: 17 HTML files updated (15 main + 2 test). Success criterion #8
    (`grep -l "shared-field-map" *.html = 15`) was already authored against
    the 15 root-level files only, so it still passes; the test-file
    instruction was over-counted.
- **Suggested next action:** DISMISS.
- **Rationale for action:** No follow-up needed — the SPEC author should
  just `grep -l "<script.*shared\.js"` next time instead of grepping the
  raw string. Filed for SPEC-authoring lessons learned.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Pre-existing JWT-pattern violations in 4 unrelated files

- **Code:** `M0-DEBT-P19-01`
- **Severity:** MEDIUM
- **Discovered during:** Sanity-checking the rule-23-secrets allow-list patch
  (commit `250a721`) with `node scripts/verify.mjs --full --only=rule-23-secrets`.
- **Location:** Four files contain hardcoded JWT-shaped tokens that the
  detector still flags after the allow-list (their lines do not contain
  `SUPABASE_ANON` / `SUPABASE_PUBLISHABLE`):
  - `modules/Module 3 - Storefront/docs/QA_HANDOFF_2026-04-14.md:373`
  - `modules/Module 3 - Storefront/scripts/blog-migration/01_catalog_wp_urls.mjs:25`
  - `modules/Module 3 - Storefront/scripts/blog-migration/03_upload_to_media_library.mjs:29`
  - `scripts/migrate_to_supabase.js:5`
- **Description:** The pre-commit hook fix on 2026-04-21 (`76a883f`) made
  `rule-23-secrets` actually block. P19 hit this on `js/shared.js` and
  patched the allow-list, but the same class of issue still lurks in the
  four files above. The next commit that stages any of them will be blocked.
  The Storefront M3 files appear to embed Supabase keys for migration scripts
  (likely service-role or anon, needs inspection). `scripts/migrate_to_supabase.js`
  is a one-time legacy migrator. The QA_HANDOFF doc is a historical artifact.
- **Reproduction:**
  ```
  node scripts/verify.mjs --full --only=rule-23-secrets
  # → 8 violations across the 4 files above (each JWT counts twice — header + payload)
  ```
- **Expected vs Actual:**
  - Expected: a clean repo-wide rule-23-secrets pass.
  - Actual: 8 violations remain.
- **Suggested next action:** NEW_SPEC (small).
- **Rationale for action:** Per file, the right move is different —
  some keys should be moved to env (real secrets), some lines should be
  allow-listed (anon keys), and the historical doc should probably have
  its key redacted. A short triage SPEC can decide each one. Doing it
  inside P19 would have violated one-concern-per-task.
- **Foreman override (filled by Foreman in review):** { }

---
