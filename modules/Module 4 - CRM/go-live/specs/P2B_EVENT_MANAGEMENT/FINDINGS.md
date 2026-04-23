# FINDINGS — P2B_EVENT_MANAGEMENT

> **Location:** `modules/Module 4 - CRM/go-live/specs/P2B_EVENT_MANAGEMENT/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `register_lead_to_event` RPC had invalid FOR UPDATE on aggregate

- **Code:** `M4-BUG-03`
- **Severity:** HIGH
- **Discovered during:** §13 Test 3 (register lead to event via browser UI)
- **Location:** Postgres function `public.register_lead_to_event(uuid, uuid, uuid, text)` — the `SELECT COUNT(*) INTO v_current_count ... FOR UPDATE` statement (see raw source at bottom)
- **Description:** The RPC contained `SELECT COUNT(*) ... FOR UPDATE` on the `crm_event_attendees` table when checking current capacity. Postgres rejects row-level locking on aggregate queries with the error:
  > FOR UPDATE is not allowed with aggregate functions
  This means **every** call to `register_lead_to_event` would fail — the RPC had never worked in any code path that executes the COUNT (which is all three: registered, waiting_list, event_closed). Feature was shipped-but-broken from whenever this RPC was authored.
- **Reproduction:**
  ```sql
  SELECT register_lead_to_event(
    '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,   -- demo tenant
    'f64190c6-6499-4b95-8747-cc1aa98e94aa'::uuid,   -- any valid lead id
    '3751a080-3720-4adb-9980-ec1a3ecaf705'::uuid,   -- any valid event id
    'manual'
  );
  ```
  Pre-fix result: `ERROR: FOR UPDATE is not allowed with aggregate functions`.
- **Expected vs Actual:**
  - Expected: `{success: true, attendee_id: <uuid>, status: 'registered'}` per SPEC §12.4
  - Actual (pre-fix): Postgres error — no row inserted, no attendee created.
- **Fix applied:** In-SPEC hotfix per Daniel authorization (Option 1). Removed `FOR UPDATE` from the COUNT statement only; the outer `SELECT * INTO v_event FROM crm_events ... FOR UPDATE` at the top of the function already serializes concurrent registrations per-event, which is the invariant the attendee count needs. Applied via `apply_migration` name `fix_register_lead_to_event_remove_for_update_on_count`. Canonical SQL at `modules/Module 4 - CRM/go-live/hotfix-register-lead-to-event.sql` (commit `925fe4c`).
- **Suggested next action:** DISMISS — already fixed in-SPEC with Daniel's explicit authorization, canonical SQL committed, post-fix verified via all 3 RPC paths (registered / waiting_list / already_registered).
- **Rationale for action:** The fix is minimal (remove 1 token from 1 line), safe (the concurrency invariant is preserved by the outer event-row lock), and the SPEC testing re-verified correctness. A follow-up SPEC would be pure ceremony. What SHOULD happen in follow-up is the executor-skill proposal #1 — add RPC smoke-testing to the Pre-Flight Check so a bug like this is surfaced at the Foreman layer before execution starts.
- **Foreman override (filled by Foreman in review):** { }

---

## Raw: pre-fix RPC source (for reference)

```sql
DECLARE
  v_event         crm_events%ROWTYPE;
  v_current_count int;
  v_attendee_id   uuid;
  v_existing_id   uuid;
BEGIN
  SELECT * INTO v_event FROM crm_events
   WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;  -- ← event-row lock (correct, kept)

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;

  SELECT id INTO v_existing_id FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id
     AND is_deleted = false;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing_id);
  END IF;

  SELECT COUNT(*) INTO v_current_count                          -- ← this aggregate query
    FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate') AND is_deleted = false
     FOR UPDATE;                                                -- ← INVALID with COUNT(*)

  -- ... rest unchanged
```
