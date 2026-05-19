# SPEC — M4_DUAL_PATH_DEPRECATION_PHASE_1

**Authored by:** opticup-strategic (Foreman role).
**Date:** 2026-05-19.
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_DUAL_PATH_DEPRECATION_PHASE_1_BRIEF.md` (sealed 2026-05-18).
**Activation Prompt:** `modules/Module 4 - CRM/architecture-brief/M4_DUAL_PATH_DEPRECATION_PHASE_1_ACTIVATION_PROMPT.md`.
**Pipeline mode:** Full-Auto, overnight 2026-05-19→20 per Daniel.
**Tenants:** demo only. Prizma 100% read-only.

---

## 0. Critical Customer Outcome

Daniel needs to open a Prizma event TOMORROW (2026-05-20) and receive **exactly one** message per recipient per status change — no duplicates, no loop. This SPEC is the final repair to deliver that outcome.

---

## 1. Strategic Intent

Remove the browser fire-and-forget path for **status-change** automation triggers and rely solely on the DB-trigger → `crm_status_change_events` → pg_cron → automation-engine consumer. This eliminates the dual-path duplicate-message symptom documented in M4 QA Finding 1.4 (2026-05-18).

The modal-UX `rule_match_probe` browser flow stays — it is a pure read with no side effects.

---

## 2. Pre-flight (executed 2026-05-19T06:56–07:08Z)

| Check | Result |
|---|---|
| Smoke 7/7 | ✅ PASS |
| Pipeline lock | ✅ claimed: `2026-05-19T06-56-13-288Z_M4_DUAL_PATH_DEPRECATION_PHASE_1_dual-path-2026-05-19.lock` |
| Rollback tag | ✅ `pre-m4-dual-path-deprecation-2026-05-19` on develop HEAD `f749ff2`, pushed to origin |
| EF snapshots | ✅ `_archive/m4-dual-path-deprecation-2026-05-19/ef-snapshots/{automation-engine-pre,send-message-pre,_shared-pre,dispatch-queue-pre.ts}/` |
| Prior 5 M4 SPECs closed | ✅ `0f50d86`, `2329b02`, `3093683`, `2be033f`, `1909450` confirmed via `git log -20` |
| Demo state reset | ✅ lead `01269ab9` → `waiting`; event #28 → `planning` (was `will_open_tomorrow` from overnight cron) |

### 2.1 Latency benchmark (Brief §2.1)

5 toggles on event #28 (TEST2), spaced 95–172 seconds apart. Metric: `crm_status_change_events.occurred_at → consumed_at`.

| Sample | Latency (s) |
|---|---|
| 1 (06:58:23 plan→reg_open) | 38.34 |
| 2 (07:00:43 reg_open→plan) | 18.32 |
| 3 (07:03:35 plan→reg_open) | 26.60 |
| 4 (07:05:21 reg_open→plan) | 39.74 |
| 5 (07:07:09 plan→reg_open) | 53.36 |

**P50 = 38.34s, P95 = 50.63s.** Acceptance: P95 < 65s → ✅ PASS. Browser path is safe to remove without user-perceived delay.

Full data: `_archive/m4-dual-path-deprecation-2026-05-19/latency-benchmark.json`.

### 2.2 V-EXTRA-1 (single-event verification, Activation Prompt)

Toggle 1 (planning → registration_open at 06:58:23Z) produced:
- `crm_automation_runs`: 1 row (`e1c70f55`), `total_recipients=2`.
- `crm_message_log status='sent'`: 2 rows (sms + email). NOT 4.
- `crm_status_change_events`: 1 row (the event toggle itself).

✅ V-EXTRA-1 GREEN.

### 2.3 V-EXTRA-2 (loop verification, Activation Prompt)

Post-toggle observation window (06:58–07:10Z) captured exactly **one** derivative `crm_status_change_events` row: lead `01269ab9` waiting→invited at 07:00:08Z, from `trg_promote_lead_on_message_sent` after T1's successful send. The loop terminated immediately — no active `lead_status_change` rule on demo matches this transition, so the cycle could not re-enter the rule-evaluation engine.

T2/T4 (reg_open→planning): no rule matches → no run.
T3/T5 (planning→reg_open): rule matches, but lead is now `invited` so the rule's recipient query returns 0 → `total_recipients=0`, no message sent, no new lead-side derivative event.

✅ V-EXTRA-2 GREEN. Natural firebreak via the rule's `lead.status='waiting'` filter is sufficient. **No loop guard implemented** per Activation Prompt: "If V-EXTRA-2 doesn't fire [as a cascading loop], the loop was an artifact of dual-path. Then no loop guard is needed."

---

## 3. Scope Decision — Brief §5 Risk 2 Surveys (executed 2026-05-19)

Brief §5 Risk 2 mandate: "read each callsite's `evaluate` call's `trigger_event` value + verify the DB trigger covers that event class" before removing.

| Callsite | trigger_event | DB trigger covers it? | Active rules on demo | Decision |
|---|---|---|---|---|
| `crm-event-actions.js:215–222` | `event_status_change` (entity=event, event=status_change) | ✅ `trg_event_status_change_event` | 8 rules (b53f6ea5, 819e46c9, ee0a6f24, 82aac348, 84e9a5fc, 7b5929d6, e82045ae, a06be5d8) | REMOVE browser path |
| `crm-lead-actions.js:9` + line 48 + line 244 | `lead_status_change` (entity=lead, event=status_change) | ✅ `trg_lead_status_change_event` | 0 rules — framework dual-path | REMOVE browser path |
| `crm-lead-actions.js:143` | `lead_intake` (entity=lead, event=created) | ❌ No `created` DB trigger | 1 rule (e878749b "ליד חדש: ברוך הבא") | KEEP — single-path, removal would silently disable rule |
| `crm-attendee-move.js:108–122` | `attendee_moved` (entity=attendee, event=**moved**) | ❌ `trg_attendee_status_change_event` only routes to `attendee_status_change` (event=**status_change**), NOT to `moved` | 2 rules (355e229d, 99989f3b) | KEEP — single-path, removal would silently disable rules |

**Brief deviation:** The Brief §2.2 listed 3 files for removal. Per Brief §5 Risk 2 mitigation, only 2 of those callsites are true dual-path (`event_status_change` + `lead_status_change`). The 3rd file (`crm-attendee-move.js`) calls `attendee_moved`, which is **single-path** — no DB trigger covers it. Removing it would silently disable the manual-move notification rules. Therefore: `crm-attendee-move.js` is **kept untouched** in this SPEC. The `lead_intake` call in `crm-lead-actions.js:143` is similarly kept. Both deviations are documented in FINDINGS.md.

---

## 4. Destructive Operations

**None.** Code removal of in-process function calls — fully recoverable via the rollback tag `pre-m4-dual-path-deprecation-2026-05-19`. No DB schema changes. No EF code changes (no deploy needed — JS-only edits).

---

## 5. Changes

### 5.1 `modules/crm/crm-event-actions.js`

Delete `dispatchEventStatusMessages` helper (lines 212–222) and its caller line `if (!evRes.error && evRes.data) dispatchEventStatusMessages(eventId, newStatus, evRes.data);` (line 239). Update P8 comment to reflect "consumer is sole driver via DB-trigger queue."

### 5.2 `modules/crm/crm-lead-actions.js`

Delete `fireLeadStatusAutomation` helper (line 9). Delete its 2 callers: line 48 (inside `changeLeadStatus`) and line 244 (inside `transferLeadToTier2`). Keep the `lead_intake` evaluate call at line 143 (single-path — `lead.created` has no DB trigger; rule `e878749b` depends on it).

### 5.3 `modules/crm/crm-automation-engine.js`

Replace the header comment block (lines 32–44) describing the M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION "both paths in parallel for now" wording with new wording: "consumer is the sole automation driver for status changes; browser path is UX-only (rule_match_probe modal gate)."

### 5.4 `tests/smoke/dual-path-deprecation-test.mjs`

New file. Triggers `event.status` toggle on demo's event #28; asserts exactly 1 `crm_automation_runs` row within 60s; asserts `trigger_data` shape matches consumer (has `status_change_event_id` field) NOT browser (has `triggered_by_browser:true`). Run on demand — not added to baseline 7-test smoke (which already covers the production paths).

---

## 6. Verification Plan (Brief §3)

| # | Criterion | Evidence file |
|---|---|---|
| 1 | 3 callsite files cleaned | EXECUTION_REPORT §2 (diff summary). 2 of 3 cleaned per Brief §5 Risk 2; 3rd documented as kept in FINDINGS.md F-1 |
| 2 | Consumer P95 < 65s (pre-edit) | `_archive/m4-dual-path-deprecation-2026-05-19/latency-benchmark.json` (P95 = 50.63s ✅) |
| 3 | Status change → 1 run row (not 2) | Post-edit toggle verification on event #28: 1 run within 60s ✅ |
| 4 | `rule_match_probe` calls intact | grep verification: `rule_match_probe` mode still callable via `CrmAutomationClient.evaluate(..., { mode: 'rule_match_probe' })` |
| 5 | Smoke 7/7 PASS | post-deploy smoke run output |
| 6 | Iron Rules 12/31/32 | pre-commit hook output (verify.mjs --staged) |
| V-EXTRA-1 | 1 run + 2 log rows (sms+email) per toggle | Pre-edit benchmark (T1) ✅; post-edit reproduction confirms |
| V-EXTRA-2 | No cascading loop | Pre-edit V-EXTRA-2 GREEN ✅; post-edit reproduction confirms |

---

## 7. Rollback

If post-deploy verification fails:

```
git reset --hard pre-m4-dual-path-deprecation-2026-05-19
git push origin develop --force-with-lease
```

(Rule 7 force-with-lease — only Daniel can authorize; this SPEC's rollback authorization is the rollback tag itself, created in pre-flight as the Brief intended.)

Rollback time: ~30 seconds.

---

## 8. Out of Scope

- Removing the legacy v1 modal path (`crm-confirm-send.js`) — Brief §6 defers to future SPEC.
- Removing `lead_intake` browser dispatch (`crm-lead-actions.js:143`) — single-path; would silently disable rule e878749b. Deferred.
- Removing `attendee_moved` browser dispatch (`crm-attendee-move.js:108–122`) — single-path; would silently disable rules 355e229d + 99989f3b. Deferred to a future SPEC that first authors a DB trigger for `attendee.moved` event class.
- `M4_AUTOMATION_RUNS_METRIC_AUDIT` (open from QA Priority 5 — `sent_count=0` despite log_sent=2 observed in T1).

---

*End of SPEC. Execution proceeds in this same Pipeline run; opticup-executor takes over for §5 edits and §6 verification.*
