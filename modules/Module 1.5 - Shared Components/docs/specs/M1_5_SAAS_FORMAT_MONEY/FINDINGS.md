# FINDINGS — M1_5_SAAS_FORMAT_MONEY

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_SAAS_FORMAT_MONEY/FINDINGS.md`
> **Written by:** opticup-executor (overnight hybrid session)

---

## Findings

### Finding 1 — PowerShell `[System.IO.File]::WriteAllText` corrupted UTF-8 in mid-execution

- **Code:** `M0-TOOL-PS-UTF8-01`
- **Severity:** MEDIUM (executor process improvement; no ship impact this run because rolled back)
- **Discovered during:** initial attempt to replace `formatILS` body in `js/shared.js`.
- **Location:** Executor process pattern, not project code.
- **Description:** The Edit tool's auto-swap of `'₪'` (escape sequence) ↔ `'₪'` (literal char) prevented matching the source's `'₪'` literal. Switched to PowerShell `[System.IO.File]::WriteAllText` with `UTF8Encoding(false)` for a precision replace. The first attempt corrupted the entire file's em-dashes (`—` → `ג€"` mojibake) — apparently PowerShell's internal UTF-16 string ↔ UTF-8 file round-trip mangled high-byte characters elsewhere in the file. Detected via `grep "ג€"` returning hits across the file. Rolled back via `git checkout -- js/shared.js`. Switched to `sed` with explicit byte patterns — worked cleanly.
- **Impact:** None on this SPEC (rolled back immediately, integrity gate caught nothing because the file wasn't committed). But this is a real foot-gun for future executors.
- **Suggested next action:**
  1. Add to `opticup-executor` SKILL.md a "Unicode escape edits" guidance section (proposed in EXECUTION_REPORT §9 Proposal 1).
  2. Consider adding a mojibake-pattern check to the integrity gate (proposed in EXECUTION_REPORT §9 Proposal 2).
- **Foreman override:** { }

---

### Finding 2 — `formatILS` returns `'₪‎-500'` (with LRM mark) for negative numbers

- **Code:** `M1_5-FORMAT-NEG-02`
- **Severity:** LOW (cosmetic; matches `Number.toLocaleString` behavior)
- **Discovered during:** Path 5 edge cases in QA.
- **Location:** `js/shared.js` `formatMoney()`.
- **Description:** `formatILS(-500)` returns `'₪‎-500'` (₪ + LRM U+200E + `-500`). The LRM mark is inserted by `Number.prototype.toLocaleString('he-IL')` when rendering a negative number in an RTL locale, to keep the `-` sign attached to the number visually. **This is the same behavior the legacy `formatILS` produced** — verified by reading the original line of code (`'₪' + num.toLocaleString('he-IL', ...)`). So no regression. Just documenting.
- **Impact:** None.
- **Suggested next action:** dismissable. Document in MODULE_MAP if needed.
- **Foreman override:** { }

---

### Finding 3 — Module 1.5 `MODULE_MAP.md` does not currently list `formatILS` (or any of shared.js's helpers individually)

- **Code:** `M4-DOC-13`
- **Severity:** INFO (pre-existing doc gap; not introduced by this SPEC)
- **Discovered during:** considering whether to add `formatMoney` to MODULE_MAP at SPEC close.
- **Location:** `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md`.
- **Description:** Module 1.5's MODULE_MAP doesn't enumerate shared.js's individual functions (`formatPhone`, `formatILS`, `formatDate`, `getTenantId`, `getTenantConfig`, etc.). Adding `formatMoney` alone would be inconsistent. Either ALL get listed (large doc edit, scope creep) or NONE get listed (current state, accepted).
- **Impact:** Low. Engineers grep for the function name; doc-discoverability is not blocking.
- **Suggested next action:** TECH_DEBT — schedule a future "Module 1.5 MODULE_MAP rewrite" SPEC that enumerates all shared.js helpers + their semantics. Out of scope tonight.
- **Foreman override:** { }

---

*End of FINDINGS.*
