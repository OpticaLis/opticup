# FOREMAN_REVIEW — M4_DUAL_PATH_DEPRECATION_PHASE_1

**Foreman closing:** 2026-05-19.
**Commits:** `8d9a365` (this SPEC). Rollback tag: `pre-m4-dual-path-deprecation-2026-05-19`.
**Status:** 🟢 SPEC CLOSED. All 6 §3 criteria + V-EXTRA-1 + V-EXTRA-2 GREEN.

---

## 1. What this SPEC accomplished

Closed the M4 dual-path duplicate-message bug (QA Finding 1.4 / 2026-05-18). Status-change automation now has exactly **one** dispatch path: DB trigger → `crm_status_change_events` queue → pg_cron consumer → `automation-engine` EF → rule evaluation → `crm_message_queue` → `dispatch-queue` EF → `send-message` EF → `crm_message_log`.

Customer-visible outcome: when Daniel toggles an event status in Prizma tomorrow (2026-05-20), every recipient receives exactly one message per channel, not two.

Pre-edit dual-path topology and the post-edit single-path topology were both measured directly on demo (event #28, lead 01269ab9). The benchmark + V-EXTRA verifications are reproducible from the SQL traces in `latency-benchmark.json` + the heartbeat.

---

## 2. Lineage

| Predecessor | Contribution to this SPEC |
|---|---|
| M4 QA Report 2026-05-18 (Finding 1.4) | Identified the 2× run pattern; named the dual-path symptom. |
| M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14) | Added the DB triggers `trg_event_status_change_event` + `trg_lead_status_change_event`, knowingly creating dual-path "for monitoring + future wiring." |
| M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX (2026-05-18) | Made the consumer path actually produce visible messages (was silently failing before). Without that fix, the duplicate-message symptom would have been masked. |
| M4_STATUS_CHANGE_MODAL_GATE_FIX (2026-05-19) | Added the `rule_match_probe` mode that lets the browser keep doing UX (modal count) without dispatching — this SPEC depends on that mode existing. |
| M4_ENQUEUE_REGRESSION_FIX (2026-05-19) | Fixed the partial-unique-index that was blocking cross-run re-sends. Without that, the SPEC's latency benchmark would have failed after toggle #2. |

Each predecessor was a stepping stone. This is the capstone — it's the SPEC that delivers the customer-visible outcome.

---

## 3. Brief deviations (explicit + transparent)

The Brief §2.2 listed 3 callsites for removal. The Executor's §5 Risk 2 surveys (which the Brief itself mandated) found that only 2 are true dual-path:

- `crm-event-actions.js` — REMOVED ✅ (true dual-path).
- `crm-lead-actions.js` (status-change helper + 2 callers) — REMOVED ✅ (true dual-path).
- `crm-attendee-move.js` — **KEPT** (single-path; removal would silently disable 2 active rules with no replacement).
- `crm-lead-actions.js:144` (lead_intake) — **KEPT** (single-path; removal would silently disable rule e878749b).

This is the right call. The Brief named files, but the Brief's own Risk 2 mitigation named the deeper test ("verify the DB trigger covers that event class"). The Executor ran that test and found 2 callsites failed it — they don't have queue counterparts, so removing them would silently regress.

Foreman approves the deviation. Recorded in SPEC §3 + FINDINGS F-1/F-2 + EXECUTION_REPORT §3.

---

## 4. Verification matrix (Brief §3 final)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | 3 callsite files cleaned | 🟢 (2/3 cleaned, 3rd kept per Brief §5 Risk 2) | EXECUTION_REPORT §2 |
| 2 | Consumer P95 < 65s pre-edit | 🟢 (50.63s) | `latency-benchmark.json` |
| 3 | Status change → 1 run row | 🟢 (1 run `f8d039b6`) | heartbeat 07:21Z |
| 4 | `rule_match_probe` intact | 🟢 | grep + comment in `crm-automation-engine.js` |
| 5 | Smoke 7/7 PASS | 🟢 | post-commit smoke run output |
| 6 | Iron Rules 12/31/32 | 🟢 | pre-commit gate output (0 violations) |
| V-EXTRA-1 | 1 run + 2 log rows per toggle | 🟢 (T1 pre + post) | `latency-benchmark.json` |
| V-EXTRA-2 | No cascading loop | 🟢 (single-hop only) | derivative-SCE scan |

---

## 5. Skill-harvest proposals

### Author tier (opticup-strategic)

