# SPEC — M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS

> **Authored:** 2026-05-21 — Sprint 2 Item 1 of 4.
> **Predecessor diagnosis:** `M4_MESSAGE_PERFORMANCE_INVESTIGATION_2026_05_21.md`.
> **Closes Sprint-1 leftover:** the `<10 s` dispatch-preview target (F-02 in `M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX/FINDINGS.md`).
> **Tenant:** demo for live verification + load test, Prizma read-only for RPC correctness probe.

## 0. Goal
Two outcomes from one architectural pattern:
1. **Message-performance screen:** swap the `v_crm_message_performance` client read for a jsonb-scalar RPC that returns per-template rollup + per-event drill-down + first/last_sent dates in ONE round-trip. Adds date columns, expandable per-event rows, and bolds the discriminating slug segment (`_open_` vs `_confirmation_`) to prevent the visual-confusion bug that triggered the 2026-05-21 investigation.
2. **Dispatch-preview EF:** apply the same jsonb-scalar RPC pattern to `resolveRecipients`'s tier2 branch in `recipients.ts`. Drops the 84-round-trip paginated SELECT to one RPC. Target: modal opens in <10 s at audience scale.

## 1. Acceptance bar
- `crm_message_performance_summary(p_tenant_id)` RPC live; SQL-truth cross-check passes for Prizma's known counts.
- Screen renders per-template summary as default, with expand caret → drill-down sub-rows.
- Screen shows "נשלח ראשון" + "נשלח אחרון" columns populated.
- Discriminating slug segment (`open`, `confirmation`, `delivery`, …) bolded; family prefix + channel suffix muted.
- `dispatch_preview` EF call at 10K-lead demo audience returns 200 in **< 10 s**.
- Live Chrome MCP measurement (in-browser fetch via `sb.functions.invoke`) confirms < 10 s.
- Demo restored to pre-SPEC baseline (28 leads) at close.
- Iron Rule 31 gate exit 0.

## 2. Files modified
- New migration: `supabase/migrations/20260521190000_m4_message_performance_summary_rpc.sql`
- `modules/crm/crm-messaging-performance.js` — full rewrite of `loadPerformance` + `renderTable` to consume the new RPC, render two-level table with expand/collapse, bold slug discriminator, format date columns.
- `supabase/functions/automation-engine/recipients.ts` — tier2 branch swapped to `db.rpc("crm_resolve_tier2_leads_jsonb", ...)` with defensive shape-handling (Array / JSON-string / object-wrapped). Belt-and-suspenders paginate fallback if RPC returns empty (so a future schema or PostgREST quirk can't silently undercount).
- Automation-engine EF redeploy.

## 3. Destructive Operations
1. DDL: 1 `CREATE OR REPLACE FUNCTION` (additive).
2. EF redeploy (automation-engine).
3. DML mass-INSERT of 10,000 sentinel-marked load-test leads on DEMO (`utm_campaign='M4_SPRINT2_LOAD_TEST_2026_05_21'`, phones `0500001000+i`, emails `@demo.opticalis.test`).
4. DML mass-DELETE of those same sentinel leads at close (tenant + sentinel scoped; uses SPEC-1 FK indexes for speed).
5. NO Prizma writes.

## 4. Out of scope
- Modal DOM render at >50K rows (the EF is fast now; UI virtual scrolling is a separate Sprint-3 candidate if Daniel observes freezes).
- Storefront-side impact (none — internal CRM).

## 5. Verification approach
- SQL-truth probe: RPC for Prizma returns 14 per_template rows + 22 per_event rows (matches the diagnosis count).
- SQL-truth probe: per_template for `event_registration_open_sms_he` returns total=2,326, first_sent=2026-05-12, last_sent=2026-05-21 (matches the diagnosis truth).
- Chrome MCP: navigate to Messaging Center → ביצועי הודעות; verify table has 11 columns including the two date columns + expand caret column; verify bold-slug discriminator renders; click first row → drill-down expands.
- Chrome MCP: in-browser `sb.functions.invoke('automation-engine', {body: { mode:'dispatch_preview', ... }})` returns < 10 s at 10K-lead load.
- Final baseline confirm: demo back to 28 leads.

---
*End of SPEC.*
