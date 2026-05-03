# Supervisor Decision — BROADCAST_1000_CAP_FIX

**Date:** 2026-05-03
**Decided by:** Supervisor (opticup-strategic, Cowork session)
**Routed to:** Campaign Overseer → REC-010 → opticup-strategic SPEC author
**Brief reviewed:** `SUPERVISOR_BRIEF.md` (this folder)

---

## Verdict

**Option A, with one refinement.**

Refactor the existing `fetchAll(tableName, filters)` in `js/supabase-ops.js` to extract its pagination loop into a new builder-agnostic helper `paginateQuery(queryBuilder, pageSize=1000)`. Then have the 7 resolvers in `modules/crm/crm-automation-recipient-resolvers.js` (plus the manual-broadcast path, once located) call `paginateQuery` directly with their own query builders.

This is **NOT** "use existing fetchAll as-is" — that doesn't fit, see §Verification — and it's **NOT** "add a parallel new helper" — that creates Rule 21 tension. It's a single pagination engine with two entry points: high-level (`fetchAll(table, filters)`) and low-level (`paginateQuery(builder)`).

---

## Verification (answers the CO's three questions)

### Q1 — Does shared.js already have a paginating fetch helper?

**Yes, partly.** Verified by direct read of `js/supabase-ops.js` lines 33–62. `fetchAll(tableName, filters)` already paginates correctly:

```js
async function fetchAll(tableName, filters) {
  const PAGE = 1000;
  let all = [], from = 0;
  while (true) {
    let query = sb.from(tableName).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
    if (tid) query = query.eq('tenant_id', tid);
    // ...apply tuple-based filters...
    query = query.range(from, from + PAGE - 1);
    const { data, error } = await query;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all.map(enrichRow);
}
```

