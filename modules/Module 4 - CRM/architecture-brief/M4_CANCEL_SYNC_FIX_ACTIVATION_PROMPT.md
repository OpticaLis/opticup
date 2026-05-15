# Activation Prompt — M4 Cancel-Sync Fix

> Paste the block below into a fresh Claude Code chat. Sonnet model.

---

```
You are running the Full Auto Pipeline on a small CRM bug fix Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_CANCEL_SYNC_FIX_BRIEF.md

Source finding: modules/Module 4 - CRM/docs/STATUS_MODEL.md §6 Finding F4 (HIGH) — operator-driven attendee cancel does not propagate to the lead's main-board status.

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §3.1:
   git tag -a pre-m4-cancel-sync-fix-2026-05-14 -m "Pre-cancel-sync-fix baseline"
   git push origin pre-m4-cancel-sync-fix-2026-05-14

2. THE FIX per Brief §2.1: modules/crm/crm-attendee-cancel.js currently UPDATEs attendee.status='cancelled' without calling sync_lead_status_from_attendee. Fix: invoke the sync after the UPDATE returns. Match the existing sync call convention used elsewhere in the codebase (register_lead_to_event RPC's tail is a good reference).

3. OPTION A vs B per Brief §2.2:
   - (a) Client-side call to sync after UPDATE — minimum viable.
   - (b) New RPC cancel_attendee doing UPDATE+sync atomically — cleaner.
   Pipeline decides. (a) is faster ship and zero DDL. (b) is bigger but eliminates the race window.

4. SCOPE DISCIPLINE per Brief §2.3: grep for other client-side direct UPDATE call sites on crm_event_attendees.status. If found, FLAG in FINDINGS but DO NOT fix here. Stop trigger: more than 2 such call sites → escalate.

5. SAFETY RULES per Brief §3:
   - DDL: zero if Option (a). One new RPC if Option (b), with Iron Rule 15 canonical policy + Iron Rule 22 FROM PUBLIC revoke + tenant_id JWT-claim guard.
   - NO historical backfill of stale leads. Forward-only fix.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 15, 22 enforced.
   - Iron Rule 32 ## Destructive Operations declared.

6. STOP TRIGGERS per Brief §3.6:
   - Demo smoke: sync runs but produces WRONG lead status → STOP, sync RPC may need updating first.
   - More than 2 other client-side direct attendee.status UPDATE sites → STOP, scope grew.

7. SMOKE per Brief §5: two scenarios on demo — single-attendee cancel and multi-attendee partial cancel. Both must produce correct lead.status post-cancel.

8. COMMIT BUDGET per Brief §3.5: 2-3 commits, cap at 4.

9. ESCALATION: write modules/Module 4 - CRM/escalations/{ISO_TS}_CANCEL_SYNC_BLOCKER.md if blocked.

10. COMMUNICATION: English status updates between phases. ONE concise English summary at end: option chosen, file(s) touched, other-callsite grep results, pre-cancel stale lead count on Prizma (informational), demo smoke results, ready for develop→main PR.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
