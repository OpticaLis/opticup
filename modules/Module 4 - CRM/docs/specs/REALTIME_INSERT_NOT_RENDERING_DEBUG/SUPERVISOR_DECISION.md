# Supervisor Decision — REALTIME_INSERT_NOT_RENDERING_DEBUG

**Date:** 2026-05-03
**Decided by:** Supervisor (opticup-strategic, Cowork session)
**Routed to:** Campaign Overseer → REC-012 → opticup-strategic SPEC author
**Brief reviewed:** `SUPERVISOR_BRIEF.md` (this folder)

---

## Verdict

**Option A — drop the JS-side `tenant_id` filter, rely on RLS for tenant isolation.**

Fall-back plan if A fails: **Option B** (`realtime.broadcast_changes` per-tenant channels).
**Option C alone** is rejected — pure investigation without a fix attempt wastes a working hypothesis we can test in 5 minutes.

---

## Verification (answers the CO's three questions + my own check)

### Direct evidence inspected

`modules/crm/crm-incoming-tab.js` lines 279–286:

```js
_rtChannel = sb.channel('crm_incoming_' + tid)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
      function (payload) { handleIncomingInsert(payload.new, tier1); })
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
      function (payload) { handleIncomingUpdate(payload.new, payload.old, tier1); })
  .subscribe(function (status, err) { ... });
```

**Critical observation the brief missed:** UPDATEs and INSERTs use the **identical filter string**. UPDATE works; INSERT doesn't. So the filter syntax itself is unlikely the root cause — if `'tenant_id=eq.' + tid` were broken for UUIDs, UPDATE would also fail.

**The differentiator is the writer:**
- INSERTs come from `lead-intake` Edge Function via `service_role`.
- UPDATEs come from CRM admin clicks via `authenticated` role.

Combined with the data point that **another lead (Shosh Falik) DID arrive** — also written by `service_role` from the same EF — the picture is: this is **not** a deterministic service-role-vs-Realtime issue, but something more transient (timing, connection buffer, fan-out RLS evaluation under specific conditions, or filter-syntax intermittency on UUID types).

Either way, **Option A removes the most plausible variable** (filter-string evaluation in fan-out) at zero risk.

### Q1 — Is dropping the JS-side `tenant_id` filter acceptable per Iron Rule 22?

**Yes.** The CO's read is correct.

Rule 22 says: *"every `.insert()` / `.upsert()` must include `tenant_id: getTenantId()`. Every `.select()` should also filter `.eq('tenant_id', getTenantId())` even though RLS enforces it. Belt AND suspenders."*

Rule 22 is scoped to WRITES and SELECT queries. A Realtime subscription filter is **not** a security boundary — it's a fan-out optimization that controls how much traffic reaches the WebSocket. **RLS is the security boundary** for Realtime broadcasts (per Supabase's documented model: per-row authorization is checked against the subscriber's role at fan-out time).

**However:** keep a `tenant_id` check IN THE HANDLER as belt-and-suspenders. The handler should still verify `payload.new.tenant_id === getTenantId()` before processing. That preserves Rule 22's spirit (explicit + redundant tenant scoping in client code) without depending on the channel filter for security.

So the SPEC's actual change is: drop the filter from the channel subscription, ADD a tenant_id guard in the handler.

### Q2 — Is `realtime.broadcast_changes` (Option B) the long-term direction?

**Maybe. Not now.**

Option B is more scalable and explicit, but the Optic Up codebase doesn't yet use it anywhere. Adopting it for one feature creates a one-off pattern that future Realtime use will either (a) follow inconsistently or (b) requires retrofitting.

The right time to adopt Option B:
- When postgres_changes shows scaling pain (e.g., bandwidth or CPU on the client) at multi-tenant scale.
- When we add a new Realtime feature and want to set the precedent across the codebase.
- When M4-DEBT-01 (31 untracked migrations) is resolved — adding a trigger now means another untracked migration.

Until then, postgres_changes + RLS is the convention. If A doesn't fix this bug, B becomes the next attempt — but only for this feature first, with an explicit marker that the codebase has dual patterns until a future cleanup SPEC unifies them.

### Q3 — Hidden Option D?

**Effectively no.** Considered:

- **Move the filter into the handler instead of the channel:** that IS Option A. Same outcome.
- **Per-tenant channel name without filter:** Realtime channels with the same `(table, event)` signature share a backend subscription regardless of channel name. So per-tenant naming alone doesn't reduce fan-out traffic. Cosmetic only.
- **Asymmetric: filter on UPDATE only, no filter on INSERT:** odd shape, no architectural justification, harder to reason about. Reject.
- **Polling instead of Realtime:** regression — Realtime IS the feature. Reject.
- **Disable RLS on `crm_leads` and re-enforce with publication filters:** breaks Rule 15 (RLS on every table). Reject.

