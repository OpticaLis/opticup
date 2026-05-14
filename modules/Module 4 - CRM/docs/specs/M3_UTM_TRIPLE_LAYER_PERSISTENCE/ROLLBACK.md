# ROLLBACK — M3_UTM_TRIPLE_LAYER_PERSISTENCE

> Documented rollback SQL for SPEC §6. **DO NOT run on the forward path.** Applied only after a STOP-on-deviation event AND explicit user authorization.

This file lives in the SPEC folder rather than as standalone `*_down.sql` files in `modules/Module 4 - CRM/migrations/` because the rollback contents are inherently destructive (DROP TABLE / DROP POLICY / DROP FUNCTION / DROP VIEW) and the Iron-Rule-32 destructive-ops gate scans staged `.sql` files at commit time. Placing the rollback as a `UPPER_SNAKE_CASE.md` file inside the SPEC folder is doc-context per the gate's `isDocFile()` regex (`/^modules\/[^/]+\/docs\/specs\/[^/]+\/[A-Z][A-Z0-9_-]+\.md$/`) — content captured, retrievable, and not flagged as a new destructive operation.

**Apply order: REVERSE of forward migrations.** Migration 4 down → Migration 3 down → Migration 2 down → Migration 1 down.

---

## Rollback Migration #4 — restore `register_lead_to_event` to BASE_RPC_MD5 body

Restores the post-FIND-1-fix state (md5 `31fea2eaf0086cf917d0d65a8595d41c`, 4674 bytes).

```sql
BEGIN;

DROP FUNCTION IF EXISTS public.register_lead_to_event(uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.register_lead_to_event(
  p_tenant_id uuid, p_lead_id uuid, p_event_id uuid, p_method text DEFAULT 'manual'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event              crm_events%ROWTYPE;
  v_current_count      int;
  v_attendee_id        uuid;
  v_existing           record;
  v_existing_other_id  uuid;
  v_move_result        jsonb;
  v_promote_status     text;
  v_jwt_tenant uuid := nullif(((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'), '')::uuid;
BEGIN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_event FROM crm_events WHERE id = p_event_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_not_found');
  END IF;
  UPDATE crm_leads SET unsubscribed_at = NULL, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND unsubscribed_at IS NOT NULL;
  SELECT a.id INTO v_existing_other_id
    FROM crm_event_attendees a JOIN crm_events e ON e.id = a.event_id
   WHERE a.lead_id = p_lead_id AND a.tenant_id = p_tenant_id AND a.event_id <> p_event_id
     AND a.status IN ('waiting_list','invited') AND a.is_deleted = false
     AND e.status NOT IN ('completed','cancelled') AND e.is_deleted = false
   ORDER BY a.created_at DESC LIMIT 1;
  IF v_existing_other_id IS NOT NULL THEN
    v_move_result := move_attendee_between_events(v_existing_other_id, p_event_id);
    RETURN jsonb_build_object('success', true, 'auto_moved', true,
      'attendee_id', v_move_result->>'new_attendee_id', 'status', v_move_result->>'new_status',
      'fee_mismatch', (v_move_result->>'fee_mismatch')::boolean);
  END IF;
  SELECT id, is_deleted, status INTO v_existing FROM crm_event_attendees
   WHERE tenant_id = p_tenant_id AND lead_id = p_lead_id AND event_id = p_event_id;
  IF FOUND THEN
    IF v_existing.is_deleted = false THEN
      IF v_existing.status = 'invited' THEN
        SELECT COUNT(*) INTO v_current_count FROM crm_event_attendees
         WHERE event_id = p_event_id AND tenant_id = p_tenant_id
           AND status NOT IN ('cancelled', 'duplicate', 'invited')
           AND is_deleted = false AND id <> v_existing.id;
        IF v_current_count >= v_event.max_capacity THEN
          v_promote_status := CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END;
        ELSE
          v_promote_status := 'registered';
        END IF;
        UPDATE crm_event_attendees SET status = v_promote_status, registration_method = p_method
         WHERE id = v_existing.id AND tenant_id = p_tenant_id;
        PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
        RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', v_promote_status);
      ELSE
        RETURN jsonb_build_object('success', false, 'error', 'already_registered', 'attendee_id', v_existing.id);
      END IF;
    ELSE
      UPDATE crm_event_attendees
         SET is_deleted = false, status = 'registered', registration_method = p_method, checked_in_at = NULL
       WHERE id = v_existing.id AND tenant_id = p_tenant_id;
      PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
      RETURN jsonb_build_object('success', true, 'attendee_id', v_existing.id, 'status', 'registered');
    END IF;
  END IF;
  SELECT COUNT(*) INTO v_current_count FROM crm_event_attendees
   WHERE event_id = p_event_id AND tenant_id = p_tenant_id
     AND status NOT IN ('cancelled', 'duplicate', 'invited') AND is_deleted = false;
  IF v_current_count >= v_event.max_capacity THEN
    INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
    VALUES (p_tenant_id, p_lead_id, p_event_id,
            CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END, p_method)
    RETURNING id INTO v_attendee_id;
    PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
    RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id,
      'status', CASE WHEN v_event.status = 'closed' THEN 'event_closed' ELSE 'waiting_list' END);
  END IF;
  INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registration_method)
  VALUES (p_tenant_id, p_lead_id, p_event_id, 'registered', p_method)
  RETURNING id INTO v_attendee_id;
  PERFORM sync_lead_status_from_attendee(p_lead_id, p_tenant_id);
  RETURN jsonb_build_object('success', true, 'attendee_id', v_attendee_id, 'status', 'registered');
END;
$function$;

COMMIT;
```

