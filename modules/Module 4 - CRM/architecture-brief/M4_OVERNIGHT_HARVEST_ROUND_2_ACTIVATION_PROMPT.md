# Activation Prompt — M4 Overnight Harvest Round 2

> Paste the block below into a fresh Claude Code chat. Opus model. Overnight run (~6-8 hours).

---

```
You are running the Full Auto Pipeline overnight on a multi-SPEC Brief. Use Opus model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md

Read the Brief in full BEFORE doing anything else. §2 (Safety Envelope) is non-negotiable.

Key parameters:

1. FIRST ACTION — SAFETY TAG (mandatory) per Brief §2.1:
   git tag -a pre-overnight-m4-r2-2026-05-14 -m "Pre-overnight-r2 baseline; revert here if anything goes wrong"
   git push origin pre-overnight-m4-r2-2026-05-14

2. SOURCE MATERIAL:
   - modules/Module 4 - CRM/docs/STATUS_MODEL.md (Findings F1-F5 + §6 14 items)
   - modules/Module 4 - CRM/docs/specs/M4_CANCEL_SYNC_FIX/FINDINGS.md (F-CSF-3, F-CSF-4)
   - modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md (Rec 3 phase 2 context)

3. SPEC QUEUE per Brief §3 (ship in this order, one at a time):
   SPEC #1: M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION — extend the crm_status_change_events framework to cover lead + event entities (not just attendee). DDL: 1 registry row + 2 DB triggers + UI rule-editor extension.
   SPEC #2: M4_RAW_SB_WRAPPER_MIGRATION_PHASE_2 — migrate next ~25-30 sb.from() calls to DB.* wrappers. NO DDL.
   SPEC #3: M4_STATUS_MODEL_FINETUNES — F2 trigger-naming normalization + F-CSF-3 composite-NULL idiom hardening.
   SPEC #4: M4_STATUS_MODEL_DOC_UPDATE — refresh STATUS_MODEL.md per same-day fixes.

   For EACH SPEC: opticup-strategic (Foreman) authors → opticup-executor implements → opticup-reviewer audits → opticup-localhost-tester smokes → opticup-strategic (Foreman-Review) closes. Smoke 7/7 + verdict green/yellow required before next SPEC starts. Red means escalation, skip dependent SPECs but continue with independent ones.

4. SAFETY RULES per Brief §2 (non-negotiable):
   - Zero Prizma DATA writes. Demo tenant only. Whitelisted contacts only for any test messaging.
   - No merge to main. No push to main. develop only.
   - DDL pre-approved ONLY for the items listed in Brief §2.4. Any other DDL needs escalation.
   - Iron Rule 31, 32, 12, 15, 21 enforced on every commit.
   - Max 4 SPECs. If a SPEC takes more than 2.5 hours and total run is over 6 hours, stop after the current SPEC.

5. PRE-FLIGHT DISCIPLINE per the REMOVE_CONFIRMED_VERIFIED lesson (2026-05-14): every SPEC's authoring step MUST verify the Brief's stated assumptions against live DB/code state BEFORE proceeding. If an assumption is contradicted → escalation, not silent proceed.

6. ESCALATION per Brief §2.7: if blocked, STOP, write modules/Module 4 - CRM/escalations/{ISO_TS}_OVERNIGHT_R2_BLOCKER.md, continue with OTHER independent SPECs in the queue, leave blocked SPEC for Daniel's morning review.

7. MORNING SUMMARY (mandatory final deliverable) per Brief §4: write ONE file at modules/Module 4 - CRM/docs/audits/M4_OVERNIGHT_RUN_2026_05_14_SUMMARY.md with master tag + SPECs run table + escalations + smoke results + open questions + recommended next steps with a clear recommendation.

8. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed; memory feedback_english_only_responses.md confirms). ONE concise English summary at the very end pointing Daniel to the morning summary file path + top 3 takeaways.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. Trust the Pipeline. Stop only on genuine deviation. The master safety tag (Brief §2.1) is the single rollback point.
```

---

*End of activation prompt.*
