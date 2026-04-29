# ACTIVATION PROMPT — M4_LEAD_STATUS_WAITLIST_SYNC

You are opticup-executor for Module 4 — CRM. Execute SPEC M4_LEAD_STATUS_WAITLIST_SYNC under Bounded Autonomy.

**SPEC:** `modules/Module 4 - CRM/docs/specs/M4_LEAD_STATUS_WAITLIST_SYNC/SPEC.md`

**Hard precondition:** P5_V2_REBUILD_RUNG2_RULES_REWIRE must be CLOSED first (this SPEC wires into the post-action that Rung 2 creates). Confirm by reading Rung 2's EXECUTION_REPORT.md.

**Pre-flight Step 1 baseline:**
- pg_get_functiondef snapshot of `register_lead_to_event` saved to the SPEC folder.
- `\d crm_statuses` to confirm UNIQUE constraint shape.
- `\d+ crm_event_attendees` to confirm status CHECK values.
- `wc -l` of files to be modified.
- Lead status counts pre-backfill: `SELECT status, count(*) FROM crm_leads WHERE tenant_id='demo-uuid' GROUP BY 1`.

**Critical guardrails:** demo only, approved phones only (no test sends in this SPEC anyway), do NOT touch TIER1_STATUSES, do NOT modify any `register_lead_to_event` semantic beyond appending sync calls.

**Deliverables at close:** all 14 success criteria pass, EXECUTION_REPORT.md with pre/post backfill counts, FINDINGS.md if anything emerged.

Read SPEC.md in full, then run pre-flight, then execute commits per §9.
