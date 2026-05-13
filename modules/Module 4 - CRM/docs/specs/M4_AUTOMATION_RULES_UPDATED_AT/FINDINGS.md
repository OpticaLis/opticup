# FINDINGS — M4_AUTOMATION_RULES_UPDATED_AT

---

## Finding #1 — `destructive-ops-declared.mjs` hook treats committed `_down.sql` rollback scripts as live destructive ops

**Severity:** MEDIUM (project infrastructure friction).

**What:** When this SPEC tried to commit `2026_05_13_automation_rules_updated_at_down.sql` (alongside `_up.sql`), the pre-commit hook fired:

```
[destructive-ops-declared] modules/Module 4 - CRM/migrations/2026_05_13_automation_rules_updated_at_down.sql:13 — Destructive pattern (SQL DROP COLUMN) introduced: DROP COLUMN IF EXISTS updated_at;
```

The hook's `isDocFile()` regex allowlist includes `architecture-brief/`, `escalations/`, SPEC-folder UPPER_SNAKE_CASE `.md` files, and a few other paths — but NOT `migrations/`. So any `_down.sql` containing the literal `DROP COLUMN` / `DROP TABLE` / `ALTER ... DROP` token is blocked even when its parent SPEC.md declared the rollback in §Destructive Operations.

**Why it matters:** SPEC_TEMPLATE.md §8 explicitly says "**Migration file naming (when SPEC creates a SQL migration):** use `YYYY_MM_DD_<spec_slug>_up.sql` for the forward migration + a paired `YYYY_MM_DD_<spec_slug>_down.sql` for the rollback. Both files in the same commit." This SPEC could not honor that pattern because the hook blocks it. Workaround used (inline rollback in SPEC.md §6) keeps the rollback documented but breaks the template's "two files in one commit" convention.

**Proposed fix:** Extend `isDocFile()` in `scripts/checks/destructive-ops-declared.mjs` to allowlist `_down.sql` files when (a) they sit in a `modules/*/migrations/` folder and (b) a paired `_up.sql` exists with the matching slug. This preserves the gate's intent (catch unintended destructive ops in active code) while allowing the canonical rollback pattern.

**Disposition:** Log as `INFRA-DEBT-DESTRUCTIVE-OPS-HOOK-DOWN-SQL-ALLOWLIST` in `TECH_DEBT.md` on next infra-touching SPEC. Not blocking — inline rollback works for now.

---

*End of FINDINGS.*
