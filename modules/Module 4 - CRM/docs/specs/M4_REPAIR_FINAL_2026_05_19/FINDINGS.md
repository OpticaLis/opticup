# FINDINGS — M4_REPAIR_FINAL_2026_05_19

---

## F-1 — SPEC 5 was merged to main without live localhost verification (the meta-bug)
**Severity:** CRITICAL (process)
**Status:** Process improvement only — no code change needed

The SPEC 5 (`M4_DUAL_PATH_DEPRECATION_PHASE_1`) Pipeline this morning produced a FOREMAN_REVIEW claiming "All 6 §3 criteria + V-EXTRA-1 + V-EXTRA-2 GREEN" — and Daniel believed it and merged to main. The Pipeline's verification was SQL-based: it confirmed run+log rows in the DB after a programmatic toggle. It NEVER opened a browser, NEVER clicked the status dropdown, NEVER verified the modal opens.

The deleted browser code path was specifically what triggers the modal-gate UX. The SPEC's "Brief §5 Risk 2 mitigation" surveyed which callsites were dual-path, but missed that "removing the duplicate path" also removed the SINGULAR modal trigger for `event_status_change`. The Foreman did not stop on this gap because there was no live verification step in the Pipeline.

**Process improvement:** Any SPEC that touches UI code paths in `modules/crm/` (or any other browser-facing code) MUST include a Chrome MCP live-verification step in §3 Verification, not just DB queries. The new M4_REPAIR_FINAL Brief established this rule explicitly; it should be promoted to a project-wide standard. Recommended SPEC slug: `LIVE_VERIFICATION_MANDATE_FOR_UI_TOUCHING_SPECS`.

---

## F-2 — Browser path's run row has 0 recipients despite modal showing 1 (race nuance)
**Severity:** LOW (observability)
**Status:** Open — root cause investigation deferred

Post-modal-confirm at 08:02:18, a browser-shape run `a6268d6f` appears at 08:03:23 with `total_recipients=0, sent_count=0`. Meanwhile the modal HAD shown 1 recipient (Daniel) and the user clicked confirm. The cron consumer at 08:04:01 (run `d5bf819d`) found 2 recipients (1 lead × 2 channels) and dispatched both messages successfully.

Possible explanations (not investigated to root):
- The browser path's POST-modal-confirm dispatch may use a different code path that doesn't loop over the planned recipients (maybe relies on the plan being passed through and the plan was empty by the time the modal callback fired).
- A race between browser and cron where the cron pre-emptively claimed the SCE and the browser dispatch found nothing left to dispatch.
- A latent bug where `pending_confirm: true` short-circuits the recipient resolution but a stale run row still gets created.

Net customer impact: ZERO. Path A's dual-path concern (4 messages instead of 2) did not materialize on this verification — only 2 messages were sent. This is actually a BETTER outcome than the Brief predicted.

Deferred investigation. Recommended SPEC slug: `M4_BROWSER_PATH_GHOST_RUN_INVESTIGATION`.

---

## F-3 — `crm_automation_runs.sent_count=0` despite log_sent=2 (carry-over)
**Severity:** LOW (observability, pre-existing)
**Status:** Already deferred to `M4_AUTOMATION_RUNS_METRIC_AUDIT`

Run `d5bf819d` reports `total_recipients=2, sent_count=0` even though both queue rows AND both log_sent rows are `status='sent'`. This is the same observation as M4_DUAL_PATH_DEPRECATION_PHASE_1's FINDINGS F-6 and M4_ENQUEUE_REGRESSION_FIX's FINDINGS F-4. Not blocking customer messages. Already in QA Priority 5 backlog.

---

## F-4 — Destructive-ops gate correctly blocked initial revert commit
**Severity:** INFO (gate working as designed)
**Status:** Resolved

The first `git commit` attempt blocked with 30 violations from `destructive-ops-declared.mjs` because the revert deleted 24 files (SPEC 5 retros, EF snapshots, smoke regression test). The gate enforced Iron Rule 32: deletions MUST be declared in a SPEC §"Destructive Operations" section.

Fix: authored `modules/Module 4 - CRM/docs/specs/M4_REPAIR_FINAL_2026_05_19/SPEC.md` with all 33 destructive ops explicitly listed in §4. Re-commit passed cleanly.

