# Supervisor Decision (Round 4) — REALTIME_INSERT_NOT_RENDERING_DEBUG

**Date:** 2026-05-03 (later same day)
**Decided by:** Supervisor (opticup-strategic, Cowork session)
**Round 0 (REC-012):** postgres_changes + filter. INSERTs don't fire callback in production.
**Round 1 (REC-013, Option A):** drop JS-side filter. Regression. Reverted.
**Round 2 (REC-014, Option D):** Realtime as cache-invalidation. Pre-flight gate FAILED — handler never fires.
**Round 3 (REC-015, Option B):** broadcast_changes trigger + per-tenant channel. Implementation passed all 22 SPEC criteria in test, but PRODUCTION REGRESSED FURTHER — `subscribe status: SUBSCRIBED` no longer appears in console (the subscription itself broke).
**Round 4 verdict:** **Cut losses on Realtime. Ship Option E (polling) now. Revert Round 3 changes. Defer Realtime restoration to post-cutover tech debt.**

---

## The honest read of where we are

We've spent ~4 hours, three rounds, two regressions, and we're WORSE OFF than before Round 0 — production now lacks even the "subscribe SUBSCRIBED" baseline. The remaining theories (broadcast_changes API signature mismatch, JS error swallowing, trigger not actually broadcasting, etc.) are all *plausible*, but each requires another investigation cycle, and **we are days from cutover**. Continuing to debug Realtime under cutover pressure is the wrong trade.

The CO's meta-question is the right one to surface: "Should we give up on Realtime for now and switch to polling?" My answer: **yes, immediately.**

**Why polling is the right answer right now:**
- It satisfies Daniel's stated strategic goal ("perfect end-to-end before final cutover") — polling delivers end-to-end correctness with at most 30-second latency. Customer experience is unchanged. Operator UX is "see new lead within 30s instead of instantly."
- 1166 leads × 1 lightweight query per 30s = trivial server load. Far below any Supabase tier limit.
- ~10 lines of code, ~30 minutes of executor work, fully reversible.
- Zero new architectural complexity, zero new migrations.
- Unblocks Daniel TODAY. Frees attention for the actual cutover.

**Why continuing to debug Realtime is the wrong trade RIGHT NOW:**
- Each round of "try a fix → verify in production → discover new failure" has cost roughly an hour. We can't afford another round under cutover pressure.
- The diagnostic burden is unbounded — `realtime.messages` inspection, Supabase API version checks, trigger introspection, client JS error trapping. Each is a reasonable experiment, but they compound.
- The bug surface clearly involves the interaction of three things (service_role write semantics, broadcast_changes API correctness, client subscribe lifecycle) and we don't fully understand any of them. That's not a 5-minute diagnostic; that's a real investigation.

---

## Verdict: Option E (polling), with cleanup + a permanent tech-debt item

### Step 1 — Revert Round 3 changes (broadcast_changes trigger + client broadcast subscription)

