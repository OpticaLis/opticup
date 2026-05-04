# Supervisor Decision (Round 3) — REALTIME_INSERT_NOT_RENDERING_DEBUG

**Date:** 2026-05-03 (later same day)
**Decided by:** Supervisor (opticup-strategic, Cowork session)
**Round 1 verdict:** Option A (drop filter). FAILED + regression. Reverted.
**Round 2 verdict:** Option D (Realtime as trigger), conditional on Step 1 diagnostic gate.
**Round 2 outcome:** Diagnostic gate FAILED. INSERT callback confirmed not firing. Option D unviable.
**Round 3 verdict:** **Option B approved.** Trigger + `realtime.broadcast_changes` per-tenant channel.

---

## What the Round 2 gate proved

The diagnostic confirmed `subscribe SUBSCRIBED` succeeds, but `INSERT callback ENTRY` log never fires after a real form submission writes to the DB. Combined with the row being verifiable in `crm_leads` via direct SQL, this isolates the failure to the Realtime broadcast layer — not the client subscription, not the filter, not the handler.

The most likely root cause (per the Round 1 brief and the CO's confirmation): `lead-intake` EF writes via `service_role`, and `postgres_changes` doesn't reliably broadcast service_role-originated INSERTs to subscribers under the current Supabase Realtime semantics. The exact mechanism (RLS evaluation timing, publication filtering, or service_role bypass) is academic — the practical outcome is that `postgres_changes` cannot be the transport for these events.

**The Round 2 gate paid for itself.** Without it, we'd have shipped Option D and had a Round 3 regression. Codify this as a permanent executor practice: never ship a fix dependent on assumption X without first verifying X.

---

## Verdict: Option B with scoped constraints

**Approve `realtime.broadcast_changes` trigger pattern.** Replace the current INSERT subscription's transport, leave the UPDATE subscription untouched (postgres_changes UPDATEs work; don't fix what isn't broken).

---

## Constraints the SPEC must enforce

### 1. The migration MUST be tracked in git from commit zero

This is the Iron Rule 21 / M4-DEBT-01 discipline. The 31 existing untracked MCP-applied migrations are tech debt to be cleaned up post-cutover. **Do NOT add to that pile.** The new migration file lives in `supabase/migrations/` (or wherever the project tracks them — the SPEC author verifies the canonical path) and is committed to git in the same PR as the client code change.

If the executor finds that the project has no git-tracked migrations directory yet (because of M4-DEBT-01), the SPEC must STOP and escalate — that's a structural prerequisite, not something to bypass.

### 2. Trigger scope: INSERT only on `crm_leads`, broadcasting to a per-tenant channel

- Trigger function fires AFTER INSERT on `crm_leads`.
- Calls `realtime.broadcast_changes()` (or whatever the current Supabase API name is — verify in supabase docs).
- Channel name: `crm_leads:tenant_${NEW.tenant_id}` (or similar — pick one and document the convention).
- Payload includes the new row (or at minimum its `id` so the client can refetch if it prefers Option-D-style reload).

### 3. Client subscription: per-tenant channel by exact name

- Client subscribes to `crm_leads:tenant_${getTenantId()}`.
- The channel name itself enforces tenant scoping — no cross-tenant broadcast leakage by construction (no Realtime-side tenant filter to misbehave).
- Handler does what Round 2 Option D wanted: trigger a full reload of the leads list, OR insert the new row into in-memory state. Either is fine; pick the simpler one. Default: full reload (Option D pattern).

### 4. Don't touch the UPDATE subscription

Postgres_changes UPDATEs work today. Leave them alone. UPDATEs from authenticated role pass RLS evaluation cleanly and reach the client. Mixing transports for INSERT (broadcast) and UPDATE (postgres_changes) is the deliberate, documented choice. Add a comment in the file explaining this so future maintainers don't "unify" the patterns and break things.

### 5. Iron-Rule compliance

- **Rule 7** (helpers): channel subscribe is the existing `sb.channel(...)` API — no new shape, just a different channel name + listener. The reload-on-event continues to use `fetchAll` (or whatever the existing leads loader uses).
- **Rule 14** (tenant_id on every table): `crm_leads` already has it. Trigger reads `NEW.tenant_id`. No schema change.
- **Rule 15** (RLS): RLS on `crm_leads` is unchanged. The trigger runs as `SECURITY DEFINER` (or however `realtime.broadcast_changes` is invoked) — verify no privilege escalation surface.
- **Rule 21** (no orphan): if there's any older trigger or function on `crm_leads` that does similar broadcasting, find + remove or extend rather than duplicate.
- **Rule 22** (defense-in-depth): handler-side `tenant_id` check still required (channel name is per-tenant, but client guards remain a safety net).
- **Rule 31** (integrity gate): runs at every commit boundary.
- **Rule 9 #7**: executor opens PR; Daniel-only merge.

### 6. Stop triggers

- **Project's git-tracked migrations directory doesn't exist or is in unclear state:** STOP. Don't invent one. Escalate — this overlaps with M4-DEBT-01 prerequisite work.
- **Existing trigger or function with similar broadcast purpose found on `crm_leads`:** STOP. Resolve the duplication first per Rule 21.
- **Smoke test fails after migration + client change:** STOP, escalate. Don't patch on top of a broken trigger.
- **Any UPDATE regression observed during smoke test:** STOP. UPDATEs are sacred — they work today.
- **`realtime.broadcast_changes` API name or signature has changed in the project's Supabase version:** STOP, verify with current Supabase docs, escalate if the pattern itself has been deprecated.

### 7. Out of scope

- Migrating other tables (e.g., `crm_event_attendees`) to broadcast triggers. Only `crm_leads` here.
- Cleaning up M4-DEBT-01's existing 31 untracked migrations. Separate post-cutover SPEC.
- Refactoring `lead-intake` EF to use authenticated role instead of service_role. Out of scope, would touch many surfaces.
- Changing the UPDATE handler — UPDATEs work via postgres_changes; do not touch.

---

## Acknowledgment

The CO's conduct across all three rounds was clean: brief → decision → execute → measure → escalate honestly when fix failed → propose better alternative (with Daniel's input) → diagnostic gate → confirm → approval. Three rounds with one failure cycle and one revert is acceptable when the underlying bug has unclear semantics; the discipline is what kept it from being more.

