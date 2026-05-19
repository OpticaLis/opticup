# FOREMAN_REVIEW — M4_ENQUEUE_REGRESSION_FIX

**Foreman closing:** 2026-05-19.
**Commits:** `1909450` + retros (next commit).
**Status:** 🟢 SPEC CLOSED. Brief §4 verification ALL GREEN.

## 1. What this SPEC accomplished

Closed a P0 regression that surfaced after SPECs 3 + 4 landed: every event-status-change message was being silently lost after the first send. Root cause was a permanent partial-unique-index that blocked cross-run re-sends, combined with a silent error-catch in `dispatch.ts` that prevented operator visibility.

The fix has THREE layers of robustness:
1. **Schema** — partial unique index now uses `run_id` instead of `event_id`. Per-run idempotency preserved (cron double-tick can't double-insert within one run); cross-run sends now work.
2. **EF code** — `dispatch.ts` now writes per-row `crm_message_log status='failed'` entries on INSERT failure. Future regressions of this class are structurally impossible to hide.
3. **UI** — queue-live now shows date+time so operators can disambiguate rows from different days.

## 2. Lineage

- QA report 2026-05-18: Finding 1.2 (silent message drop) — original surface.
- SPEC 3 (this morning): closed Finding 1.2's resolver gap, but the per-event-permanent constraint surfaced underneath.
- Brief authored by Architect post-3-SPEC chain when Daniel observed the regression in operator workflow.
- This SPEC: investigation in ~10 min (DB + code + manual INSERT), fix authored + applied in ~10 min, verification end-to-end in ~10 min.

## 3. Verification matrix (Brief §4)

8/8 ✅ — see EXECUTION_REPORT.md §"Verification matrix". Both Daniel-required toggles produced new `crm_message_log status='sent'` rows with no errors.

## 4. Skill-harvest proposals

### Author tier (opticup-strategic)

**A-1 — "Side-effect ledger" for SPEC verifications.** SPEC 3's verification at 05:33Z inserted persistent queue rows that became blockers for later tests. The opticup-strategic SPEC template should include a "verification side effects" section that captures any persistent state created by the verification (rows inserted, status changes, etc.) so future operators know to clean up before re-testing.

**A-2 — Multi-SPEC interaction surface.** SPECs 3 + 4 each verified independently. The interaction (resolver gap fixed → execution reaches queue → constraint surfaces) was a third-order effect neither could catch alone. Recommend that any SPEC closing a CRITICAL finding gets a 24-hour soak-test window before declaring done, AND that the verification covers the next layer (here: queue insert) not just the gate the SPEC fixed.

### Executor tier (opticup-executor)

**E-1 — `console.error` audit on every EF touch.** When editing an EF, search for all `console.error` calls in the file + adjacent files. Verify each one has a corresponding DB write that makes the error visible to operators. If not, propose a defense-in-depth log-row fallback. This SPEC's `dispatch.ts:62-65` was a textbook example of an invisible-failure surface that should have been caught earlier.

**E-2 — Manual replay before chasing code.** The fastest investigation step was "INSERT a row with the exact shape dispatch.ts produces, see what DB says." 30 seconds, perfect diagnosis. Should be the FIRST step in any "data is silently disappearing" investigation, not just `git diff` the EF source.

## 5. Open follow-ups

- F-4 (`crm_automation_runs.sent_count` undercount) — already deferred to `M4_AUTOMATION_RUNS_METRIC_AUDIT` (Priority 5 from QA report).
- M4_STATUS_CHANGE_ATOMIC_GATE — atomic-gate piece of SPEC 4 still deferred.
- M4_DUAL_PATH_DEPRECATION_PHASE_1 — browser fire-and-forget removal still deferred.
- `M4_CONFIG_SYNC_SCRIPT_REGRESSION_TEST` — from SPEC 1's findings.
- `SENTINEL_MISSION_11_IMPL` — from SPEC 1's scope.

## 6. Rollback

Per SPEC §5:
- DB: re-apply old index shape via a new migration.
- EF: redeploy old `dispatch.ts` (from `_archive/m4-overnight-2026-05-18/ef-snapshots/` if needed, OR git revert).
- UI: `git revert` of the queue-live.js commit.

Rollback time: ~10 minutes if needed.

## 7. Outcome statement

🟢 SPEC sealed. Regression closed end-to-end with three layers of defense (schema, EF, UI). Both required toggles produce visible `sent` rows. The pattern of "silent dispatch failure" is now structurally impossible at the queue insert layer.
