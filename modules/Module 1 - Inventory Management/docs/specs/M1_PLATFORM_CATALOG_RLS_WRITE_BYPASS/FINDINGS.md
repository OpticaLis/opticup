# FINDINGS — M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS

> Extracted from EXECUTION_REPORT.md §13 by the Foreman during closure (the Executor inlined findings because the agent harness reported a restriction on writing sibling files mid-run; the Foreman is satisfying the SPEC §12 "FINDINGS.md present in folder" checklist item here).

---

## F-1 — Iron Rule 32 hook lacks SQL-pattern authorization parsing

**Severity:** HIGH (architectural)
**Source:** Executor (escalation file `modules/Module 1 - Inventory Management/escalations/2026-05-18T173501Z_iron-rule-32-sql-pattern-authorization-gap.md`)
**Affected:** all future SPECs that authorize destructive SQL operations via `## Destructive Operations` declaration.

**What:** The Iron Rule 32 pre-commit hook (`scripts/checks/destructive-ops-declared.mjs`) flags every staged file containing destructive SQL keywords (DROP TABLE / DROP COLUMN / DROP POLICY / TRUNCATE / ALTER ... DROP / DELETE FROM without WHERE) as a violation. The companion auth-parser (`scripts/destructive-ops-auth-parser.mjs`) consults the SPEC's `## Destructive Operations` section ONLY for file-deletion authorization (path / basename / glob match). It cannot consume SQL-pattern authorizations. So a SPEC that authorizes "4× DROP POLICY IF EXISTS platform_admin_bypass ON public.<table>;" in `## Destructive Operations` cannot pass the gate — the authorization is documentation, not enforcement.

**Evidence:** Daniel granted one-time `--no-verify` bypass to ship this SPEC's commits per Iron Rule 32 protocol (the only authorized bypass path). Without that bypass, the SPEC could not have shipped despite the DB migration succeeding.

**Disposition:** **NEW_SPEC — `M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION`** (Module 1.5, Shared Components — governance infrastructure). Estimated 2-3 hours. Sister to already-tracked `IRON_RULE_32_HOOK_COMMENT_AWARENESS`. Target: extend `destructive-ops-auth-parser.mjs` to parse an `Authorized SQL patterns:` block from SPEC §Destructive Operations OR alternatively allow per-pattern declarations like `- 4× DROP POLICY <policy-name> ON <table-pattern>`. Foreman to author this SPEC in next session; until then, future destructive-SQL SPECs follow the same one-time `--no-verify` chat-go-ahead protocol.

---

## F-PRE-1 — `contact_lens_variant.public_view` `cmd='ALL'` vs siblings' `cmd='SELECT'`

**Severity:** INFO (pre-existing schema drift)
**Source:** Foreman pre-flight (SPEC §0.4 carry-forward) — noted during 2026-05-18 night `pg_policies` probe.

**What:** Among the 4 global lens-catalog tables, `contact_lens_variant.public_view` was created with `cmd='ALL'` (effective for SELECT/INSERT/UPDATE/DELETE) while `lens_brand.public_view`, `lens_design.public_view`, `lens_variant.public_view` are `cmd='SELECT'`. Both forms have `with_check=NULL`, meaning Postgres defaults INSERT/UPDATE writes to fail the policy (NULL with_check is treated as false for these ops). Net practical behavior: roughly equivalent today (writes blocked on all 4); but a future change to add a `WITH CHECK` clause to `public_view` would behave differently across the 4 tables.

**Disposition:** **TECH_DEBT** — bundle with Stage 2A's leftover TECH_DEBT cleanup session (already includes display_id RPC, FIELD_MAP, lens_type CHECK, detail-pane split, modal-API consolidation). Low-priority operational consistency cleanup. No customer impact today.

---

## F-2 — Iron Rule 32 hook comment-awareness gap (already tracked elsewhere)

**Severity:** LOW (already tracked)
**Source:** Executor (collateral observation during F-1 investigation).

**What:** The destructive-ops hook's regex matches `DROP POLICY` in BOTH active SQL and SQL comments (`-- ...`). The migration file's header comment intentionally mentions "DROP POLICY IF EXISTS precedes each CREATE" as a self-documentation line. This trips the hook unconditionally. Executor skill notes the existing mitigation is "AVOID destructive-pattern keywords inside `--` SQL comments" — but the SPEC §3a Shared Edit Block declared the comment verbatim, which the Executor honored.

**Disposition:** **ALREADY-TRACKED** — `IRON_RULE_32_HOOK_COMMENT_AWARENESS` SPEC is referenced in `opticup-executor/SKILL.md` as a known follow-up. The F-1 SPEC above (`M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION`) should bundle both fixes (comment-awareness + SQL-pattern-auth) into one Module 1.5 governance-infrastructure SPEC.

---

## Summary

| # | Severity | Status | Disposition |
|---|----------|--------|-------------|
| F-1 | HIGH | NEW | NEW_SPEC `M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION` (bundle comment-awareness + SQL-pattern-auth fixes) |
| F-PRE-1 | INFO | NEW (carry from §0.4) | TECH_DEBT — bundle with Stage 2A leftover cleanup |
| F-2 | LOW | ALREADY-TRACKED | Bundle into F-1's SPEC |

**Foreman action items captured in FOREMAN_REVIEW.md §6 Findings Processing.**
