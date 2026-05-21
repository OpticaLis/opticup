# SPEC — M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX

> **Authored:** 2026-05-21 — Sprint 1 SPEC 2 of 3.
> **Predecessor:** `M4_DISPATCH_PREVIEW_REGRESSION_2026_05_21.md` diagnosis (post-audit, characterized the 80s EF execution).
> **Tenant:** Demo only (Prizma unchanged).

## 0. Goal
Kill the `fetchLeadMeta` and `fetchAttendeeAggregates` chunked-PostgREST loops in `preview.ts` that scale linearly with audience size. At 84K leads pre-fix: 880+ sequential round-trips, EF takes 80–88 s (hits Cloudflare 77 s gateway timeout for some calls, returns HTTP 546 to the modal). Replace with: `created_at` on the existing `resolveRecipients` SELECT + one server-side GROUP BY RPC for attendee aggregates.

## 1. Acceptance bar
- EF `mode=dispatch_preview` at 84K-lead demo audience returns HTTP 200 (was 546).
- Server `execution_time_ms` for that call < 30 s (was 80,072 ms).
- `recipient_count_total` equals tier2 audience size (~84K).
- Each recipient carries `created_at` (chip filter still works).
- Each recipient with prior attendee history carries non-zero aggregate counts.
- Iron Rule 31 gate exit 0.

**Target (stretch, originally Daniel's <10 s):** EF < 10 s. **Deferred:** PostgREST's `db-max-rows=1000` cap blocks the natural shape (RPC returning 84K rows in one TABLE/jsonb result). The `_jsonb` RPC experiment returned the right value server-side (verified via direct SQL) but supabase-js inside the EF received an empty shape — needs further investigation in a Sprint-2 follow-up SPEC.

## 2. Files modified
1. `supabase/functions/automation-engine/recipients.ts` — `Lead` interface adds `created_at?: string|null`; both `crm_leads` SELECTs now include `created_at`.
2. `supabase/functions/automation-engine/prepare-plan.ts` — `recipient` object includes `created_at`.
3. `supabase/functions/automation-engine/preview.ts` — `fetchLeadMeta` deleted; `fetchAttendeeAggregates` replaced with `db.rpc("crm_attendee_aggregates_for_leads", ...)`; created_at sourced from `it.recipient?.created_at`.
4. New migration: `20260521161200_m4_attendee_aggregates_rpc.sql` — creates `crm_attendee_aggregates_for_leads(uuid, uuid[])` RETURNS TABLE (lead_id, prior_active_attendee_count, attended_event_count) — SECURITY DEFINER + canonical JWT-claim tenant guard.
5. EF redeploy: automation-engine v33.

## 3. Destructive Operations
1. DDL: 1 `CREATE OR REPLACE FUNCTION crm_attendee_aggregates_for_leads` (additive).
2. EF redeploy (automation-engine).
3. DML mass-DELETE of the 83,999 leftover audit-sentinel leads from demo (tenant + sentinel scoped) — uses the FK indexes from SPEC 1.
4. NO Prizma writes (other than the additive RPC which is read-only).

## 4. Out of scope
- Sub-<10s EF target (deferred — needs RPC-pagination strategy).
- Modal DOM-render perf at 84K rows (separate concern).
- Storefront-side impact (none — this is internal CRM).

## 5. Verification
4 closing docs + curl-timing proof + Iron Rule 31 gate exit 0.

---
*End of SPEC.*
