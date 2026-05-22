# SPEC — M4_LEADS_BULK_RPC

> **Authored:** 2026-05-21 — Sprint 3 Item 4 of 6.

## 0. Goal
Wrap Sprint-2's sequential client-side bulk-approve loop in a single atomic server-side RPC. Same UX (modal + confirm dialog + toast), same terms-gate behaviour, but a single SQL transaction so a partial failure can't leave half-promoted leads.

## 1. Acceptance bar
- New RPC `crm_bulk_approve_leads_to_tier2(p_tenant_id, p_lead_ids[]) RETURNS jsonb` with SECURITY DEFINER + canonical JWT-claim tenant guard.
- One transaction: identifies terms-approved subset → bulk `UPDATE crm_leads SET status='waiting'` + bulk `INSERT INTO crm_lead_notes`. Lead-status trigger fires per row (existing behavior).
- Client (`crm-leads-bulk-actions.js`) replaces the for-loop with a single `sb.rpc(...)` call.
- Returns `{ok, promoted, blocked_no_terms, total, promoted_ids[], blocked_ids[]}`.
- ActivityLog continues to write one row per promoted lead (audit per-row preserved).
- Iron Rule 31 gate exit 0.

## 2. Files modified
- New migration: `supabase/migrations/20260521210000_m4_bulk_approve_leads_to_tier2_rpc.sql`.
- Edited: `modules/crm/crm-leads-bulk-actions.js` — `bulkApproveToTier2` rewritten from loop → single RPC call (158 lines, was 155).

## 3. Destructive Operations
1. DDL: 1 `CREATE OR REPLACE FUNCTION`.
2. The RPC itself, when called, UPDATEs crm_leads + INSERTs to crm_lead_notes — tenant + caller-scoped to passed lead_ids. NO destructive blast on Daniel's 10K test leads (they're never passed as p_lead_ids unless an operator explicitly selects them in the UI).
3. NO Prizma writes.

## 4. Out of scope
- Bulk-reject / bulk-delete / bulk other status (separate SPECs).
- The UI itself is unchanged — checkbox column + sticky bar + confirm dialog already shipped in Sprint 2 Item 3.
- ActivityLog format change (still 1 row per promoted lead).

## 5. Verification
- Live verification deferred during this run because Supabase had an intermittent connectivity outage. Migration was applied via `apply_migration` (returned timeout-style response; existence to be confirmed post-outage).
- Once Supabase responsive: select N test leads in incoming-leads tab, hit "אשר למצב רשום", verify confirm dialog shows count, click confirm, verify (a) toast shows correct promoted+blocked counts, (b) DB rows updated atomically.

---
*End of SPEC.*
