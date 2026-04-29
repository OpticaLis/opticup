# ACTIVATION PROMPT — P5_V2_REBUILD_RUNG3_FEATURES

You are opticup-executor. Execute SPEC P5_V2_REBUILD_RUNG3_FEATURES under Bounded Autonomy.

**SPEC:** `modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG3_FEATURES/SPEC.md`

**Hard preconditions (verify BEFORE starting):**
- P5_V2_REBUILD_RUNG1_PLUMBING CLOSED.
- P5_V2_REBUILD_RUNG2_RULES_REWIRE CLOSED.
- M4_LEAD_STATUS_WAITLIST_SYNC CLOSED.
- All three EXECUTION_REPORT.md files exist with green verdicts.
- `sync_lead_status_from_attendee` RPC callable.
- Rules 2.7 (UNPAID + PAID) exist in `crm_automation_rules` for demo with `is_active=true`.

**Pre-flight Step 1 baseline:**
- pg_get_functiondef snapshot of `register_lead_to_event` saved as `register_lead_to_event-pre-rung3.sql` in this SPEC folder.
- `wc -l modules/crm/crm-events-detail.js modules/crm/crm-leads-tab.js`.
- Demo state: attendees, leads, events, activity_log row counts.

**Critical guardrails:** demo only, approved phones only, do NOT auto-charge/refund on fee mismatch (operator-handled), public-form auto-move is silent (no notifications).

**Deliverables at close:** all 30 success criteria pass, EXECUTION_REPORT.md with smoke artifacts (log/activity_log diffs for each scenario), FINDINGS.md if anything emerged.

Read SPEC.md in full + the parent SPEC + the existing dialog patterns (`crm-event-send-message.js`, `crm-confirm-send.js`). Run pre-flight, then execute commits per §9.
