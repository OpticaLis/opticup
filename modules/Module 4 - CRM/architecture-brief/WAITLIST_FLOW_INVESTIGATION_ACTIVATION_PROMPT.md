# Activation Prompt — Waitlist Flow Investigation + Test-Lead Cleanup

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). Sonnet model is sufficient — mostly investigation, one Daniel-approved single-row UPDATE on Prizma.

---

```
You are running the Full Auto Pipeline on a 3-part Brief: close an escalated SPEC, perform ONE Daniel-approved Prizma UPDATE, and produce a focused investigation report. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/WAITLIST_FLOW_INVESTIGATION_BRIEF.md

Context: the Overnight Audit Harvest (2026-05-13 night) flagged SPEC M4_DEAD_WAITLIST_SLUG_CLEANUP for escalation. The audit said "0 leads with status='waitlist'" but Prizma has 1 — a test lead Daniel created. When this reached Daniel, a deeper truth surfaced: the `waitlist` status is NOT dead; it's the intended TARGET for an automatic flow that fires when an event reaches capacity. Daniel's intent: when a lead registers for a full event, the lead's `crm_leads.status` on the Tier 2 board should transition to `'waitlist'`. Today 0 leads have this status — meaning the flow is either unimplemented or broken.

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §4.1:
   git tag -a pre-waitlist-investigation-2026-05-13 -m "Pre-waitlist-investigation baseline"
   git push origin pre-waitlist-investigation-2026-05-13

2. THREE WORK ITEMS per Brief §3:
   3.1 Move the test lead from waitlist→waiting on Prizma (single-row UPDATE, Daniel-approved). Pre-flight: confirm exactly 1 matching row. If multiple → STOP escalate.
   3.2 Close SPEC M4_DEAD_WAITLIST_SLUG_CLEANUP with REVISED verdict (🟡 CLOSED-WITH-REVISED-SCOPE). The `waitlist` slug ROW in `crm_statuses` is INTENTIONALLY RETAINED. Update the escalation file to RESOLVED.
   3.3 Investigate the capacity-reached → waitlist flow (READ-ONLY): code search, DB function bodies, automation rules, historical evidence. Produce report at modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md per Brief §3.3 structure.

3. SAFETY RULES per Brief §4 (non-negotiable):
   - NO removal of the `waitlist` slug from `crm_statuses` under any circumstance. Daniel explicitly forbade this in chat 2026-05-13: "שלא ימחק את הסטטוס בשום אופן".
   - ONLY ONE Prizma write allowed (§3.1). Everything else read-only.
   - Pre-UPDATE: confirm exactly 1 matching row. Post-UPDATE: confirm exactly 1 row affected + post-state count of `status='waitlist'` on Prizma is 0.
   - NO DDL of any kind.
   - NO merges to main.
   - Iron Rule 31, 32, 12 enforced.

4. INVESTIGATION RIGOR per Brief §3.3:
   - Code search: grep waitlist across modules/crm/, supabase/functions/, supabase/migrations/.
   - DB search: SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%waitlist%'.
   - Automation rules: SELECT from crm_automation_rules WHERE conditions::text ILIKE '%waitlist%' OR actions::text ILIKE '%waitlist%'.
   - Trace event-register EF + register_lead_to_event RPC + any other capacity-handling code path. Document what HAPPENS today when a lead tries to register for a full event.
   - Cross-reference against Daniel's intent: the LEAD's status should become 'waitlist' (not just the attendee row's status).

5. REPORT STRUCTURE per Brief §3.3 — Executive Summary + Evidence + Current Behavior + Gap Analysis + Recommendation + Out-of-Scope Notes.

6. COMMIT BUDGET: 3-5 commits expected, cap at 6. One UPDATE migration + one SPEC close + one escalation resolution + one investigation report.

7. ESCALATION: if §3.1 returns unexpected (multiple rows, wrong row), STOP. If §3.3 surfaces a CURRENTLY-HARMING production bug (events going to capacity but leads silently not getting flagged), STOP at the report step and surface clearly. Do NOT attempt a fix — this Brief explicitly excludes fixes per Daniel's directive.

8. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed). ONE concise English summary at the end pointing Daniel to the investigation report path + verdict (flow implemented / not / partial) + clear recommendation about whether to author a follow-up fix SPEC.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
