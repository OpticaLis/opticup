-- SPEC: M4_WAITLIST_SYNC_PRIORITY_FIX §3.3 (Brief Decision #3)
-- Applied live: 2026-05-14 (UTC version 20260513122446)
-- Adds an AFTER UPDATE OF status trigger on crm_events that recycles leads whose
-- attendee row on the closing event has status IN ('invited','attended') AND
-- is_deleted=false back to lead.status='waiting' on the Tier 2 board.
--
-- Out of scope (Brief Decision #4): attendee statuses NOT in {invited, attended}
-- on the closing event are NOT touched. Their lead.status is governed by the
-- existing sync rules (the §3.1-patched RPC).
--
-- Trigger fires only on transition INTO ('closed','completed') from outside that
-- set, so noop UPDATEs and lateral transitions don't refire it.
-- SECURITY DEFINER because the trigger may run under any auth context that can
-- update crm_events; we need the function to perform a controlled UPDATE on
-- crm_leads scoped to the SAME tenant_id as the event.
-- Iron Rule 22 (defense-in-depth): tenant_id filter on the inner UPDATE.

CREATE OR REPLACE FUNCTION public.event_status_close_recycle_leads_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status IN ('closed','completed')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND COALESCE(OLD.status, '') NOT IN ('closed','completed')
  THEN
    UPDATE public.crm_leads l
       SET status = 'waiting',
           updated_at = now()
     WHERE l.tenant_id = NEW.tenant_id
       AND l.is_deleted = false
       AND l.status NOT IN ('not_interested','unsubscribed','waiting')
       AND EXISTS (
         SELECT 1
           FROM public.crm_event_attendees a
          WHERE a.lead_id = l.id
            AND a.tenant_id = NEW.tenant_id
            AND a.event_id = NEW.id
            AND a.is_deleted = false
            AND a.status IN ('invited','attended')
       );
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_event_status_close_recycle_leads ON public.crm_events;

CREATE TRIGGER trg_event_status_close_recycle_leads
AFTER UPDATE OF status ON public.crm_events
FOR EACH ROW
EXECUTE FUNCTION public.event_status_close_recycle_leads_fn();
