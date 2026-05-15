# Activation Prompt — Waitlist Sync Priority Fix + Event-Close Recycle

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). Sonnet model.

---

```
You are running the Full Auto Pipeline on a CRM fix Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/WAITLIST_SYNC_PRIORITY_FIX_BRIEF.md

Predecessor investigation (READ THIS FIRST for full context): modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md

Read both files in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §4.1:
   git tag -a pre-waitlist-sync-priority-fix-2026-05-14 -m "Pre-waitlist-sync-priority-fix baseline"
   git push origin pre-waitlist-sync-priority-fix-2026-05-14

2. FOUR WORK ITEMS per Brief §3, executed in the LOCKED ORDER from §4.2:
   Step 1: Update sync_lead_status_from_attendee RPC — give waitlist precedence over other active statuses (Decision #1). Small body edit, no DDL.
   Step 2: New event-close recycle mechanism (§3.3) — DB trigger on crm_events when status transitions to closed/completed, OR existing automation framework if cleaner. Effect: for attendees on the closing event with status IN ('invited','attended') AND is_deleted=false, set lead.status='waiting'.
   Step 3: Demo smoke test — create test event, register test lead with attendee status 'invited', close event, verify lead recycled to 'waiting'. Repeat with 'attended'. Verify 'registered' / 'confirmed_verified' did NOT recycle.
   Step 4: ONLY AFTER step 3 green — run §3.4 retroactive recycle on past Prizma + Demo events.
   Step 5: ONLY AFTER step 4 green — run §3.2 retroactive sync for waiting_list leads. (§3.2 last so waitlist priority wins final state.)

3. SAFETY RULES per Brief §4 (non-negotiable):
   - Prizma writes ARE authorized: ~8 lead UPDATEs from §3.2, dozens to ~150 from §3.4. ALL writes are on crm_leads.status only. No other column. No deletes.
   - Capture pre-state snapshot of every UPDATE target in EXECUTION_REPORT.md §2 before any UPDATE. Enables row-by-row rollback if needed.
   - DDL pre-approved: ONE trigger on crm_events + ONE RPC body update. No other DDL.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 15 enforced.
   - Iron Rule 32 ## Destructive Operations section in SPEC.md MUST declare the UPDATEs as destructive.

4. ORDERING CRITICALITY: Steps 4 and 5 MUST run in that order. If reversed, §3.2 might mark a lead 'waitlist' that §3.4 then overwrites to 'waiting'. Running §3.2 LAST locks waitlist precedence into the final state.

5. STOP TRIGGERS per Brief §4.7:
   - If any UPDATE in §3.2 or §3.4 would affect a lead whose attendee row is on a non-closed/non-completed event with status='waiting_list' → STOP, ordering wrong.
   - If demo smoke step 3 fails (wrong status recycled) → STOP.
   - If retroactive recycle would affect more than 300 Prizma rows → STOP, surface to Daniel.

6. COMMIT BUDGET per Brief §4.6: 5-7 commits, cap at 8.

7. ESCALATION: if any step's premise is wrong or unsafe, STOP, write modules/Module 4 - CRM/escalations/{ISO_TS}_WAITLIST_SYNC_BLOCKER.md.

8. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed). ONE concise English summary at the end pointing to final HEAD, count of leads recycled (§3.4), count of leads waitlisted (§3.2), demo smoke results, and whether ready for develop→main PR.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
