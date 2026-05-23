# M7_SCHEMA — Foreman Review

> **Role:** opticup-strategic Foreman. 2026-05-23.

## SPEC quality audit

- Measurable criteria (20): yes.
- §0 Pre-Flight load-bearing: identified `payment_methods` collision (M8 territory, surfaced at SPEC time, didn't bleed into M7) and ratified D1-D8 design decisions.
- Stop triggers narrow + specific.
- Cross-Module Contract Matrix (harvest from M6 P-AUTHOR-1) applied in §0.
- Runtime semantics rehearsed for all 6 RPCs.

## Execution quality audit

- 13 MCP migrations applied in declared order. No silent extras.
- Smoke 9/9 — including the M6 P-AUTHOR-2 effect/invariant separation (S6 verifies inventory restored AND letter immutability).
- Status aggregation trigger correctly advances orders.status quote→active when sub_order transitions (verified in cross-contract X-S3).
- Selective git-add discipline maintained (campaign/M4 dirty files untouched).

## Findings processing

All 6 F-M7-* findings dismissed (intentional design / deferred per Brief / no action). Documented in FINDINGS.md.

## 2 author-skill (opticup-strategic) proposals

### P-AUTHOR-1 — Shared-infra discovery section in SPEC §0

**Symptom:** M7 SPEC needed to discover that `allocate_tenant_number` + `tenant_number_counters` existed (from M5), that M1 `decrement_inventory`/`increment_inventory` existed (from M1A), and that `payment_methods` existed (M1-era stub). These three shared-infra checks were ad-hoc probes; a structured §0 sub-section would have made the discovery faster.

**Proposed change:** Add to `SPEC_TEMPLATE.md` §0 a sub-section:

> **Shared-Infra Discovery Matrix:**
> | Resource | Probed Y/N | Exists? | Action |
> |---|---|---|---|
> | `allocate_tenant_number` | ✓ | yes | re-use entity_kind='X' |
> | `decrement/increment_inventory` | ✓ | yes/no | call direct / build wrapper |
> | ... existing tables with overlap | ✓ | yes | extend / replace / rename |
>
> One row per shared resource the SPEC depends on. Forces explicit discovery instead of buried-in-probes.

### P-AUTHOR-2 — `Status aggregation trigger` pattern naming convention

**Symptom:** M7 added `recompute_order_status_fn` trigger that auto-advances `orders.status` based on child sub_orders. This pattern (parent status = aggregate of children) recurs across modules. Naming convention would help.

**Proposed change:** Add to `SPEC_TEMPLATE.md` §0 patterns library:

> **Pattern P21 — Parent-status aggregation trigger:** When a parent's status is a deterministic function of child rows' states, build a trigger function `recompute_<parent>_status_fn()` + AFTER INSERT OR UPDATE OF state, is_deleted trigger on the child table. Function reads aggregate via FILTER counts. Used in M7 (orders ← sub_orders).

## 2 executor-skill (opticup-executor) proposals

### P-EXEC-1 — Verify status aggregation trigger fires in smoke

**Symptom:** Cross-contract X-S3 verified that after `transition_sub_order_state(sub, 'active')` the parent `orders.status` became 'active'. This is an excellent invariant check. Executor should make this trigger-fires-correctly assertion explicit in any smoke that mutates a parent-aggregated state.

**Proposed change:** Add to `opticup-executor` SKILL.md a smoke-discipline rule:

> **Triggers-fire-correctly invariants:** When testing a parent-status aggregation trigger (Pattern P21), the smoke MUST assert both the direct effect (child state changed) AND the indirect effect (parent status changed). Without the indirect assertion, a silent trigger failure (function exists but doesn't fire) passes the smoke unnoticed.

### P-EXEC-2 — Apply migrations grouped by logical unit, one MCP call per group

**Symptom:** M7 had 13 MCP migrations — 1 enum batch + 4 table CREATEs + 6 RPC CREATEs + 1 trigger + 1 views batch. The 6 separate RPC migrations could have been a single migration (each CREATE OR REPLACE FUNCTION is independent). Reduces MIGRATION.md noise.

**Proposed change:** Add to `opticup-executor` SKILL.md:

> **Migration grouping:** Group independent CREATE OR REPLACE FUNCTION calls into a single migration when (a) all are SECURITY DEFINER with Block A, (b) all REVOKE/GRANT the same way, (c) none depend on each other's body. Reduces noise in MIGRATION.md without sacrificing atomicity.

## Master-doc update checklist (chain close)

| File | Status |
|---|---|
| MASTER_ROADMAP.md | ⏳ task #14 |
| docs/GLOBAL_MAP.md | ⏳ task #14 |
| docs/GLOBAL_SCHEMA.sql | ⏳ task #14 |
| docs/DB_TABLES_REFERENCE.md | ⏳ task #14 |
| Module 7 docs (SESSION_CONTEXT, MODULE_SPEC, MODULE_MAP, CHANGELOG, db-schema.sql) | ⏳ task #14 |
| js/shared.js T-constants | ⏳ task #14 |

## Verdict

**🟢 CLOSED.** All §3 criteria pass. Smoke 9/9. Advisors clean. 0 reopener-class.
