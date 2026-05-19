# SPEC — M4_REPAIR_FINAL_2026_05_19

**Authored by:** opticup-strategic (Foreman role).
**Date:** 2026-05-19.
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_REPAIR_FINAL_2026_05_19_BRIEF.md` (sealed by Architect ~10:50 IL).
**Pipeline mode:** Full-Auto with mandatory live verification (Brief §2.2).
**Priority:** P0 — production blocker.
**Tenants:** demo only. Prizma 100% read-only.

---

## 0. Critical Customer Outcome

Daniel needs to open a Prizma event TOMORROW (2026-05-20). Today's main merge of SPEC 5 (`M4_DUAL_PATH_DEPRECATION_PHASE_1`) broke the event-status messaging entirely: ZERO modal opens, ZERO messages sent. This SPEC restores working messaging end-to-end and verifies live on localhost before declaring closed.

---

## 1. Live Reproduction (Brief §1.1)

Confirmed at 2026-05-19 07:51Z via Chrome MCP on `localhost:3000/crm.html?t=demo`:

1. Installed instrumentation (`window.__modalTrace`, hooked `Modal.show`, `CrmAutomationClient.evaluate`, `CrmEventActions.changeEventStatus`).
2. Invoked `CrmEventActions.changeEventStatus('a027610e...', 'registration_open')` (event #28, planning → registration_open).
3. Result:
   - `changeEventStatus.in` fired, DB UPDATE succeeded (`status: 'registration_open'` returned).
   - **ZERO `Modal.show` events.**
   - **ZERO `CrmAutomationClient.evaluate` events.**
   - 0 modals visible in DOM.
4. `cron.consume_status_change_events` confirmed missing from `cron.job` (Daniel unscheduled at ~10:40 IL).

Evidence: `_archive/m4-repair-final-2026-05-19/verification/repro_broken_trace.json` + `02_broken_no_modal.png`.

**Conclusion:** Bug confirmed. SPEC 5 removed the only path that opens the modal AND fires browser-side rule evaluation. Combined with cron being off, the entire status-change → message pipeline is dead.

---

## 2. Foreman Decision — Path A (Rollback)

**Reasons:**
1. **Production deadline.** Daniel needs Prizma working tomorrow. Safer path wins.
2. **Brief estimate:** Path A 30-45 min, Path B 2-4 hr with architectural risk (needs new "approval-signaled" queue flag + AE EF redeploy + careful loop testing).
3. **Path A preserves all working SPECs 1-4 + regression fix.** Only SPEC 5 reverts.
4. **Customers getting duplicate messages << customers getting NO messages.** Dual-path duplicates are a known acceptable issue per QA Finding 1.4.
5. **Path B is a proper future SPEC** for when Daniel can verify step-by-step live, not under time pressure.

---

## 3. Steps

### 3.1 Pre-flight (executed 2026-05-19T07:51Z)

- Brief read. Smoke 7/7 implicitly green (recent verification on commit 8d9a365).
- Live reproduction on Chrome MCP confirms broken state.
- 11 backlog `crm_status_change_events` rows from morning SPEC 5 toggles inspected.

### 3.2 Skip the test-data SCE backlog

Mark 11 pending `crm_status_change_events` rows (from SPEC 5 benchmark toggles earlier today) as `consumed_at = NOW()` to prevent the rescheduled cron from immediately draining them and firing ~4 sets of SMS+Email to Daniel's allow-listed phone. Audit-log integrity preserved (rows not deleted; column doc supports manual consumption marker — "consumed_at IS NULL = pending; NOT NULL = processed").

### 3.3 Revert SPEC 5 commits

`git revert --no-commit 38e0fe2 8d9a365` (Activation/Brief order: newest first). This restores:
- `modules/crm/crm-event-actions.js`: `dispatchEventStatusMessages` helper + caller line.
- `modules/crm/crm-lead-actions.js`: `fireLeadStatusAutomation` helper + 2 callers.
- `modules/crm/crm-automation-engine.js`: legacy header comment ("both paths in parallel for now").
- Deletes: `tests/smoke/dual-path-deprecation-test.mjs`, SPEC 5 retro docs, SPEC 5 EF snapshots + heartbeat + latency benchmark, MORNING_SUMMARY's "Final closure 2026-05-19/20" section.

### 3.4 Re-enable consume_status_change_events cron

Verbatim copy from `supabase/migrations/20260513025544_consume_status_change_events_cron.sql` via `SELECT cron.schedule('consume_status_change_events', '* * * * *', ...)`. Confirmed: jobid 11, active=true.

### 3.5 Author this SPEC + commit revert + push develop

Commits:
- This commit (the revert + SPEC.md): blocked initially by destructive-ops gate; gate satisfied once SPEC.md §4 declares all 24 file deletions explicitly.
- Push develop to origin.

### 3.6 Live verification (Brief §2.2 — 6 checks)

Per Brief §2.2:
1. Chrome MCP on `localhost:3000/crm.html?t=demo`, instrumentation installed.
2. Toggle event #28 `planning → registration_open` via UI (or `changeEventStatus` if dropdown not findable).
3. Modal "אישור פעולה" must OPEN and STAY OPEN.
4. Modal shows ≥1 recipient (lead 01269ab9 status=waiting on demo).
5. Click "אישור". Within 90s: 1 run from confirm-path + 2 `crm_message_log status='sent'` (sms+email).
6. ZERO `rejected` rows; track derivative SCEs for 5 min (loop test).

**Important: Path A accepts dual-path** — the cron consumer will ALSO produce a separate run (background) for the same status change. Total: 2 runs + 4 sent rows is the expected steady-state behavior, NOT 1+2. The Brief's "exactly 1 run" was Path B framing.

### 3.7 Save evidence

All 5 mandatory artifacts (per Brief §6) saved to `_archive/m4-repair-final-2026-05-19/verification/`:
- Modal-open screenshot.
- Modal-confirm-clicked screenshot.
- Console output dumping `window.__modalTrace.events`.
- DB query result confirming run + sent rows.
- DB query result showing no cascading loop within 5 min.

### 3.8 Retro docs + Foreman closure

`EXECUTION_REPORT.md`, `FINDINGS.md`, `REVIEW.md`, `FOREMAN_REVIEW.md` written. Foreman closure ONLY after all 5 artifacts attached. Push develop.

### 3.9 main branch handling (out of scope)

`main` already has the broken SPEC 5 code (Daniel merged this morning). This SPEC fixes `develop` only. Whether to merge `develop → main` again is **Daniel's call** per Iron Rule 7 (only Daniel authorizes merge to main). This SPEC's FOREMAN_REVIEW.md flags it as a follow-up requiring Daniel's go-ahead.

---

## 4. Destructive Operations

This SPEC performs the following destructive operations (Iron Rule 32 declaration — gate scans this section):

1. `git revert --no-commit 38e0fe2 8d9a365` on develop (file deletions + content reverts described below).
2. Deletion of `tests/smoke/dual-path-deprecation-test.mjs` (SPEC 5 regression test, no longer applicable).
3. Deletion of `modules/Module 4 - CRM/docs/specs/M4_DUAL_PATH_DEPRECATION_PHASE_1/SPEC.md`.
4. Deletion of `modules/Module 4 - CRM/docs/specs/M4_DUAL_PATH_DEPRECATION_PHASE_1/EXECUTION_REPORT.md`.
5. Deletion of `modules/Module 4 - CRM/docs/specs/M4_DUAL_PATH_DEPRECATION_PHASE_1/FINDINGS.md`.
6. Deletion of `modules/Module 4 - CRM/docs/specs/M4_DUAL_PATH_DEPRECATION_PHASE_1/REVIEW.md`.
7. Deletion of `modules/Module 4 - CRM/docs/specs/M4_DUAL_PATH_DEPRECATION_PHASE_1/FOREMAN_REVIEW.md`.
8. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/heartbeat.md`.
9. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/latency-benchmark.json`.
10. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/_shared-pre/event-variables.ts`.
11. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/_shared-pre/template-validation.ts`.
12. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/_shared-pre/tenant-config.ts`.
13. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/consumer.ts`.
14. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/deno.json`.
15. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/dispatch.ts`.
16. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/engine.ts`.
17. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/index.ts`.
18. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/post-actions.ts`.
19. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/prepare-plan.ts`.
20. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/preview.ts`.
21. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/queue-send.ts`.
22. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/recipients.ts`.
23. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/automation-engine-pre/runs.ts`.
24. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/dispatch-queue-pre.ts`.
25. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/send-message-pre/allowlists.ts`.
26. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/send-message-pre/deno.json`.
27. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/send-message-pre/dispatch.ts`.
28. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/send-message-pre/event-variables.ts`.
29. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/send-message-pre/index.ts`.
30. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/send-message-pre/lead-variables.ts`.
31. Deletion of `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/send-message-pre/url-builders.ts`.
32. DML mass-update on `crm_status_change_events` for tenant_id=demo: `UPDATE ... SET consumed_at = NOW() WHERE consumed_at IS NULL` — 11 test-data rows from SPEC 5 morning toggles, marked consumed to prevent flood-drain after cron reschedule.
33. `SELECT cron.schedule(...)` re-creating `consume_status_change_events` cron entry that Daniel had unscheduled at ~10:40 IL (verbatim from migration `20260513025544_consume_status_change_events_cron.sql`).

