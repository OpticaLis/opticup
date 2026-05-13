# Activation Prompt — M4 updated_at Backfill

> Paste the block below into a fresh Claude Code chat. Sonnet model.

---

```
You are running the Full Auto Pipeline on a small CRM hygiene Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_UPDATED_AT_BACKFILL_BRIEF.md

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §3.1:
   git tag -a pre-m4-updated-at-backfill-2026-05-14 -m "Pre-updated-at-backfill baseline"
   git push origin pre-m4-updated-at-backfill-2026-05-14

2. THREE TABLES per Brief §2:
   - crm_lead_notes
   - crm_event_attendees
   - crm_automation_rules
   For each: ALTER TABLE ADD COLUMN updated_at + backfill (updated_at = created_at) + ON UPDATE trigger that auto-stamps now().

3. RULE 21 CHECK: before creating a new trigger function, check pg_proc for an existing project-wide tg_set_updated_at function (or similar). The crm_leads table already has this pattern — REUSE its function if it's project-shared. If it's per-table, follow the project's existing convention. Pipeline decides between shared-function vs per-table.

4. SAFETY RULES per Brief §3 (non-negotiable):
   - Pre-flight: capture row counts of all 3 tables for both Prizma and Demo BEFORE any DDL.
   - Post-flight: confirm row count delta = 0 for all 3 tables on both tenants. We added a COLUMN; we did NOT add rows.
   - Backfill writes are semantic no-ops (updated_at = created_at). Iron Rule 22 defense-in-depth applies — the UPDATE is scoped per-table, no cross-tenant leakage.
   - DDL pre-approved per Brief §3.2 only. No other DDL.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 15, 22 enforced.
   - Iron Rule 32 ## Destructive Operations section: declare the 3 ALTER TABLE + 3 backfill UPDATEs.

5. STOP TRIGGERS per Brief §3.7:
   - Row count delta != 0 on any table → STOP.
   - Trigger doesn't fire on UPDATE in demo smoke → STOP.

6. SMOKE per Brief §5: insert/update/update test rows in each of the 3 tables on demo. Verify updated_at advances. Clean up.

7. COMMIT BUDGET per Brief §3.6: 2-3 commits, cap at 4.

8. ESCALATION: if anything unsafe surfaces, write modules/Module 4 - CRM/escalations/{ISO_TS}_UPDATED_AT_BACKFILL_BLOCKER.md.

9. COMMUNICATION: English status updates between phases. ONE concise English summary at end: row counts pre/post, trigger naming, smoke results, ready for develop→main PR.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
