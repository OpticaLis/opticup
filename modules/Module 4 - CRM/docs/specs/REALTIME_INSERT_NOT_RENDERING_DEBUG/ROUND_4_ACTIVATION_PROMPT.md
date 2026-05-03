You are working in `C:\Users\User\opticup`. The user is Daniel.

This is **Round 4** — the FINAL round of the existing SPEC `REALTIME_INSERT_NOT_RENDERING_DEBUG`. We're cutting losses on Realtime and shipping polling.

**Context (4 rounds, 4 hours, 2 regressions):**
- Round 0 (REC-012): postgres_changes + filter — INSERTs don't fire callback in production.
- Round 1 (REC-013): drop UUID filter — regression, reverted.
- Round 2 (REC-014): Realtime as cache-invalidation trigger — pre-flight failed (handler never fires).
- Round 3 (REC-015): broadcast_changes Postgres trigger + per-tenant channel — production WORSE: even `subscribe SUBSCRIBED` log no longer appears.

**Round 4 verdict (Supervisor, see `SUPERVISOR_DECISION_ROUND_4.md`):** Cut losses. Ship polling (Option E). Revert Round 3. Defer Realtime to post-cutover tech-debt.

## Clean-repo discipline (non-negotiable)

- **At session start:** First Action Protocol per CLAUDE.md §1. Working tree must be clean. Stash any pre-existing WIP if present.
- **At session end:** `git status` must show "working tree clean". Pop the stash AFTER push.

## Two sub-scopes — same SPEC folder, single commit

### Sub-SPEC A — Revert Round 3 (broadcast_changes trigger + client subscription)

**A.1 — Migration revert (NEW migration, NOT git-revert of original):**

Create a new migration file in `supabase/migrations/` (timestamp now). Drops the trigger + function added in Round 3. Original migration file stays — git history is sacred. New migration:

```sql
-- Revert Round 3: drop crm_leads broadcast_insert trigger + function.
-- Original migration: 20260503180000_realtime_crm_leads_broadcast_insert.sql.
-- Reverted because Round 3 caused a regression in client subscription
-- (subscribe SUBSCRIBED log disappeared from console after Round 3 deploy).
-- Falling back to polling per Supervisor Round 4 decision.

DROP TRIGGER IF EXISTS crm_leads_broadcast_insert_trigger ON public.crm_leads;
DROP FUNCTION IF EXISTS public.crm_leads_broadcast_insert();
```

**A.2 — Client-side: remove broadcast subscription cleanly:**

