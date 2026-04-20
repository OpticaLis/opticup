# FINDINGS — CRM_PHASE_A_SCHEMA_MIGRATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Rules

1. One entry per finding. Never merge two unrelated issues.
2. Findings are things discovered OUTSIDE the SPEC's declared scope.
   In-scope bugs are just normal work — they belong in commits, not here.
3. Do NOT fix findings inside this SPEC. Fixing would violate "one concern per task."
4. Every finding needs a **suggested next action**: NEW_SPEC / TECH_DEBT / DISMISS.
   The Foreman can override, but never leave it blank.

---

## Findings

### Finding 1 — SPEC template does not include tenant UUID pre-flight verification

- **Code:** `M4-INFO-01`
- **Severity:** INFO
- **Discovered during:** Pre-flight check — Criterion 10 (tenants_prizma) returned 0
- **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/SPEC.md` §10 and SPEC template in general
- **Description:** The SPEC hardcoded the Prizma tenant UUID as `7a061cb5-49a0-4e88-8927-4e7dcf2e139a` for use in seed data and success criteria. The actual UUID in the live DB is `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. This caused a STOP trigger and required a round-trip to Daniel for confirmation. This is not a data integrity issue (the correct UUID was used), but a SPEC authoring gap.
- **Reproduction:**
  ```sql
  SELECT count(*) FROM tenants WHERE id = '7a061cb5-49a0-4e88-8927-4e7dcf2e139a';
  -- Returns: 0 (wrong UUID in SPEC)
  SELECT id, name FROM tenants WHERE slug = 'prizma';
  -- Returns: 6ad0781b-37f0-47a9-92e3-be9ed1477e1c
  ```
- **Expected vs Actual:**
  - Expected: SPEC UUID matches live DB UUID
  - Actual: Mismatch — SPEC UUID was stale/wrong
- **Suggested next action:** TECH_DEBT — add to opticup-strategic SPEC template: "Verify tenant UUIDs against live DB before writing into SPEC. Use `SELECT id FROM tenants WHERE slug = 'prizma'` not a hardcoded value."
- **Rationale for action:** Prevents future STOP triggers on the same category of error.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Git repository has stale lock files blocking commits from Cowork

- **Code:** `M4-INFO-02`
- **Severity:** INFO
- **Discovered during:** Commit step — `HEAD.lock` and `objects/maintenance.lock` exist from a prior Windows session and cannot be removed from the Cowork sandbox (permission denied)
- **Location:** `.git/HEAD.lock`, `.git/objects/maintenance.lock`
- **Description:** The git repository has stale lock files left by a previous Windows process. Cowork sandbox cannot remove them (Operation not permitted). This blocks `git commit` from Cowork. The workaround is to commit from the Windows desktop where the files can be deleted. Additionally, `scripts/verify.mjs` is truncated (Cowork truncation issue — SyntaxError at line 121), causing the pre-commit hook to fail with exit code 1 even for pure SQL commits. Both issues are pre-existing WIP, not caused by this SPEC.
- **Suggested next action:** TECH_DEBT — (1) On Windows desktop: delete `.git/HEAD.lock` and `.git/objects/maintenance.lock` before next session. (2) Restore `scripts/verify.mjs` from git history: `git checkout HEAD -- scripts/verify.mjs`. (3) Restore `.husky/pre-commit` from git history: `git checkout HEAD -- .husky/pre-commit`.
- **Foreman override (filled by Foreman in review):** { }
