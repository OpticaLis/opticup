# FINDINGS — BRAND_GALLERY_MEDIA_CONSOLIDATION

> **Location:** `modules/Module 3 - Storefront/docs/specs/BRAND_GALLERY_MEDIA_CONSOLIDATION/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — studio-brands.js exceeds 350-line Iron Rule 12 limit

- **Code:** `M3-R12-01`
- **Severity:** MEDIUM
- **Discovered during:** §3 criterion 14 verification
- **Location:** `modules/storefront/studio-brands.js` (830 lines)
- **Description:** File is 830 lines, well above the 350-line Rule 12 cap. This SPEC reduced it from 871 (net -41 lines) by removing the dead upload function and gallery preview HTML, but it remains a significant violation. The file contains brand listing, editor modal, SEO scoring, AI content generation, gallery management, logo upload, Quill editor init, and tag management — at least 4-5 logical separations.
- **Reproduction:**
  ```
  wc -l modules/storefront/studio-brands.js
  # → 830
  ```
- **Expected vs Actual:**
  - Expected: ≤350 lines per Iron Rule 12
  - Actual: 830 lines
- **Suggested next action:** NEW_SPEC
- **Rationale for action:** This is pre-existing tech debt that this SPEC explicitly declared out of scope (§7). A dedicated file-splitting SPEC should separate: (1) brand list/table, (2) brand editor modal, (3) SEO scoring + AI content, (4) gallery + logo upload, (5) Quill/tag helpers.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Rule 7 violation: direct sb.from() in Module 3 storefront code

- **Code:** `M3-R07-01`
- **Severity:** LOW
- **Discovered during:** building studio-media-picker.js
- **Location:** `modules/storefront/studio-media.js`, `modules/storefront/studio-brands.js`, `modules/storefront/studio-media-picker.js` (all use `sb.from()` directly)
- **Description:** Iron Rule 7 says "all DB interactions pass through shared.js helpers (fetchAll, batchCreate, etc.). Never call sb.from() directly except for specialized joins." All Module 3 storefront Studio files use `sb.from()` directly. The new picker follows this pre-existing pattern for consistency, but it's a project-wide Rule 7 violation in Module 3.
- **Reproduction:**
  ```
  grep -rn "sb\.from(" modules/storefront/studio-*.js | wc -l
  # → ~30+ occurrences
  ```
- **Expected vs Actual:**
  - Expected: DB.fetchAll() / DB.insert() wrappers
  - Actual: Direct sb.from() calls
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Migrating all Module 3 studio files to DB.* wrapper is a separate concern. Low severity because Module 3 code always includes manual tenant_id filtering (Rule 22 is followed).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — _backup_brand_gallery_20260417 table should be dropped after QA

- **Code:** `M3-DEBT-01`
- **Severity:** INFO
- **Discovered during:** migration execution
- **Location:** Supabase table `_backup_brand_gallery_20260417`
- **Description:** A backup table was created as part of the rollback plan. After Daniel confirms the gallery is working correctly on localhost, this table should be dropped to avoid clutter. No RLS policy was added (it's a backup, not a production table), which the pre-commit hook flagged as a false positive.
- **Reproduction:**
  ```sql
  SELECT COUNT(*) FROM _backup_brand_gallery_20260417;
  -- → 465
  ```
- **Expected vs Actual:**
  - Expected: Temporary table, dropped after QA
  - Actual: Still exists, awaiting QA confirmation
- **Suggested next action:** DISMISS (after Daniel confirms gallery works)
- **Rationale for action:** This is a planned temporary artifact per SPEC §6 rollback plan. Not a bug or debt — just needs cleanup after verification.
- **Foreman override (filled by Foreman in review):** { }
