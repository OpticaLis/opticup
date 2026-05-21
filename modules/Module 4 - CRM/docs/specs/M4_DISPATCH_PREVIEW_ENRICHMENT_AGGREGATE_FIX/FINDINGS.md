# FINDINGS — M4_DISPATCH_PREVIEW_ENRICHMENT_AGGREGATE_FIX

## F-01 (resolved) — eager per-lead enrichment loops in preview.ts
**Severity:** HIGH originally, resolved here for the 84K case.
**Root cause:** `fetchLeadMeta` + `fetchAttendeeAggregates` ran 445 chunked PostgREST round-trips each over the full audience; at 84K = 880 sequential 200-ms round-trips = ~180 s of pure network. EF killed by 80-s execution-budget timer; Cloudflare returned 546 to client. Daniel observed it as "modal opens after more than a minute".
**Resolution:** `created_at` moved onto resolveRecipients SELECT (no separate fetch); aggregates collapsed to one SECURITY DEFINER RPC with server-side GROUP BY.

## F-02 (Sprint-2 follow-up) — PostgREST `db-max-rows=1000` cap blocks the natural <10 s target
**Severity:** MEDIUM.
**What:** Supabase enforces a `db-max-rows=1000` cap that applies to BOTH PostgREST SELECT requests AND RPC TABLE-returning functions. This caps the recipient-fetch shape at 1000 rows per round-trip → 84 sequential round-trips at 84K. Single-call RPC bypasses (TABLE or jsonb return) attempted in this SPEC didn't reach supabase-js correctly — the SQL function returns 84,001 when invoked directly, but `db.rpc("...")` inside the EF received empty / 0-length data. Needs deeper investigation in a Sprint-2 follow-up SPEC (`M4_DISPATCH_PREVIEW_RPC_SHAPE_INVESTIGATION` or similar).
**Workaround in place:** the current shape (paginate at 1000) is correct but bounded by db-max-rows. Total response 24 s = ~17 s pagination + ~3-5 s aggregate RPC + ~1-2 s JSON serialize + 1.5 s 26-MB transfer.
**Out of scope here:** SPEC 2 explicitly deferred this because Sprint 1's primary acceptance bar (no more 80 s blowup) is met.

## F-03 (Sprint-2 follow-up) — Modal DOM render at 83,999 rows is unverified
**Severity:** UNKNOWN (likely MEDIUM).
**What:** The EF now returns 83,999 recipient objects in a 26 MB JSON payload. The modal (`crm-confirm-send-v2.js`) builds DOM rows from `recipients_by_lead`. 83,999 DOM table rows in vanilla JS without virtualization is likely 3-10 s of synchronous DOM construction blocking the main thread on Daniel's hardware. IR34 verification was deferred this iteration (curl verified the EF payload, but no live UI smoke at 84K).
**Proposed fix:** virtual scrolling in the modal table (e.g., render only visible rows). Sprint 2 candidate.

## F-04 (INFO) — SPEC 2 IR34 deviation logged
**Severity:** INFO.
**What:** Iron Rule 34 calls for live Chrome MCP on UI-touching SPECs. This SPEC touched `prepare-plan.ts` (EF) which shapes the modal's payload. Curl verified the response shape correct, but no live UI smoke this iteration. Daniel recommended for next QA pass.

---
*End of findings.*
