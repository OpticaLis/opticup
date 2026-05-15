# FINDINGS — M1A_DEBT_SWEEP

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-15
> **Total findings:** 4 (1 INFO + 2 LOW + 1 MEDIUM)

---

## M1A-SWEEP-FINDINGS-01 (INFO) — Brief estimate of 48 rule-18 violations was wrong (actual: 5)

- **Severity:** INFO (estimate-vs-reality drift; surfaced + corrected at SPEC §0 reality check).
- **Location:** `modules/Module 1 - Inventory Management/architecture-brief/M1A_DEBT_SWEEP_BRIEF.md` §2 DEBT-02 description.
- **What:** The Brief stated "48 pre-existing UNIQUE-without-tenant-id violations from the frames era". Live measurement at SPEC author time showed 5 rule-18 violations (4 real + 1 false-positive on a `-- partial unique (022)` comment).
- **Why it happened:** The "48" estimate originated from Phase 1A FOREMAN_REVIEW EXECUTION_REPORT §2 row 21, which counted the TOTAL violations blocking the db-schema.sql append (38 rule-15 + 5 rule-18 + a few others), not "48 rule-18 violations". The Brief author copied "48" without re-running the rule-18 probe.
- **Reproduce:**
  ```bash
  node -e "import('./scripts/checks/rule-18-unique-tenant.mjs').then(m=>m.default(['modules/Module 1 - Inventory Management/docs/db-schema.sql']).then(r=>console.log('rule-18 violations:', r.violations.length)))"
  # → rule-18 violations: 5 (pre-fix); 0 (post-fix)
  ```
