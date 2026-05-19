# M4_DUAL_PATH_DEPRECATION_PHASE_1 — Retire the Browser Fire-and-Forget Path

**Status:** Brief — sealed for execution after `M4_STATUS_CHANGE_MODAL_GATE_FIX` closes.
**Authored by:** Architect (Cowork, 2026-05-18 evening)
**Pipeline mode:** Full-Auto.
**Priority:** P3.

---

## 1. Strategic Intent

**The problem.** From QA report Finding 1.4: every status change fires automation TWICE — once from the browser (`CrmAutomationClient.evaluate(...)` fire-and-forget) and once from the DB-trigger → `crm_status_change_events` → cron consumer. Both paths reach the same logical conclusion. 8 status changes produced 16 runs. The code-comment at `crm-automation-engine.js:32-42` admits "both paths run in parallel for now."

**The intent.** Remove the browser fire-and-forget path. Rely solely on the DB-trigger consumer. Keep the browser path active ONLY for the modal-UX gate via the new `rule_match_probe` mode added in `M4_STATUS_CHANGE_MODAL_GATE_FIX`.

---

## 2. Deliverables

### 2.1 Consumer latency benchmark

Before removing the browser path, measure: from `crm_status_change_events.created_at` to `crm_message_queue.created_at` (or `crm_message_log.created_at` for direct-send). Run for 5 status changes on demo. Compute P50 + P95. Acceptance: P95 < 65 seconds (one cron tick + jitter).

If P95 > 65s — STOP. Open finding "consumer latency too high to drop browser path"; do not proceed. Browser path stays as failsafe.

### 2.2 Remove browser `evaluate` calls

Remove the fire-and-forget `evaluate` calls from:
- `modules/crm/crm-event-actions.js:215-222`
- `modules/crm/crm-lead-actions.js` (line per file inspection)
- `modules/crm/crm-attendee-move.js` (line per file inspection)

The modal-UX `rule_match_probe` calls STAY.

### 2.3 Update file headers

`crm-automation-engine.js:32-42` — remove the "both paths in parallel for now" comment; replace with "consumer is the sole automation driver; browser path is UX only."

### 2.4 Regression test

`tests/smoke/dual-path-deprecation-test.mjs`:
- Trigger a status change on demo.
- Verify EXACTLY 1 run row in `crm_automation_runs` created within 60s.
- Verify the run has `trigger_data` shape A (consumer), NOT shape B (browser).

---

## 3. Verification Criteria

1. 3 callsite files cleaned.
2. Consumer P95 < 65s (measured before edit).
3. Status change → 1 run row (not 2).
4. `rule_match_probe` calls intact for modal UX.
5. Smoke 7/7 PASS.
6. Iron Rules 12/31/32 enforced.

---

## 4. Destructive Operations

**None.** Code removal — not destructive in Iron Rule 32 sense (git history preserves old version).

---

## 5. Risk Surface

- **Risk 1: consumer is slow → user experiences a delay.** Mitigation: latency benchmark in §2.1 gates the SPEC.
- **Risk 2: removed call had a side-effect we missed.** Mitigation: read each callsite's `evaluate` call's `trigger_event` value + verify the DB trigger covers that event class.

---

## 6. Out of Scope

- Removing the legacy v1 modal path (`crm-confirm-send.js`) — that's a future deprecation cycle.

---

## 7. Pre-flight Checklist

- [ ] `M4_STATUS_CHANGE_MODAL_GATE_FIX` 🟢 closed.
- [ ] Latency benchmark complete; P95 < 65s.
- [ ] Pipeline lock claimed.

---

## 8. Estimated wall-clock

1-2 days (most of it is the latency benchmark + soak time).

