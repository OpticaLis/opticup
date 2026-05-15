# Activation Prompt — M4 Dry-Run Preview E2E Validation

> Paste the block below into a fresh Claude Code chat. Opus model. ~6-10 hours.
>
> **BEFORE PASTING:** confirm localhost is running:
> ```
> cd C:\Users\User\opticup
> .\scripts\start-local.ps1
> ```

---

```
You are running the Full Auto Pipeline on an EXHAUSTIVE end-to-end validation Brief. Use Opus model. NO CODE CHANGES, NO DDL — validation only.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_DRY_RUN_PREVIEW_E2E_VALIDATION_BRIEF.md

Context: the preceding SPEC (M4_DRY_RUN_PREVIEW_AND_DISPATCH) shipped the v2 modal feature but deferred browser-DOM smoke to Daniel. That was a Brief violation — Daniel's standing requirement is Pipeline owns 100% of verification correctness BEFORE any merge. This Brief authorizes the missing exhaustive validation.

Read the Brief in full BEFORE doing anything else. §4 Safety Envelope is non-negotiable.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §4.1:
   git tag -a pre-dry-run-preview-validation-2026-05-14 -m "Pre-validation baseline"
   git push origin pre-dry-run-preview-validation-2026-05-14

2. SECOND ACTION — LOCALHOST HEALTH CHECK per Brief §4.4: confirm http://localhost:3000 reachable. If not → STOP, escalate.

3. THIRD ACTION — WHITELIST VERIFICATION per Brief §4.2: confirm demo allowlists contain EXACTLY:
   - Phones: 0537889878, 0503348349, 0507168471
   - Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com
   If different → STOP, do not update autonomously.

4. FIVE PHASES per Brief §3:
   Phase 1: Enumerate every active crm_automation_rules row on demo. If >30 → STOP, escalate.
   Phase 2: Per-automation E2E test (the bulk of the run). Setup → Chrome MCP execute → modal interaction validation → DB chain validation → recipient inbox validation → cancel test for 3+ rules → save per-rule artifact.
   Phase 3: Cross-cutting tests (session-save persistence, 6h TTL, stale-id, empty-recipient, legacy v1 backward compat).
   Phase 4: Cleanup all test data created during the run.
   Phase 5: Morning summary with GO/NO-GO verdict.

5. PER-AUTOMATION TEST RIGOR per Brief §3.2:
   - Recreate test data freely (DELETE + INSERT demo leads/events as needed).
   - Modal: search, recipient body expand, chip filters (all 4), checkbox toggle, test-send-to-3, approve-and-send, cancel toast.
   - DB chain: crm_message_queue created + drained + crm_message_log updated + activity_log entry.
   - Recipient inbox: SMS to whitelisted phone + email to whitelisted address.
   - Cancel test for 3+ rules: mid-dispatch cancel → queue rows flip to cancelled → cron does NOT drain.
   - Save artifact per rule at modules/Module 4 - CRM/docs/audits/v2-modal-validation/{rule_slug}.md.

6. SAFETY RULES per Brief §4 (non-negotiable):
   - WHITELIST is the hardest gate. Any non-whitelisted dispatch → STOP IMMEDIATELY.
   - Demo tenant ONLY. ZERO Prizma writes throughout.
   - NO CODE CHANGES. NO DDL. NO automation rule edits.
   - Bugs found → write FINDINGS entry, continue. Do NOT fix.
   - All work on develop. NEVER touch main.
   - Iron Rule 31, 32, 12, 15, 21, 22 enforced.

7. CLEANUP per Brief §3.4: delete every test artifact created. Confirm demo tables back to pre-run row counts. Pre-existing demo data UNTOUCHED.

8. ESCALATION per Brief §4.9: write modules/Module 4 - CRM/escalations/{ISO_TS}_VALIDATION_BLOCKER.md, continue with other automations.

9. PIPELINE ACCOUNTABILITY: Pipeline issues GO/NO-GO verdict in morning summary. Daniel merges manually after reviewing the artifact bundle. Pipeline does NOT merge to main.

10. TIME: no hard cap. 5 retries per scenario before escalating that scenario. Continue with other automations.

11. COMMUNICATION: English status updates between phases. ONE concise English summary at end: total automations tested + green/red/escalated breakdown + cleanup confirmation + Pipeline GO/NO-GO + top 3 findings + artifact bundle path.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point. This is validation only — Pipeline produces artifacts; Daniel decides merge.
```

---

*End of activation prompt.*
