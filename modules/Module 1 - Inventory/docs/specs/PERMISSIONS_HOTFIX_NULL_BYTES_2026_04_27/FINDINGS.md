# FINDINGS — PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27

> **Written by:** opticup-executor (during SPEC execution)
> **Note:** Substantive deviations are documented in EXECUTION_REPORT.md §5–§7.

---

## Findings

### Finding 1 — SPEC misdiagnosed the bug: alleged null-byte truncation does not exist; real cause is `escapeAttr` ReferenceError

- **Code:** `M0-DIAG-01`
- **Severity:** HIGH (entire SPEC was based on a wrong premise)
- **Discovered during:** Pre-flight `wc -c` + `tr -cd '\0'` + `git cat-file blob 7d37e62`
- **Location:** SPEC §1 ("4,788 trailing null bytes"), §3 #3-#5 (size/null-byte verifications)
- **Description:** SPEC claimed `modules/permissions/employee-list.js` had 4,788 trailing null bytes from a Cowork-VM file-write. Verification:
  - On-disk file: 12,748 bytes, **0 null bytes anywhere**, ends correctly with `compliance).\n`.
  - Committed blob `7d37e62`: 12,491 bytes, **0 null bytes**.
  - 257-byte on-disk delta vs blob is Windows CRLF line endings (`core.autocrlf`). Not corruption.

  Actual root cause of the user-visible "matrix hangs on טוען" symptom: `ReferenceError: escapeAttr is not defined` at `permission-matrix.js:64`. PHASE2 commit `7d37e62` introduced 5 `escapeAttr()` calls when extracting the matrix UI; the function is only defined in `modules/storefront/studio-form-renderer.js`, which is NOT loaded on `employees.html`. Browser threw at first matrix render → `#perm-matrix-wrap` stayed at its initial "טוען..." text.

- **Reproduction:**
  ```bash
  wc -c modules/permissions/employee-list.js
  tr -cd '\0' < modules/permissions/employee-list.js | wc -c
  git cat-file blob 7d37e62:modules/permissions/employee-list.js | tr -cd '\0' | wc -c
  # All three: 0 null bytes
  ```
  Plus Chrome MCP `evaluate_script` calling `renderPermissionMatrix` directly:
  ```
  ReferenceError: escapeAttr is not defined
    at permission-matrix.js:64:50
  ```

- **Suggested next action:** TECH_DEBT (Foreman SKILL — bug-reproduction step at top of every SPEC author flow); also surfaces an executor-skill improvement (see EXECUTION_REPORT §10 Proposal 1).

- **Foreman override:** { }

---

### Finding 2 — PHASE2 commit `7d37e62` introduced an undefined-function reference that wasn't caught by any pre-commit check

- **Code:** `M3-DEBT-01`
- **Severity:** MEDIUM (production-breaking bug shipped + hooks didn't catch it)
- **Discovered during:** Diagnosing the matrix-hang
- **Location:** PHASE2 commit `7d37e62` introduced `escapeAttr()` calls in `permission-matrix.js`; no static check verifies that referenced identifiers exist in the loaded script bundle.
- **Description:** I (the executor) added `escapeAttr()` calls in PHASE2 commit 6 thinking it was a globally-available helper like `escapeHtml`. It isn't — only one file in the entire codebase defines `escapeAttr` (`modules/storefront/studio-form-renderer.js`), and that file isn't loaded on `employees.html`. The pre-commit hooks (verify.mjs + verify-tree-integrity.mjs) caught file-size + null-byte issues but had no way to verify "is this identifier defined in the script-load order this HTML uses?".

- **Reproduction:**
  ```
  grep -rn 'function escapeAttr\|escapeAttr\s*=' --include='*.js' [active source]
  → only modules/storefront/studio-form-renderer.js
  ```

- **Suggested next action:** TECH_DEBT — add an "undefined identifier" pre-commit check that scans staged JS for function calls + cross-references against the union of identifiers defined in the script-bundle the file loads in. Non-trivial (per-HTML-file analysis) but would catch this entire class of bug.

- **Foreman override:** { }

---

### Finding 3 — Iron Rule 31 gate's null-byte check ALREADY covers anywhere-in-file; SPEC author assumed it was EOF-only

- **Code:** `M0-DIAG-02`
- **Severity:** LOW (positive-direction misdiagnosis — the gate was already strong)
- **Discovered during:** Reading `scripts/verify-tree-integrity.mjs`
- **Location:** SPEC §1, §3 #6 (Iron Rule 31 strengthening)
- **Description:** SPEC claimed the gate "only checks for null-byte runs at end-of-file" and needed strengthening. Reading `verify-tree-integrity.mjs:122-131`:
  ```js
  function checkNullBytes(buf, path) {
    const firstNul = buf.indexOf(0x00);
    if (firstNul === -1) return [];
    ...
  }
  ```
  `buf.indexOf(0x00)` finds the first 0x00 ANYWHERE — not just at EOF. The gate was already correct.

- **Suggested next action:** DISMISSED — but added value by codifying the guarantee with a 4-case regression test (`npm run test:integrity-gate`). The test would have prevented this kind of "is the gate doing what we think?" doubt in the first place.

- **Foreman override:** { }

---

### Finding 4 — PIN modal expects 5-input structure; programmatic `.value=` clears immediately

- **Code:** `M0-PROCESS-02`
- **Severity:** LOW (operational; affects test automation only)
- **Discovered during:** Manager-login QA attempt
- **Location:** PIN modal hpin-0..hpin-4 inputs on `localhost:3000/?t=demo`
- **Description:** Tried to log in via Chrome MCP by setting `input.value` on the 5 hpin inputs and dispatching `input` events. The values were cleared immediately by some controller — likely auto-advance focus combined with a clear-on-blur reset. Worked around by calling project's own `verifyEmployeePIN(pin)` + `initSecureSession(employee, token)` directly via evaluate_script. Demo manager PIN: `090004` (six digits including leading zero — '90004' rejected as Invalid PIN).

- **Suggested next action:** TECH_DEBT (small documentation note in Phase 2 executor SKILL update — when scripted login is needed, prefer calling the auth functions directly, not dispatching to the PIN modal UI).

- **Foreman override:** { }

---

### Finding 5 — `Module 1 - Inventory` vs `Module 1 - Inventory Management` folder duplication (recurrence)

- **Code:** `M3-RECUR-01`
- **Severity:** LOW (recurrence — already TECH_DEBT in 4 prior FOREMAN_REVIEWs)
- **Description:** Same folder-shorthand issue as before. SPEC folder lives under `Module 1 - Inventory/`; SESSION_CONTEXT lives under `Module 1 - Inventory Management/`.
- **Suggested next action:** DISMISS (already TECH_DEBT)
- **Foreman override:** { }

---

*End of FINDINGS.md.*
