# Activation Prompt — CRM_HOTFIXES

> **Run this on Claude Code.**
> **SPEC:** `modules/Module 4 - CRM/final/CRM_HOTFIXES/SPEC.md`

---

## Context

4 bugs block CRM production use. This SPEC fixes them all. After each fix,
verify it works and verify nothing else broke.

---

## Pre-Flight

1. `cd` to ERP repo
2. `git branch` → must be `develop`
3. `git pull origin develop`
4. `git status` → handle any dirty state per CLAUDE.md §1 step 4
5. Read the SPEC at `modules/Module 4 - CRM/final/CRM_HOTFIXES/SPEC.md`

---

## Fix 1 — send-message EF not creating short links

### Diagnosis

The `short_links` table is empty (0 rows) even though messages were sent
after the SHORT_LINKS deploy. Edge function logs show `send-message` at
`version: 4`, but the short link code was committed and deployed as v5.

### Steps

1. Check current deployed version:
   ```bash
   npx supabase functions list --project-ref tsxrrxzmdxaenlvocyit
   ```
   Or use the Supabase MCP `list_edge_functions` tool.

2. If send-message is NOT at the latest version (v5 with `url-builders.ts`
   import), redeploy:
   ```bash
   npx supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
   ```
   Or use the Supabase MCP `deploy_edge_function` tool.

3. **Verify:** After deploy, the function version should increment. Then
   trigger a test: use the CRM UI to send a test message to lead
   `0537889878` (demo tenant) or call send-message directly:
   ```sql
   SELECT COUNT(*) FROM short_links;
   ```
   Should be ≥1 after a successful send.

4. Check `crm_message_log` for the most recent message:
   ```sql
   SELECT content FROM crm_message_log
   WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   ORDER BY created_at DESC LIMIT 1;
   ```
   The content should contain `prizma-optic.co.il/r/` (short URL), NOT
   the full token URL.

**If the EF code itself has a bug** (e.g., import path wrong, runtime error),
check EF logs via Supabase MCP `get_logs` service=edge-function. Fix the
code, commit, redeploy.

---

## Fix 2 — Lead status not changing to "invited" after event invite

### Problem

When the automation engine sends an event invitation (rule type
`registration_open` or manual invite), the lead's status should change from
`waiting` to `invited`. Currently it stays unchanged.

### Where to fix

`modules/crm/crm-automation-engine.js` — in the function that handles
post-send logic. After a successful send via send-message EF, if the
message is an event-related invitation, update the lead's status.

### Logic

Find where the automation engine calls the send-message EF (the fetch to
the EF URL). After a successful response (status 200), add:

```javascript
// After successful send of event-related message, update lead status to 'invited'
// Only if current status is 'waiting' (don't demote confirmed leads)
if (eventId && lead.status === 'waiting') {
  await window.sb.from('crm_leads')
    .update({ status: 'invited', updated_at: new Date().toISOString() })
    .eq('id', lead.id)
    .eq('tenant_id', tenantId);
}
```

**Important:** Use the existing `window.sb` Supabase client (with tenant
JWT), not service_role. The RLS policy will enforce tenant isolation.

**Also add defense-in-depth:** include `.eq('tenant_id', tenantId)` per
Rule 22.

### Verify

1. Open CRM, go to events, open an event
2. Find a lead with status "waiting" (ממתינים)
3. Trigger "open registration" automation or manually send invitation
4. Check lead board — status should now be "הוזמן לאירוע" (invited)
5. Check DB: `SELECT status FROM crm_leads WHERE id = '<lead_id>'` → `invited`

---

## Fix 3 — "שלח הודעה" button not working in event detail

### Problem

The button exists in `crm-events-detail.js` line ~87 but has no
`data-action` attribute and no event handler wired for it.

### Steps

1. Add `data-action="send-message"` to the button in the header HTML:
   ```javascript
   '<button type="button" class="' + CLS_HEAD_BTN + '" data-action="send-message">שלח הודעה</button>' +
   ```

