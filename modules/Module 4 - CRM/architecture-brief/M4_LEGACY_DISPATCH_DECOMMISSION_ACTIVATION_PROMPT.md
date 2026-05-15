# Activation Prompt — M4 Legacy Dispatch Decommission

> Paste the block below into a fresh Claude Code chat. Opus model. Overnight run (~6-10+ hours).
>
> **BEFORE PASTING:** start localhost manually:
> ```
> cd C:\Users\User\opticup
> .\scripts\start-local.ps1
> ```
> Verify http://localhost:3000 is reachable. Then paste.

---

```
You are running the Full Auto Pipeline overnight on a production-automation decommission Brief. Use Opus model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_LEGACY_DISPATCH_DECOMMISSION_BRIEF.md

Read the Brief in full BEFORE doing anything else. §2 Safety Envelope is non-negotiable. The §2.3 whitelist is the hardest gate of the run.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §2.1:
   git tag -a pre-legacy-dispatch-decommission-2026-05-14 -m "Pre-legacy-dispatch-decommission baseline"
   git push origin pre-legacy-dispatch-decommission-2026-05-14

2. SECOND ACTION — LOCALHOST HEALTH CHECK per Brief §2.5:
   Confirm http://localhost:3000 is reachable. If not, run scripts/start-local.ps1 once. If still not reachable after the script's 30-second health check, STOP, write escalation, halt run.

3. THIRD ACTION — WHITELIST VERIFICATION per Brief §2.3:
   Query demo tenant's test_mode_sms_allowlist and ui_config.test_mode_email_allowlist. Confirm they contain EXACTLY these:
   - Phones: 0537889878, 0503348349, 0507168471
   - Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com
   If allowlists differ, STOP, do NOT update them autonomously — write escalation.

4. FIVE PHASES per Brief §3:
   Phase 1: Discovery — inventory every legacy CrmAutomation.evaluate-style call site + map to crm_automation_rules. Save to modules/Module 4 - CRM/docs/audits/LEGACY_DISPATCH_INVENTORY_2026_05_14.md. If more than ~30 automations → STOP, scope premise wrong.
   Phase 2: Per-automation migration with localhost-tester gate on EVERY automation. Failed-5-times → escalate that automation, continue with others.
   Phase 3: Full regression sweep — walk EVERY operator action one more time end-to-end via localhost-tester. Capture SQL chain artifacts.
   Phase 4: Legacy code removal — ONLY if every automation is MIGRATED (no ESCALATED, no REGRESSION). Hard gate: all green or skip Phase 4 entirely.
   Phase 5: Morning summary — write LEGACY_DISPATCH_DECOMMISSION_SUMMARY_2026_05_14.md.

5. SAFETY RULES per Brief §2 (non-negotiable):
   - WHITELIST (§2.3): any test message to non-whitelisted recipient → STOP IMMEDIATELY.
   - Demo tenant ONLY for all testing. Zero Prizma writes of any kind until Phase 4, and Phase 4 is JS/code only — no Prizma DML.
   - All work on develop. NEVER touch main.
   - Localhost (§2.5): mandatory before any smoke. If unreachable after 1 retry → escalation.
   - DDL minimal/none. Schema-touching → escalation.
   - Iron Rule 31, 32, 12, 15, 21, 22 enforced.

6. ESCALATION per Brief §2.9: write modules/Module 4 - CRM/escalations/{ISO_TS}_LEGACY_DISPATCH_DECOMMISSION_BLOCKER.md, continue with OTHER independent automations.

7. TIME: no hard cap. Daniel approves long run (10+ hours acceptable). Quality > speed. Per-automation loop cap is 5 retries before escalating that automation.

8. NO MAIN MERGE per Brief §2.10: the morning summary tells Daniel "merge decision is yours". The Pipeline is 100% accountable for verification correctness. Pipeline should issue its own go/no-go in the summary.

9. PIPELINE ACCOUNTABILITY: the Pipeline owns end-to-end verification. Localhost-tester runs each automation in Chrome MCP. Each smoke captures: (a) operator action performed, (b) crm_status_change_events row created, (c) consumer enqueued message_queue row, (d) dispatch to whitelisted recipient succeeded, (e) crm_message_log shows status='sent', (f) recipient phone/email body matches template expected output. All 6 verified per automation = green for that automation.

10. COMMUNICATION: English status updates between phases. ONE concise English summary at the end pointing Daniel to the summary file path + top 3 takeaways + Pipeline's go/no-go verdict.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