- **Suggested next action:** DISMISS as a one-time Brief-authoring miss. SPEC §0 caught it via live-baseline rule (`STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1, now binding) and corrected scope before execution. The corrective discipline is already in place; no further action needed beyond logging.

---

## M1A-SWEEP-FINDINGS-02 (MEDIUM) — rule-15 false-positive on quoted policy names was undocumented in Brief

- **Severity:** MEDIUM — caused a mid-execution reorder (B3 → B1 instead of B1 → B3) that required 10 minutes to diagnose + recover.
- **Location:**
  - `modules/Module 1 - Inventory Management/architecture-brief/M1A_DEBT_SWEEP_BRIEF.md` §2 VERIFY_HOOKS_REGEX_FIXES description (claimed "rule-15-rls.mjs regex doesn't accept schema prefix").
  - `scripts/checks/rule-15-rls.mjs` pre-patch (line 10–12): `policyRE` used `\w+` for the policy name token, which doesn't match quoted policy names like `"service_bypass_tenants"`.
  - Real-world impact: 38 false-positive violations against `modules/Module 1 - Inventory Management/docs/db-schema.sql` before B3 landed.
- **What:** The Brief described rule-15's flaw as "doesn't accept schema prefix" (e.g., `public.lens_brand`). Reading the live hook revealed `(?:public\.)?` was ALREADY present in both ENABLE-RLS and CREATE-POLICY regexes. The actual flaw was quoted policy names — `\w+` doesn't match `"name with spaces"`. The SESSION_CONTEXT note from `RECEIPT_FORM_FIXES_FROM_MANAGER` ("42 rule-15-rls on quoted policy names") supports this; the Brief misattributed the cause.
- **Reproduce:**
  ```bash
  # Pre-patch (commit 588ecd0 or earlier):
  node -e "import('./scripts/checks/rule-15-rls.mjs').then(m=>m.default(['modules/Module 1 - Inventory Management/docs/db-schema.sql']).then(r=>console.log(r.violations.length)))"
  # → 38 violations (all on quoted-policy tables)
  # Post-patch (commit 913fa47):
  # → 0 violations (all 38 cleared by the policyRE alternation `(?:\w+|"[^"]+")`)
  ```
- **Suggested next action:** **DISMISSED** — addressed by VERIFY_HOOKS_REGEX_FIXES (commit `913fa47`). The fix is now live. Foreman should consider this finding evidence for executor-skill improvement proposal #1 (multi-rule pre-flight probe), which would catch this category of Brief misattribution at SPEC-author time, not at executor staging time.

---

## M1A-SWEEP-FINDINGS-03 (LOW) — rule-18 hook has a comment-content false-positive surface

- **Severity:** LOW — single occurrence in current codebase (line 767 of M1 db-schema.sql); 2-char workaround applied without expanding hook scope.
- **Location:** `scripts/checks/rule-18-unique-tenant.mjs` regex `UNIQUE_RE = /UNIQUE\s*\(([^)]+)\)/gi`.
- **What:** The case-insensitive regex matches `unique(NNN)` patterns inside `-- ...` line comments AND `/* ... */` block comments AND any string-literal that contains the phrase. Real-world impact: the comment `-- partial unique (022)` at line 767 of M1 db-schema.sql tripped the regex as `UNIQUE(022)` and was flagged as a violation. Workaround in this SPEC: 2-char edit changing `(022)` to `, migration 022` (semantically equivalent, eliminates the parens that trip the regex).
- **Suggested fix (deferred to a future SPEC):** Strip line-comments and block-comments from `content` before applying `UNIQUE_RE`. Sketch:
  ```js
  const stripped = content
    .split('\n')
    .map(l => l.replace(/--.*$/, ''))  // strip line comments
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ''); // strip block comments
  // then run UNIQUE_RE on `stripped` instead of `content`
  ```
- **Reproduce:**
  ```bash
  # Synthetic .sql file:
  echo "-- partial unique (022)" > /tmp/test-rule18.sql
  node -e "import('./scripts/checks/rule-18-unique-tenant.mjs').then(m=>m.default(['/tmp/test-rule18.sql']).then(r=>console.log(r.violations.length)))"
  # → 1 violation (the false positive)
  ```
- **Suggested next action:** **TECH_DEBT entry** — Add to `TECH_DEBT.md` or `MASTER_ROADMAP.md §5` as `RULE18-COMMENT-FALSE-POSITIVE`. Effort: ~15 min for the 2-line `stripped` patch + 5-min self-test. Not bundled into this SPEC per Brief §8 anti-pattern. Recommended as a follow-up commit BEFORE Phase 1B starts touching shared SQL doc files.

---

## M1A-SWEEP-FINDINGS-04 (LOW) — expense_folders RLS doc-gap was pre-existing, surfaced by patched rule-15

- **Severity:** LOW — DOC-only gap; live DB has correct RLS via migration. Resolved within DEBT-02.
- **Location:** `modules/Module 1 - Inventory Management/docs/db-schema.sql` lines 1945-1956 (pre-fix); fixed within DEBT-02 commit `fdf3e2c`.
- **What:** After the rule-15 patch (commit `913fa47`) tightened the false-positive surface from 38 → 1, the remaining 1 violation was `expense_folders` at line 1945 — a real doc-only gap. The doc file had a narrative comment `-- RLS: tenant_isolation + service_bypass` but no actual `ALTER TABLE expense_folders ENABLE ROW LEVEL SECURITY` + `CREATE POLICY ... ON expense_folders ...` statements. The migration file (058 series) does have the actual RLS DDL — only the per-module doc snapshot was out of sync.
- **Resolution:** Added the 3 missing RLS doc lines (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY "tenant_isolation"`, `CREATE POLICY "service_bypass"`) inside DEBT-02's commit (`fdf3e2c`). Mirrors the canonical 2-policy pattern used 30+ times elsewhere in the same file.
- **Reproduce (pre-fix):**
  ```bash
  # At commit fdf3e2c~1 (after B3 but before B1's doc-sync):
  node -e "import('./scripts/checks/rule-15-rls.mjs').then(m=>m.default(['modules/Module 1 - Inventory Management/docs/db-schema.sql']).then(r=>r.violations.forEach(v=>console.log('  line',v.line,':',v.message))))"
  # → line 1945: CREATE TABLE expense_folders missing ENABLE ROW LEVEL SECURITY or CREATE POLICY
  ```
- **Suggested next action:** **DISMISSED** — resolved within this SPEC. Logged here for traceability. A follow-up audit of all per-module `db-schema.sql` files for similar narrative-comment-only RLS doc-gaps would be a small, defensible cleanup SPEC (defer to next maintenance window).

---

## Summary

| # | Severity | Disposition | Status |
|---|---|---|---|
| 01 | INFO | DISMISS — corrective discipline already in place (live-baselines rule) | Closed |
| 02 | MEDIUM | DISMISSED — fixed by B3 commit 913fa47 | Closed |
| 03 | LOW | TECH_DEBT entry — RULE18-COMMENT-FALSE-POSITIVE | Open |
| 04 | LOW | DISMISSED — resolved within B1 commit fdf3e2c | Closed |

**Zero findings left orphaned.** 3 closed in-pipeline, 1 promoted to tech-debt for a future maintenance window.

---

*End of FINDINGS.md.*
