# M4 dispatch_preview regression at 89K leads — diagnosis

> **Authored:** 2026-05-21 (post-audit, post-Daniel-repro).
> **Mode:** DIAGNOSE ONLY. No code changes this run. Fix folds into Sprint 1 (or its own SPEC).
> **Severity:** **HIGH** — single biggest 100K-readiness blocker; demoted SPEC A's "operator-confirm safety brake" from "fast modal" → "modal times out".

## 1. Symptom (Daniel's live repro)

Localhost demo, with the ~89K audit leftover synthetic leads still present (status='waiting'):
- Click event → "שנה סטטוס" → "הרשמה פתוחה".
- Confirmation/send modal takes **>60 seconds** to open. Screen is responsive but waiting.

This is a regression vs SPEC A's reported "1.2 s at 1,210 leads".

## 2. Reproduced via curl + EF logs (measured, not inferred)

| Probe | Value |
|---|---|
| `curl POST /functions/v1/automation-engine` `mode=dispatch_preview` at 89K-lead tier2 audience | **HTTP 546** (Supabase `WORKER_RESOURCE_LIMIT`) |
| Curl `TIME_STARTTRANSFER` | **77.2 s** (Cloudflare gateway timeout) |
| EF `execution_time_ms` in logs for this run | **80,072 ms** (server actually ran 80 s before its own timeout kicked in) |
| Response body | `{"code":"WORKER_RESOURCE_LIMIT","message":"Function failed due to not having enough compute resources (please check logs)"}` |

**Daniel's >60-second wait = exactly this.** The client (supabase-js) sees the gateway return 546, falls into the error path, and `probeAndCommit` would normally Toast.error and abort. If the modal "opens" in his repro it's likely the LOADING-state shell from `crm-confirm-send-v2.js` that renders immediately + then either flips to error OR remains stuck on the spinner — depending on which exact code path the 546 takes through supabase-js.

## 3. Where the 80 seconds go (code trace)

`supabase/functions/automation-engine/preview.ts → previewDispatch()` at 89K-lead audience:

```
Step                                                    | Approx cost @89K
--------------------------------------------------------|------------------
1. load rules (4 lines, 1 SELECT)                        | ~10 ms
2. createRun (1 INSERT)                                  | ~30 ms
3. for each rule: prepareRulePlan(skipBodyComposition=t) | 
   └─ resolveRecipients (paginate 1000/page)             | ~18 s (89 PostgREST roundtrips)
   └─ push plan items (in-memory, 89K iterations)        | ~1 s
4. group by lead → byLead Map                            | ~1 s
5. fetchLeadMeta(leadIds) — chunked CHUNK=200            | ~89 s (445 chunks × ~200 ms each, sequential)
   ↑ THE HEADLINE BOTTLENECK
6. fetchAttendeeAggregates(leadIds) — chunked CHUNK=200  | ~30-60 s if it gets here (445 chunks, may be cut off by EF timeout)
   ↑ SECOND BOTTLENECK
7. sort + return                                         | ~0.5 s
```

**At ~80 s the EF runtime kills the worker. Steps 5+6 alone account for the budget.**

## 4. Why SPEC A's lazy-rows fix did NOT prevent this

SPEC A's fix made **message BODIES** lazy (each body materialized only on operator click). The headline win was "no 26 MB / 76 s eager body composition" — that's still true. **But the per-lead METADATA (`created_at`, `prior_active_attendee_count`, `attended_event_count`) is still eagerly fetched for EVERY lead via the per-recipient enrichment loops.**

For a 1,210-lead audience the enrichments are ~7 PostgREST chunks total. Fast.
For an 89K-lead audience: 445+445 = 890 PostgREST round-trips, sequential. **>2.5 minutes of pure network if it could complete.** EF kills it at 80 s.

This is the architectural sibling of the dispatch-preview hang we already fixed — same class of bug, different loop.