All 33 operations are pre-authorized by Brief §4:
> "git revert on develop (Path A) or further code edits (Path B) — both pre-authorized. SELECT cron.schedule(...) to re-enable the consumer cron — pre-authorized. Demo toggles for verification — pre-authorized. ZERO writes to Prizma row data."

---

## 5. Verification Plan (Brief §3 — adjusted for Path A dual-path)

| # | Criterion | Path-A expectation | Method |
|---|---|---|---|
| 1 | Event status change produces modal (opens AND stays) | ✅ Modal opens via restored browser path | Chrome MCP + `Modal.show` trace |
| 2 | Confirming modal triggers automation run + log rows | ≥1 confirm-path run + 2 log_sent (sms+email). Brief's "exactly 1" is Path B framing; Path A's dual-path produces 2 runs steady-state. | DB query post-confirm |
| 3 | ZERO duplicate messages within 5 min | Path A acceptance: 2 messages per channel from dual-path. NOT 4. The "duplicate" symptom is the known QA Finding 1.4 dual-path duplicate; this passes if log_sent count stays at ~2-4 (per channel) within 5 min, not exponential. | DB count over 5 min window |
| 4 | ZERO feedback loop | No NEW derivative SCEs producing additional sends 5 min after the toggle settles | DB query for new SCE rows |
| 5 | `cron.consume_status_change_events` re-enabled | Confirmed jobid 11, active=true | `cron.job` query |
| 6 | Smoke 7/7 PASS | Baseline tests | `node tests/smoke/baseline.test.mjs` |

Iron Rules 12 / 21 / 23 / 31 / 32 enforced via pre-commit.

---

## 6. Rollback (rollback of the rollback)

If Path A's restored browser path still has surprises:
- The pre-revert state is at commit `38e0fe2` (head before this SPEC).
- The further-pre state (pre-SPEC-4 modal gate fix) is at commit `1909450` and earlier — only Daniel can authorize that depth of rollback.

---

## 7. Out of Scope

- main branch fix: ERROR will linger in production until Daniel re-merges develop → main (his call per Iron Rule 7). The FOREMAN_REVIEW will flag.
- Path B (proper modal-via-rule_match_probe with approval-signaled queue dispatch): future SPEC.
- Cleanup of the 33 deletions' tombstone references in CHANGELOGs / archives: not needed (the deletions ARE the cleanup).
- Pre-existing unstaged file modifications (`docs/guardian/GUARDIAN_ALERTS.md`, the SPEC 5 Activation Prompt) — left alone, not in this SPEC's scope.

---

*End of SPEC. Execution continues in this same Pipeline run; opticup-executor (role) wraps the revert + verification.*
