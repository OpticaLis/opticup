# Activation Prompt — M4 Remove confirmed_verified

> Paste the block below into a fresh Claude Code chat. Sonnet model.

---

```
You are running the Full Auto Pipeline on a status-cleanup Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_REMOVE_CONFIRMED_VERIFIED_BRIEF.md

Context: confirmed_verified is a dead lead status. 0 leads carry it on Prizma + Demo. The status was second-stage manual verification, replaced by booking-fee deposits. The sync_lead_status_from_attendee RPC still maps attendee.status='purchased' → lead.status='confirmed_verified', but no code writes 'purchased' to attendee.status today. Daniel approved removal (chat 2026-05-14). Future "purchaser" status is separate work.

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §4.1:
   git tag -a pre-m4-remove-confirmed-verified-2026-05-14 -m "Pre-remove-confirmed-verified baseline"
   git push origin pre-m4-remove-confirmed-verified-2026-05-14

2. FOUR WORK ITEMS per Brief §3:
   3.1 UPDATE crm_statuses SET is_active=false WHERE slug='confirmed_verified' AND entity_type='lead' on BOTH Prizma + Demo (2 single-row UPDATEs). Soft-deactivate, not hard DROP.
   3.2 CREATE OR REPLACE FUNCTION sync_lead_status_from_attendee — remove the 'purchased' → 'confirmed_verified' branch. Same signature, same return type, same RLS.
   3.3 Edit modules/crm/crm-helpers.js — remove 'confirmed_verified' from TIER2_STATUSES array.
   3.4 grep project for 'confirmed_verified' string. Flag remaining references in FINDINGS.

3. PRE-FLIGHT (mandatory): confirm 0 leads at status='confirmed_verified' on BOTH tenants. If any → STOP, assumption is wrong.

4. SAFETY RULES per Brief §4 (non-negotiable):
   - DDL pre-approved: ONE RPC body rewrite (CREATE OR REPLACE FUNCTION). NO other DDL.
   - Data writes pre-approved: 2 single-row UPDATEs on crm_statuses (one per tenant). NO writes to crm_leads.
   - Capture original RPC body in EXECUTION_REPORT.md §2 BEFORE rewriting. Enables rollback.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 15 enforced.
   - Iron Rule 32 ## Destructive Operations: declare the 2 UPDATEs + 1 RPC rewrite.

5. STOP TRIGGERS per Brief §4.7:
   - Any lead carries status='confirmed_verified' pre-flight → STOP.
   - Demo smoke: sync RPC behavior unexpected → STOP.
   - More than 5 string references in cross-asset grep → STOP.

6. SMOKE per Brief §6: Demo first (test sync RPC + verify is_active=false + grep clean), then Prizma (single UPDATE on is_active, RPC already applied globally).

7. COMMIT BUDGET per Brief §4.6: 2-3 commits, cap at 4.

8. ESCALATION: if blocked, write modules/Module 4 - CRM/escalations/{ISO_TS}_REMOVE_CONFIRMED_VERIFIED_BLOCKER.md.

9. COMMUNICATION: English status updates between phases. ONE concise English summary at end: confirmed_verified state on both tenants, RPC body diff, TIER2_STATUSES post-state, grep results, demo smoke results, ready for develop→main PR.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
