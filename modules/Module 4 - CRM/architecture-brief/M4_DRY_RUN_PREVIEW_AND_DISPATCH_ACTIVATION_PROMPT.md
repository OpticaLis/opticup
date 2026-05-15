# Activation Prompt — M4 Dry-Run Preview + Manual Curation + Queue Cancellation

> Paste the block below into a fresh Claude Code chat. Opus model. Overnight run (~10-12 hours).
>
> **BEFORE PASTING:** start localhost manually:
> ```
> cd C:\Users\User\opticup
> .\scripts\start-local.ps1
> ```
> Verify http://localhost:3000 is reachable. Then paste.

---

```
You are running the Full Auto Pipeline overnight on a feature-build Brief. Use Opus model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_DRY_RUN_PREVIEW_AND_DISPATCH_BRIEF.md

Read the Brief in full BEFORE doing anything else. §2 Safety Envelope is non-negotiable. The §4.2 whitelist is the hardest gate of the run.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §4.1:
   git tag -a pre-dry-run-preview-2026-05-14 -m "Pre-dry-run-preview baseline"
   git push origin pre-dry-run-preview-2026-05-14

2. SECOND ACTION — LOCALHOST HEALTH CHECK per Brief §4.4:
   Confirm http://localhost:3000 is reachable. If not, run scripts/start-local.ps1 once. If still not reachable after the script's 30-second health check, STOP, write escalation, halt run.

3. THIRD ACTION — WHITELIST VERIFICATION per Brief §4.2:
   Query demo tenant's test_mode_sms_allowlist and ui_config.test_mode_email_allowlist. Confirm they contain EXACTLY these:
   - Phones: 0537889878, 0503348349, 0507168471
   - Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com
   If allowlists differ, STOP, do NOT update them autonomously — write escalation.

4. ELEVEN WORK AREAS per Brief §3 (executed in the Brief §5 phase order):
   3.1 Add mode='dispatch_preview' to automation-engine EF.
   3.2 Refactor CrmConfirmSend modal to consume the EF dry_run output (server-authoritative previews).
   3.3 Per-recipient body preview (click-to-expand).
   3.4 In-list search (client-side filter).
   3.5 Manual recipient deselection (checkboxes, default checked, captured in client state, sent as exclude_lead_ids on dispatch).
   3.6 Test-send to first 3 (alphabetical subset).
   3.7 Queue-side cancellation (broadcast_id + UPDATE crm_message_queue WHERE processed_at IS NULL → status='cancelled').
   3.8 Incremental count display.
   3.9 Quick filter chips (All / Last 30 days / No previous registration / Customers).
   3.10 Per-recipient message history line.
   3.11 Session-saved selections.
   "Reverse selection" is EXPLICITLY OUT OF SCOPE per Daniel's Brief §2 #4.

5. NINE PHASES per Brief §5:
   Phase 1: Discovery + UX sketch.
   Phase 2: EF dry_run mode.
   Phase 3: Modal refactor.
   Phase 4: Search + body preview + checkboxes.
   Phase 5: Test-send to first 3.
   Phase 6: Queue-side cancellation.
   Phase 7: Quality-of-life additions (3.8-3.11).
   Phase 8: Full regression smoke.
   Phase 9: Morning summary.

6. SAFETY RULES per Brief §4 (non-negotiable):
   - WHITELIST (§4.2): any test message to non-whitelisted recipient → STOP IMMEDIATELY.
   - Demo tenant ONLY. Zero Prizma writes of any kind throughout.
   - All work on develop. NEVER touch main.
   - Localhost (§4.4): mandatory before any UI smoke. Unreachable after 1 retry → escalation.
   - DDL: NO DDL expected. Schema-touching needs → escalation.
   - Iron Rule 31, 32, 12, 15, 21, 22 enforced.

7. PRE-FLIGHT DISCIPLINE per the REMOVE_CONFIRMED_VERIFIED + LEGACY_DISPATCH_DECOMMISSION lessons (2026-05-14): EVERY phase's authoring step MUST verify the Brief's stated assumptions against live DB/code state BEFORE proceeding. If an assumption is contradicted → escalation, not silent proceed. Specifically:
   - Confirm the literal symbol CrmAutomationClient.evaluate exists in the codebase (NOT CrmAutomation.evaluate).
   - Confirm the existing modal's data shape before refactoring it.
   - Confirm crm_message_queue has a broadcast_id concept OR plan to introduce one cleanly.

8. EF DEPLOY FALLBACK per Brief §4.8: if MCP deploy_edge_function returns InternalServerError (OPEN-021), write DEPLOY_FALLBACK_NEEDED.md with explicit verify_jwt flag for automation-engine (currently true — confirm via get_edge_function BEFORE writing fallback). Daniel CLI-deploys.

9. LOCALHOST-TESTER PER PHASE per Brief §6: Chrome MCP opens localhost, performs operator action, captures DOM + DB chain + recipient inbox + cancellation chain. All 4 verified per UI phase = green.

10. ESCALATION per Brief §4.10: if blocked, write modules/Module 4 - CRM/escalations/{ISO_TS}_DRY_RUN_PREVIEW_BLOCKER.md, continue with OTHER independent work areas.

11. NO MAIN MERGE per Brief §4.9: morning summary explicitly tells Daniel "Review the modal in localhost yourself before merging." Pipeline owns 100% of verification correctness; merge decision is Daniel's. Pipeline issues its own go/no-go verdict in the summary.

12. TIME BUDGET per Brief §4.7: no hard cap. Quality > speed. ~10-12 hours expected. Per-phase loop cap is 5 retries before escalating that phase.

13. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed; memory feedback_english_only_responses.md confirms). ONE concise English summary at the end pointing Daniel to the summary file path + top 3 takeaways + Pipeline's go/no-go verdict.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. Trust the Pipeline. Stop only on genuine deviation. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
