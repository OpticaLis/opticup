# FINDINGS — M4_LEADS_BULK_RPC

## F-01 (resolved) — Atomicity guaranteed
**Severity:** N/A (feature add).
**Resolution:** Single-transaction UPDATE + INSERT. If either fails, both roll back. No more half-promoted batches under failure.

## F-02 (preserved) — Terms-approved gate behavior
**Severity:** N/A.
**What:** RPC partitions the input set via CTE; only terms_approved=true rows enter the UPDATE. The blocked subset is returned to the caller in `blocked_ids[]` for client-side reporting.

## F-03 (INFO) — Trigger fires per row, not per batch
**Severity:** INFO.
**What:** `trg_lead_status_change_event` fires for each row updated. So a 100-lead batch generates 100 SCE rows + 100 cron-driven dispatch evaluations. This is the SAME pattern as the prior sequential loop — no change. (If Daniel later wants ONE batched dispatch event instead of N, that's a separate SPEC.)

## F-04 (INFO) — Verification deferred
**Severity:** INFO.
**What:** Supabase had connectivity issues during this Item. Once stable, exercise the bulk flow via Chrome MCP — same flow as Sprint 2 Item 3's verification but the RPC swap is invisible to the user.

---
*End of findings.*
