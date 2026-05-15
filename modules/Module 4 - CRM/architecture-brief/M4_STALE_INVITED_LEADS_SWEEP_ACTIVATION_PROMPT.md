# Activation Prompt — M4 Stale Invited Leads Sweep

> Paste the block below into a fresh Claude Code chat. Sonnet model.

---

```
You are running the Full Auto Pipeline on a CRM data-sweep Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_STALE_INVITED_LEADS_SWEEP_BRIEF.md

Source finding: modules/Module 4 - CRM/docs/specs/M4_CANCEL_SYNC_FIX/FINDINGS.md → F-CSF-1 (INFO, 960 stale invited leads on Prizma).

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §3.1:
   git tag -a pre-m4-stale-invited-leads-sweep-2026-05-14 -m "Pre-stale-invited-leads-sweep baseline"
   git push origin pre-m4-stale-invited-leads-sweep-2026-05-14

2. THE SWEEP per Brief §2:
   - Identify Prizma leads with status='invited' AND no non-deleted attendee rows on non-closed/non-completed events.
   - Call sync_lead_status_from_attendee RPC for each. The RPC's existing logic recomputes correct status.
   - Process in batches of 50-100.
   - Demo first (smoke) → Prizma after.

3. PRE-SWEEP DATA CAPTURE per Brief §3.3: capture full list of affected lead_ids + current status in EXECUTION_REPORT.md §2 BEFORE any UPDATE. This is the rollback artifact (the master safety tag is repo-only; the snapshot is data-only).

4. SAFETY RULES per Brief §3 (non-negotiable):
   - Prizma writes ARE authorized: ~960 lead-row UPDATEs on crm_leads.status ONLY. No other column.
   - All UPDATEs come from the RPC's internal logic — Pipeline does NOT write direct UPDATE statements against crm_leads.
   - Zero DDL.
   - No code changes. No new RPC. No new view.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 15 enforced.
   - Iron Rule 32 ## Destructive Operations: declare the ~960 UPDATE-via-RPC operations.

5. STOP TRIGGERS per Brief §3.7:
   - Pre-sweep count outside 800-1200 range → STOP, escalate.
   - Sync RPC produces a status NOT in [waiting, invited, waitlist, confirmed, confirmed_verified, attended] → STOP.
   - Post-sweep count of stale invited leads != 0 → STOP, investigate.

6. COMMIT BUDGET per Brief §3.6: 1-2 commits, cap at 3.

7. ESCALATION: if any stop trigger fires, write modules/Module 4 - CRM/escalations/{ISO_TS}_STALE_INVITED_SWEEP_BLOCKER.md.

8. COMMUNICATION: English status updates between phases. ONE concise English summary at end: pre/post counts (Demo + Prizma), distribution table by post-sweep status, any unexpected slug encountered, ready for develop→main PR (SPEC commits only — data is already live).

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point for the SPEC; the pre-sweep snapshot is the rollback artifact for the data.
```

---

*End of activation prompt.*
