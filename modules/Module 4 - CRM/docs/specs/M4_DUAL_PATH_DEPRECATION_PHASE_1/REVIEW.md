# REVIEW — M4_DUAL_PATH_DEPRECATION_PHASE_1

**Reviewed by:** opticup-reviewer (Pipeline-internal review pass).
**Date:** 2026-05-19.
**Subject:** code edits + SPEC artifacts in this SPEC folder, prior to commit.
**Verdict:** 🟢 APPROVED.

---

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 6 (index.html at root) | ✅ | Untouched. |
| 7 (API abstraction) | ✅ | Edits don't introduce direct `sb.from()` calls beyond what was already there. The deleted browser path was a function call wrapper, not a DB write. |
| 8 (security/sanitization) | ✅ | No new user-input paths. No `innerHTML`. |
| 10 (global name collision) | ✅ | Deleted helpers (`dispatchEventStatusMessages`, `fireLeadStatusAutomation`) were file-local (inside IIFE). No global namespace impact. Verified via `grep -rn fireLeadStatusAutomation modules/crm/ --include="*.js"` → 0 hits post-edit. |
| 12 (file size ≤ 350) | ✅ | crm-event-actions.js: 296. crm-lead-actions.js: 344. crm-automation-engine.js: 344. New test: 112. All under cap. |
| 21 (no orphans, no duplicates) | ✅ | The deleted functions had exactly 1 caller each (within the same file). Their callers were also removed. No dangling references. |
| 22 (defense-in-depth on writes) | ✅ | No DB writes added or removed; the consumer's writes already follow this rule (`automation-engine` EF). |
| 23 (no secrets) | ✅ | None in any edit. |
| 31 (integrity gate) | ⏳ | Will run on `verify.mjs --staged` pre-commit. Expected ✅. |
| 32 (destructive ops) | ✅ | SPEC §4 declares "None". Code-removal does not trigger the destructive-ops gate (git history preserves prior state, and the rollback tag `pre-m4-dual-path-deprecation-2026-05-19` is created in pre-flight). |

---

## Code review observations

### O-1 — Brief §5 Risk 2 mitigation was correctly applied

The Brief itself anticipated the risk that a listed callsite might not be truly dual-path. The Executor probed `pg_trigger` + `crm_automation_rules` for the 3 callsites and found that `attendee_moved` is single-path. The decision to keep that callsite is conservative and aligns with Daniel's stated final criterion ("הודעה אחת לכל החלפת סטטוס") — removing it would have silently broken 2 active rules (`355e229d`, `99989f3b`) for a non-status-change trigger.

Strong execution discipline. The deviation is documented openly in SPEC §3 + FINDINGS F-1 + EXECUTION_REPORT §3 — no hidden scope-creep, no silent dropping of work.

### O-2 — Single-hop firebreak is a real architectural property

The V-EXTRA-2 result is interesting beyond this SPEC: the rule's recipient-status filter (`status='waiting'`) is the firebreak that prevents the post_action loop, NOT some explicit cycle-detection logic. This means:

- Today, the firebreak depends on **every** "send invitation" rule having a status-equals-waiting filter. If anyone authors a rule that fires on `registration_open` without filtering by `lead.status`, the cycle re-emerges.
- This is a discipline issue at rule-author time, not at engine time. FINDINGS F-4 captures it; future SPEC `M4_RULE_AUTHOR_CYCLE_VALIDATION` (handoff) would convert the discipline into a hard guard.

For this SPEC, the discipline is sufficient. Daniel's 2026-05-20 Prizma event uses these existing rules — they all have the filter — so the firebreak holds.

### O-3 — Header comment in crm-automation-engine.js now accurately reflects the architecture

The pre-edit comment said "both paths run in parallel for now" — which had been true since 2026-05-14 and was the source of the bug. Post-edit: the comment enumerates the DB triggers, the single-path triggers, and the rule_match_probe UX path. A future reader can understand the dispatch lifecycle from the header alone, without reading every callsite.

### O-4 — Regression test is on-demand, not part of baseline 7-test smoke

This is the right call. The baseline 7-test smoke covers production paths in <30s. A regression test that includes 60s of wait + DB state setup/teardown should be opt-in. The dual-path-deprecation test can be run any time someone touches automation-engine, the DB triggers, or the 3 browser files modified here.

Suggest adding it to a future "M4 automation regression suite" once 2-3 more tests of similar shape exist.

### Nitpick (N-1) — Comment line length

The new comment block in `crm-automation-engine.js` is 13 lines, same as before. No wrap issues observed in any editor. Fine.

### Nitpick (N-2) — `lead_intake` line 144 left unchanged

The line `if (window.CrmAutomationClient && CrmAutomationClient.evaluate) CrmAutomationClient.evaluate('lead_intake', { leadId: ins.data.id });` predates this SPEC and follows an old style (no `await`, no error handling). The Executor correctly left it untouched per Iron Rule scope-discipline (one concern per task). A future SPEC could harden it.

---

## Verification review

The Executor's pre-edit benchmark + post-edit reproduction is reproducible: the SQL traces in `latency-benchmark.json` + heartbeat are time-stamped and ID-keyed. Anyone re-running with the same event #28 + same lead would see the same shape (different latency values, same run/log topology).

Run row `f8d039b6` (post-edit) carries `total_recipients=2` + 2 log_sent rows. trigger_data shape clearly comes from the consumer (the AE EF code at `automation-engine/index.ts` builds this trigger_data on consume; the browser-path equivalent would have been different).

---

## Permission to close

✅ APPROVED for commit. Next step: opticup-localhost-tester smoke run (or Executor self-runs the smoke), then opticup-strategic Foreman close.
