# M5_SCHEMA — Foreman Review

> **Role:** opticup-strategic (Foreman, post-execution review)
> **Authored:** 2026-05-22 overnight chain close
> **Subject:** SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION + REVIEW for `M5_SCHEMA`

## SPEC quality audit

- **Did the SPEC have measurable success criteria?** Yes — 24 success criteria with exact expected values + verify commands. Mostly verified at run-end.
- **Were stop triggers clear?** Yes — §5 lists 6 specific deviation triggers beyond CLAUDE.md §9 globals. None fired during the run.
- **Was the autonomy envelope appropriate?** Yes — §4 enumerates allowed DDL via MCP, seed writes on both tenants, smoke on demo only, selective `git add` discipline. Executor stayed within envelope throughout.
- **Cosmetic discrepancy:** SPEC §3 row #3 said "40 columns" but actual is 42 (24 added vs 26 actually added — author counting error). Documented in EXECUTION_REPORT §2 + §3 and proposed as P-AUTHOR-1 below.
- **Pre-flight strength:** §0 Pre-Authoring Reality Check was load-bearing — caught the `customers` already-exists deviation BEFORE authoring DDL. The SPEC adapted strategy (extend, not drop) inside §0, not in the executor's lap. This is exactly what the harvested Step 1.5 pattern is for.

## Execution quality audit

- **Did the executor follow the SPEC?** Yes. 19 MCP `apply_migration` calls in the order declared in DDL Steps 1–15. No silent extras.
- **Any deviations?** One positive: MIGRATION.md added at the run (5 retro files instead of 4). The SPEC's §8 didn't list MIGRATION.md explicitly but the SPEC §3 #21 criterion required it — executor followed.
- **Smoke discipline:** All 9 cases executed with proper teardown logic embedded in the DO blocks (smoke S5 leaves merge-side-effects intact intentionally to verify; S7 part 2 leaves a row with FK to prove the failure path). No cross-tenant data leakage.
- **Selective git-add:** Enforced (pre-existing dirty files from chain start remain untouched in the working tree).
- **No Prizma writes during smoke:** Verified via final count probe — 0/0/0 rows on prizma `customers`/`customer_notes`/`customer_documents`.

## Findings processing

FINDINGS.md contains 9 items (F1–F9). Per-item decisions:

| # | Decision | Action |
|---|---|---|
| F1 (column count cosmetic) | Dismissed; apply as P-AUTHOR-1 (below) | This FOREMAN_REVIEW proposes adding per-table column-count manifests in §0 baseline. |
| F2 (demo branch leftovers from M1A smoke) | TECH_DEBT | M5 UI SPEC pre-flight will replace with real "Demo Optic Store" branch. |
| F3 (customers.health_fund text kept alongside health_fund_id) | M5_MIGRATION SPEC addresses | Migration SPEC drops legacy column with explicit Iron Rule 32 declaration. |
| F4 (legacy `prescriptions` table) | TECH_DEBT (also F-M6-4) | Future cleanup SPEC. |
| F5 (legacy `work_orders` table) | TECH_DEBT | Future M7 SPEC. |
| F6 (compute_lifecycle_dormant_sweep stub) | Dismissed | Deferred by design until M7 ships. |
| F7 (Block A inlining duplication) | Dismissed | Intentional per harvested lessons. |
| F8 (smoke RLS limitation under MCP) | Dismissed | Structural verification via pg_policy is canonical. |
| F9 (single-Pipeline session) | Dismissed | N/A. |

## 2 author-skill (opticup-strategic) improvement proposals

### P-AUTHOR-1 — Per-table column-count manifest in §0, not a project-wide total

**Symptom:** M5 SPEC §3 #3 said "40 columns" but actual is 42 (count-of-additions error: 24 declared, 26 actually added because first_name + last_name weren't included in the "24"). Cosmetic; documented; no functional impact.

