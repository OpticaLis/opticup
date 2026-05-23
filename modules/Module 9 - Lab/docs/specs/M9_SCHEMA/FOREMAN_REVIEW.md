# M9_SCHEMA — Foreman Review

> **Role:** opticup-strategic Foreman. 2026-05-23.

## SPEC quality

- 17 measurable criteria. All pass.
- §0 Pre-Authoring inherits Track 1 lesson (Pattern P22 idempotency from day-1) — first SPEC that codifies the inheritance.
- Cross-Module Contract Matrix included.
- Brief §9 ToDos explicitly enumerated as out-of-scope (M1-extension blocker, M7 lab_flow column, M12 templates, M13 RPC, pg_cron). Clean foundation-first delivery.

## Execution quality

- 12 MCP migrations applied in declared order.
- Smoke 10/10: 8 functional + 2 cross-contract.
- Pattern P22 inheritance proven (T3-X2 direct INSERT raises 23505).
- 0 Prizma row writes on data tables; config seeds applied to both per Brief.

## Findings processing

8 F-T3-* — 4 dismissed (intentional design), 3 TECH_DEBT for future SPECs (M1-extension / M13 / tenant-config), 1 deferred (production go-live cron).

## 2 author-skill (opticup-strategic) proposals

### P-AUTHOR-1 — Pattern inheritance discipline section in SPEC_TEMPLATE.md

**Symptom:** Track 3 inherited Pattern P22 dedup idiom from Track 1 explicitly. Without a structured "inherited patterns" section, the inheritance was easy to miss. Future modules implementing event queues need a checklist.

**Proposed change:** Add to `SPEC_TEMPLATE.md` §0:

> **Inherited Patterns Checklist:** When the SPEC's design depends on patterns codified in prior SPECs (e.g., P21 status aggregation trigger, P22 durable event queue, Block A JWT header), list each in §0 with a one-line cite of the source SPEC. If a pattern has remediation lessons from later SPECs (e.g., Track 1's partial-unique addition to P22), the SPEC MUST adopt the latest version of the pattern, not the original.

### P-AUTHOR-2 — Cross-SPEC dependency manifest

**Symptom:** M9 has 6 known cross-SPEC dependencies (M1 extension blocker, M7 lab_flow column, M12 templates, M13 loyalty RPC, tenant-config plumbing, pg_cron). Without a manifest, future M9 UI / Production SPECs need to re-discover the list.

**Proposed change:** Add to `SPEC_TEMPLATE.md` §7 Out-of-Scope subsection:

> **Cross-SPEC Dependency Manifest:** List every out-of-scope item with: (a) which future SPEC will resolve it, (b) the workaround/stub today, (c) the cross-reference point (db-schema column, RPC name, etc.) where the future SPEC plugs in.

## 2 executor-skill (opticup-executor) proposals

### P-EXEC-1 — Smoke fixture diversity for FK-constrained chains

**Symptom:** Track 3 T3-S7 needed 2 distinct fresh sub_orders (sub_order_id UNIQUE on lab_jobs). Demo had limited supply (5 existing sub_orders from M7 smoke). Smoke had to handle the partial case where only 1 was free. Fragile.

**Proposed change:** Add to opticup-executor SKILL.md smoke discipline:

> **Smoke fixture pre-allocation:** Before running smoke cases, the executor SHOULD count required-distinct-rows per case (e.g., T3-S7 needs 2 fresh sub_orders) and seed the missing rows if needed. Document a "fixture pre-allocation" step in TEST_REPORT.md so re-runs are deterministic.

### P-EXEC-2 — Inherit Pattern P22 idiom from day-1 (codify)

**Symptom:** Track 3 correctly shipped lab_events_queue with 3 partial-unique idempotency indexes from migration 5 (not retroactively from a later Phase B as M8 had to do).

**Proposed change:** Add to opticup-executor SKILL.md:

> **Pattern P22 from day-1 mandate:** Whenever the SPEC instructs creating a new `{module}_events_queue` table, the SAME migration MUST also create the partial-unique idempotency indexes for every emit-once event_kind, even if the trigger fn that emits doesn't exist yet. Day-1 idempotency. Source: Code Review §6 (M8 retrofit avoided).

## Master-doc update

- MODULE_9_ROADMAP exists; Phase A+B status to mark closed 🟢
- MASTER_ROADMAP: add Module 9 row with closure status
- GLOBAL_MAP: append M9 tables/RPCs/views section
- GLOBAL_SCHEMA: append M9 DDL summary
- DB_TABLES_REFERENCE: 10 new T-constants

## Verdict

**🟢 CLOSED.** All 3 tracks of the NIGHT_RUN chain now closed. Daniel reviews in the morning.