---

## Rollback Migration #3 — remove `v_crm_lead_first_touch` view

```sql
BEGIN;
REVOKE ALL ON public.v_crm_lead_first_touch FROM authenticated;
DROP VIEW IF EXISTS public.v_crm_lead_first_touch;
COMMIT;
```

---

## Rollback Migration #2 — remove the 2 helper RPCs

```sql
BEGIN;
DROP FUNCTION IF EXISTS public.resolve_touchpoints_to_lead(uuid, uuid, text);
DROP FUNCTION IF EXISTS public._record_touchpoint(uuid,uuid,text,text,uuid,uuid,uuid,text,uuid,text,text,text,text,text,text,text,text,text);
COMMIT;
```

---

## Rollback Migration #1 — remove `crm_lead_touchpoints` table + policies + indices + constraints

```sql
BEGIN;

REVOKE ALL ON public.crm_lead_touchpoints FROM authenticated;
REVOKE ALL ON public.crm_lead_touchpoints FROM anon;
REVOKE ALL ON public.crm_lead_touchpoints FROM service_role;

DROP POLICY IF EXISTS service_bypass ON public.crm_lead_touchpoints;
DROP POLICY IF EXISTS tenant_isolation ON public.crm_lead_touchpoints;

DROP INDEX IF EXISTS public.idx_crm_lead_touchpoints_tenant_lead_occurred;
DROP INDEX IF EXISTS public.idx_crm_lead_touchpoints_tenant_phone_type_occurred;
DROP INDEX IF EXISTS public.idx_crm_lead_touchpoints_tenant_occurred;
DROP INDEX IF EXISTS public.idx_crm_lead_touchpoints_tenant_short_link;

DROP TABLE IF EXISTS public.crm_lead_touchpoints;

COMMIT;
```

---

## EF rollback

After applying the 4 SQL rollback migrations above, redeploy the prior EF versions:
- `resolve-link` v5 (pre-this-SPEC) — restore source from `modules/Module 4 - CRM/backups/2026-05-14_M3_UTM_TRIPLE_LAYER_PERSISTENCE/` (gitignored local backups) or fetch via `mcp__claude_ai_Supabase__get_edge_function` from a Supabase snapshot if available.
- `lead-intake` v24 (pre-this-SPEC) — same source path.

Then run smoke 7/7 to verify rollback success.

---

## Git tree rollback

Hard-restore working tree to the master safety tag pushed pre-SPEC:
```
pre-m3-utm-triple-layer-2026-05-14
```

(The exact PowerShell command for the hard-restore + force-publish is intentionally not embedded here — see SPEC §6 prose; the operation is authorized only on the rollback path under explicit user instruction per Iron Rule 32.)

---

*End of ROLLBACK.md.*