Meta-lesson: this exact path (write SPEC.md FIRST, then re-commit) is now well-trodden — should be promoted to the executor's revert playbook so future emergency reverts don't lose 5-10 min to gate iteration.

---

## F-5 — Click-positioning unreliable through dropdown after page reload (Chrome MCP nuance)
**Severity:** LOW (test tooling)
**Status:** Worked around in this SPEC

After page reload, clicking the status cell text (`uid=22_24` "תכנון") did NOT open the event detail panel on the second attempt. The first attempt (uid=17_24) had worked. Speculation: Chrome MCP's click coordinate calculation uses snapshot positions that may drift if internal layout changes between snapshot capture and click execution.

Workaround: invoked `CrmEventActions.changeEventStatus(eventId, 'registration_open')` directly via `evaluate_script`. This is the EXACT same code path the dropdown click handler invokes — the dispatch / modal trigger chain is identical. Documented this deviation in `_archive/m4-repair-final-2026-05-19/verification/modal_trace.json`.

The dropdown click path WAS demonstrated working earlier in this session (~07:59:48Z) when the modal opened after clicking "הרשמה פתוחה" (uid=19_1). So the UI's click handler is verified-functional; only the test tooling had a positional glitch.

---

## F-6 — Browser-side `evaluate` returns `pending_confirm:true` reliably when CrmConfirmSendV2 is loaded
**Severity:** INFO (architectural confirmation)
**Status:** Working as designed

The engine's behavior matches the source comment: "when CrmConfirmSend is loaded (default for CRM UI), shows the confirmation modal and returns `{ fired, pending_confirm: true, planned }` without dispatching." Trace at ms=354 shows `pending_confirm:true` and modal opens at ms=1830 — exactly the documented behavior. SPEC 4's `suppressEmptyModal` flag works correctly: when recipients=0 (post-promotion state), modal does NOT open (verified during the second-toggle test at 08:01 before state reset).

This finding contradicts the Brief §1.2 framing that SPEC 4 "may have interacted badly with the dual-path removal." Actually SPEC 4 is working correctly; the breaker was SPEC 5 removing the only call site that invokes the modal in the first place.

---

## Future SPEC candidates (handoff to opticup-strategic)

1. **`LIVE_VERIFICATION_MANDATE_FOR_UI_TOUCHING_SPECS`** — high priority. Codify the rule that ANY SPEC touching browser code MUST include Chrome MCP live verification before declaring closed. Add a checklist to opticup-strategic/SKILL.md.
2. **`M4_DUAL_PATH_DEPRECATION_PHASE_2`** — re-attempt the deprecation properly. Architecture: modal opens via `rule_match_probe` mode (read-only, no dispatch), user confirms, browser writes an "approved" flag on the SCE row, consumer respects that flag (skips SCEs that haven't been approved within N minutes OR dispatches normally). This preserves modal UX while eliminating dual-path. Estimated 2-4 hours per Brief.
3. **`M4_BROWSER_PATH_GHOST_RUN_INVESTIGATION`** — diagnose why post-modal-confirm browser run has 0 recipients (F-2).
4. **Existing carry-overs:** `M4_AUTOMATION_RUNS_METRIC_AUDIT`, `M4_STATUS_CHANGE_ATOMIC_GATE`, `M4_RULE_AUTHOR_CYCLE_VALIDATION` — all still open.

---

## What went well

- The Brief itself was excellent — Architect's framing ("Architect is no longer accepting Pipeline self-reports — every closure MUST include live verification") set the right bar.
- The rollback tag from SPEC 5 (`pre-m4-dual-path-deprecation-2026-05-19`) was in place; revert was clean.
- All 5 mandatory evidence artifacts (Brief §6) captured: 2 screenshots (modal open + confirm clicked), modal_trace.json (console output), db_query_results.json (DB query results), final state screenshot.
- 5-min silence window confirmed natural firebreak — no architectural surprises.

## What hurt

- ~50 minutes burned on a regression that proper localhost verification would have caught in 2 minutes pre-merge.
- Destructive-ops gate iteration cost ~5 minutes (could have been 0 if revert flow was documented).
- Test tooling click-position glitch took 2 attempts before switching to programmatic invocation.

Net: ~55 minutes wall-clock. The Brief estimated 30-45 min for Path A. Slight overshoot, all to live-verification rigor — which is exactly the right place to spend time per the new mandate.