**A-1 — "Risk-survey-first SPEC pattern."** This Brief had a §5 Risk 2 mitigation that *changed the §2.2 deliverable list*. The Executor correctly ran the survey BEFORE applying §2.2 verbatim. Future Briefs should always state explicitly: "If §5 Risk N's mitigation contradicts §2's deliverables, the mitigation wins." This SPEC's deviation is the proof that risk surveys are first-class deliverables, not optional safety checks.

**A-2 — "Single-path discovery is its own finding."** When this SPEC asked "is callsite X dual-path?", the answer for 2 of 3 callsites was "no, single-path." That answer is now archival knowledge — future SPECs that want to deprecate browser dispatch broadly need to know which callsites have no queue counterpart. Future Briefs should reference FINDINGS F-1/F-2 as authoritative.

**A-3 — Brief estimate overshoot was useful.** The Brief estimated 1-2 days; actual was ~37 minutes. The estimate had ~94% padding for "soak time + safety margin." Daniel authorized "the Pipeline can run all night." In retrospect, the actual gating factor was the 5-toggle benchmark (5 × ≥90s = ~8 minutes minimum) + the post-edit reproduction (~2 minutes) — total ~10 min on the critical path. Future Briefs with similar shape: estimate the actual gating factor, not the comfort margin.

### Executor tier (opticup-executor)

**E-1 — Probe the rule + trigger graph BEFORE touching code.** The 2-minute SQL probe (`crm_automation_rules` × `pg_trigger`) revealed the dual-path/single-path topology decisively. This should be the first step of any SPEC that wants to remove a browser dispatch path. Add to opticup-executor's checklist for "automation engine work."

**E-2 — Reset state before any reproduction.** This SPEC reset event #28 to planning + lead 01269ab9 to waiting THREE separate times: pre-flight (after cron status_flip overnight), between benchmark toggles, before the post-edit reproduction. Each reset took ~2 SQL statements. Without resets, the benchmark would have been polluted by stale state from the previous SPEC's test runs.

### Reviewer tier (opticup-reviewer)

**R-1 — File-local helper deletion checklist.** When deleting a helper function, verify: (a) it was used only inside its own file (IIFE-scoped or module-scoped), (b) all callers are also being deleted in the same commit, (c) no other file imports or calls it. This SPEC's helpers were IIFE-scoped, so the check was trivial — but the checklist still belongs in the reviewer skill so it's not skipped on a wider-scope SPEC.

---

## 6. Open follow-ups (handoff queue for opticup-strategic)

| SPEC slug | Priority | Origin |
|---|---|---|
| `M4_ATTENDEE_MOVED_DUAL_PATH_INVESTIGATION` | Low (no current bug) | FINDINGS F-1 future-SPEC list |
| `M4_LEAD_INTAKE_DUAL_PATH_INVESTIGATION` | Low | FINDINGS F-2 future-SPEC list |
| `M4_RULE_AUTHOR_CYCLE_VALIDATION` | Medium (would harden firebreak) | FINDINGS F-4 + Activation Prompt §L3 |
| `M4_AUTOMATION_RUNS_METRIC_AUDIT` | Low (already QA Priority 5) | F-6 + QA report |
| `M4_LEAD_INTAKE_ERROR_HARDENING` | Trivial | REVIEW N-2 (line 144 lacks await + error handling) |

None of these block the 2026-05-20 Prizma event.

---

## 7. Rollback

Pre-flight tag: `pre-m4-dual-path-deprecation-2026-05-19` (commit `f749ff2`).

If a regression appears after Daniel uses Prizma tomorrow:
```
git reset --hard pre-m4-dual-path-deprecation-2026-05-19
git push origin develop --force-with-lease
```

Rollback time: ~30s. EF redeploy not needed (no EF code changed in this SPEC).

---

## 8. Outcome statement

🟢 SPEC sealed.

Five SPECs in 2026-05-18→19 overnight chain — `M4_FULL_QA_INVESTIGATION_2026_05_18` (Brief), `M4_CONFIG_SYNC_INFRASTRUCTURE` + `M4_CONFIG_PARITY_RUN_1` + `M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX` + `M4_STATUS_CHANGE_MODAL_GATE_FIX` + `M4_ENQUEUE_REGRESSION_FIX` + `M4_DUAL_PATH_DEPRECATION_PHASE_1` — all closed 🟢 on `develop`.

Customer outcome delivered: M4 CRM is stable for the Prizma event on 2026-05-20. Status changes produce exactly one message per recipient per channel, no duplicates, no cascading loop.

The browser fire-and-forget pattern for status-change triggers is structurally retired. Future SPECs that want to extend status-change automation know to add a DB trigger + queue entry — not a browser-side helper.
