# Claude Code — Execute P5.5 Event Trigger Wiring SPEC

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P5.5 wires CRM client-side triggers to the `send-message` Edge Function.
Currently only `lead-intake` (server-side) dispatches messages. After P5.5,
event status changes, attendee registration, and the broadcast wizard will
all send real messages via the same pipeline.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/SPEC.md`

Read the full SPEC before executing. Key sections: §3 (18 measurable success
criteria), §4 (autonomy envelope), §12 (technical design with status→template
mapping, recipient queries, broadcast refactor, fire-and-forget pattern).

---

## Pre-Flight (SPEC §13 Step 1)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC: `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/SPEC.md`
3. Read the 3 files to modify:
   - `modules/crm/crm-event-actions.js` (266 lines)
   - `modules/crm/crm-event-register.js` (122 lines)
   - `modules/crm/crm-messaging-broadcast.js` (341 lines)
4. Read the dispatch helper: `modules/crm/crm-messaging-send.js` (69 lines)
5. Reference: `git show HEAD:supabase/functions/lead-intake/index.ts | sed -n '102,157p'` — the `dispatchIntakeMessages` pattern
6. Verify demo tenant state:
   - `SELECT count(*) FROM crm_leads WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND status IN ('waiting_for_event','invited','confirmed_attendance') AND is_deleted = false` → ≥1
   - `SELECT id, name, status FROM crm_events WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb' AND is_deleted = false LIMIT 5` → ≥1 event
7. Name collision check: `grep -rn "dispatchEventStatusMessages\|buildEventVariables\|dispatchRegistrationMessage" modules/crm/` → 0 hits

---

## Execution (follow SPEC §13 Steps 2–7)

### Commit 1: Event Status → Message Dispatch (§13 Step 2)

Edit `modules/crm/crm-event-actions.js`:
- Add `buildEventVariables(event)` helper — returns `{ event_name, event_date, event_time, event_location }`
- Add `dispatchEventStatusMessages(eventId, newStatus, event)`:
  - STATUS_TEMPLATE_MAP: 8 statuses → template slugs (SPEC §12.1)
  - Recipient queries per type: tier2 / tier2_excl_registered / attendees / attendees_waiting
  - All queries: `.eq('tenant_id', tid)` + `.eq('is_deleted', false)` (Rule 22)
  - Dual-channel: SMS always + Email if lead has email
  - `Promise.allSettled()` + toast with count
- Modify `changeEventStatus()`: after DB update, fetch event details, fire-and-forget `dispatchEventStatusMessages()`

```bash
git add modules/crm/crm-event-actions.js
git commit -m "feat(crm): wire event status change → message dispatch"
```
Verify: `wc -l` → ≤350

### Commit 2: Registration → Confirmation Message (§13 Step 3)

Edit `modules/crm/crm-event-register.js`:
- In click handler after `toastResponse(resp)`:
  - If `resp.success` && (`registered` || `waiting_list`):
    - Map: `registered` → `event_registration_confirmation`, `waiting_list` → `event_waiting_list_confirmation`
    - Fetch event details for variables
    - Fire-and-forget `CrmMessaging.sendMessage()` (SMS + Email)

Seed 4 templates on demo — SQL in SPEC §13 Step 3

```bash
git add modules/crm/crm-event-register.js
git commit -m "feat(crm): wire attendee registration → confirmation message"
```

### Commit 3: Broadcast Wizard → Edge Function (§13 Step 4)

Edit `modules/crm/crm-messaging-broadcast.js` `doWizardSend()`:
- Keep `crm_broadcasts` INSERT
- Remove direct `crm_message_log` INSERT
- Replace: loop over leadIds → `CrmMessaging.sendMessage()` per lead (template mode if template selected, raw if custom body)
- `Promise.allSettled()` → update `crm_broadcasts` sent/failed counts
- Toast with count

```bash
git add modules/crm/crm-messaging-broadcast.js
git commit -m "feat(crm): wire broadcast wizard to send-message Edge Function"
```

### Browser QA (§13 Step 5)

On `localhost:3000/crm.html?t=demo`:
1. Events → change status to `registration_open` → toast + log entries
2. Event detail → register lead → toast + confirmation in log
3. Messaging Hub → Broadcast → test send → log entries + broadcasts row
4. 0 console errors
5. DB verify: `SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...' AND created_at > NOW() - interval '10 minutes'` → ≥3

### Commit 4: Documentation (§13 Step 6)

```bash
git add "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md" "modules/Module 4 - CRM/go-live/ROADMAP.md"
git commit -m "docs(crm): mark P5.5 CLOSED — all CRM triggers wired"
```

### Commit 5: Retrospective (§13 Step 7)

```bash
git add "modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/"
git commit -m "chore(spec): close P5_5_EVENT_TRIGGER_WIRING with retrospective"
git push origin develop
```

---

## Budget

5 commits (±1 fix). No schema changes. No Edge Function changes. 4 template seeds on demo.

## Key Files

| File | Action |
|------|--------|
| `modules/crm/crm-event-actions.js` | EDIT — add dispatch after status change (~+65 lines) |
| `modules/crm/crm-event-register.js` | EDIT — add confirmation dispatch (~+20 lines) |
| `modules/crm/crm-messaging-broadcast.js` | EDIT — replace direct DB write with EF dispatch (~±10 lines) |
| `modules/crm/crm-messaging-send.js` | READ ONLY — dispatch helper contract |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | EDIT — P5.5 CLOSED |
| `modules/Module 4 - CRM/go-live/ROADMAP.md` | EDIT — P5.5 ✅ + trigger checklist update |
