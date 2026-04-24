# FINDINGS — OVERNIGHT_M4_SCALE_AND_UI

---

## F1 — event-register EF deployed with `verify_jwt=true` (regression from source) — HIGH

**Severity:** HIGH
**Location:** `supabase/functions/event-register/index.ts` line 9 comment
says "verify_jwt=false (public form)"; current deployed version 9 has
`verify_jwt: true`.
**Description:** Public form registrations (unauthenticated browser
submissions) need `verify_jwt=false` to reach the function body. With
the flag flipped to true, storefront form submissions will fail with
401 before touching the handler. User reported "event-register deployed
successfully earlier by Daniel" — the CLI deploy didn't preserve the
intended flag.
**Repro:** `curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/event-register -H "Content-Type: application/json" --data '{"tenant_id":"...","lead_id":"...","event_id":"..."}'` without Authorization header → expect 401.
**Suggested fix:** During morning handoff, redeploy event-register with
`supabase functions deploy event-register --no-verify-jwt`. Included in
the 3-command morning handoff.

---

## F2 — send-message EF MCP deploy infra failure (5th consecutive SPEC) — HIGH

**Severity:** HIGH (infra)
**Location:** `mcp__claude_ai_Supabase__deploy_edge_function` for
send-message. Event-register hits the same failure.
**Description:** Fifth SPEC in a row where MCP returns
`InternalServerErrorException: Function deploy failed due to an
internal error` for send-message (and in previous SPECs for
event-register). All other EFs (retry-failed, dispatch-queue) deploy
cleanly on first try. The pattern suggests something specific to these
two EFs — maybe a Supabase CLI-vs-MCP codepath divergence, maybe
artifact caching on the deploy server.
**Workaround:** Manual CLI deploy. Included in morning handoff (§10).
**Suggested long-term:** Open a ticket with Supabase support listing
project_ref + function slugs + timestamps of the failures.

---

## F3 — Engine auto-routing to queue not wired (SPEC §6.3 partial) — INFO

**Severity:** INFO (design decision, not a bug)
**Location:** `modules/crm/crm-automation-engine.js:evaluate()` still
direct-dispatches via `dispatchPlanDirect` or the modal's approveAndSend.
The queue helper `CrmAutomationRuns.enqueuePlan` is exported but
unused by the engine.
**Description:** The SPEC §6.3 criterion says "evaluate enqueues to
queue instead of Promise.all-ing to send-message". Fully wiring this
would replace the immediate dispatch with a queue INSERT, losing the
synchronous user-feedback loop in the modal approval path
(user clicks Send, messages go into a queue, nothing visible for up to
60 seconds). This UX regression needs an explicit product decision.
**Design options for Daniel:**
- (a) Small batches (<20 items) stay direct; larger enqueue. Needs a
  threshold decision.
- (b) All modal dispatches stay direct; only non-interactive
  automations (future: server-side triggers) use the queue.
- (c) Per-tenant or per-rule `use_queue` flag in action_config.
**Suggested:** (b) — queue is infrastructure ready; modal UX unchanged.
Future rules (e.g., time-delayed reminders) opt in by setting
`action_config.use_queue: true` + having the engine read it. Low-risk.

---

## F4 — leads-tab filter/sort still client-side on loaded slice — MEDIUM

**Severity:** MEDIUM
**Location:** `modules/crm/crm-leads-tab.js` + `crm-lead-filters.js`
+ sort dropdown.
**Description:** Phase 10 introduced server-side .range() pagination
with a 200-row initial fetch. But search/filter/sort still operate on
the loaded slice only. At high tenant counts (20K+ leads) users can
scroll filter results that miss rows not yet loaded.
**Impact at 20K leads:** Initial load is fast (<500ms for 200 rows).
Scrolling to find a specific lead works if "Load more" is clicked.
Filtering by status "unsubscribed" might show 0 results until more
slices are loaded.
**Suggested fix:** Migrate search/filter to the server query:
- `q.or('full_name.ilike.%X%,phone.ilike.%X%,email.ilike.%X%')`
- `q.in('status', [...])`
- `q.order(column, { ascending: dir })`
Scope: ~40 lines change across crm-leads-tab.js + crm-lead-filters.js.
Follow-up SPEC.

---

## F5 — No backpressure in crm_message_queue — INFO

**Severity:** INFO
**Location:** `crm_message_queue` + dispatch-queue EF.
**Description:** The queue accepts unlimited queued rows per tenant.
A misbehaving automation could enqueue tens of thousands of rows in
a single call. The allowlist will reject most, but the DB still
stores the rows, cron still ticks, and processing-count climbs.
**Suggested fix:** Soft cap per tenant: `COUNT(*) WHERE tenant_id=X
AND status IN ('queued','processing') > 10_000` → reject enqueue
with "queue_full". Add to CrmAutomationRuns.enqueuePlan. Not urgent
for overnight — no misbehaving automations exist yet.

---

## F6 — dispatch-queue claim race is best-effort — LOW

**Severity:** LOW
**Location:** `supabase/functions/dispatch-queue/index.ts`.
**Description:** Claim uses SELECT-then-UPDATE across 2 round-trips
with `.eq('status','queued')` on the UPDATE. If two cron ticks ever
overlap (they shouldn't with 1-per-minute), the second tick could
SELECT rows the first hasn't yet flipped, attempt to flip, and see
updRes.data.length=0 for the already-claimed ones — handled by the
`claimedIds` set. Not a correctness issue, but idiomatic PostgreSQL
would use `SELECT ... FOR UPDATE SKIP LOCKED` or a single CTE. The
current approach is correct-enough at 1 concurrent worker.
**Suggested fix:** If we ever run dispatch-queue from multiple
workers concurrently, move the claim to an RPC using
`SELECT ... FOR UPDATE SKIP LOCKED`. Not needed for current scale.

---

## F7 — dispatch-queue's verify_jwt=false allows anyone to invoke — LOW

**Severity:** LOW (design)
**Location:** `supabase/functions/dispatch-queue/index.ts` deploy
flag `verify_jwt: false`.
**Description:** Required for pg_cron via net.http_post (no JWT in
that path). Consequence: anyone on the internet can POST to this EF
and trigger a queue drain. The drain only sends rows already in the
queue, so this is not a privilege escalation — but it could be
abused for cost/quota attacks. Mitigation: the EF doesn't accept
input that controls what gets sent; it only drains already-authorized
queue rows.
**Suggested fix:** Add a shared-secret header the pg_cron call
includes; EF rejects without it. Low priority — public invocation
doesn't send unauthorized messages.

---

## F8 — Test events + old leads still on demo — LOW (cleanup)

**Severity:** LOW
**Location:** `crm_events` on demo tenant.
**Description:** Demo has events #1 (P5.5 Demo) through #10+ (WLDF_QA,
POST_WL_FIXES_QA, etc.). Many are QA artifacts from recent SPECs.
Cluttering but not blocking. One-liner cleanup:
```sql
UPDATE crm_events SET is_deleted=true
 WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND (name LIKE '%QA%' OR name LIKE '%TEST%');
```
**Suggested:** Daniel runs when he wants the demo list clean.