The Round 3 implementation is making things worse. Specifically:
- The migration that added the trigger + function: roll back via a new revert migration in the same `supabase/migrations/` directory (don't `git revert` the migration file itself — leave the audit trail; add a new migration that drops the trigger + function). This preserves git-tracking discipline (no orphan migrations).
- The client-side change to subscribe to `crm_leads_<uuid>` broadcast channel: revert to whatever was before — but DO NOT restore the Round-0 postgres_changes INSERT subscription either (it didn't work). Just remove the broken broadcast subscription cleanly. UPDATE subscription on postgres_changes stays untouched (still works).

### Step 2 — Implement Option E (polling)

In `modules/crm/crm-incoming-tab.js` (or wherever the leads-loading happens):
- Add a `setInterval` that calls the existing `loadIncomingLeads()` (or whatever the current loader is) every 30 seconds.
- Clear the interval on tab navigation away (`clearInterval`) to prevent accumulation.
- Add a single console log line: `[Polling] refresh fired` for verifiability.
- Keep the existing UPDATE postgres_changes subscription if it still works — UPDATE point-updates remain real-time (avoids unnecessary regression).

### Step 3 — Tech-debt item: Realtime restoration (post-cutover)

Create a new tech-debt entry, slug `REALTIME_INSERT_INVESTIGATION_POST_CUTOVER` (or similar — let CO/Foreman pick the canonical name). The entry must capture, in detail:
- The Round 0–3 history (what was tried, what failed, what evidence we have).
- The known-uncertain hypotheses (service_role-bypass, broadcast_changes API drift, client subscribe lifecycle).
- The diagnostic checklist (CO's F: `realtime.messages` inspection; D': try/catch + logs around startRealtime; verify broadcast_changes signature against project's actual Supabase version).
- The acceptance criterion: when Realtime restoration is attempted, at least the SUBSCRIBE log MUST appear; if it doesn't, the work has gone backwards from baseline.
- A test plan that exercises both `service_role` writes and `authenticated` writes to confirm both pathways broadcast correctly.

This entry sits in the project's tech-debt register and is picked up post-cutover when there's time to debug without operational pressure.

### Why we don't run F or D' first (CO's recommendation)

CO recommended F → D' → E. The hierarchy is logically sound but operationally wrong given the cutover deadline.

- **F (`realtime.messages` inspection):** valuable evidence, but the answer doesn't change the immediate decision. If the trigger IS broadcasting, the bug is client-side. If it ISN'T, the bug is migration-side. Either way, polling is the unblocking move; F's data feeds the post-cutover SPEC, not Round 4's fix.
- **D' (try/catch + logs around startRealtime):** valuable for understanding why the SUBSCRIBE log disappeared in R3. But again — the answer doesn't change "ship polling now." It feeds the post-cutover SPEC.
- **E (polling):** independent of F and D', unblocks Daniel.

The right sequencing: ship E, then OPTIONALLY run F + D' as ~10-minute diagnostic captures BEFORE the executor closes the SPEC, so the post-cutover tech-debt entry has real evidence rather than a wishlist of investigations. If executor has time, do them. If not, the tech-debt entry can include them as the first post-cutover steps.

---

## Iron Rules to honor

- **Rule 7** (helpers): polling uses the existing `loadIncomingLeads()` function which already goes through `fetchAll` (or equivalent shared helper). Compliant.
- **Rule 14 + 15** (tenant_id + RLS): polling fetches via the existing tenant-scoped query path. Preserved.
- **Rule 21** (no orphan / no duplicates): the revert migration that drops the Round-3 trigger MUST be a new migration file, properly tracked in git. Don't delete the original migration file — that's git history and we don't rewrite it.
- **Rule 22** (defense-in-depth): polling already inherits the same tenant_id checks the existing loader has.
- **Rule 31** (integrity gate before commit).
- **Rule 9 #7** (Daniel-only merge to main).

---

## Stop triggers for the Round 4 SPEC

- The revert migration fails or causes other migration breakage → STOP, escalate. Migration discipline is sacred even when reverting.
- The polling adds noticeable UI flicker / scroll-position loss / filter loss / login-state issue → STOP, fix UX before close.
- A different real-time mechanism is "discovered" mid-execution and the executor wants to try it instead → STOP. We've made the strategic call; one bird in hand.
- Removing the Round-3 broadcast subscription accidentally breaks the still-working UPDATE postgres_changes subscription → STOP, fix.

---

## Out of scope for Round 4

- Diagnosing WHY Round 3 broke. Capture as evidence in tech-debt entry; don't chase it now.
- Restoring any Realtime mechanism. That's the post-cutover tech-debt SPEC.
- Adjusting the polling interval beyond 30s. 30s is the agreed default; tune later if operators complain.
- Adding optimistic-UI patterns (insert-then-confirm). Out of scope; if wanted, separate UX SPEC.
- Investigating the underlying Supabase Realtime + service_role behavior at the platform level. Vendor concern; document in tech-debt entry.

---

## Lessons (Supervisor self-improvements)

### 1. Surface the "boring fallback" earlier in option enumeration

Polling was a viable option from Round 0. I never surfaced it because the discussion centered on "fix Realtime architecturally." For any feature where the user-facing behavior is "see fresh data without manual refresh," polling is a baseline option that should be enumerated alongside the architectural fixes — and prioritized when the architectural path keeps producing regressions.

Codify into the option-enumeration discipline: when listing options A/B/C/D for a sync problem, always include "polling" as a baseline. Even if it's the boring answer, listing it makes the cost/benefit comparison honest.

### 2. Set a "rounds budget" before starting any architectural fix

We did 3 rounds without a pre-set ceiling. Each round felt like incremental progress; in aggregate, 4 hours got us further from working code. Codify: when starting an architectural fix that may need multiple iterations, declare upfront "if this isn't working after N rounds or T hours, we cut to the boring fallback." Forces the cut-loss decision before sunk cost compounds.

For this kind of bug under cutover pressure: 2 rounds + 2 hours, max. After that, fall back.

### 3. The Round 2 gate was the right shape; we should reuse it

The diagnostic gate in Round 2 (add a console.log before the handler logic, verify the assumption before shipping the fix) was the correct discipline. We applied it once. We should apply it to EVERY architectural-fix SPEC that depends on a non-trivial assumption. Codify into the SPEC template.

These three lessons go into the next Supervisor SKILL revision.

---

## Operational priority

**HIGH — same as prior rounds, but the framing has shifted from "fix Realtime" to "unblock operator UX before cutover."**

- 30-minute work to ship polling.
- Independent of cutover roadmap; can land any time before/after Phase 2/3 work.
- Best to land BEFORE cutover so post-flip operators don't re-encounter the F5 problem.

---

## Next step (Campaign Overseer)

1. Update REC-012 (and the satellite REC-013/014/015 that fed it) in `DECISIONS_LOG.md` — close the chain with this R4 verdict.
2. Author `ACTIVATION_PROMPT_ROUND_4.md`. Two SPEC scopes in the same SPEC folder (continuation of the existing REALTIME_INSERT_NOT_RENDERING_DEBUG slug):
   - **Sub-SPEC A:** revert Round 3 (new revert migration + remove the broadcast client subscription).
   - **Sub-SPEC B:** implement polling (Option E).
3. Daniel pastes activation prompt → fresh Module Strategist session.
4. Module Strategist authors revised SPEC reflecting both sub-scopes, OR keeps two separate sub-folder SPECs. Their call.
5. Daniel pastes executor prompt into Claude Code.
6. Standard execution → spot-check by Supervisor → Daniel-only PR merge.
7. CO opens the post-cutover tech-debt entry `REALTIME_INSERT_INVESTIGATION_POST_CUTOVER` and seeds it with evidence from R0–R3.
8. Foreman review captures the four-round arc + the three Supervisor self-improvement lessons + pushes them to the next SKILL revision.

— Supervisor (opticup-strategic).
