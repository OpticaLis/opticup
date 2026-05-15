# Activation: Demo End-to-End Full Audit + Fix-As-You-Go (Overnight)

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_E2E_FULL_AUDIT_BRIEF.md`

**Mission:** Run an overnight comprehensive audit + fix-as-you-go of every behavioral flow in demo's CRM/event/lead/messaging system. Fix the confirmed §3 bug first. Then run all scenarios in Blocks A-G of the Brief. Fix everything you find. Don't stop for questions. Produce a clear morning report Daniel reads.

**Pre-condition you must respect throughout:**
- Demo tenant ONLY (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- Whitelist enforced for ALL test contacts:
  - Phones: `0537889878`, `0503348349`, `0507168471`
  - Emails: `danylis92@gmail.com`, `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`
- Prizma is read-only across the entire run
- No schema changes
- No hard DELETE — only soft-delete on test artifacts you created
- No merge to main

**Deliverables (in SPEC folder `M4_DEMO_E2E_FULL_AUDIT/`):**
- `AUDIT_REPORT.md` — primary morning report (executive summary + bug §3 status + Block A-G results + 3-bucket classification of all findings)
- `COMMITS_LIST.md` — every commit with one-line description
- `TEST_ARTIFACTS_LOG.md` — every lead/event you created or deleted
- Standard EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry

**Continuous-Run Mandate (OVERNIGHT — fully autonomous):**
- Run in ONE Claude Code chat for up to 8 hours
- DO NOT stop for any question
- DO NOT ask Daniel anything
- For every bug found: fix it. Classify your confidence:
  - 🟢 Fixed (confident) — clear-cut bug, fix is obvious from existing patterns
  - 🟡 Fixed (uncertain - review) — bug was real but the right fix isn't certain; you chose the best option but Daniel should review
  - 🔴 Not Fixed (needs Architect) — fix would require schema change, touching Prizma, or major architectural decision; log only

**Step 1: Fix the confirmed bug §3 of the Brief — CORRECTED UNDERSTANDING**

This is TWO intertwined bugs. Read Brief §3 in detail. Summary in Hebrew terms:

**Bug 3.1 — Wrong audience for the "additional event waitlist invite" automation:**
- The flow `event_invite_waiting_list` / "הזמנה לאירוע נוסף - רשימת המתנה" is currently configured (per Daniel's UI screenshot 2026-05-11) to send to "כל Tier 2 (כל הרשומים)" — all registered leads.
- It SHOULD send ONLY to leads on the main leads board (`crm_leads` table) whose `status = 'רשימת המתנה'` (Waiting List in the main board).
- "Main leads board" = `crm_leads` table — NOT any event's attendee list. This is critical.
- The other automation that sends to status="ממתין" (Pending) leads is already working correctly — don't touch it.

**Bug 3.2 — Send-message auto-attaches recipient as event attendee:**
- When `event_invite_waiting_list` template is sent, the codepath also INSERTs the recipient into the new event's attendee table with status "הוזמן" (Invited).
- This is wrong. The message is a marketing invitation, not a registration.
- Recipients should NOT appear in the event's attendee list as a result of being sent the invitation.
- They appear only after they actively register (click link → fill form → submit).
- Note on the visible UI: "הוזמן" status often shows as not counting toward capacity (so cap displays 0/1 even when 1 person is attached), but in the DB the slot IS taken — so a real registrant who clicks the link gets bumped to waitlist. The UI lies; the DB tells the truth. Fix the underlying DB-level auto-attach.

Find the codepath (likely an automation_rule row + an RPC or trigger or EF handler). Fix both:
1. The automation rule's audience filter — must be `crm_leads.status = 'רשימת המתנה'` on the main board
2. The auto-attach side-effect on send — must be removed for this template specifically

After fix: create a clean test event, populate the main board with whitelisted-contact test leads at various statuses, open registration on the test event, observe — only "רשימת המתנה"-status leads on the main board get the message, AND no one is auto-attached to the new event.

**Visual verification via Chrome MCP is REQUIRED for this fix.** Use `mcp__Claude_in_Chrome__*` tools to:
1. Navigate to demo CRM
2. Create a test event
3. Visually confirm the attendee list stays empty
4. Click the registration link from one whitelisted test lead → verify they register successfully into the open slot
5. Screenshot before/after for AUDIT_REPORT.md

**Step 2: Run every scenario in Blocks A-G**

See Brief §4 for the full list (Lead Lifecycle, Event Lifecycle, Messaging Flows, Storefront Integration, Event Board UI, Edge Cases, Data Integrity).

For each scenario:
1. Set up clean state (delete any leftover test artifacts from prior scenario)
2. Execute the scenario step-by-step
3. Observe actual behavior vs expected
4. If broken → fix it (per the 3-bucket confidence classification)
5. Re-run after fix to verify
6. Log to AUDIT_REPORT.md

**Step 3: Final cleanup + report**

After all blocks complete:
1. Soft-delete every test lead + event created by this Pipeline (NOT pre-existing demo data)
2. Generate AUDIT_REPORT.md as the primary morning deliverable
3. Verify Prizma's data is bit-identical to pre-run snapshot (hash check on key tables)
4. Pre-commit gates green
5. Push all commits to `origin/develop`

**Destructive Operations Envelope:**
- INSERT test leads + events on demo
- UPDATE demo rules / templates / config rows
- UPDATE demo Edge Function code or RPC bodies as needed for bug fixes
- Soft-DELETE (set `is_deleted=true`) on test artifacts created by this Pipeline only
- FORBIDDEN: hard DELETE, Prizma writes, schema changes, merge to main, message to non-whitelisted contact
- Anything outside envelope → STOP + escalate (but tonight, this should be rare — most things are in scope)

**Stop Triggers (rare):**
- Iron Rule 31/32 violation
- Attempted write to Prizma scope (catastrophic regression signal)
- Database connection lost
- Pre-commit gate fails 3 times in a row (structural problem)

In ANY other case → keep running. Fix. Log. Move on.

**Success Criteria:**
1. Bug §3 fixed and verified via fresh test event
2. All Blocks A-G executed
3. AUDIT_REPORT.md complete with 3-bucket classification
4. All test artifacts cleaned (soft-deleted)
5. Prizma untouched (hash verification)
6. `npm run verify:integrity` exit 0
7. `npm run smoke` 7/7 PASS
8. Working tree clean
9. Pushed to `origin/develop`

**Closure:** Pipeline writes FOREMAN_REVIEW.md + 2 lessons each. End with ONE Hebrew summary in this format:

> ✅ Demo E2E Audit CLOSED 🟢 — באג ראשי תוקן. בלוקים A-G נסרקו. {N} תיקונים בטוחים, {M} לבדיקה בבוקר, {K} ממתינים להחלטה. AUDIT_REPORT.md מוכן בנתיב {path}.

Begin with Bug §3. Then proceed through Blocks A-G in order. Don't stop. Good morning, Daniel.
