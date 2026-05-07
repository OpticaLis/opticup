# FINDINGS — M4_HARDCODED_DEMO_PHONE_CLEANUP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_HARDCODED_DEMO_PHONE_CLEANUP/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §5 Step 2 comment template contradicts §3 criterion #4

- **Code:** `M4-SPEC-01`
- **Severity:** LOW
- **Discovered during:** §3 verification round (criterion #4 grep)
- **Location:** `modules/Module 4 - CRM/docs/specs/M4_HARDCODED_DEMO_PHONE_CLEANUP/SPEC.md` §5 Step 2 (lines 123–129) vs §3 row 4 (line 65)
- **Description:** SPEC §5 Step 2 supplied a verbatim comment block beginning `-- '050-717-5675' from a decorative comment ...` to be inserted into the migration file. SPEC §3 criterion #4 simultaneously requires `grep -n "717-5675" <up-file>` to return no match. Following Step 2 verbatim guarantees criterion #4 fails. Executor resolved by rephrasing the comment to omit the literal while preserving forensic value (logged as real-time decision §4 #2 in EXECUTION_REPORT). The Foreman should know their forensic comment template tripped the very check it was warning against.
- **Reproduction:**
  ```bash
  # Apply SPEC §5 Step 2 verbatim, then run:
  grep -n "717-5675" "modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql"
  # → matches line 16, criterion #4 FAILS
  ```
- **Expected vs Actual:**
  - Expected (from §3 #4): no match
  - Actual (after applying §5 Step 2 verbatim): one match inside the new comment
- **Suggested next action:** TECH_DEBT (improve SPEC author skill — see Proposal 1 in EXECUTION_REPORT.md)
- **Rationale for action:** Not a code issue; a SPEC-authoring discipline issue. Mirrors the existing self-improvement loop opticup-strategic uses. Add a "criterion-vs-template literal" cross-check to the Foreman's SPEC validation checklist.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC §5 Step 5 framed the MODULE_MAP citation as a `business_phone` example, but the actual citation is `formatPhone()` I/O documentation

- **Code:** `M4-SPEC-02`
- **Severity:** INFO
- **Discovered during:** §5 Step 5 execution
- **Location:** `modules/Module 4 - CRM/docs/specs/M4_HARDCODED_DEMO_PHONE_CLEANUP/SPEC.md` §5 Step 5 (lines 198–202) vs `modules/Module 4 - CRM/docs/MODULE_MAP.md:167`
- **Description:** SPEC §5 Step 5 reads: "locate any line that cites `'050-717-5675'` as the example/expected value for `business_phone` or `%phone%`. Replace it with `'053-3645404'`." The actual citation in MODULE_MAP.md:167 is the `formatPhone(raw)` function documentation showing format conversion: `+972507175675 → 050-717-5675`. Replacing only the output to `053-3645404` would document an incorrect transformation (the regex `/^\+972(\d{9})$/` cannot turn `+972507175675` into `053-3645404`). Executor used the placeholder pair `+9725XXXXXXXX → 0XX-XXX-XXXX` instead, mirroring the Step 1 fix in `crm-helpers.js`. Logged as real-time decision §4 #1 in EXECUTION_REPORT.
- **Reproduction:**
  ```bash
  grep -n "717-5675" "modules/Module 4 - CRM/docs/MODULE_MAP.md"
  # → only hit was line 167, which is formatPhone() documentation, not business_phone
  ```
- **Expected vs Actual:**
  - Expected (from SPEC framing): a `business_phone` example to swap with `'053-3645404'`
  - Actual (in file): a `formatPhone()` function I/O example
- **Suggested next action:** DISMISS
- **Rationale for action:** Executor resolved without quality loss; one-off framing mismatch, no corrective work needed. Future cleanup-style SPECs benefit from author proposal in EXECUTION_REPORT §8 (verify the file's actual citation context, not the SPEC author's mental model of it).
- **Foreman override (filled by Foreman in review):** { }
