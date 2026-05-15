# Activation Prompt — M4 Overnight Audit Harvest

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). This is an overnight Full Auto Pipeline run (6-8 hours). The Brief authorizes 4-5 SPECs end-to-end, each fully reviewed and smoke-tested before the next.

---

```
You are running the Full Auto Pipeline overnight on an Architect-authored multi-SPEC Brief.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md

Read the Brief in full BEFORE doing anything else. The Brief is the constitution for this run — every rule in §2 (Safety Envelope) is non-negotiable.

Key parameters:

1. FIRST ACTION — SAFETY TAG (mandatory): before reading the audit, before writing any SPEC, before any code change, create the master rollback tag exactly as specified in Brief §2.1:
   git tag -a pre-overnight-m4-2026-05-13 -m "Pre-overnight-run baseline; revert here if anything in this run goes wrong"
   git push origin pre-overnight-m4-2026-05-13
   Confirm the tag exists on origin before proceeding. If the tag already exists, STOP — that suggests a previous overnight run is in progress.

2. SOURCE MATERIAL: read modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md in full. Then read SESSION_CONTEXT.md, MODULE_SPEC.md, MODULE_MAP.md, db-schema.sql for M4, plus the 3 most recent FOREMAN_REVIEW.md files under modules/Module 4 - CRM/docs/specs/.

3. SPEC QUEUE per Brief §4 (ship in this order, one at a time):
   SPEC #1: M4_INVITED_GHOST_ATTENDEE_FIX — Audit finding #1 Option A.
   SPEC #2: M4_AUTOMATION_RULES_UPDATED_AT — open M4-DEBT-CRM-AUTO-RULES-UPDATED-AT.
   SPEC #3: M4_DEAD_WAITLIST_SLUG_CLEANUP — Audit finding #4 sub-item.
   SPEC #4: M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1 — Audit finding #2, first 30-40 call sites only.
   SPEC #5 (OPTIONAL): M4_FUNNEL_REPORT_FOUNDATION — Audit finding #5 view-only foundation.

   For EACH SPEC: opticup-strategic (Foreman) authors → opticup-executor implements → opticup-reviewer audits → opticup-localhost-tester smokes → opticup-strategic (Foreman-Review) closes. Smoke 7/7 + verdict (green or yellow) required before next SPEC starts. Red verdict means STOP, write escalation, skip dependent SPECs but continue with independent ones.

4. SAFETY RULES per Brief §2 (non-negotiable):
   - Zero Prizma writes. Demo tenant only. Whitelisted contacts only.
   - No merge to main. No push to main. develop only.
   - DDL pre-approved ONLY for SPEC #2 (single ALTER TABLE ADD COLUMN on crm_automation_rules) AND optionally SPEC #5 (single CREATE VIEW). Any other DDL — escalation.
   - Iron Rule 31, 32, 12, 15 enforced on every commit.
   - Max 5 SPECs. If a SPEC takes more than 2 hours and total run is over 6 hours, stop after the current SPEC.
   - SKIP SPEC #5 if previous 4 took more than 5 hours combined OR if any escalation occurred.

5. ESCALATION: if blocked by any condition in Brief §2.7 (wrong premise, Prizma write needed, extra DDL needed, repeated test failure, Iron Rule conflict), STOP, write modules/Module 4 - CRM/escalations/{ISO_TS}_OVERNIGHT_BLOCKER.md, continue with OTHER independent SPECs in the queue, leave the blocked SPEC for Daniel.

6. MORNING SUMMARY (mandatory final deliverable): write ONE file at modules/Module 4 - CRM/docs/audits/M4_OVERNIGHT_RUN_2026_05_13_SUMMARY.md per Brief §5 structure (master tag + SPECs run table + escalations + smoke results + open questions + recommended next steps with a clear recommendation).

7. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed; memory feedback_english_only_responses.md confirms this). ONE concise English summary at the end pointing Daniel to the morning summary file path + top 3 takeaways.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. Trust the Pipeline. Stop only on genuine deviation per Brief §2.7. The master safety tag is the single rollback point — Daniel can revert the entire run with one command if needed.
```

---

*End of activation prompt.*
