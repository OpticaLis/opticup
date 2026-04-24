# Activation Prompt — CRM_RESUBSCRIBE_FIX

> **Run this on Claude Code. Three fixes for unsubscribe/resubscribe flow.**
> **Priority: HIGH — unsubscribed leads can't receive event invitations.**

---

## Context

When a lead unsubscribes (clicks the unsubscribe link in an SMS/email), their
`crm_leads.unsubscribed_at` is set to `now()`. After that:

1. They can't receive any automated messages (filtered out by automation engine)
2. If they re-register for an event OR re-register to the system in general,
   the `unsubscribed_at` stays set — so they STILL can't receive messages,
   even though they clearly want to participate

There are TWO re-registration paths that must clear `unsubscribed_at`:
- **Event registration:** via `register_lead_to_event` RPC
- **General system re-registration:** via `lead-intake` Edge Function (when
  an existing lead submits the public form again — currently returns 409
  "duplicate" but does NOT clear unsubscribed_at)

Daniel's requirements:
- **Fix A (RPC):** When a lead re-registers for an event, automatically clear
  `unsubscribed_at`.
- **Fix B (EF):** When a lead re-registers to the system via lead-intake
  (duplicate path), automatically clear `unsubscribed_at`.
- **Fix C (CRM UI):** Add a manual "החזר לדיוור" (resubscribe) button in the
  lead detail card, so CRM staff can manually resubscribe a lead who contacts
  them via WhatsApp asking to be re-added.

---

## Pre-Flight

1. `cd` to ERP repo
2. `git branch` → must be `develop`
3. `git pull origin develop`
4. `git status` → clean

---

## Fix A — Auto-clear unsubscribed_at on re-registration

### Step 1: Update the `register_lead_to_event` RPC

The RPC currently does NOT touch `unsubscribed_at`. Add a line to clear it
when a lead successfully registers (both new registration AND soft-delete
reactivation paths).

Run this SQL (Level 2 — write with approval, this modifies an RPC):

```sql
CREATE OR REPLACE FUNCTION register_lead_to_event(
  p_tenant_id uuid,
  p_lead_id uuid,
  p_event_id uuid,
  p_method text DEFAULT 'manual'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event         crm_events%ROWTYPE;
  v_current_count int;
  v_attendee_id   uuid;
  v_existing      record;
BEGIN
  SELECT * INTO v_event FROM crm_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  -- Check for existing (active) registration
  SELECT id, is_deleted INTO v_existing FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id;

  IF FOUND THEN
    IF v_existing.is_deleted = false THEN
      -- Active registration exists
      RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
    ELSE
      -- Soft-deleted registration — reactivate it
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method,
             checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;

      -- Update lead status + clear unsubscribe (re-registration = implicit resubscribe)
      UPDATE crm_leads
         SET status = 'confirmed', updated_at = now(), unsubscribed_at = NULL
       WHERE id = p_lead_id AND tenant_id = p_tenant_id
         AND status NOT IN ('confirmed', 'confirmed_verified');

      -- Also clear unsubscribe even if status doesn't change
      UPDATE crm_leads
         SET unsubscribed_at = NULL, updated_at = now()
       WHERE id = p_lead_id AND tenant_id = p_tenant_id
         AND unsubscribed_at IS NOT NULL
         AND status IN ('confirmed', 'confirmed_verified');

      RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', 'registered');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_current_count
    FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate') AND is_deleted = false;

  IF v_current_count >= v_event.max_capacity THEN
    INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
    VALUES (p_tenant_id, p_lead_id, p_event_id,
            CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END,
            p_method)
    RETURNING id INTO v_attendee_id;

    -- Clear unsubscribe even for waiting list — they chose to register
    UPDATE crm_leads
       SET unsubscribed_at = NULL, updated_at = now()
     WHERE id = p_lead_id AND tenant_id = p_tenant_id
       AND unsubscribed_at IS NOT NULL;

    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'waiting_list');
  END IF;

  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;

  -- Update lead status to 'confirmed' + clear unsubscribe
  UPDATE crm_leads
     SET status = 'confirmed', updated_at = now(), unsubscribed_at = NULL
   WHERE id = p_lead_id AND tenant_id = p_tenant_id
     AND status NOT IN ('confirmed', 'confirmed_verified');

  -- Also clear unsubscribe even if status doesn't change
  UPDATE crm_leads
     SET unsubscribed_at = NULL, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id
     AND unsubscribed_at IS NOT NULL
     AND status IN ('confirmed', 'confirmed_verified');

  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$$;
```

