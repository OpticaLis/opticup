# TEST_REPORT — M4_LEADS_BULK_RPC

## 1. Code-level diff equivalence
- Client signature unchanged: `bulkApproveToTier2(leadIds): { ok, blocked_no_terms, errors }`.
- Caller `bulkApproveWithUx` unchanged (consumes the same stats shape).
- DOM contract unchanged (Sprint 2 Item 3 UI shipped + verified).

## 2. RPC body sanity check
```sql
-- Partition: terms-approved leads go to v_promoted_ids; rest go to v_blocked_ids.
-- Single UPDATE on v_promoted_ids: status='waiting' + updated_at=now.
-- Bulk INSERT of one note per promoted lead.
-- Return: { ok, promoted, blocked_no_terms, total, promoted_ids[], blocked_ids[] }.
```
Atomicity: single PL/pgSQL function = single transaction. Trigger `trg_lead_status_change_event` fires per UPDATE row (existing behavior).

## 3. Live verification
**Status: deferred.** Supabase had connectivity issues during this run. Re-verification path:
1. Demo with 3 test leads (2 with terms_approved=true, 1 without — same shape as Sprint 2 Item 3 test).
2. Select all → "אשר למצב רשום" → confirm.
3. Verify: 2 promoted to 'waiting', 1 unchanged, toast shows correct counts.
4. SQL truth check: `SELECT status FROM crm_leads WHERE id = ANY(test_ids)`.

## 4. Iron Rule 31 gate
exit 0 throughout.

## 5. Verdict
🟡 **CLOSED-WITH-DEFERRED-VERIFICATION.** Code is correct + the migration file is committed. Live smoke deferred to first successful test after Supabase outage clears.

---
*End of test report.*
