# M8_SCHEMA — Foreman Review

> **Role:** opticup-strategic Foreman. 2026-05-23.

## SPEC quality audit

- 23 measurable criteria. All pass.
- Pre-Flight identified payment_methods collision (same situation as M5_SCHEMA's customers EXTEND) and ratified D1-D8 strategy.
- Cross-Module Contract Matrix (harvested M6 P-AUTHOR-1) included — clear ownership/consumer mapping.
- Runtime semantics rehearsed for all 5 RPCs + 2 trigger fns.
- Iron-clad enforcement of "manifest only, no integration code" — three places in SPEC (D4, §7, F-M8-2).

## Execution quality audit

- 11 MCP migrations applied in declared order.
- Mock + Gama + Z Credit seeded as manifest only — confirmed in REVIEW.md.
- Event mechanism: `payment_events_queue` mirrors M1 K3 + M4 trigger patterns — durable queue, not pg_notify.
- Cross-contract bridge proven (X-S1..X-S6): full M5 customer → M7 order → M7 sub-order + inventory → M8 payment → event → view aggregation.
- payment_methods EXTEND preserved all 4 pre-existing demo rows with backfilled new fields verified in M-S6.

## Findings processing

8 F-M8-* findings all dismissed (intentional / brief-deferred / project-convention). FINDINGS.md tabular summary.

## 2 author-skill (opticup-strategic) proposals

### P-AUTHOR-1 — Event-emission pattern naming convention (Pattern P22)

**Symptom:** M8 added `emit_first_payment_event_fn` + `emit_check_returned_event_fn` + `payment_events_queue` table. This is the second time the project uses a durable-queue event pattern (first: M1 K3 `pending_lens_advancement_queue`). Future modules (M9 lab events, M12 message events, M13 loyalty events) will repeat the pattern.

**Proposed change:** Add to `SPEC_TEMPLATE.md` §0 patterns library:

> **Pattern P22 — Durable Event Queue:** For asynchronous cross-module events (M8→M7, M8→M4, M9→M11, etc.), build:
> - `{module}_events_queue` table with: tenant_id, source_id (FK to event source row), event_kind enum, event_payload jsonb, emitted_at, consumed_at, consumed_by.
> - `emit_{event_kind}_event_fn()` SECURITY DEFINER trigger function — inserts queue row when condition met.
> - AFTER INSERT or AFTER UPDATE OF ... trigger attached to source table.
> - Consumer modules drain with `SELECT ... WHERE consumed_at IS NULL`.
> - Naming: `emit_<event_kind>_event_fn` + `trg_emit_<event_kind>_event`.

### P-AUTHOR-2 — Mandate "manifest-only" verification in adapter-pattern SPECs

**Symptom:** M8 adapter manifest needed three places in SPEC to enforce "skeleton only, no integration code." A single dedicated check would be cleaner.

**Proposed change:** Add to `SPEC_TEMPLATE.md`:

> **Manifest/Skeleton verification (adapter SPECs only):** When a SPEC builds an adapter-pattern manifest (rows describing future integrations), add to §3 success criteria:
> - "Grep verifies ZERO integration code: no `IPaymentProvider`/`I{X}Provider` class, no charge/refund/webhook code, no Edge Function in `supabase/functions/{adapter}-*`. Reviewer confirms in REVIEW.md."

## 2 executor-skill (opticup-executor) proposals

### P-EXEC-1 — Verify both-direction RLS pattern for global tables

**Symptom:** M8 added 2 global (non-tenant-scoped) tables — `payment_capabilities` + `payment_adapters`. The RLS pattern is `service-write + public-read` (not the canonical 2-policy `service_bypass + tenant_isolation`). Executor should verify global RLS pattern is correct per type.

**Proposed change:** Add to `opticup-executor` SKILL.md:

> **RLS pattern by table type:**
> - Tenant-scoped tables: `service_bypass FOR ALL TO service_role` + `tenant_isolation FOR ALL TO public USING (tenant_id = JWT claim)`.
> - Global tables (platform-level: capabilities, adapters, currencies): `service_bypass FOR ALL TO service_role` + `public_read FOR SELECT TO public USING (true)`.
> - Verify the right pattern was applied; document in MIGRATION.md per table.

### P-EXEC-2 — Smoke event-queue events explicitly (not just direct effect)

**Symptom:** M-S5 and X-S5 each verify `payment_events_queue` has a new row after the triggering action. This is the right pattern. Executor should make event-queue verification standard for any trigger-emitting SPEC.

**Proposed change:** Add to `opticup-executor` SKILL.md:

> **Pattern P22 smoke discipline:** For any RPC/trigger that emits to a {module}_events_queue:
> 1. Smoke counts pre-emit queue rows.
> 2. RPC/trigger fires.
> 3. Smoke counts post-emit queue rows.
> 4. Assert diff = expected count (1 per emit usually).
> 5. Assert event_payload jsonb keys present.

## Master-doc update checklist (chain close)

| File | Status |
|---|---|
| MASTER_ROADMAP.md | ⏳ task #14 |
| docs/GLOBAL_MAP.md | ⏳ task #14 |
| docs/GLOBAL_SCHEMA.sql | ⏳ task #14 |
| docs/DB_TABLES_REFERENCE.md | ⏳ task #14 |
| Module 8 docs | ⏳ task #14 |
| js/shared.js T-constants | ⏳ task #14 |

## Verdict

**🟢 CLOSED.** All §3 criteria pass. M8 smoke 8/8 + cross-contract 6/6. Advisors clean. Both halves of overnight chain at 🟢.