### Verify Fix A

```sql
-- Check the RPC was updated
SELECT prosrc FROM pg_proc WHERE proname = 'register_lead_to_event';
-- Should now contain 'unsubscribed_at = NULL' in multiple places
```

---

## Fix B — Auto-clear unsubscribed_at on general re-registration (lead-intake EF)

### The issue
`supabase/functions/lead-intake/index.ts` lines ~248-262: when a lead with an
existing phone number submits the public form again, the EF finds the duplicate,
sends a "lead_intake_duplicate" message, and returns 409. But it does NOT clear
`unsubscribed_at`. So a lead who unsubscribed, then re-registers through the
public form, still can't receive messages.

### The fix
In the duplicate-found block (around line 248, `if (existing) {`), add BEFORE
the `dispatchIntakeMessages` call:

```javascript
// If the returning lead was unsubscribed, clear it — re-registration = implicit resubscribe
await db.from("crm_leads")
  .update({ unsubscribed_at: null, updated_at: new Date().toISOString() })
  .eq("id", existing.id)
  .eq("tenant_id", tenantId)
  .not("unsubscribed_at", "is", null);
```

This is a §4 exception — pre-approved by Daniel. ONLY add this update, do NOT
change any other logic in lead-intake.

### Verify
```sql
SELECT id, unsubscribed_at FROM crm_leads
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND unsubscribed_at IS NOT NULL;
-- After a test re-registration via lead-intake, unsubscribed_at should be NULL
```

### Deploy
After committing the EF source change:
```
supabase functions deploy lead-intake --project-ref tsxrrxzmdxaenlvocyit
```
If MCP deploy fails (as it did for event-register), flag as pending-manual
for Daniel — same pattern as EVENT_CONFIRMATION_EMAIL.

---

## Fix C — Manual "החזר לדיוור" button in lead detail

### Step 1: Find the lead detail card

Read `modules/crm/crm-leads-detail.js` — find where the lead info is
rendered (the section that shows marketing consent / unsubscribe status).

Currently line ~230 shows:
```javascript
row('שיווק', lead.marketing_consent ? '✅ מאושר' : (lead.unsubscribed_at ? '❌ הוסר' : '—'))
```

### Step 2: Add resubscribe button

When `lead.unsubscribed_at` is set, show a button "החזר לדיוור" next to
the "❌ הוסר" text. When clicked:

```javascript
// Clear unsubscribed_at for this lead
var res = await sb.from('crm_leads')
  .update({ unsubscribed_at: null, updated_at: new Date().toISOString() })
  .eq('id', lead.id)
  .eq('tenant_id', tid());

if (!res.error) {
  Toast.success('הליד הוחזר לדיוור');
  // Refresh the detail view
}
```

**Important:**
- Include `tenant_id` in the WHERE clause (Rule 22 — defense in depth)
- Log the action: `ActivityLog.write('crm.lead.resubscribed', { lead_id: lead.id })`
- After success, refresh the detail card to show the updated status
- The button should only appear when `unsubscribed_at` is not null

### Step 3: File size check

Check `crm-leads-detail.js` line count. If adding the button pushes it
over 350, extract to a helper.

### Verify Fix C

1. Open CRM → click on a lead that has `unsubscribed_at` set
2. See "❌ הוסר" with "החזר לדיוור" button next to it
3. Click the button → status changes to show marketing is active
4. Activity log shows the resubscribe action

---

## Commits

Commit 1 (RPC + EF + UI):
```
git add modules/crm/crm-leads-detail.js supabase/functions/lead-intake/index.ts
git commit -m "fix(crm): auto-clear unsubscribed_at on re-registration + manual resubscribe button"
git push origin develop
```

---

## MANDATORY at End

- `git status` → clean
- Push to `develop`
- Report what was done

---

## Warnings

- Do NOT modify the unsubscribe EF — it stays as is
- Do NOT modify send-message EF or event-register EF
- The RPC change (Fix A) is Level 2 (write) — execute it, this is pre-approved
  by Daniel in this activation prompt
- The lead-intake EF change (Fix B) is a §4 exception — pre-approved by Daniel
- File size: 350 lines max per file
- If MCP deploy fails for lead-intake, flag as pending-manual (same as event-register pattern)
