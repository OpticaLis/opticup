# FINDINGS — M4_DUAL_PATH_DEPRECATION_PHASE_1

---

## F-1 — Brief §2.2 callsite list was over-broad (2 of 3 truly dual-path)
**Severity:** INFO (Brief deviation, documented + escalated transparently)
**Status:** RESOLVED in this SPEC

The Brief §2.2 listed 3 files for `evaluate` removal:
1. `crm-event-actions.js` (event_status_change) — TRUE dual-path
2. `crm-lead-actions.js` (lead_status_change) — TRUE dual-path
3. `crm-attendee-move.js` (attendee_moved) — **single-path** (Brief §5 Risk 2 survey)

Brief §5 Risk 2 mandated: "read each callsite's `evaluate` call's `trigger_event` value + verify the DB trigger covers that event class." Executing that mitigation:

- `event_status_change` → covered by `trg_event_status_change_event` ✅
- `lead_status_change` → covered by `trg_lead_status_change_event` ✅
- `attendee_moved` → DB trigger `trg_attendee_status_change_event` writes only `attendee_status_change` (event=`status_change`) to the queue, NOT `attendee_moved` (event=`moved`). The queue routes to different rules. So `attendee_moved` has **no queue counterpart**.

Active demo rules on `attendee.moved`:
- `355e229d` "העברת משתתף ידנית - לא שילם"
- `99989f3b` "העברת משתתף ידנית - שילם"

Removing the browser call in `crm-attendee-move.js` would silently disable these 2 rules with no path replacement. Per the Brief's own §5 Risk 2 mitigation, the right action is to NOT remove this callsite.

**Resolution:** kept `crm-attendee-move.js:108–122` untouched. The deviation is recorded here and in SPEC §3 + §8. A future SPEC ("M4_ATTENDEE_MOVED_DUAL_PATH_INVESTIGATION" — see open follow-ups) should decide whether to author a `trg_attendee_moved_event` DB trigger (making this rule class dual-path-ready, then deprecating the browser call in a Phase 2 SPEC) — or simply accept that `attendee_moved` stays browser-driven because it's tightly tied to the user-initiated move dialog and its confirmation modal.

---

## F-2 — `lead_intake` browser call is single-path (kept)
**Severity:** INFO (related to F-1)
**Status:** N/A — explicit scope decision

The Brief §2.2 wrote "modules/crm/crm-lead-actions.js (line per file inspection)" — non-specific. Inspection found 3 evaluate callsites in that file:
1. Line 9 / 48 / 244: `lead_status_change` (helper + 2 callers) → REMOVED
2. Line 144 (post-edit): `lead_intake` → KEPT

`lead_intake` has no DB trigger (no `crm_leads` INSERT trigger writes to `crm_status_change_events`). Active rule on demo: `e878749b` "ליד חדש: ברוך הבא". Removal would silently disable it.

**Resolution:** kept the line. Scope of this SPEC is dual-path deprecation, not single-path deprecation.

---

## F-3 — Consumer P95 latency well under target
**Severity:** INFO (positive observability finding)
**Status:** N/A

Brief acceptance: P95 < 65s. Measured: 50.63s (P95), 38.34s (P50). Margin of safety: ~22%.

The acceptance threshold was chosen as "one cron tick (30s) + jitter." Actual cron tick variance + automation-engine processing time was tight enough that even the slowest observed sample (53.36s) stayed under 65s.

Recommendation: future capacity planning can keep the 65s threshold as a soft alarm; consider tightening to 60s if more than 3 samples in 24h exceed it.

---

## F-4 — Single-hop derivative SCE is the natural firebreak (no loop guard needed)
**Severity:** INFO (architectural confirmation)
**Status:** RESOLVED — guard NOT implemented per Activation Prompt instruction

V-EXTRA-2 detected exactly 1 derivative `crm_status_change_events` row in the post-toggle window: lead `01269ab9` waiting→invited, fired by `trg_promote_lead_on_message_sent`. This is the expected single-hop promotion after a successful message send.

The loop **does not cascade** because:
1. The promoted lead is now `invited`, not `waiting`.
2. Rule `b53f6ea5` ("שינוי סטטוס: נפתחה הרשמה") has a recipient-filter requiring `lead.status='waiting'`.
3. Subsequent event toggles to `registration_open` find 0 recipients → no message sent → no further promotion → no further derivative SCE.

Activation Prompt's instruction: "If V-EXTRA-2 doesn't fire [as a cascading loop], the loop was an artifact of dual-path. Then no loop guard is needed."

**Resolution:** no loop guard implemented. The rule's status-filter is the natural firebreak. Daniel's stated final criterion ("הודעה אחת לכל החלפת סטטוס, ללא לולאה") is met by the rule's design discipline, not by a guard in the engine.

Risk discipline carry-over: if a future rule is authored without a recipient status filter (e.g., "send to all leads regardless of status"), the cycle could re-emerge. That is a rule-authoring discipline question that belongs in the rule editor's validation, not in the consumer engine. Logged as a future SPEC candidate: `M4_RULE_AUTHOR_CYCLE_VALIDATION` (Activation Prompt §L3 Option).

---

## F-5 — Brief estimate vs actual
**Severity:** INFO
**Status:** N/A

Brief §8 estimated 1–2 days. Actual: ~37 minutes from pre-flight to post-edit verification. The "1–2 days" estimate was dominated by the "soak time" of the latency benchmark + safety margin. With the consumer already showing tight P95 in the first 10 minutes, the SPEC was able to proceed without soak.

Future Briefs that include long benchmarks may want to specify "X samples PASS → proceed" rather than fixed wall-clock budgets, to avoid blocking on unnecessary calendar time.

---

## F-6 — `crm_automation_runs.sent_count=0` despite log_sent=2 (pre-existing, deferred)
**Severity:** LOW (observability — already tracked)
**Status:** OPEN, deferred to `M4_AUTOMATION_RUNS_METRIC_AUDIT` (QA Priority 5)

Post-edit verification observed `run.sent_count=0` even though both queue rows reached `status='sent'` and both log rows reached `status='sent'`. This is the same observation as `M4_ENQUEUE_REGRESSION_FIX` FINDINGS F-4 — the run's `sent_count` is set during AE evaluation BEFORE the async cron drain completes. Not blocking customer messages, but the run-level metric is misleading.

Already documented; no action in this SPEC.

---

## Future SPEC candidates (handoff to opticup-strategic)

1. **`M4_ATTENDEE_MOVED_DUAL_PATH_INVESTIGATION`** — decide whether to author a `trg_attendee_moved_event` DB trigger so the `attendee.moved` rule class becomes dual-path-ready, then Phase 2 the deprecation. Or accept browser-driven status quo.
2. **`M4_LEAD_INTAKE_DUAL_PATH_INVESTIGATION`** — same question for `lead.created`. The DB trigger would fire on `crm_leads` INSERT.
3. **`M4_RULE_AUTHOR_CYCLE_VALIDATION`** — add cycle-check validation in the rule editor: flag rules whose `post_action.status_change` could re-trigger the same rule via the rule's own match condition.
4. **`M4_AUTOMATION_RUNS_METRIC_AUDIT`** — fix `sent_count` discrepancy (QA Priority 5).