In `modules/crm/crm-incoming-tab.js`:
- Remove the `.on('broadcast', { event: 'INSERT' }, ...)` handler block from the channel chain.
- Remove the `crm_leads_<tenant_uuid>` channel name; rename channel to a generic name like `crm_incoming_updates`.
- KEEP the existing `postgres_changes UPDATE` subscription as-is (it works, don't break it).
- Keep `reloadIncomingFromRealtime()` helper — Sub-SPEC B reuses it from polling.

### Sub-SPEC B — Implement polling (Option E)

In `modules/crm/crm-incoming-tab.js`:

```js
var _pollIntervalId = null;
var POLL_INTERVAL_MS = 30000; // 30 seconds — Supervisor-set default

function startPolling() {
  if (_pollIntervalId) return;
  _pollIntervalId = setInterval(function () {
    console.log('[Polling] refresh fired');
    reloadIncomingFromRealtime(null, null); // null highlightId = no flash, just refresh
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (_pollIntervalId) {
    clearInterval(_pollIntervalId);
    _pollIntervalId = null;
  }
}
```

Wiring:
- Call `startPolling()` in `loadCrmIncomingTab()` AFTER initial fetch completes.
- Call `stopPolling()` in any tab-leave handler + `window.addEventListener('beforeunload', stopPolling)`.
- Polling reuses existing `reloadIncomingFromRealtime()` helper from Round 2/3 (already calls `loadIncomingLeads(true)` + `applyIncomingFilters()`).

## Iron Rules

- **Rule 7** (helpers — `loadIncomingLeads` already canonical).
- **Rule 12** (file-size — change is small, well under 350).
- **Rule 14/15** (RLS preserved through `loadIncomingLeads`).
- **Rule 21** (revert migration is a NEW migration file, never delete the original).
- **Rule 22** (defense-in-depth — polling inherits existing tenant_id filter on `loadIncomingLeads`).
- **Rule 31** (integrity gate before commit).
- **Rule 9 #7** (no merge to main).

## Acceptance criteria (manual QA)

1. **PRIMARY:** Open Incoming tab. Submit a fresh lead via `prizma-optic.co.il/supersale/`. Within 30 seconds the new lead appears, no F5. Console shows `[Polling] refresh fired` lines firing every 30s.
2. **No UI flicker:** During the polling refresh, the table doesn't visibly flash, scroll position is preserved, active filters preserved, search box value preserved.
3. **UPDATE regression:** Status change on existing lead → list updates within ~30s (or immediately if UPDATE postgres_changes still works in this code path).
4. **Tab-leave hygiene:** Switch to "רשומים" tab → console-log `[Polling] refresh fired` lines stop. Switch back → resume.
5. **Page-leave hygiene:** Close the tab → no leaked intervals.
6. **DB verification:** `SELECT tgname FROM pg_trigger WHERE tgrelid='public.crm_leads'::regclass;` returns NO `crm_leads_broadcast_insert_trigger` row (revert successful). The migration is tracked in git (`git log --oneline supabase/migrations/ | head -3` shows the revert as recent commit).
7. **Cross-tenant safety:** RLS on `loadIncomingLeads` already prevents cross-tenant leaks (confirmed in earlier rounds).

## Optional 10-minute diagnostics for the post-cutover tech-debt entry

If executor has time AFTER the polling implementation passes acceptance criteria, capture (NOT required, just helpful for post-cutover work):

- **F (`realtime.messages` inspection):** Run `SELECT topic, event, inserted_at FROM realtime.messages WHERE topic LIKE 'crm_leads_%' ORDER BY inserted_at DESC LIMIT 10;` BEFORE the revert migration runs. Save output to `evidence_realtime_messages_pre_revert.txt` in the SPEC folder.
- **D' (try/catch capture):** Capture last seen `[Realtime] subscribe status:` log timestamp from production console history (if accessible) — confirms when subscription stopped working.

If executor doesn't have time, skip — the post-cutover SPEC will start fresh with these as Step 1.

## Stop triggers

- Revert migration fails or breaks other migration ordering → halt + escalate.
- Removing the broadcast subscription accidentally breaks the still-working UPDATE subscription → halt.
- Polling causes UI flicker / scroll loss / filter loss → halt; fix UX before close.
- Executor "discovers" a new Realtime fix mid-execution and wants to try it → HALT. Strategic call is made. Ship E.

## Stage 1 — opticup-strategic authors the SPEC update

1. Switch to `opticup-strategic` skill.
2. Verify SPEC folder. Append §R4 to existing SPEC.md (Round 4 implementation), or write SPEC_ROUND_4.md if cleaner.
3. Author the revert migration .sql in the proper migrations folder.
4. Hand off to executor.

## Stage 2 — opticup-executor

1. Switch to `opticup-executor` skill.
2. First Action Protocol — clean repo + integrity gate.
3. Apply revert migration via Supabase MCP `apply_migration`.
4. Implement Sub-SPEC A (remove broadcast subscription) + Sub-SPEC B (add polling) in `crm-incoming-tab.js`.
5. Test on localhost: open Incoming tab, submit form via storefront, verify lead appears in ≤30s.
6. Single commit: `feat(crm): polling fallback for incoming-leads tab; revert Round-3 broadcast trigger`. Push to `origin/develop`.
7. Append closure to EXECUTION_REPORT.md (Round 4 section).
8. Optionally capture 10-min diagnostics for post-cutover tech-debt (see above).
9. End-of-session: clean repo, no untracked drift.

## Tech-debt entry to be opened by Overseer post-merge

Slug: `REALTIME_INSERT_INVESTIGATION_POST_CUTOVER` (or similar — Foreman picks canonical name during FOREMAN_REVIEW).

Will capture: 4-round history, hypotheses, diagnostic checklist (F + D' + signature verification), acceptance criteria for restoration attempt.

## Lessons logged for next Supervisor SKILL revision

1. Always include "polling" as baseline option for sync problems — even when boring.
2. Set rounds budget upfront (e.g., "2 rounds, 2 hours, then fall back to boring") for any architectural fix that may iterate.
3. Pre-flight diagnostic gate from Round 2 should be standard SPEC-template item for any architectural fix that depends on a non-trivial assumption.

## References

- Phase 1 SPEC + diagnostics: this folder
- Round 1 (Option A — REVERTED): `SUPERVISOR_DECISION.md`
- Round 2 (Option D — pre-flight failed): `SUPERVISOR_DECISION_ROUND_2.md` (if exists)
- Round 3 (Option B — broke worse): `SUPERVISOR_DECISION_ROUND_3.md` (if exists)
- Round 4 (Option E — current): `SUPERVISOR_DECISION_ROUND_4.md`
- Overseer recommendation: REC-016 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