But it's hardcoded for **table-with-simple-filters + enrichRow**. The 7 CRM resolvers need:
- Custom `.select()` shapes (PostgREST join syntax like `crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)`)
- Filter operators not in the tuple list (`.is('unsubscribed_at', null)`, post-fetch JS filtering)
- No `enrichRow` (irrelevant for CRM leads/attendees — that's inventory-specific lookup)

So existing `fetchAll` **cannot be reused as-is**. Generalizing it (parameter sprawl, optional callbacks, conditional `enrichRow`) breaks every existing caller. The cleaner refactor: extract the pagination loop into its own helper that accepts an arbitrary builder, then have `fetchAll` call it internally.

The CO's suspicion was correct on instinct — Rule 21 IS in play here — but the existing helper doesn't fit the resolver shape. The refactor satisfies Rule 21 by collapsing two would-be pagination implementations into one.

### Q2 — Are recipient resolvers a place where we want RPCs long-term?

**No, not for this case.** Reasoning:

1. **Rule 7 doesn't mandate RPCs.** It says "DB interactions pass through helpers... never `sb.from()` directly except for specialized joins." A paginating helper satisfies Rule 7 without moving logic to Postgres.
2. **Rule 11 is about atomic correctness** (sequential number generation with `FOR UPDATE` locks) — not a general read-path convention. Recipient resolution is a read; no concurrency hazard.
3. **Project convention favors client-side dispatch logic.** The existing resolvers compose multiple queries, filter in JS, return enriched rows. Moving to RPCs means rewriting them in PL/pgSQL with stricter semantics — net negative for maintainability and debuggability.
4. **M4-DEBT-01 (31 MCP-applied migrations not in git) is an active blocker.** Adding new RPCs now piles new migration debt on top of un-audited existing debt. Tech-debt principle: pay down before adding more. The post-cutover SPEC for M4-DEBT-01 must land before any new RPC migrations are introduced for non-critical features.
5. **Bigger security surface.** RPCs require RLS-aware functions OR `SECURITY DEFINER` with explicit tenant checks (Rule 22). Each new RPC is a new security review surface. The pagination helper has zero new security surface.

The right time to revisit RPCs for recipient resolution: post-launch, if/when the system reaches 50K+ leads and client-side pagination latency begins hurting operator experience. Not now.

### Q3 — Is there a hidden Option D?

**No.** Considered:

- **Async iterator / streaming:** PostgREST doesn't expose this natively. Would require custom WebSocket/Realtime abstraction. Not an Optic Up convention.
- **Single-call view:** Views are read-through to underlying tables; the 1000-row cap is enforced at the PostgREST gateway regardless of source. Doesn't help.
- **Edge Function for resolution:** Adds latency, deployment overhead, and an EF redeploy cycle every time a resolver shape changes. Unjustified for read paths.
- **Batched parallel queries:** Doesn't solve the cap; just splits one capped query into multiple capped queries.

`paginateQuery` is the right shape.

---

## SPEC scope (for opticup-strategic to author)

The SPEC must cover:

### 1. Refactor `js/supabase-ops.js` (NO behavior change to existing callers)

- Extract the pagination loop from `fetchAll(tableName, filters)` into a new helper `paginateQuery(queryBuilder, pageSize=1000)`.
- `fetchAll` becomes a thin wrapper: builds its query (table select + tuple filters + tenant_id), then delegates to `paginateQuery` for the cursor loop, then maps through `enrichRow`.
- All existing `fetchAll(...)` call sites continue to work bit-identical — verified by side-by-side diff of return values on a smoke-test table.

### 2. Apply `paginateQuery` to the 7 resolvers in `modules/crm/crm-automation-recipient-resolvers.js`

Lines 53 (tier2 cluster), 75 (attendees cluster), 94 (attendees_with_active_coupon), 109 (cross_event_active_waitlist) — each gets its existing query builder wrapped in `paginateQuery(...)`. Line 38 (`trigger_lead`) is single-row — skip.

### 3. Locate + fix the manual-broadcast path

CO didn't verify location. **Step 1 of the SPEC is to grep** the codebase (likely `crm-confirm-send.js` or similar) for the broadcast handler, then apply the same `paginateQuery` wrapping. If the broadcast uses a different mechanism (RPC, edge function, etc.), document the deviation in `FINDINGS.md`.

### 4. Test on >1000-row dataset

- Either: locate or seed a demo tenant with >1000 leads.
- Or: temporarily seed prizma demo with synthetic leads (then clean up).
- Confirm a "send to all leads" broadcast resolves to ALL leads, not 1000.
- Confirm a tier2 event-invite resolves to ALL eligible leads.

### 5. No new migrations, no DB changes

Pure JS refactor. Keeps the SPEC out of M4-DEBT-01 territory.

### 6. Iron Rules to honor

- **Rule 7** (API abstraction — `paginateQuery` is THE pagination helper going forward).
- **Rule 21** (no orphan — single pagination engine; `fetchAll` becomes a thin wrapper).
- **Rule 22** (defense-in-depth — query builders already include `tenant_id` filter; helper is agnostic, doesn't strip it).
- **Rule 31** (integrity gate before every commit).
- **Rule 9 #7** (executor must NOT merge to main; PR + Daniel one-click only).

### 7. Stop triggers

- Manual-broadcast code can't be located by Step 1 grep → halt + escalate to Supervisor.
- The refactored `fetchAll` changes behavior on any existing caller (regression risk) → halt.
- Test on >1000-row dataset returns capped result → halt; the fix is wrong.
- Any change required outside `js/supabase-ops.js` and `modules/crm/*` → halt + escalate (scope creep).

### 8. Out of scope

- Moving any resolver to an RPC (revisit post-launch if scale demands).
- M4-DEBT-01 work (separate post-cutover SPEC).
- Any UI changes; this is purely a fetch-layer fix.
- Touching the inventory `enrichRow` lookup logic.
- Renaming or repositioning `fetchAll` — only its internals change.

---

## Operational priority

**HIGH — not cutover-blocking, but customer-impacting today.**

- Manual broadcast in CRM admin currently drops 166 leads per send on Prizma. Real customer message loss happening now.
- Event-open invites: each future event launch silently misses 166 eligible invitees.
- Coupon dispatch + waitlist invite: future-leak today (no event has 1000+ attendees), but will surface as the platform grows.
- The fix can ship in parallel with the cutover roadmap (Phase 2 decisions + Phase 3 migration don't depend on it).
- **Land it before the next event open after cutover.** That's the operational deadline.

---

## Next step (Campaign Overseer)

1. Log REC-010 in `DECISIONS_LOG.md` referencing this decision file.
2. Author `ACTIVATION_PROMPT.md` for opticup-strategic in this same SPEC folder, with the §SPEC scope above as the brief.
3. Daniel pastes the activation prompt into a fresh Module Strategist session.
4. Module Strategist authors `SPEC.md` + an executor `ACTIVATION_PROMPT.md` per the folder-per-SPEC protocol.
5. Daniel pastes the executor prompt into Claude Code (opticup-executor).
6. Standard execution → spot-check by Supervisor → Daniel-only PR merge.
7. Foreman review by Module Strategist closes the SPEC.

— Supervisor (opticup-strategic).
