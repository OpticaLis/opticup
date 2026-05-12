# Supervisor Brief — Broadcast 1000-Recipient Cap

**From:** Campaign Overseer (Cowork session, 2026-05-03)
**To:** Supervisor (opticup-strategic / Architect)
**Decision needed:** architectural — pick the right fix shape, then author the SPEC.

## The bug (operational impact)

Every recipient query in the CRM that doesn't paginate is silently capped at 1000 rows by Supabase's PostgREST default. With Prizma now at 1166 active leads, this means:

- **Manual broadcast "send to all leads"** → 166 leads silently dropped per send.
- **Event-open invites (tier2 / leads_by_status resolver)** → same 166-lead drop on every event launch.
- **Coupon dispatch on event day (attendees_with_active_coupon)** → safe today (no event has 1000+ attendees), but a future-leak.
- **Cross-event waitlist invites (cross_event_active_waitlist)** → same future-leak.

This is not a one-off. It's a structural defect that grows with the tenant.

## Where the bug lives (Overseer-verified)

`modules/crm/crm-automation-recipient-resolvers.js` — **7 recipient resolvers, none paginated**:

| Line | Resolver | Risk today |
|---|---|---|
| 38 | `trigger_lead` (single lead) | none — `.eq('id', leadId)` |
| 53 | `tier2` / `tier2_excl_registered` / `leads_by_status` | **active — 166-lead drop** |
| 75 | `attendees` / `attendees_waiting` / `attendees_all_statuses` | future-leak |
| 94 | `attendees_with_active_coupon` | future-leak |
| 109 | `cross_event_active_waitlist` | future-leak |

Plus the manual-broadcast path (separate code, same root cause — to be re-verified).

## Iron Rules in scope

- **Rule 7 (API Abstraction):** all DB I/O goes through `shared.js` helpers (`fetchAll`, `batchCreate`, etc.). The resolvers currently use `sb.from()` directly — likely a Rule 7 violation already.
- **Rule 21 (No Orphans, No Duplicates):** before adding a paginating helper, check whether `shared.js` already has one. The Overseer suspects it does (the rule's mention of `fetchAll` is suggestive) — confirm before designing.
- **Rule 22 (Defense-in-depth):** any new paginating fetch must keep `tenant_id` filtering on every page.
- **Rule 14 / 15:** RLS already enforces tenant isolation; the helper just needs to respect it.

## Three options I see (Overseer's read — not authoritative)

### Option A — One paginating helper, applied at every resolver
Write `fetchAllPaginated(query, pageSize=1000)` in `shared.js` (or use existing `fetchAll` if present). Replace each of the 7 raw queries with a call to it. Rule 7 finally satisfied across this file.
- ✅ Single fix point, single test.
- ✅ Future resolvers inherit safety automatically if they use the helper.
- ⚠️ Requires changes in 7 places + a helper. Larger diff.
- ⚠️ Each resolver returns `crm_leads(...)` joins differently — helper needs to accept an arbitrary query builder, not assume shape.

### Option B — Server-side aggregation via RPC
Move recipient resolution into Postgres RPCs (`get_recipients_tier2`, `get_recipients_attendees_with_coupon`, etc.). RPCs return all rows, no PostgREST cap. Client just calls the RPC.
- ✅ Eliminates the cap entirely (RPCs aren't subject to it).
- ✅ Cleaner separation: business logic in DB, dispatch logic in JS.
- ✅ Follows the project's existing pattern (Rule 11 — sequential numbers via RPC).
- ⚠️ Bigger architectural change. Means new migrations (and these would land in the project's already-broken migration tracking, see M4-DEBT-01).
- ⚠️ Rule 7 says shared.js helpers; an RPC isn't a helper.
- ⚠️ Need RLS-aware functions or `SECURITY DEFINER` with explicit tenant check.

### Option C — Increase the page size on the Supabase REST defaults
Raise PostgREST `db-max-rows` from 1000 to e.g. 50000 globally. No code changes.
- ✅ Zero code work.
- ❌ Doesn't scale — at 50K leads we have the same bug, just delayed.
- ❌ Affects every other read in the project, including UI screens that don't expect 50K rows.
- ❌ Doesn't satisfy Rule 7.
- **Probably not the right answer, but listed for completeness.**

## What the Overseer recommends

**Option A** (one helper, applied 7 places). It's the smallest change that fixes the problem permanently, and it nudges the file toward Rule 7 compliance without forcing a full RPC migration.

But this is exactly the kind of decision where the Supervisor sees architectural angles I miss. **Three questions for you:**

1. Does `shared.js` already have a paginating fetch helper? (Rule 21 — must know before designing.)
2. Are recipient resolvers a place where we *want* RPCs long-term (Option B), or is keeping them client-side better for the project's current direction?
3. Is there a hidden Option D — for example, a streaming pattern, an async iterator, or a single-call view — that fits Optic Up's conventions better?

## What happens after your call

- **If Option A:** I write REC-010 → ACTIVATION_PROMPT for opticup-strategic to author the SPEC → opticup-executor implements.
- **If Option B:** Same flow, but the SPEC is bigger (migration + RPC + client refactor) and probably gates on M4-DEBT-01 being addressed first.
- **If Option D:** You describe it and I'll re-author REC-010 around it.

## Operational note

This is **HIGH priority** — every event invite Daniel sends today drops 166 leads silently. He noticed it on the manual broadcast; he hasn't yet noticed it on automated invites because no event has been opened post-cutover. The next event open is the moment this becomes visible.

Awaiting your call.