2. Wire a handler in the function that binds header button actions. Find
   where `data-action="change-status"` and similar buttons are handled.
   Add a case for `send-message`:

   ```javascript
   // Handle "send message" button
   var sendMsgBtn = body.querySelector('[data-action="send-message"]');
   if (sendMsgBtn) {
     sendMsgBtn.addEventListener('click', function () {
       openEventSendMessageModal(event, attendees);
     });
   }
   ```

3. Create the `openEventSendMessageModal` function. It should:
   - Open a modal with:
     - Textarea for message body (raw text, not template)
     - Recipient selector: "כל הרשומים" / filter by attendee status
       (registered, waiting_list, confirmed, etc.)
     - Channel selector: SMS / Email
     - Send button + Cancel button
   - On send: loop through selected recipients, call send-message EF for
     each (with the raw body, not template_slug)
   - Show progress: "שולח X/Y..."
   - On completion: show success count + any failures

   **Keep it simple.** This is a basic compose-and-send, not a full
   messaging suite. The modal can be built with the existing Modal pattern
   used elsewhere in the CRM (see `CrmEventRegister.openRegisterLeadModal`
   as a reference).

4. **File size check:** Before editing, run `wc -l` on the file. If adding
   the handler + modal pushes it over 350 lines, extract the send-message
   modal into a new file `modules/crm/crm-event-send-message.js` and add
   a `<script>` tag in `crm.html`.

### Verify

1. Open CRM → Events → click on an event
2. Click "שלח הודעה" button
3. Modal should open with message body field and recipient options
4. No console errors

---

## Fix 4 — Capacity vs coupon count verification

### Problem

An event with max_capacity=50 + extra_coupons=10 shows 60 coupons but
only 50 spots. Need to verify the registration logic handles this correctly.

### Steps

1. Read the `register_lead_to_event` RPC:
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'register_lead_to_event';
   ```

2. Verify that:
   - `max_capacity` is the registration cap (not max_capacity + extra_coupons)
   - When `current_count >= max_capacity`, new registrants go to waiting list
   - Extra coupons are for walk-in overflow, not additional registrations

3. Check the UI display logic in `crm-events-detail.js` — find where
   capacity and coupon counts are displayed. Verify:
   - "מקומות פנויים" = `max_capacity - current_registered_count`
   - "קופונים" = `max_coupons` (total allocated, separate from capacity)
   - The numbers should NOT be conflated

4. If there's a bug in the display or the RPC — fix it. If the logic is
   correct — document in the EXECUTION_REPORT that capacity/coupon
   separation is working as designed.

### Verify

```sql
-- With an event at max capacity, attempt registration:
SELECT register_lead_to_event(
  '8d8cfa7e-ef58-49af-9702-a862d459cccb', -- demo tenant
  '<test_lead_id>',
  '<test_event_id>',
  'manual'
);
-- Should return: {"success": true, "status": "waiting_list"} if at capacity
```

---

## Post-Fix Verification (MANDATORY)

After all 4 fixes:

1. `git status` → clean (all changes committed)
2. Run verify script if available
3. Check CRM pages load without console errors
4. Verify fixes don't interfere with each other:
   - Send a test invitation → lead status changes to "invited" AND the SMS
     contains a short URL (`/r/XXXXXXXX`)
   - "שלח הודעה" button works AND sent messages contain short URLs
5. Update `modules/Module 4 - CRM/final/OPEN_ISSUES.md` — mark issues
   #1, #2, #4, #5 as resolved with date and commit hash

---

## Commits

Follow the commit plan in the SPEC §9. One commit per fix for clear
attribution. Final commit: `chore(spec): close CRM_HOTFIXES with retrospective`.

---

## MANDATORY at End

- Write `EXECUTION_REPORT.md` + `FINDINGS.md` in:
  `modules/Module 4 - CRM/final/CRM_HOTFIXES/`
- `git status` clean
- Push to `develop`

---

## Warnings

- **Do NOT modify unsubscribe or event-register EFs** — they are working correctly
- **Do NOT create new DB tables** — this SPEC has no schema changes
- **Do NOT send test messages to any phone other than 0537889878 or 0503348349**
- **All test data on demo tenant only** (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- **Check file sizes before editing** — extract if approaching 350 lines
- **send-message EF uses `url-builders.ts` as a relative import** — do not change the import path
