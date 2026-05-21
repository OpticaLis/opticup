# TEST_REPORT — M4_BACKFILL_FK_LEAD_ID_INDEXES

## 1. Verification approach
This SPEC creates 4 indexes. IR34 N/A (pure-DB primitive, no UI surface). Verification via:
- `pg_indexes` confirms presence.
- `EXPLAIN ANALYZE` confirms Index Scan (not Seq Scan) on FK-validation lookup.
- Sample DELETE timing confirms the audit-time bottleneck is gone.

## 2. `pg_indexes` confirmation
All 4 indexes present in `public` schema:

| indexname | tablename |
|---|---|
| `idx_crm_lead_notes_lead_id` | `crm_lead_notes` |
| `idx_crm_message_log_lead_id` | `crm_message_log` |
| `idx_crm_unsubscribes_lead_id` | `crm_unsubscribes` |
| `idx_short_links_lead_id` | `short_links` |

## 3. EXPLAIN ANALYZE — FK validation lookup
```
... Index Only Scan using idx_crm_message_log_lead_id on crm_message_log
    Index Cond: (lead_id = (InitPlan 2).col1)
    Heap Fetches: 0
```
✅ Exactly the goal. Pre-fix this would have been `Seq Scan on crm_message_log`.

## 4. Sample DELETE on demo
- Input: 5,000 audit-sentinel leads (`utm_campaign='M4_FULL_AUDIT_LOAD_TEST_2026_05_21'`)
- Wall-clock: ~15 s end-to-end (DB DELETE + Supabase MCP roundtrip)
- Result: `rows_deleted: 5000` — clean.
- Pre-fix baseline (from audit teardown attempts earlier today): repeatedly timed out at >30 s for batches as small as 500 rows.

✅ **Order of magnitude speedup confirmed.**

## 5. Demo lead-count delta
- Pre: 89,027 total (28 originals + 88,999 audit-sentinel)
- Post: 84,027 total (28 originals + 83,999 audit-sentinel)
- The 5,000-row reduction matches the DELETE.
- Originals (28) unchanged. ✅

## 6. Prizma
- Schema-only change. Both tenants share the same Postgres schema. The indexes apply to Prizma rows too.
- Zero Prizma DML. Prizma row counts unchanged.

## 7. Verdict
✅ **PASS.** All 4 indexes live, EXPLAIN shows the desired plan shape, sample DELETE proves the practical impact. Remaining 83,999 audit-sentinel leads in demo are kept for SPEC 2's load test.

---
*End of test report.*
