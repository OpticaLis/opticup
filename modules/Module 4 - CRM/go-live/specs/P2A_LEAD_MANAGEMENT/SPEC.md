# SPEC — P2A_LEAD_MANAGEMENT

> **Location:** `modules/Module 4 - CRM/go-live/specs/P2A_LEAD_MANAGEMENT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-21
> **Module:** 4 — CRM
> **Phase:** P2a (Go-Live)
> **Execution environment:** Claude Code local (Windows desktop)

---

## 1. Goal

Wire the CRM lead-management actions so that a user can change a lead's status
(individual + bulk), add notes, and transfer a lead from Tier 1 to Tier 2 —
turning the currently read-only lead tables into a working lead-management tool.

---

## 2. Background & Motivation

P1 built the intake pipeline: leads arrive in `crm_leads` with `status='new'`
via the `lead-intake` Edge Function. But once a lead is in the CRM, there is
no way to act on it — the buttons are visual stubs that show "בקרוב". Daniel
cannot change a status, add a note, or approve a lead without touching
Supabase directly.

P2a gives Daniel the minimum actions to run the daily lead-review workflow:
look at incoming leads (Tier 1), change their status (e.g. mark as
`no_answer`), add notes, and approve-and-transfer good leads to Tier 2
(`waiting` status).

**Why split P2 into a/b?** The original P2 ROADMAP covers both lead management
AND event management. That's too broad for one session (~15 JS file touches,
new RPCs, new UI modals). P2a = lead actions. P2b = event actions. This SPEC
is P2a only.

**Depends on:** P1 (done — leads can enter the system), B3-B8 (done — UI
exists with stub buttons), Phase A (done — schema + statuses seeded).

**Feeds into:** P2b (event management), P3 (Make message dispatcher — status
changes will eventually trigger messages).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Individual lead status change works | Change test lead from `new` → `no_answer` via CRM UI | DB query: `SELECT status FROM crm_leads WHERE id = '{test_lead_id}'` → `no_answer` |
| 3 | Status change writes to `crm_lead_notes` | After status change, a note exists | DB: `SELECT content FROM crm_lead_notes WHERE lead_id = '{test_lead_id}' ORDER BY created_at DESC LIMIT 1` → contains "סטטוס שונה" |
| 4 | Bulk status change works | Select 2+ leads, change to `callback` | DB: both leads have `status = 'callback'` |
| 5 | Add note from lead detail modal | Type and save a note | DB: `SELECT content FROM crm_lead_notes WHERE lead_id = '{test_lead_id}' ORDER BY created_at DESC LIMIT 1` → matches typed text |
| 6 | Notes tab refreshes after adding | New note appears in the notes list without page reload | Visual: note appears at top of list |
| 7 | Tier 1→2 transfer ("אשר והעבר") button works | Click button on a Tier 1 lead → lead status becomes `waiting` | DB: `SELECT status FROM crm_leads WHERE id = '{test_lead_id}'` → `waiting` |
| 8 | Transferred lead disappears from incoming tab | After transfer, lead no longer shows in "לידים נכנסים" | Reload incoming tab → lead not in list (its status `waiting` is not in TIER1_STATUSES) |
| 9 | Transferred lead appears in registered tab | After transfer, lead shows in "רשומים" tab | Reload registered tab → lead appears (status `waiting` is in TIER2_STATUSES) |
| 10 | Status change dropdown shows correct statuses per tier | On a Tier 1 lead: only Tier 1 statuses shown. On a Tier 2 lead: only Tier 2 statuses shown. | Visual inspection |
| 11 | All writes include `tenant_id` (Rule 22) | Every `.update()` and `.insert()` includes `tenant_id: getTenantId()` | `grep -n "tenant_id" {modified_files}` → present on every write |
| 12 | No new tables or columns created | Zero DDL | `git diff --stat` shows no `.sql` files |
| 13 | File sizes ≤ 350 lines (Rule 12) | All modified JS files | `wc -l {files}` → all ≤ 350 |
| 14 | Docs updated | SESSION_CONTEXT, CHANGELOG, MODULE_MAP | File inspection |
| 15 | Test data cleaned up | Any test leads/notes created during verification are removed | DB count check |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Modify JS files in `modules/crm/` — specifically: `crm-incoming-tab.js`, `crm-leads-tab.js`, `crm-leads-detail.js`, `crm-helpers.js`
- Add new helper functions to existing files (within 350-line limit)
- Create a new file `modules/crm/crm-lead-actions.js` if action logic needs isolation (≤ 350 lines)
- Run read-only SQL (Level 1)
- INSERT test notes in `crm_lead_notes` on demo tenant (Level 2 — approved)
- UPDATE test lead status on demo tenant (Level 2 — approved)
- DELETE test notes/data created during testing on demo tenant (Level 2 — approved)
- Commit and push to `develop`
- Update MODULE_MAP, SESSION_CONTEXT, CHANGELOG
- Choose UI patterns for status dropdown (inline dropdown, modal, popover — executor's judgment, keeping visual consistency with B8 Tailwind patterns)
- Choose how to structure the "add note" UI (inline form in notes tab vs modal)

### What REQUIRES stopping and reporting

- Any schema change (DDL) — ALTER TABLE, CREATE TABLE, etc.
- Any modification to `crm.html` structure beyond adding a `<script>` tag for a new JS file
- Any modification to `js/shared.js`
- Any modification to `crm-helpers.js` beyond adding new helper functions
- Any write to Prizma tenant (only demo tenant writes allowed)
- Any merge to `main`
- Any step where actual output diverges from §3 expected values
- Any new file exceeding 350 lines
- If `crm_lead_notes` doesn't accept inserts without `employee_id` (column is nullable per schema, but RLS might block)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If updating `crm_leads.status` via Supabase client returns an RLS error → STOP. The update should work with the tenant JWT, but if it doesn't, there's a policy issue.
- If inserting into `crm_lead_notes` returns an RLS error → STOP, report exact error.
- If any modified JS file exceeds 350 lines after edits → STOP, propose a split.
- If `TIER1_STATUSES` or `TIER2_STATUSES` arrays in `crm-helpers.js` don't match the DB `crm_statuses` table → STOP, report mismatch.

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}`
- **DB:** `DELETE FROM crm_lead_notes WHERE lead_id IN (test leads) AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'`; reset test lead statuses to `new`.
- SPEC marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- **Sending messages on status change** — that's P3+P4. Status change here is DB-only.
- **Auto-approval logic** (auto-transfer to Tier 2) — deferred. This needs either a DB trigger or Edge Function enhancement. Will be a separate mini-SPEC.
- **Lead edit form** (editing name, phone, email, etc.) — the "ערוך" button stays as stub. Full edit form is a separate SPEC.
- **Event management** (create event, change event status, register to event) — that's P2b.
- **Make scenarios** — no Make work in this SPEC.
- **Schema changes** — no new tables, no new columns, no DDL.
- **CRM visual redesign** — use existing B8 Tailwind patterns only.
- **Event-day actions** — check-in and purchase are already wired from B4.
- **Bulk WhatsApp/SMS from bulk bar** — those are P4 scope (message dispatch).

