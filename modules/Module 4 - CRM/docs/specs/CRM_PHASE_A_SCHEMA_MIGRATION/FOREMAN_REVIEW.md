# FOREMAN_REVIEW — CRM_PHASE_A_SCHEMA_MIGRATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-20
> **Reviews:** `SPEC.md` (author: strategic Cowork session, 2026-04-20) + `EXECUTION_REPORT.md` (executor: Cowork session, 2026-04-20) + `FINDINGS.md` (2 findings)
> **Commit range reviewed:** `3c8e9fe..370b0b9`

---

## 1. Verdict

🟢 **CLOSED** — all 23 tables, 7 Views, 8 RPCs, 46 RLS policies created and
verified against live DB. Seed data correct. 2 findings are both INFO-level
and handled below. No documentation drift (this SPEC explicitly deferred all
master-doc updates to Integration Ceremony per §7 Out of Scope).

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Single sentence, unambiguous: create DB schema |
| Measurability of success criteria | 5 | 13 criteria, each with exact expected value + verify command |
| Completeness of autonomy envelope | 5 | Explicitly authorized Level 3 DDL scoped to `crm_*` only |
| Stop-trigger specificity | 5 | 5 specific triggers beyond CLAUDE.md globals |
| Rollback plan realism | 5 | Full DROP sequence in dependency order, no existing objects touched |
| Expected final state accuracy | 3 | **Wrong Prizma UUID** — hardcoded `7a061cb5-...` instead of `6ad0781b-...`. Caused a STOP trigger. |
| Commit plan usefulness | 4 | Clear 2-commit plan. Minor: didn't anticipate a possible fix migration (executor needed 2 apply_migration calls). |

**Average score:** 4.6/5.

**Weakest dimension:** Expected final state accuracy (3/5) — the SPEC contained
a wrong tenant UUID that the author should have verified against the live DB
before writing. This is the Foreman's error, not the executor's. The executor
correctly stopped and reported.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | Only `crm_*` objects created. Zero modification to existing tables. |
| Adherence to Iron Rules | 5 | Self-audit covers 10 rules, all verified with evidence. Spot-checked RLS — 0 non-canonical policies. |
| Commit hygiene | 5 | 2 clean commits with proper `feat(crm)` and `docs(crm)` prefixes |
| Handling of deviations | 5 | Stopped on wrong UUID (correct). Fixed FOR UPDATE in-scope without over-asking (correct). |
| Documentation currency | 5 | Updated TODO.md. Did NOT update GLOBAL_SCHEMA per SPEC §7 — correct. |
| FINDINGS.md discipline | 5 | 2 findings logged, neither absorbed. Both have suggested dispositions. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Honest about UUID error being SPEC's fault, not theirs. Clear deviation table. |

**Average score:** 5.0/5.

**Did executor follow autonomy envelope correctly?** YES — stopped on UUID
mismatch (a §5 trigger), fixed FOR UPDATE autonomously (in-scope bug, within
envelope).

**Did executor ask unnecessary questions?** 0.

**Did executor silently absorb any scope changes?** No.

---

## 4. Findings Processing

| # | Finding code | Finding summary | Disposition | Action |
|---|---|---|---|---|
| 1 | M4-INFO-01 | SPEC template doesn't require tenant UUID pre-flight verification | ACCEPT — incorporated into Author Proposal 1 below | No separate artifact needed — it's a skill improvement |
| 2 | M4-INFO-02 | Git lock files + truncated verify.mjs from stale Cowork sessions | DISMISS | Pre-existing environment issue, not project debt. Daniel already closed the stale sessions. verify.mjs should be restored from git on the Windows desktop (`git checkout HEAD -- scripts/verify.mjs .husky/pre-commit`). |

**Zero findings left orphaned.** ✅

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|------|-----------|--------|
| "108 tables in public schema" | ✅ | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'` → 108 |
| "46 RLS policies on crm_* tables, all canonical JWT-claim" | ✅ | `SELECT count(*) FROM pg_policies WHERE tablename LIKE 'crm_%'` → 46. `SELECT ... WHERE policyname != 'service_bypass' AND qual::text NOT LIKE '%request.jwt.claims%'` → 0 rows (all canonical) |
| "31 crm_statuses rows for Prizma" | ✅ | `SELECT count(*) FROM crm_statuses WHERE tenant_id = '6ad0781b-...'` → 31 |

All 3 spot-checks passed. ✅

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Verify tenant UUIDs against live DB before writing SPEC

