# SPEC — M4_BACKFILL_FK_LEAD_ID_INDEXES

> **Authored:** 2026-05-21
> **Sprint 1, SPEC 1 of 3** (followed by M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX then M4_DASHBOARD_STATUS_RPC + M4_LEAD_EVENT_HISTORY_MV).
> **Predecessor:** `M4_FULL_AUDIT_FINDINGS_2026_05_21.md` (Risk #1 + Sprint 1 / S1).
> **Pipeline:** Full-Auto.
> **Tenant:** Demo first → Prizma after Demo green (indexes-only; read-pattern, safe).

## 0. Goal
Backfill the 4 missing `lead_id` indexes on tables that FK-reference `crm_leads.id`. Eliminate the O(M) FK-validation sequential scan that blocked every audit-cleanup DELETE this morning.

## 1. Tables + index plan

| Table | Rows (both tenants) | Index name | Notes |
|---|---|---|---|
| `crm_lead_notes` | 607 | `idx_crm_lead_notes_lead_id` | small |
| `crm_message_log` | 8,904 | `idx_crm_message_log_lead_id` | the one that caused the 100K DELETE seq-scan blowup |
| `crm_unsubscribes` | 0 | `idx_crm_unsubscribes_lead_id` | empty today; index protects future scale |
| `short_links` | 13,766 | `idx_short_links_lead_id` | small enough that even non-concurrent lock is sub-second |

## 2. Migration shape
1 migration: `20260521151700_m4_backfill_fk_lead_id_indexes.sql`

Try `CREATE INDEX CONCURRENTLY` first. If the migration runner wraps the SQL in a transaction (which makes CONCURRENTLY illegal), fall back to plain `CREATE INDEX` — all 4 target tables are <14K rows so the lock is <100 ms each. Same result either way.

## 3. Success criteria
1. 4 indexes exist on demo + Prizma (`pg_indexes` query confirms).
2. `EXPLAIN ANALYZE` of a DELETE that touches each FK validation shows **Index Scan** (or Bitmap Index Scan), NOT **Seq Scan**.
3. Sample DELETE of ~5,000 of the 88,999 leftover audit leads on demo completes in **<10 seconds** (was timing out at >60s before).
4. Prizma row counts unchanged (indexes don't mutate data).
5. Iron Rule 31 gate exit 0.

## Destructive Operations
1. DDL: 4 `CREATE INDEX [CONCURRENTLY]` on demo + Prizma. Pure-additive.
2. DML mass-DELETE of 5,000 sentinel-marked demo audit leads (tenant + sentinel scoped). The 83,999 remaining stay for SPEC 2's load test.
3. NO migration on tables not listed; NO drops; NO data writes on Prizma.

## 4. Out of scope
- Other missing FK indexes (only the 4 audit-identified ones).
- The leftover 83,999 audit leads — SPEC 2 cleans them up after its own load test.

## 5. Verification & closure
4 closing docs in this SPEC folder. Pipeline lock claimed + released.

---
*End of SPEC.*