---

## 8. Expected Final State

### New files (possible, executor decides)
- `modules/crm/crm-lead-actions.js` (≤ 350 lines) — if lead action logic (status change modal, note form, tier transfer) needs a dedicated file to keep other files under 350 lines

### Modified files
- `modules/crm/crm-incoming-tab.js` — add "אשר והעבר" button per row or in a row-action menu; wire row click → lead detail
- `modules/crm/crm-leads-tab.js` — wire bulk "שנה סטטוס" button to actual status change; wire row click → lead detail
- `modules/crm/crm-leads-detail.js` — wire status change dropdown in lead detail; add "add note" form in notes tab; refresh notes after adding
- `crm.html` — add `<script>` tag for `crm-lead-actions.js` if created (only this change to crm.html)
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `modules/Module 4 - CRM/docs/CHANGELOG.md`
- `modules/Module 4 - CRM/docs/MODULE_MAP.md`

### DB state (demo tenant only)
- No schema changes
- After testing: 0 test rows remain (cleanup)

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): wire lead status change — individual and bulk` — status change logic + dropdown UI
- **Commit 2:** `feat(crm): add lead notes from detail modal` — note creation form + notes tab refresh
- **Commit 3:** `feat(crm): add Tier 1→2 transfer button in incoming tab` — "אשר והעבר" button wiring
- **Commit 4:** `docs(crm): update P2a session context, changelog, module map`
- **Commit 5:** `chore(spec): close P2A_LEAD_MANAGEMENT with retrospective` — EXECUTION_REPORT.md + FINDINGS.md

---

## 10. Dependencies / Preconditions

- CRM schema deployed (Phase A) ✅
- `crm_statuses` seeded for demo tenant ✅ — verified: 11 lead statuses, 10 event statuses, 10 attendee statuses
- `crm_lead_notes` table exists ✅ — columns: id, tenant_id, lead_id, event_id (nullable), content, employee_id (nullable), created_at
- `TIER1_STATUSES` / `TIER2_STATUSES` arrays in `crm-helpers.js` ✅ — Tier 1: new, invalid_phone, too_far, no_answer, callback; Tier 2: waiting, invited, confirmed, confirmed_verified, not_interested, unsubscribed
- B8 Tailwind patterns ✅ — all UI components use Tailwind utility classes
- Demo tenant exists ✅ — slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Supabase MCP available for `execute_sql` verification

---

## 11. Lessons Already Incorporated

- FROM `P1_INTERNAL_LEAD_INTAKE/FOREMAN_REVIEW.md` §6 Proposal 1 → "Add platform notes to test protocol re: Windows UTF-8" → APPLIED: no Hebrew in curl test commands in this SPEC (all testing is via CRM UI in browser, not curl).
- FROM `P1_INTERNAL_LEAD_INTAKE/FOREMAN_REVIEW.md` §7 Proposal 1 → "Split git pull into fetch+log first" → APPLIED: executor should run `git fetch && git log HEAD..origin/develop` before pulling.
- FROM `P1_INTERNAL_LEAD_INTAKE/FOREMAN_REVIEW.md` §7 Proposal 2 → "Use `git commit -- <paths>` for selective commits" → APPLIED: noted in §9 commit plan (executor uses pathspecs).
- FROM `P1_INTERNAL_LEAD_INTAKE/FINDINGS.md` Finding 3 → "Module 4 has no db-schema.sql" → NOT APPLICABLE to this SPEC but noted as open tech debt.
- FROM `P1_INTERNAL_LEAD_INTAKE/EXECUTION_REPORT.md` Decision 4 → "Soft-deleted leads excluded from duplicate check" → APPLIED: status change should respect `is_deleted = false` filter on all queries.

---

## 12. Technical Design

### 12.1 Status Change — Individual

**Where:** Lead detail modal (`crm-leads-detail.js`) or new file `crm-lead-actions.js`.

**UI pattern:** Add a status badge/button in the lead detail header that opens a dropdown with the available statuses for the lead's current tier. Clicking a status option:
1. Calls `sb.from('crm_leads').update({ status: newStatus }).eq('id', leadId).eq('tenant_id', getTenantId())`
2. Inserts a note: `sb.from('crm_lead_notes').insert({ tenant_id: getTenantId(), lead_id: leadId, content: 'סטטוס שונה מ-' + oldStatus + ' ל-' + newStatus })`
3. Refreshes the lead detail view
4. Refreshes the parent table (incoming or registered)

**Status list logic:**
- If current status is in `TIER1_STATUSES` → show only `TIER1_STATUSES`
- If current status is in `TIER2_STATUSES` → show only `TIER2_STATUSES`
- Status labels come from `CRM_STATUSES.lead[slug].name_he`

### 12.2 Status Change — Bulk

**Where:** `crm-leads-tab.js`, bulk bar "שנה סטטוס" button.

**UI pattern:** Click "שנה סטטוס" → show a dropdown/modal with available Tier 2 statuses (bulk bar only appears on registered/Tier 2 tab). For each selected lead:
1. Same update + note insert as individual
2. After all updates, refresh the table

**Note:** The incoming tab (`crm-incoming-tab.js`) does NOT have checkbox selection / bulk bar. Bulk actions are only on the registered tab. This is correct — incoming leads are reviewed one by one.

### 12.3 Add Note

**Where:** Lead detail modal, notes tab (`crm-leads-detail.js`).

**UI pattern:** Add a text input + "הוסף" button at the top of the notes tab. On submit:
1. `sb.from('crm_lead_notes').insert({ tenant_id: getTenantId(), lead_id: leadId, content: noteText })`
2. Prepend the new note to the notes list in the DOM (no full reload needed)
3. Clear the input

### 12.4 Tier 1→2 Transfer

**Where:** `crm-incoming-tab.js` — add a button per row OR in the lead detail modal when opened from the incoming tab.

**Recommended approach:** Add a small "אשר ✓" action button in each row of the incoming table. Clicking it:
1. Updates `crm_leads SET status = 'waiting'` (first Tier 2 status = "ממתין לאירוע")
2. Inserts a note: "הועבר ל-Tier 2 (אושר)"
3. Removes the row from the incoming table (the lead now has a Tier 2 status, so it won't appear in Tier 1 filter)
4. Shows a Toast confirmation

**Alternative (executor may choose):** Instead of per-row button, add the transfer action inside the lead detail modal as a prominent button. This is also acceptable.

### 12.5 Row Click → Lead Detail

**Where:** `crm-incoming-tab.js` — currently rows don't open the lead detail modal. They should.

**Wire:** Add click handler on table rows (excluding the approve button click) that calls `openCrmLeadDetail(leadId)`. The registered tab (`crm-leads-tab.js`) should also have this if not already wired.

---

## 13. Test Protocol

Execute after all code is committed and pushed. All tests on demo tenant (`?t=demo`).

**Pre-test:** Create a test lead via the P1 Edge Function:
```bash
curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake ^
  -H "Content-Type: application/json" ^
  --data-binary @- << 'EOF'
{"tenant_slug":"demo","name":"P2a Test Lead","phone":"0537889878","email":"test@example.com","terms_approved":true}
EOF
```
Record the returned lead `id`.

### Test 1: Open incoming tab, find test lead
- Navigate to CRM → "לידים נכנסים" tab
- Expected: test lead appears with status "חדש"

### Test 2: Click row → lead detail opens
- Click on the test lead row
- Expected: lead detail modal opens with correct data

### Test 3: Change status individually
- In lead detail, change status from "חדש" to "לא עונה" (no_answer)
- Expected: status badge updates, note auto-created
- Verify DB: `SELECT status FROM crm_leads WHERE phone = '+972537889878' AND tenant_id = '8d8cfa7e-...'` → `no_answer`

### Test 4: Add a note
- In lead detail notes tab, type "הערת בדיקה P2a" and submit
- Expected: note appears in list
- Verify DB: `SELECT content FROM crm_lead_notes WHERE lead_id = '{id}' ORDER BY created_at DESC LIMIT 1` → "הערת בדיקה P2a"

### Test 5: Transfer Tier 1→2
- Change status back to `new` first (or use the individual status change)
- Click "אשר" / transfer button
- Expected: lead disappears from incoming tab
- Check registered tab: lead appears with status "ממתין לאירוע"
- Verify DB: status = `waiting`

### Test 6: Bulk status change (registered tab)
- In "רשומים" tab, select the transferred test lead + at least 1 other lead
- Click "שנה סטטוס", choose "הוזמן לאירוע" (invited)
- Expected: both leads show "הוזמן" status
- Verify DB: both have `status = 'invited'`

### Test 7: Cleanup
- Delete test lead and notes:
```sql
DELETE FROM crm_lead_notes WHERE lead_id IN (SELECT id FROM crm_leads WHERE phone = '+972537889878' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb');
DELETE FROM crm_leads WHERE phone = '+972537889878' AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```
- Verify: count = 0

---

## 14. Reference: Existing RPC Signatures (verified 2026-04-21)

These RPCs exist but are NOT used in P2a (they're P2b scope). Listed for reference:

| RPC | Signature | Used in P2a? |
|-----|-----------|-------------|
| `check_in_attendee` | `(p_tenant_id uuid, p_attendee_id uuid) → jsonb` | No (B4, already wired) |
| `record_purchase` | `(p_tenant_id uuid, p_attendee_id uuid, p_amount numeric) → jsonb` | No (B4, already wired) |
| `register_lead_to_event` | `(p_tenant_id uuid, p_lead_id uuid, p_event_id uuid, p_method text DEFAULT 'form') → jsonb` | No (P2b) |
| `next_crm_event_number` | `(p_tenant_id uuid, p_campaign_id uuid) → integer` | No (P2b) |

P2a uses **direct Supabase client calls** (`.update()`, `.insert()`), not RPCs, because:
- Status change is a simple field update — no transaction/locking needed
- Note creation is a simple insert — no business logic beyond tenant_id
- An RPC would add complexity without benefit here (Rule 7 exception: Edge Functions use direct client; browser code follows `shared.js` pattern but status update is too simple for a dedicated helper)
