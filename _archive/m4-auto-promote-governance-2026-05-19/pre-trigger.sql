-- Rollback reference — promote_lead_on_message_sent state BEFORE M4_AUTO_PROMOTE_GOVERNANCE.
-- Captured via pg_get_functiondef on 2026-05-19T10:35Z.
CREATE OR REPLACE FUNCTION public.promote_lead_on_message_sent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only act on transitions INTO 'sent' (not at INSERT time, and not on
  -- terminal failed/rejected).
  IF NEW.status <> 'sent' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'sent' THEN
    -- Already sent in a prior tick — no double-promotion.
    RETURN NEW;
  END IF;
  IF NEW.lead_id IS NULL OR NEW.event_id IS NULL THEN
    -- Promotion only relevant for event-bound messages.
    RETURN NEW;
  END IF;

  UPDATE crm_leads
  SET status = 'invited', updated_at = NOW()
  WHERE id = NEW.lead_id
    AND tenant_id = NEW.tenant_id
    AND status = 'waiting';

  RETURN NEW;
END;
$function$
;
