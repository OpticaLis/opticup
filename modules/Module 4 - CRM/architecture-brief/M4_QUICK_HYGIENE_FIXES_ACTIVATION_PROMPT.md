# Activation Prompt — M4 Quick Hygiene Fixes

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). Sonnet model.

---

```
You are running the Full Auto Pipeline on a small CRM hygiene Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_QUICK_HYGIENE_FIXES_BRIEF.md

Source audit (for context): modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md — Rec 6 and Rec 7.

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §3.1:
   git tag -a pre-m4-quick-hygiene-fixes-2026-05-14 -m "Pre-quick-hygiene-fixes baseline"
   git push origin pre-m4-quick-hygiene-fixes-2026-05-14

2. TWO WORK ITEMS per Brief §2:
   2.1 Fix v_crm_event_dashboard view: change INNER JOIN crm_campaigns to LEFT JOIN. Single line edit. CREATE OR REPLACE VIEW. Same column list, same RLS.
   2.2 Add explicit verify_jwt = false declarations to supabase/config.toml for every public EF whose live verify_jwt is currently false. CRITICAL: do not trust the audit's list — query Supabase MCP list_edge_functions and confirm the actual live set before editing config.toml. Add a [functions.<slug>] block with verify_jwt = false for each.

3. SAFETY RULES per Brief §3 (non-negotiable):
   - DDL pre-approved: ONLY the CREATE OR REPLACE VIEW for v_crm_event_dashboard. NO other DDL.
   - NO EF redeploys. Editing config.toml is enough — declarative source of truth update. Server state unchanged.
   - NO Prizma data writes. View recreation is schema-only.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 13, 15 enforced.

4. STOP TRIGGERS per Brief §3.7:
   - Audit-cited list of 6 public EFs doesn't match live set → STOP, use the LIVE set.
   - v_crm_event_dashboard recreation changes column list → STOP.

5. COMMIT BUDGET per Brief §3.6: 2-3 commits, cap at 4.

6. ESCALATION: if any step is unsafe, write modules/Module 4 - CRM/escalations/{ISO_TS}_QUICK_HYGIENE_BLOCKER.md.

7. COMMUNICATION: English status updates between phases. ONE concise English summary at end pointing to: confirmed list of EFs with explicit verify_jwt=false in config.toml; v_crm_event_dashboard count delta on Prizma (events now visible that previously were hidden); demo smoke results; whether ready for develop→main PR.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