## 5. Fix shapes (small → architectural)

### A. Smallest fix (sized for one Pipeline run) — collapse the enrichments
1. **Kill `fetchLeadMeta` entirely.** Add `created_at` to the `recipients.ts → resolveRecipients` SELECT — it's already fetching every matching lead and is already paginated. No second pass needed. **Saves all ~89 s.**
2. **Replace `fetchAttendeeAggregates` with one server-side aggregate.** Single SQL via RPC `SELECT lead_id, count(*) FILTER (WHERE status='attended') AS attended, count(*) FILTER (WHERE status IN (active_set)) AS active FROM crm_event_attendees WHERE tenant_id=$1 AND lead_id = ANY($2) AND is_deleted=false GROUP BY lead_id`. **1 round-trip vs 445.** Saves ~89 s of the worst case.

**Combined: 80 s → ~5-10 s for a 89K-lead preview. Still slow but inside the EF execution budget and below the 30 s Cloudflare gateway timeout.**

Risk: LOW. Both changes are pure-additive code-shape with identical observable behavior at small scale. At 89K scale, the result is faster + correct.

### B. Architectural fix (sized for one larger SPEC) — lazy LIST too
Match the original SPEC A `summary-mode` design that Daniel had rejected in favor of the lazy-rows design. At 89K-scale, the FULL list IS too expensive to load by default. The default modal response:
- counts (total + by-channel)
- sample 5 recipients
- chip-driver aggregates (3 numbers: in-last-30d count, no-prior-reg count, customers count)

Operator opt-in: "Show full list" button triggers a second EF call that streams pages of recipients (e.g., 500 per page with virtual scrolling in the modal).

**This is the right architecture for 100K+. Sprint 2 or 3 territory.**

### C. Combined recommendation
- **Sprint 1 emergency fix: A** (collapse enrichments). Daniel can dispatch on 89K audience without a 60s wait or 546 error. Modal opens in ~5-10 s.
- **Sprint 2 architectural fix: B** (lazy list). Modal opens in <2 s regardless of audience size.

## 6. Relationship to the audit findings

This regression is **not** Finding #1 (FK indexes). FK indexes affect lead deletion/merge, not the preview path.

This regression is the **delayed-consequence** of SPEC A's framing decision: the lazy-rows design saved bodies but left enrichments eager. The audit's Part B perf measurements I ran earlier MISSED this because they used the dashboard load path (different queries) and the EF dispatch_preview was not directly measured under 100K-audience load — that's a methodology gap in my audit which I'll document.

## 7. Recommended SPEC scope (proposed)

**SPEC name:** `M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX`

**Files modified (4):**
- `supabase/functions/automation-engine/preview.ts` — delete `fetchLeadMeta` + `fetchAttendeeAggregates` functions, replace their call sites with the consolidated patterns below.
- `supabase/functions/automation-engine/recipients.ts` — add `created_at` to the `crm_leads` SELECT in `resolveRecipients`.
- 1 new migration: `CREATE FUNCTION crm_attendee_aggregates_for_leads(p_tenant_id uuid, p_lead_ids uuid[]) RETURNS TABLE (lead_id uuid, attended int, active int)` — SECURITY DEFINER + canonical JWT-claim header.
- Re-deploy automation-engine.

**Acceptance bar at 89K-lead demo:**
- Curl `POST mode=dispatch_preview` returns 200 (not 546) in <15 s.
- Response payload still carries `recipients_by_lead[]` with `created_at` populated (since it now rides on resolveRecipients) + chip-driver fields populated from the new aggregate.
- Lazy per-row body fetch (SPEC A's `preview_recipient_body` mode) still works unchanged.
- Cancel-path / confirm-path safety unchanged (SPEC A's brake still in place).

**Load test required:** repro Daniel's exact steps under 89K-lead demo audience. The audit's leftover 89K leads serve as the existing test bed.

---

*End of regression diagnosis.*