**Real lesson for the project's Realtime playbook:** any Realtime feature where the writer is `service_role` (Edge Function, RPC, trigger-side INSERT) must use `realtime.broadcast_changes` from the start, not `postgres_changes`. Add this to a Realtime-pattern reference doc in `docs/CONVENTIONS.md` (or wherever Optic Up's pattern docs live) when this SPEC closes.

---

## Operational priority

**HIGH — same as prior rounds. Now finally on the right track.**

- Customer leads still don't appear in real-time. Operators manual-refresh.
- Larger SPEC than originally hoped (migration + trigger + client change), but bounded.
- NOT cutover-blocking (manual refresh is the workaround).
- Should land before cutover so post-flip operations have working real-time visibility.

---

## Next step (Campaign Overseer)

1. Update REC-012 in `DECISIONS_LOG.md` — note R1 failed, R2 gate failed (correctly), R3 verdict logged here.
2. Author `ACTIVATION_PROMPT_ROUND_3.md` for opticup-strategic in this SPEC folder. Include the §Constraints above as the binding scope.
3. Daniel pastes activation prompt → fresh Module Strategist session.
4. Module Strategist authors revised SPEC (likely a continuation of the existing folder, not a new slug — same problem, third attempt with fundamentally different approach).
5. Module Strategist's SPEC should explicitly address: which migrations directory does this project use? Is it git-tracked? If neither — STOP at SPEC authoring, escalate before code work begins.
6. Daniel pastes executor prompt into Claude Code.
7. Standard execution → spot-check by Supervisor → Daniel-only PR merge.
8. Foreman review captures the full three-round arc and the convention proposal for `docs/CONVENTIONS.md`.

— Supervisor (opticup-strategic).
