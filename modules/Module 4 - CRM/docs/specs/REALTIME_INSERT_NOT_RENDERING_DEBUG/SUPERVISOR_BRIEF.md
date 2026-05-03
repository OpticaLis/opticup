# Supervisor Brief — Realtime INSERT not received by client

**From:** Campaign Overseer
**To:** Supervisor (Main Strategic Chat)
**Decision needed:** architectural — pick the right fix shape for RLS-on-Realtime broadcast.

## The bug (operational)

REC-012 added Realtime to the "לידים נכנסים" tab. UPDATE events fire correctly. INSERT events DO NOT reach the client.

## What's confirmed

- ✅ `crm_leads` IS in `supabase_realtime` publication.
- ✅ REPLICA IDENTITY FULL.
- ✅ `subscribe status: SUBSCRIBED err: null` (verified in production console).
- ✅ Daniel submitted a real form via `prizma-optic.co.il/supersale/`. Row WAS written to `crm_leads` (verified by direct DB query).
- ❌ But the client console showed ZERO `[Realtime DEBUG] INSERT received:` lines after that submission.
- ✅ A different lead (Shosh Falik) DID arrive via Realtime around the same time, AFTER Daniel did a page refresh.

## Root cause hypothesis

Daniel's lead was inserted by `lead-intake` Edge Function using `service_role` key. The current RLS policy on `crm_leads`:

```
tenant_isolation (cmd: ALL):
  USING: tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid

service_bypass (cmd: ALL):
  USING: true
```

Realtime broadcasts go through the SELECT policy of the **subscribed client's role**, not the writer's role. The CRM admin client subscribes as `authenticated` with a JWT carrying `tenant_id`. The `tenant_isolation` policy reads `request.jwt.claims.tenant_id`.

In Supabase Realtime, the per-row authorization check happens at broadcast-fan-out time. There is a known pattern where:

- INSERTs done by `service_role` carry no JWT context, so the row's broadcast evaluation against the subscriber's RLS uses the subscriber's JWT (correct).
- BUT — Supabase Realtime's RLS-aware filtering for postgres_changes was deprecated/restricted in newer versions; on v2 of the realtime client, only "Broadcast from DB" with explicit `realtime.broadcast_changes` triggers respects RLS, while raw `postgres_changes` requires the subscriber to have direct SELECT permission AND the row to pass the filter at the publication level (which doesn't apply tenant filters).

Two potential issues:
1. **Filter-string syntax:** the JS subscribe uses `filter: 'tenant_id=eq.' + tid`. PostgREST-style filter strings on Realtime are restricted to specific operators and certain column types. UUID columns may not work with this syntax in all client versions.
2. **service_role insertion path:** the EF inserts using service role → broadcast goes out → but the subscriber's `tenant_isolation` policy may evaluate FALSE during broadcast because the row check uses the subscriber's JWT context which is fine, BUT the row's `tenant_id` is correct, so this SHOULD work.

The Shosh Falik lead WAS received, suggesting the wiring CAN work but is intermittent — possibly:
- A bug in the JS filter string for some leads but not others.
- Burst/throughput limits in the Supabase Realtime free tier (we're on what plan?).
- A connection state issue where some inserts arrive in the buffer and others don't.

## Three options

### Option A — Drop the JS-side filter, rely on RLS only
Remove `filter: 'tenant_id=eq.' + tid` from the subscribe. Let the subscription receive ALL `crm_leads` INSERTs across all tenants. The RLS policy will block rows from other tenants (the client never sees them, blocked at fan-out). The handler does its own client-side check on `tenant_id`.
- ✅ Simplest. Zero migration. 1-line code change.
- ✅ Removes the filter-string-syntax-on-UUID hypothesis entirely.
- ⚠️ Increases Realtime traffic to the client (every tenant's INSERTs flow through the WS, RLS then blocks). With 1166 leads and rare INSERTs (<10/min today), the bandwidth impact is negligible. Becomes meaningful at scale (10+ tenants, each high-volume).
- ⚠️ Trusts RLS to block cross-tenant. Already tested + audited.

### Option B — Switch to `realtime.broadcast_changes` trigger pattern
Add a Postgres trigger on `crm_leads` that explicitly broadcasts via `realtime.broadcast_changes()` to a per-tenant channel name (e.g., `crm_leads_<tenant_uuid>`). Client subscribes to that exact channel — no RLS-on-broadcast complexity.
- ✅ Future-proof for scale.
- ✅ Explicit per-tenant fan-out, zero cross-tenant traffic.
- ⚠️ New migration (counts toward M4-DEBT-01).
- ⚠️ More moving parts. Trigger could fail silently.
- ⚠️ Different subscribe API on the client (Broadcast channels not Postgres Changes).

### Option C — Investigate the actual cause first
Ask the executor to add MORE detailed logging:
- WS frame inspection in DevTools Network → look for the actual frame containing Daniel's INSERT.
- Compare exactly what's different between Daniel's lead (didn't arrive) and Shosh Falik (did arrive).
- Check `supabase.realtime.connection.conn` state.
- Check whether the channel-side filter regex matches the actual `tenant_id` value.

Then choose A or B based on findings.

## Overseer recommends: Option A (start there, fall back to B if it doesn't work)

A is reversible (1-line revert), takes 5 minutes, and tests the simplest hypothesis (filter-string-on-UUID). If A fixes it → ship + document. If A doesn't fix it → we've learned the filter wasn't the issue, and B becomes the answer.

C alone takes hours and produces no fix yet. Better to try A first, then escalate to C/B if it fails.

## Three questions for the Supervisor

1. Is dropping the JS-side `tenant_id` filter on a Realtime subscription acceptable per Iron Rule 22 (defense-in-depth)? My read: yes, because RLS is the defense, and adding a filter on a subscription is a performance optimization not a security boundary. But you may see a deeper concern.
2. Is the `realtime.broadcast_changes` pattern (Option B) the long-term direction, even if A works for now?
3. Is there an Option D I missed? E.g., something Optic-Up-conventional that fits the existing architecture better?

## What happens next

- **If Option A:** I author a 1-line micro-SPEC; opticup-strategic + executor handle in 10 min.
- **If Option B:** SPEC is bigger (trigger + migration + client refactor); 1-2 hour SPEC.
- **If Option C:** Re-author Phase 2 of the existing DEBUG SPEC with deeper logging.
- **If Option D:** You describe; I re-author.

Awaiting your call.
