# M5_M8_CROSS_CONTRACT_FIXES — Foreman Review

> **Role:** opticup-strategic Foreman. 2026-05-23.

## SPEC quality

- 22 measurable criteria. All pass.
- §0 Pre-Authoring Reality Check confirmed all 8 premises live before authoring.
- Strategic + Code Review recommendations integrated (Q1/Q2/Q3 from Strategic + F-D1/F-D2 idiom from Code).
- Cross-Module Contract Matrix included.
- Runtime semantics rehearsed for all touched RPCs + trigger fns.

## Execution quality

- 11 MCP migrations applied in declared order. No silent extras.
- Smoke 7/7 covers concurrency (T1-S3 partial unique + exception trap), state-machine races (T1-S4 mark_check_returned dedup + body-guard), CHECK enforcement (T1-S5 amount/quantity), snapshot immutability (T1-S6 jsonb stable under source mutation), regression preservation (T1-S7 cross-tenant + anon).
- 0 Prizma writes.

## Findings processing

5 F-T1-* — all dismissed with rationale. One documentation step queued (F-A-2 invariant in M7 db-schema.sql header) for chain close.

## 2 author-skill (opticup-strategic) proposals

### P-AUTHOR-1 — Codify Pattern P22 dedup idiom in SPEC_TEMPLATE.md

**Symptom:** Track 1 added partial-unique + exception-trap pattern. M9 Track 3 inherited it from day-1 (M8 Q2 + Track 1 lesson). Future modules with event queues will need the same pattern.

**Proposed change:** Add to `SPEC_TEMPLATE.md` §0 Patterns library:

> **Pattern P22 (Durable Event Queue with idempotency) — canonical idiom:**
> Every `{module}_events_queue` table MUST ship with:
> 1. Partial UNIQUE index `(source_id) WHERE event_kind='<kind>'` for every emit-once event kind.
> 2. Trigger function INSERT wrapped in `BEGIN ... EXCEPTION WHEN unique_violation THEN NULL; END` for at-least-once → exactly-once semantics.
> 3. Optionally tenant_id index for consumer queries; otherwise rely on FK-implicit tenant scoping (F-T1-3 justification).

### P-AUTHOR-2 — F-A-2 documented-invariant pattern in SPEC_TEMPLATE.md

**Symptom:** F-A-2 is the "pick one mechanism" pattern — a contract that has multiple valid implementations and you must DOCUMENT which is the project's pick rather than build a redundant new one. Recurs frequently (orders.status, customer lifecycle, M9 lab_jobs.status, etc.).

**Proposed change:** Add to `SPEC_TEMPLATE.md` Pre-Authoring Reality Check:

> **Documented-Invariant Discipline:** When a state transition has multiple plausible mechanisms (trigger on table A vs trigger on table B vs cron), pick ONE in the SPEC and DOCUMENT the invariant explicitly in the target module's db-schema.sql header. Do NOT build a redundant secondary mechanism. Future SPECs referencing the same transition cite the documented invariant. (Track 1 F-A-2 codified this for orders.status.)

## 2 executor-skill (opticup-executor) proposals

### P-EXEC-1 — Set service_role JWT claim explicitly for migration RPCs

**Symptom:** Track 2 demo migration first call failed because MCP runs as postgres but the RPC's Block A reads `current_setting('request.jwt.claims')` → NULL → triggers anon-reject path. Workaround: `SET LOCAL request.jwt.claims = '{"role":"service_role"}'` before invoking. Future migration-RPC smokes should pre-set this.

**Proposed change:** Add to `opticup-executor` SKILL.md migration RPC discipline:

> **Service_role JWT pre-set:** Before invoking any SECURITY DEFINER RPC via MCP where the body has `IF v_jwt_role IS DISTINCT FROM 'service_role'`, run `SET LOCAL request.jwt.claims = '{"role":"service_role"}'` first in the same SQL block. MCP's connection as `postgres` superuser does NOT auto-populate jwt.claims; the SET LOCAL is required for the bypass branch to fire.

### P-EXEC-2 — Smoke setup must seed FK targets, not just probe table existence

**Symptom:** Track 1 T1-S3 first attempt failed because the smoke tried to manually INSERT into payment_events_queue with a fake payment_id that didn't satisfy the FK. Reworked to use a real existing payment_id and INSERT a second event row.

**Proposed change:** Add to `opticup-executor` SKILL.md smoke discipline:

> **FK-safe smoke fixtures:** When a smoke needs a row referenced by FK (e.g., payment_id, order_id, customer_id), always SELECT-then-use an existing row OR INSERT the parent first; never use `gen_random_uuid()` as a fake referenced-row id. The smoke's job is to test business logic, not to fight FK constraints.

## Master-doc update

Track 1 closing implies F-A-2 invariant goes into M7 db-schema.sql header at chain close. Tracked.

## Verdict

**🟢 CLOSED.** 7/7 smoke. 0 reopener-class findings.
