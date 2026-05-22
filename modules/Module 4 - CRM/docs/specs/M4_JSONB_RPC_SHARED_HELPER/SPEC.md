# SPEC — M4_JSONB_RPC_SHARED_HELPER

> **Authored:** 2026-05-21 — Sprint 3 Item 1 of 6.

## 0. Goal
Extract the defensive jsonb-shape-handling logic (Array | JSON-string | object-wrapped) that Sprint 2 inlined in `recipients.ts` into a shared `unwrapJsonbArray` helper at `supabase/functions/automation-engine/rpc-shape-util.ts`. Iron Rule 21 prevention: prevent future EF jsonb-RPC consumers from duplicating the same fallback dance.

## 1. Acceptance bar
- New file `rpc-shape-util.ts` exports `unwrapJsonbArray<T>(data: any): T[]`.
- `recipients.ts` tier2 branch uses `unwrapJsonbArray(rpcRes.data)` instead of the inline triple-check.
- Belt-and-suspenders paginate fallback retained (empty result still triggers it).
- automation-engine EF redeployed.
- Iron Rule 31 gate exit 0.

## 2. Files modified
- New: `supabase/functions/automation-engine/rpc-shape-util.ts` (40 lines).
- Edited: `supabase/functions/automation-engine/recipients.ts` — 28 lines of inline shape-handling collapsed to 1 call.

## 3. Destructive Operations
1. EF redeploy (automation-engine). No DB writes.

## 4. Out of scope
- Browser-side jsonb-RPC call sites (browser supabase-js handles jsonb correctly today — proven across SPEC 3 dashboard + Sprint 2 message-perf screen).
- The Sprint-1 `crm_attendee_aggregates_for_leads` TABLE-return RPC in preview.ts (different shape; not affected by the cap).

## 5. Verification
- recipients.ts diff: 28-line inline check → 1-line call.
- Net line count: −24 lines.
- Live curl/UI verification of dispatch_preview deferred (Supabase project intermittent outage during this run).

---
*End of SPEC.*
