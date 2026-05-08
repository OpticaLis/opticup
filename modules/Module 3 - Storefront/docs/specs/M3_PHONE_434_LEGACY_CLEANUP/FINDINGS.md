# FINDINGS — M3_PHONE_434_LEGACY_CLEANUP

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_PHONE_434_LEGACY_CLEANUP/FINDINGS.md`
> **Written by:** opticup-executor (2026-05-08)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC was authored on stale data; cleanup already complete via prior commit `a4723b5` (2026-05-07)

- **Code:** `M3-SPEC-01`
- **Severity:** MEDIUM (would have wasted ~30 min of executor time AND produced an empty / no-op storefront commit if executed literally)
- **Discovered during:** Step 0 sanity check
- **Location:** `SPEC.md` §1 / §2 / §4 — the entire premise that the 3 files exist and need deleting
- **Description:** Step 0 check 1 (`ls -la` for the 3 target paths) returned "No such file or directory" for all 3 paths. Investigation via `git log` surfaced storefront commit `a4723b5` (2026-05-07 11:27, authored by Daniel — `feat(storefront): phone-channel templates + cleanup of stale 053-434-7265`) which already deleted exactly the 3 files this SPEC names:
  ```
  D public/images/lab/israel-hayom-logo.png
  D src/_deprecated/legal-privacy.ts
  D src/_deprecated/legal-terms.ts
  ```
  Plus other phone-template work in the same commit. The SPEC was authored 2026-05-08 (one day later) without checking the current state of the storefront repo. **All 5 success criteria that depend on the cleanup state (criteria 1-5, 10, 11) are pre-met by this prior commit.**

  Note: a real PNG (1024×232 image data) exists at `public/images/campaign/israel-hayom-logo.png`. That is NOT the misnamed-HTML file the SPEC describes; it's a legitimate marketing logo asset, used by storefront blocks. SPEC §1 confused the path or referenced an older audit run before the file was relocated/renamed.

- **Reproduction:**
  ```bash
  cd opticup-storefront
  ls public/images/lab/israel-hayom-logo.png  # No such file
  ls src/_deprecated/legal-terms.ts           # No such file
  ls src/_deprecated/legal-privacy.ts         # No such file
  grep -rln "053-434-7265" src/ public/       # 0 results
  git show --name-status a4723b5 | grep -E "^D"
  # D public/images/lab/israel-hayom-logo.png
  # D src/_deprecated/legal-privacy.ts
  # D src/_deprecated/legal-terms.ts
  ```
- **Expected vs Actual:**
  - Expected per SPEC §3 check 1: all 3 target files exist.
  - Actual: 0 of 3 exist; deleted in prior commit a4723b5 (2026-05-07).
- **Suggested next action:** TECH_DEBT — Foreman SKILL update: SPEC authoring MUST verify file existence + run `git log --since=<lookback>` against the target repo for related cleanup commits BEFORE asserting the cleanup is needed. The 3-occurrence rule from CLAUDE.md should extend to "did someone already do this work in the last N days?" check.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `src/_deprecated/` retains 5 unrelated legacy files (not in this SPEC's scope)

- **Code:** `M3-DATA-02`
- **Severity:** INFO
- **Discovered during:** Step 0 investigation of the `src/_deprecated/` folder
- **Location:** `opticup-storefront/src/_deprecated/`
- **Description:** After `legal-terms.ts` and `legal-privacy.ts` were deleted in `a4723b5`, the folder is not empty — it contains 5 OTHER files: `CategoryGrid.astro`, `LabReviews.astro`, `legal-prizma-express.ts`, `legal-terms-branches.ts`, `MultifocalCTA.astro`. SPEC §7 says "If `src/_deprecated/` contains files OTHER than the 2 named → leave it intact and document; do NOT mass-delete a folder of unknown content." Per SPEC §6 stop trigger, this is the documented decision to leave intact.
- **Reproduction:**
  ```bash
  ls -la opticup-storefront/src/_deprecated/
  # 5 files remaining
  ```
- **Suggested next action:** TECH_DEBT — a future cleanup SPEC could investigate each of the 5 files: are they truly orphaned, or referenced somewhere? If orphaned, delete them in a similar low-risk cleanup. None of the 5 contain the `053-434-7265` phone (verified — outside this SPEC's scope, but the grep-result for 053-434-7265 across `src/` returned 0 matches).
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