No Option D worth pursuing.

---

## SPEC scope (for opticup-strategic to author)

### Change

In `modules/crm/crm-incoming-tab.js` lines 279–287:

1. Remove `filter: 'tenant_id=eq.' + tid` from BOTH the INSERT and UPDATE subscriptions.
2. Add a guard at the top of `handleIncomingInsert(payload.new, tier1)` AND `handleIncomingUpdate(payload.new, payload.old, tier1)`:
   ```js
   if (!row || row.tenant_id !== getTenantId()) return;
   ```
3. Update the `[Realtime DEBUG]` log lines to also print `payload.new.tenant_id` so future debugging can correlate.

### Verification (executor's tests)

1. **Smoke test on prizma + demo:** open CRM admin in two browser tabs (one logged into prizma tenant, one into demo). Submit a fresh lead via the lead-intake EF for prizma. Verify:
   - Prizma tab logs `[Realtime DEBUG] INSERT received:` and renders the lead.
   - Demo tab does NOT log the INSERT (or if it does because filter is removed, the handler guard rejects it; verify with a custom debug log line).
2. **Reproduction of the original bug:** repeat Daniel's failure case (form submission via prizma-optic.co.il/supersale/). Confirm the new lead arrives at the CRM admin tab in real-time.
3. **No regression on UPDATEs:** verify that an UPDATE to an existing lead still triggers `handleIncomingUpdate` without filter-side rejection.

### If Option A doesn't fix it (executor stop trigger)

If after the change INSERTs STILL don't arrive, the executor must STOP and escalate to Supervisor with:
- Network DevTools WebSocket frame dump showing the actual broadcast frames received.
- The exact comparison: what's in the frame vs what's not.
- Confirmation that `payload.new.tenant_id` is correctly populated on the frames that DO arrive.

That escalation triggers the Option B SPEC (broadcast_changes trigger pattern).

### Iron Rules to honor

- **Rule 7** (helpers in shared.js — N/A here, this is a client-side subscription).
- **Rule 14 + 15** (tenant_id + RLS — preserved; we're relying on RLS, not weakening it).
- **Rule 22** (defense-in-depth — preserved by adding the handler-side guard).
- **Rule 31** (integrity gate before commit).
- **Rule 9 #7** (executor must NOT merge to main).

### Stop triggers

- After the fix, INSERTs still don't arrive → STOP, escalate (triggers Option B planning).
- Removing the filter causes UPDATEs to break → STOP, this is unexpected; investigate.
- Any other Realtime regression observed during smoke test → STOP, escalate.

### Out of scope

- Refactoring to `realtime.broadcast_changes` (Option B) — only if A fails.
- Any DB migration or trigger creation — pure client-side change.
- Touching other Realtime subscriptions in the codebase — scope strictly to `crm-incoming-tab.js`.
- Performance tuning at multi-tenant scale (revisit when scale demands).

---

## Operational priority

**HIGH — but small effort.**

- Real customer leads aren't appearing in the CRM admin in real-time. Operators have to manually refresh to see incoming leads. Customer experience risk: slower response times to fresh leads.
- Fix is a 1-3-line code change + tests. ~10 minutes of executor work after SPEC is authored.
- NOT cutover-blocking (the CRM admin can still see leads, just with manual refresh).
- Should land before the cutover so post-flip operators have working real-time visibility.

---

## Next step (Campaign Overseer)

1. Log REC-012 in `DECISIONS_LOG.md` referencing this decision file.
2. Author `ACTIVATION_PROMPT.md` for opticup-strategic in this same SPEC folder, with the §SPEC scope above as the brief. Note the SPEC is small (micro-SPEC) — single file edit, 3 verifications, 1 fall-back trigger.
3. Daniel pastes the activation prompt into a fresh Module Strategist session.
4. Module Strategist authors `SPEC.md` + executor `ACTIVATION_PROMPT.md`.
5. Daniel pastes executor prompt into Claude Code (opticup-executor).
6. Standard execution → spot-check by Supervisor → Daniel-only PR merge.
7. Foreman review by Module Strategist closes the SPEC.

If A succeeds (most likely outcome): SPEC closes. If A fails: re-open with Option B as a separate SPEC; this SPEC's FINDINGS.md captures the WS frame evidence.

— Supervisor (opticup-strategic).
