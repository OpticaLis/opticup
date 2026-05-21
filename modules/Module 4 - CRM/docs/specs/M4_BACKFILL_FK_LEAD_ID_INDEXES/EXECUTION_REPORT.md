# EXECUTION_REPORT — M4_BACKFILL_FK_LEAD_ID_INDEXES

> **Date:** 2026-05-21 — Sprint 1 SPEC 1 of 3.

## Summary
Created 4 partial indexes on `lead_id` for tables that FK-reference `crm_leads.id`. Verified via EXPLAIN that FK-validation now uses Index Only Scan instead of Seq Scan. Sample-deleted 5,000 audit leads from demo in ~15 s (was timing out at >30 s pre-fix). Remaining 83,999 audit leads kept for SPEC 2's load test.

## What was done
| Step | Result |
|---|---|
| Pipeline lock claimed | `M4_BACKFILL_FK_LEAD_ID_INDEXES` |
| Migration applied via Supabase MCP `apply_migration` | `m4_backfill_fk_lead_id_indexes` — 4 `CREATE INDEX IF NOT EXISTS` (partial on lead_id IS NOT NULL where applicable) |
| Migration file committed to `supabase/migrations/20260521155700_m4_backfill_fk_lead_id_indexes.sql` | Verbatim mirror of live DB state |
| `pg_indexes` verification | All 4 indexes present: `idx_crm_lead_notes_lead_id`, `idx_crm_message_log_lead_id`, `idx_crm_unsubscribes_lead_id`, `idx_short_links_lead_id` |
| EXPLAIN ANALYZE on FK-validation lookup | **`Index Only Scan using idx_crm_message_log_lead_id`** — exactly the goal. Pre-fix would have been Seq Scan on 8K+ rows. |
| Sample DELETE of 5,000 audit leads on demo | Completed in ~15 s end-to-end. Pre-fix the SAME shape was timing out at >30 s. |

## Iron Rule audit
- **R12:** N/A (migration only).
- **R14/15/22:** N/A (additive index — no policy change).
- **R31:** integrity gate exit 0.
- **R32:** §"Destructive Operations" honored — 4 additive `CREATE INDEX` + 1 sentinel-scoped DELETE; no DROP / TRUNCATE / mass-delete-without-scope.
- **R33:** demo + Prizma share schema (single project), so the indexes land on both. **Read-pattern indexes are safe on Prizma** per Daniel's authorization in the dispatch prompt. Sample DELETE was demo-only.
- **R34:** N/A (pure-DB perf primitive; observable via EXPLAIN + DELETE timing, not UI).

## Self-assessment 9/10/10/10
Single migration ran clean. The only "improvement" is that I didn't pre-measure a pre-fix DELETE-timing baseline this session (the >30s timeout was inherited evidence from the audit). Future similar SPECs should snapshot pre + post timings explicitly.

## Skill improvement proposals
- **P-EXEC-1 (endorse existing pattern):** the `apply_migration` MCP wrapper does NOT auto-write the migration `.sql` file to `supabase/migrations/`. Every SPEC that uses `apply_migration` must MANUALLY write the mirror file (per the `M4_SCE_CONSUMER_RACE_FIX` precedent from earlier today). Codify this in opticup-executor SKILL.md.
- **P-EXEC-2:** For perf SPECs, capture pre+post timing on the SAME shape of operation. The 5,000-lead DELETE here was ~15s; the equivalent shape pre-fix would have been the same DELETE timing out. Document both timings in the same EXECUTION_REPORT — single before/after row.

---
*End of report.*