- **Where:** SPEC_TEMPLATE.md §10 "Dependencies / Preconditions"
- **Change:** Add mandatory step: "If the SPEC contains tenant UUIDs for seed
  data or success criteria, the author MUST verify them against the live DB
  before writing: `SELECT id FROM tenants WHERE slug = '{slug}'`. Never
  hardcode a UUID from memory or from a stale document."
- **Rationale:** This SPEC had a wrong UUID that caused a STOP trigger and
  required a round-trip to Daniel. A 2-second query would have prevented it.
- **Source:** FINDINGS #1 (M4-INFO-01), EXECUTION_REPORT §3 Deviation #1

### Proposal 2 — Note FOR UPDATE + aggregate limitation in SPEC execution notes

- **Where:** SPEC_TEMPLATE.md — add §12 "Execution Notes" as an optional
  section for domain-specific gotchas that the executor should know
- **Change:** Add: "When a SPEC includes RPCs with sequential number generation
  (Iron Rule 11), note in Execution Notes: PostgreSQL cannot combine `FOR UPDATE`
  with aggregate functions (`MAX`, `COUNT`). The correct pattern is: lock the
  parent row first (`PERFORM ... FOR UPDATE`), then compute the aggregate in
  a separate SELECT."
- **Rationale:** The executor discovered this limitation at runtime and fixed it
  correctly, but it cost ~5 minutes. Pre-documenting known footguns in the SPEC
  saves future executors time.
- **Source:** EXECUTION_REPORT §3 Deviation #2, §5 item 2

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Add tenant UUID verification to DB Pre-Flight

- **Where:** opticup-executor SKILL.md §"Step 1.5 — DB Pre-Flight Check"
- **Change:** Add step: "If the SPEC contains hardcoded tenant UUIDs for seed
  data, verify each against `tenants` table before any DDL:
  `SELECT id FROM tenants WHERE id = '<uuid>'` → must return 1 row. If 0 →
  STOP with deviation report."
- **Rationale:** Catches SPEC authoring errors before they cause FK violations
  during seed INSERT. Defense in depth (author should also verify, but
  executor is the last gate).
- **Source:** EXECUTION_REPORT §8 Proposal 1

### Proposal 2 — Document FOR UPDATE + aggregate pattern in code patterns

- **Where:** opticup-executor SKILL.md §"Code Patterns — Database patterns"
- **Change:** Add: "`FOR UPDATE` cannot be combined with aggregate functions
  in PostgreSQL. For sequential number RPCs: (1) lock parent row with
  `PERFORM ... FOR UPDATE`, (2) compute `SELECT MAX(...)` in separate query,
  (3) return result. Reference: `next_crm_event_number` in
  `campaigns/supersale/migrations/001_crm_schema.sql`."
- **Rationale:** Common footgun that cost ~5 minutes. Documenting it prevents
  repeat debugging.
- **Source:** EXECUTION_REPORT §8 Proposal 2

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | Follow-up needed |
|-----|--------------------------|---------|------------------|
| `MASTER_ROADMAP.md` §3 | NO — SPEC §7 deferred to Integration Ceremony | N/A | None |
| `docs/GLOBAL_MAP.md` | NO — SPEC §7 deferred to Integration Ceremony | N/A | None |
| `docs/GLOBAL_SCHEMA.sql` | NO — SPEC §7 deferred to Integration Ceremony | N/A | None |
| Module 4 `SESSION_CONTEXT.md` | NO — Module 4 docs not yet created (first SPEC) | N/A | Create when UI work starts |
| Module 4 `CHANGELOG.md` | NO — same reason | N/A | Create when UI work starts |
| Module 4 `MODULE_MAP.md` | NO — no code files, only DB schema | N/A | Create when UI work starts |
| Module 4 `MODULE_SPEC.md` | NO — same reason | N/A | Create when UI work starts |
| `campaigns/supersale/TODO.md` | YES | YES ✅ | None |

No documentation drift. All deferrals are explicitly authorized by SPEC §7.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> סכמת ה-CRM נוצרה בהצלחה — 23 טבלאות, 7 Views, 8 RPCs, הכל עם הגנת
> tenant isolation. ה-seed data (סטטוסים, קמפיינים, הרשאות) מוכן לפריזמה.
> השלב הבא: ייבוא הלידים מ-Monday.

---

## 10. Followups Opened

None. Both findings were processed (Proposal 1 incorporated, Finding 2 dismissed).
No new SPEC stubs or TECH_DEBT entries created.
