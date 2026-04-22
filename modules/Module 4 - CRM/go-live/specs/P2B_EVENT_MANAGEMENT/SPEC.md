# SPEC — P2B_EVENT_MANAGEMENT

> **Location:** `modules/Module 4 - CRM/go-live/specs/P2B_EVENT_MANAGEMENT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-21
> **Module:** 4 — CRM
> **Phase:** P2b (Go-Live)
> **Execution environment:** Claude Code local (Windows desktop)

---

## 1. Goal

Wire the CRM event-management actions so that a user can create events, change
event status through the 10-status lifecycle, and register leads to events —
completing the event workflow that connects P2a's managed leads to the event
funnel documented in `campaigns/supersale/FLOW.md` §שלב 2.

---

## 2. Background & Motivation

P2a wired lead management: status changes, notes, tier transfer. But once a
lead reaches Tier 2 (`waiting`), there is no CRM action available — the user
can't create an event, open registration, or register leads. These are
currently done manually in Supabase or not at all.

P2b gives Daniel the event workflow: create an event under a campaign (auto-
numbered), change its status through the 10-state lifecycle (planning →
will_open_tomorrow → registration_open → ... → completed), and register
Tier 2 leads to the event using the existing `register_lead_to_event` RPC.

Check-in and purchase recording are **already wired from B4** and are NOT in
this SPEC's scope.

**Depends on:** P2a (done — leads can be managed and transferred to Tier 2),
Phase A (done — schema, RPCs, statuses).

**Feeds into:** P3 (Make message dispatcher — event status changes will
trigger messages like "ההרשמה נפתחה"), P4 (CRM→Make trigger hookup).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Event creation form works | Create test event "P2b Test Event" on demo | DB: `SELECT name, status, event_number FROM crm_events WHERE tenant_id = '8d8cfa7e-...' AND name = 'P2b Test Event'` → 1 row, status=`planning`, event_number=1 |
| 3 | Event auto-numbering works | `event_number` is auto-assigned via RPC | DB: event_number > 0 (not null, not 0) |
| 4 | Event appears in events tab | After creation, event shows in the events list | Browser: events tab shows "P2b Test Event" row |
| 5 | Event status change works | Change event from `planning` to `registration_open` | DB: `SELECT status FROM crm_events WHERE id = '{test_event_id}'` → `registration_open` |
| 6 | Event status dropdown shows correct statuses | All 10 event statuses listed | Visual: dropdown shows planning, will_open_tomorrow, registration_open, invite_new, closed, waiting_list, 2_3d_before, event_day, invite_waiting_list, completed |
| 7 | Register lead to event works | Register a Tier 2 test lead to the test event | DB: `SELECT * FROM crm_event_attendees WHERE event_id = '{test_event_id}' AND tenant_id = '8d8cfa7e-...'` → 1 row, status=`registered` |
| 8 | RPC handles capacity correctly | If event is full, registration returns `waiting_list` | Test with `max_capacity = 1`, register 2 leads → first `registered`, second `waiting_list` |
| 9 | Duplicate registration blocked | Register same lead twice → `already_registered` | RPC returns `{ success: false, error: 'already_registered' }` |
| 10 | Event detail shows updated attendee count | After registration, attendee count refreshes | Browser: capacity bar updates |
| 11 | All writes include `tenant_id` (Rule 22) | Every `.update()` and `.insert()` includes `tenant_id` | `grep -n "tenant_id" {modified_files}` |
| 12 | No new tables or columns | Zero DDL | `git diff --stat` shows no `.sql` migration files |
| 13 | File sizes ≤ 350 lines (Rule 12) | All modified/new JS files | `wc -l` → all ≤ 350 |
| 14 | Docs updated | SESSION_CONTEXT, CHANGELOG, MODULE_MAP | File inspection |
| 15 | Test data cleaned up | Test event, attendees, campaign seed verified | DB check |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Modify JS files in `modules/crm/`: `crm-events-tab.js`, `crm-events-detail.js`, `crm-event-day.js`
- Create a new file `modules/crm/crm-event-actions.js` (≤ 350 lines) for event action logic
- Seed 1 campaign row for demo tenant (Level 2 INSERT — approved): clone Prizma's "supersale" campaign with demo tenant_id, same slug. This is the same pattern as P2a's `crm_statuses` seed.
  Verify: `SELECT COUNT(*) FROM crm_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` → currently 0, expected after seed: 1
- Run read-only SQL (Level 1)
- INSERT test events on demo tenant via the new creation feature (Level 2 — approved)
- INSERT test attendees via `register_lead_to_event` RPC on demo (Level 2 — approved)
- DELETE test events and attendees on demo after testing (Level 2 — approved)
- Call `register_lead_to_event` and `next_crm_event_number` RPCs on demo
- Commit and push to `develop`
- Update MODULE_MAP, SESSION_CONTEXT, CHANGELOG
- Add `<script>` tag to `crm.html` for new JS file if created
- Use `Toast.success/error/info/warning` (NOT `Toast.show` — see P2a Finding M4-BUG-02)

### What REQUIRES stopping and reporting

- Any schema change (DDL)
- Any modification to `js/shared.js`
- Any modification to existing RPCs (the RPCs work as-is)
- Any write to Prizma tenant
- Any merge to `main`
- Any step where actual output diverges from §3 expected values
- Any new file exceeding 350 lines
- If `next_crm_event_number` or `register_lead_to_event` RPCs don't work on demo tenant (RLS issue)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If calling `next_crm_event_number` RPC returns an error on demo tenant → STOP (the RPC uses SECURITY DEFINER but the campaign must exist)
- If `register_lead_to_event` returns an RLS violation → STOP
- If the events tab view `v_crm_event_stats` doesn't include demo tenant events after creation → STOP (view may filter by tenant)
- If any modified JS file exceeds 350 lines → STOP, propose a split

---

## 6. Rollback Plan

- **Code:** `git reset --hard {START_COMMIT}`
- **DB:** Delete test events: `DELETE FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-...' AND event_id IN (SELECT id FROM crm_events WHERE tenant_id = '8d8cfa7e-...')`. Then `DELETE FROM crm_events WHERE tenant_id = '8d8cfa7e-...'`.
- Campaign seed row can remain (it's reference data, not test data).
- SPEC marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

- **Sending messages on event status change** — P3+P4. Status change is DB-only.
- **"שלח הודעה" button** in event detail — P3+P4 scope.
- **"ייצוא Excel" button** in event detail — separate utility SPEC.
- **Check-in / purchase recording** — already wired from B4, fully functional.
- **Event editing** (change name, date, location after creation) — separate SPEC.
- **Campaign management** (CRUD campaigns) — separate SPEC. P2b seeds 1 campaign for demo and uses a dropdown of existing campaigns in the creation form.
- **Make scenarios** — no Make work.
- **Schema changes** — no DDL.
- **Bulk event operations** — not needed.
- **Auto-approval / auto-transfer** — deferred to separate SPEC.

---

## 8. Expected Final State

### New files (possible, executor decides)
- `modules/crm/crm-event-actions.js` (≤ 350 lines) — event creation form, status change, register-to-event UI

### Modified files
- `modules/crm/crm-events-tab.js` — add "יצירת אירוע +" button, wire row click → event detail
- `modules/crm/crm-events-detail.js` — wire "שנה סטטוס" button, add "רשום משתתף" button/form in attendees sub-tab
- `crm.html` — add `<script>` tag for `crm-event-actions.js` if created
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `modules/Module 4 - CRM/docs/CHANGELOG.md`
- `modules/Module 4 - CRM/docs/MODULE_MAP.md`

### DB state (demo tenant only)
- 1 new campaign row (seed, persistent — not test data)
- After testing: 0 test events, 0 test attendees remain

---

## 9. Commit Plan

- **Commit 0:** `fix(crm): seed demo campaign for P2b event testing` — seed SQL + run
- **Commit 1:** `feat(crm): add event creation form with auto-numbering` — creation modal/form + events tab button
- **Commit 2:** `feat(crm): wire event status change in detail modal` — status dropdown in event header
- **Commit 3:** `feat(crm): add register-lead-to-event from event detail` — attendee registration UI
- **Commit 4:** `docs(crm): update P2b session context, changelog, module map`
- **Commit 5:** `chore(spec): close P2B_EVENT_MANAGEMENT with retrospective`

---

## 10. Dependencies / Preconditions

- P2a completed ✅ — lead management functional, `crm-lead-actions.js` pattern established
- `crm_statuses` seeded for demo ✅ — 10 event statuses + 10 attendee statuses
  Verify: `SELECT COUNT(*) FROM crm_statuses WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND entity_type = 'event'` → 10
- `crm_campaigns` for demo: **currently 0 rows** — must be seeded in Commit 0
  Verify: `SELECT COUNT(*) FROM crm_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` → 0 (before seed), 1 (after seed)
- `next_crm_event_number(p_tenant_id, p_campaign_id)` RPC exists ✅ — locks campaign row FOR UPDATE, returns MAX(event_number)+1
  Verify: `SELECT proname FROM pg_proc WHERE proname = 'next_crm_event_number'` → 1 row
- `register_lead_to_event(p_tenant_id, p_lead_id, p_event_id, p_method)` RPC exists ✅ — handles capacity, waiting list, duplicates
  Verify: `SELECT proname FROM pg_proc WHERE proname = 'register_lead_to_event'` → 1 row
- `v_crm_event_stats` view exists ✅ — used by events tab
- Demo tenant exists ✅ — slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- B8 Tailwind patterns ✅
- **Toast API:** use `Toast.success/error/info/warning` only (NOT `.show`)

---

## 11. Lessons Already Incorporated

- FROM `P2A_LEAD_MANAGEMENT/FOREMAN_REVIEW.md` §6 Proposal 1 → "Mandatory Verify lines in §10 Preconditions" → APPLIED: every precondition above has a Verify query.
- FROM `P2A_LEAD_MANAGEMENT/FOREMAN_REVIEW.md` §6 Proposal 2 → "Shared API Dependencies table" → APPLIED: §12.6 below.
- FROM `P2A_LEAD_MANAGEMENT/FOREMAN_REVIEW.md` §7 Proposal 1 → "Shared-JS API Quick-Check before using window.* calls" → APPLIED: Toast API explicitly called out in §10 and §12.6.
- FROM `P2A_LEAD_MANAGEMENT/FOREMAN_REVIEW.md` §7 Proposal 2 → "Tooling Probe: dry-run pre-commit hook" → APPLIED: executor should run tooling probe before first commit (husky `set +e` fix from P2a should still be in place, but verify).
- FROM `P2A_LEAD_MANAGEMENT/EXECUTION_REPORT.md` Decision 6 → "Fix husky root cause, not workaround" → NOTED: fix already landed in P2a commit `23bc333`.
- FROM `P2A_LEAD_MANAGEMENT/FINDINGS.md` Finding 2 → "Toast.show doesn't exist" → APPLIED: §10 + §12.6 explicitly say "use Toast.success/error, NOT .show".

---

## 12. Technical Design

### 12.1 Campaign Seed (Commit 0)

Seed 1 campaign for demo tenant by cloning Prizma's "supersale" campaign:

```sql
INSERT INTO crm_campaigns (tenant_id, slug, name, description, is_active,
  default_location, default_hours, default_max_capacity, default_booking_fee)
SELECT '8d8cfa7e-ef58-49af-9702-a862d459cccb', slug, name, description, is_active,
  default_location, default_hours, default_max_capacity, default_booking_fee
FROM crm_campaigns
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug = 'supersale'
ON CONFLICT DO NOTHING;
```

Save as `modules/Module 4 - CRM/go-live/seed-crm-campaign-demo.sql`.

### 12.2 Event Creation Form

**Where:** New `crm-event-actions.js` or inline in `crm-events-tab.js` (executor decides based on line count).

**Trigger:** "יצירת אירוע +" button in the events tab (above the table).

**UI pattern:** Modal form with fields:
- Campaign dropdown (pre-populated from `crm_campaigns`, should be just 1 on demo)
- Event name (text, required)
- Event date (date picker, required)
- Start time / End time (defaults: 09:00 / 14:00 from schema)
- Location address (text, required — use campaign's `default_location` as default)
- Waze URL (text, optional)
- Max capacity (number, default from campaign's `default_max_capacity` or 50)
- Booking fee (number, default from campaign's `default_booking_fee` or 50)
- Coupon code (text, required)

**On submit:**
1. Call `next_crm_event_number` RPC to get the auto-number: `sb.rpc('next_crm_event_number', { p_tenant_id: getTenantId(), p_campaign_id: selectedCampaignId })`
2. Insert into `crm_events` with the returned event_number
3. Show Toast.success, close modal, reload events tab

### 12.3 Event Status Change

**Where:** `crm-events-detail.js` — wire the existing "שנה סטטוס" button.

**UI pattern:** Same anchored-dropdown pattern as P2a's lead status change (reuse `CrmLeadActions.openStatusDropdown` logic or create parallel `CrmEventActions.openStatusDropdown`). Show all 10 event statuses from `CRM_STATUSES.event`.

**On pick:**
1. `sb.from('crm_events').update({ status: newStatus }).eq('id', eventId).eq('tenant_id', getTenantId())`
2. Toast.success with the new status label
3. Update the status badge in the modal header
4. Optionally: reload events tab in the background (so the table reflects the change)

**Status lifecycle note:** The 10 statuses have a natural progression (planning → ... → completed) but the SPEC does NOT enforce ordering. The user can set any status at any time — business rules about ordering will come in P4 when triggers fire messages.

### 12.4 Register Lead to Event

**Where:** Event detail modal, attendees sub-tab — add a "רשום משתתף" button.

**UI pattern:** Button opens a search-and-select UI:
1. User types a name or phone → search `crm_leads` filtered to Tier 2 statuses (only Tier 2 leads can be registered to events)
2. Select a lead → call RPC: `sb.rpc('register_lead_to_event', { p_tenant_id: getTenantId(), p_lead_id: selectedLeadId, p_event_id: eventId, p_method: 'manual' })`
3. Handle RPC response:
   - `{ success: true, status: 'registered' }` → Toast.success "נרשם בהצלחה"
   - `{ success: true, status: 'waiting_list' }` → Toast.warning "נרשם לרשימת המתנה (אירוע מלא)"
   - `{ success: false, error: 'already_registered' }` → Toast.info "כבר רשום לאירוע"
   - `{ success: false, error: 'event_not_found' }` → Toast.error "אירוע לא נמצא"
4. Refresh the attendees list in the sub-tab

### 12.5 Row Click → Event Detail

**Where:** `crm-events-tab.js` — rows should open event detail modal on click.

Check if this is already wired. If not, add click handler calling `openCrmEventDetail(eventId)`.

### 12.6 Shared API Dependencies

| Utility | Method to call | Verified? | Source file |
|---------|---------------|-----------|-------------|
| Toast | `Toast.success(msg)`, `Toast.error(msg)`, `Toast.warning(msg)`, `Toast.info(msg)` | ✅ (P2a verified) | `shared/js/toast.js` |
| Modal | `Modal.show({ title, size, body })` | ✅ (used in crm-events-detail.js line 29) | `shared/js/modal-builder.js` |
| escapeHtml | `escapeHtml(str)` | ✅ (global, used everywhere in CRM) | `js/shared.js` |
| CrmHelpers | `CrmHelpers.formatDate()`, `CrmHelpers.getStatusInfo('event', slug)`, `CrmHelpers.statusBadgeHtml('event', slug)` | ✅ | `modules/crm/crm-helpers.js` |
| sb | `sb.rpc(name, params)`, `sb.from(table).insert/update/select` | ✅ (global Supabase client) | `js/shared.js` |

---

## 13. Test Protocol

All tests on demo tenant (`?t=demo`). Use chrome-devtools MCP for browser testing.

### Pre-test: Seed data
1. Verify campaign was seeded: `SELECT id, slug FROM crm_campaigns WHERE tenant_id = '8d8cfa7e-...'` → 1 row, slug=`supersale`
2. Create a test lead (for registration test later):
```bash
curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake ^
  -H "Content-Type: application/json" ^
  --data-binary @- << 'EOF'
{"tenant_slug":"demo","name":"P2b Test Lead","phone":"0537889878","email":"test@example.com","terms_approved":true}
EOF
```
3. Transfer the test lead to Tier 2 (via P2a's CrmLeadActions or direct DB update to `status='waiting'`)

### Test 1: Create event
- Navigate to CRM → Events tab
- Click "יצירת אירוע +"
- Fill form: campaign=supersale, name="P2b Test Event", date=tomorrow, location="Test Location", coupon="TEST123"
- Submit
- Expected: event appears in list with status "תכנון" (planning)
- DB verify: `SELECT name, status, event_number, campaign_id FROM crm_events WHERE tenant_id = '8d8cfa7e-...' AND name = 'P2b Test Event'` → event_number=1, status=`planning`

### Test 2: Change event status
- Open event detail (click row)
- Click "שנה סטטוס" → select "הרשמה פתוחה" (registration_open)
- Expected: status badge updates in modal header
- DB verify: status = `registration_open`

### Test 3: Register lead to event
- In event detail → attendees sub-tab → click "רשום משתתף"
- Search for "P2b Test Lead" (or phone)
- Select and confirm
- Expected: Toast success, attendee appears in list
- DB verify: `SELECT status FROM crm_event_attendees WHERE event_id = '{id}' AND tenant_id = '8d8cfa7e-...'` → status=`registered`

### Test 4: Duplicate registration blocked
- Try to register same lead again
- Expected: Toast info "כבר רשום"

### Test 5: Capacity + waiting list
- Update event max_capacity to 1: `UPDATE crm_events SET max_capacity = 1 WHERE id = '{id}' AND tenant_id = '8d8cfa7e-...'`
- Create a second test lead (phone `0501234567`) and transfer to Tier 2
- Register second lead
- Expected: RPC returns `waiting_list` status
- DB verify: second attendee has `status = 'waiting_list'`

### Test 6: Cleanup
```sql
DELETE FROM crm_event_attendees WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
DELETE FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
DELETE FROM crm_lead_notes WHERE lead_id IN (SELECT id FROM crm_leads WHERE phone IN ('+972537889878', '+972501234567') AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb');
DELETE FROM crm_leads WHERE phone IN ('+972537889878', '+972501234567') AND tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```
Verify: all counts = 0. Campaign seed row stays (reference data).
