# TEST_REPORT — M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX

## 1. Verification approach
SPEC 2 modifies an Edge Function (server-side). Verification via curl + EF execution-time logs from Supabase. IR34 deviation logged (see FINDINGS F-04).

## 2. Pre-fix baseline (captured 19:00 UTC at 84,001-lead tier2 audience)
```
STATUS:200 STARTTRANSFER:86.86s TOTAL:88.33s SIZE:26450976B
```
Earlier observation (with Cloudflare hitting first): STATUS:546 (WORKER_RESOURCE_LIMIT) after 77.2 s.
EF logs `execution_time_ms`: **80,072**.

## 3. Post-fix verification (captured 19:15 UTC, same audience)
```
STATUS:200 TOTAL:24.0s SIZE:26450976B
count: 83999  recipients: 83999  created_at_ok: true
```
EF logs: ~22 s execution_time_ms.

## 4. Speedup
- **88.3 s → 24.0 s** = **3.7× faster**.
- Cloudflare gateway timeout no longer fires.
- Modal will receive a complete payload (no more HTTP 546).

## 5. Daniel's <10 s target
**NOT MET this iteration.** 24 s is over the stated target.
Root cause: PostgREST `db-max-rows=1000` cap on the remaining paginated SELECT in resolveRecipients (84 round-trips for 84K leads).
Mitigation attempts this iteration: 5 EF redeploys including `_jsonb` and TABLE-returning RPC bypasses — both returned empty from supabase-js inside the EF despite returning correct data directly. Deferred to Sprint 2 (see F-02).

## 6. Correctness preserved
- recipient_count_total = 83,999 (matches tier2 audience exactly)
- recipients_by_lead.length = 83,999
- first recipient's `created_at` = `2026-03-23T02:12:14.887...` (real ISO datetime, populated by resolveRecipients SELECT)
- aggregate fields present on recipients with attendee history

## 7. Demo cleanup
The 83,999 leftover audit-sentinel leads are being drained by pg_cron job `m4-audit-cleanup-drain-2026-05-21` (jobid 18, every minute, 5,000 rows/tick, ETA ~17 minutes). Direct DELETE via MCP/PostgREST timed out repeatedly due to client-side window (~30 s); pg_cron decouples cleanup from MCP timeouts.

## 8. Verdict
🟡 **PARTIAL — regression resolved, stretch target deferred.**
- ✅ HTTP 546 / 88 s catastrophic regression: gone.
- ✅ Modal CAN open now (was returning error).
- ✅ Correctness intact.
- ⚠️ <10 s target deferred — Sprint 2 SPEC needed.
- ⚠️ IR34 live UI verification deferred to next QA pass.

---
*End of test report.*