**Proposed change:** Update `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §0 Baselines section to include a sub-bullet:

> **For tables extended via ALTER TABLE ADD COLUMN:** pin both the pre-ALTER column count AND a per-column manifest (one bullet per added column) under a `BASE_COLS_<table>` symbol. §3 success criteria reference the per-column list, not a sum. This avoids count-of-additions errors and gives the Reviewer a per-column conformance check.

**Acceptance:** next FOREMAN_REVIEW that pins column counts will use the per-column manifest format. M5_MIGRATION SPEC (next M5 SPEC) is the first opportunity.

### P-AUTHOR-2 — Probe `current_setting('request.jwt.claims', true)` semantics explicitly in §0 for MCP-tested SPECs

**Symptom:** During M5 functional smoke, S8 cross-tenant guard was verified via the RPC-rejection path (RAISE 42501 caught) but the secondary verification "demo session SELECT-from-prizma returns 0 rows" did NOT fire (because MCP runs as postgres superuser → RLS doesn't engage even with `SET LOCAL request.jwt.claims`). The SPEC's smoke explanation noted this fact but didn't anticipate it; the executor had to add an in-line comment to clarify. Author-time anticipation would have written the smoke differently.

**Proposed change:** Update SKILL.md §"Runtime semantics rehearsed (P-AUTHOR-2 enforcement)" with a new sub-bullet:

> **MCP execution context for smoke tests:** Supabase MCP `execute_sql` connects as the `postgres` superuser. `SET LOCAL request.jwt.claims` changes the `current_setting('request.jwt.claims')` value (which `Block A` RPCs read), but **does NOT** make RLS policies engage from the postgres role (which bypasses RLS structurally). Therefore: RLS verification in MCP-driven smoke is "structural" (via `pg_policy` queries), NOT behavioral (via a SELECT-blocked-by-RLS assertion). Smoke cross-tenant guards MUST be RPC-level (RAISE 42501) checks, not SELECT-by-tenant_id-filter checks. Author the smoke matrix accordingly.

**Acceptance:** future M-series SPECs author smoke cases that distinguish "RLS structurally verified via pg_policy" from "RLS behaviorally verified via PostgREST round-trip with anon key." The latter requires the localhost-tester skill, not MCP-direct.

## 2 executor-skill (opticup-executor) improvement proposals

### P-EXEC-1 — Validate column count against SPEC §3 expected before declaring DDL Step success

**Symptom:** After DDL Step 5 (customers extend), the executor moved on to Step 6 without first running `SELECT count(*) FROM information_schema.columns WHERE table_name='customers'` to confirm the column count matched §3 #3 (which would have caught the 40-vs-42 discrepancy at Step 5, not at run-end).

**Proposed change:** Add to `opticup-executor` SKILL.md a post-DDL validation discipline:

> **After every ALTER TABLE / CREATE TABLE migration:** run a probe that compares the table's actual column count against the SPEC's §3 expectation. If they differ, do NOT auto-pass-through — surface the variance in the next status update + flag in FINDINGS. The Foreman next-cycle decides whether the variance is a SPEC error or an Executor deviation.

**Acceptance:** future schema SPECs surface count variances proactively (vs at run-end synthesis).

### P-EXEC-2 — Capture seed-INSERT row counts in EXECUTION_REPORT per-migration, not just final

**Symptom:** The M5_SCHEMA EXECUTION_REPORT §2 shows aggregate seed counts (8 tenant_languages, 10 health_funds) but not per-migration row counts. If a seed migration partial-applied (e.g., 4 of 10 rows due to ON CONFLICT), the aggregate would mask it. M5's smoke caught nothing because all seeds applied fully — but it's a latent risk.

**Proposed change:** Add to `opticup-executor` SKILL.md a post-INSERT discipline:

> **After every seed INSERT migration:** run a probe that counts the inserted rows + compares against the SPEC's expected count. Pin both in MIGRATION.md (e.g., "M5_07_health_funds: 10/10 rows inserted, ON CONFLICT skipped: 0"). If actual ≠ expected, escalate to Foreman.

**Acceptance:** future seed migrations have per-migration row count verification, not just aggregate end-state.

## Master-doc update checklist

| File | Status | Notes |
|---|---|---|
| `MASTER_ROADMAP.md` §3 | ⏳ pending at chain-close (task #7) | Update Module 5 status from "in-design (Architecture Brief sealed)" → "Phase A+B closed 🟢" |
| `docs/GLOBAL_MAP.md` | ⏳ pending at chain-close | Add M5 functions + contracts |
| `docs/GLOBAL_SCHEMA.sql` | ⏳ pending at chain-close | Append M5 DDL |
| `docs/DB_TABLES_REFERENCE.md` | ⏳ pending at chain-close | 7 new tables |
| `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` | ⏳ pending at chain-close | Phase A+B closed |
| `modules/Module 5 - Customers/docs/CHANGELOG.md` | ⏳ pending at chain-close | |
| `modules/Module 5 - Customers/docs/MODULE_MAP.md` | ⏳ pending at chain-close | |
| `modules/Module 5 - Customers/docs/MODULE_SPEC.md` | ⏳ pending at chain-close | |
| `modules/Module 5 - Customers/docs/db-schema.sql` | ⏳ pending at chain-close | |
| `modules/Module 5 - Customers/MODULE_5_ROADMAP.md` | ✅ Phase A+B marked done | (already updated in module roadmap from authoring) |

## Verdict

**🟢 CLOSED.** All §3 criteria pass at-time-of-review or are queued for chain-close (Integrity Gate + Master Docs). Smoke 9/9 PASS. Advisors clean. 0 reopener-class issues. The 3 deferred criteria (#17, #22, #23) close as part of task #7 of the overnight chain.
