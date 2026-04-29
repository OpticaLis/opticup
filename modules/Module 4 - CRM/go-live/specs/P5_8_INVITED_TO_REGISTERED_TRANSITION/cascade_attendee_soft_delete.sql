-- P5_8 Fix B — cascade attendee soft-delete on lead soft-delete.
-- Applied 2026-04-29.
--
-- When crm_leads.is_deleted flips from false to true, all matching
-- crm_event_attendees rows (lead_id, tenant_id, is_deleted=false) get
-- is_deleted=true. Tenant-scoped (defense-in-depth even though lead_id
-- alone would suffice). Status preserved (audit trail).
--
-- Idempotent: only fires on the false→true transition. UPDATEs that don't
-- change is_deleted (e.g. renaming a lead, status changes on a lead that's
-- already soft-deleted) do not re-touch attendees.
--
-- Why: orphan attendees (lead soft-deleted, attendee not) pollute capacity
-- counts in register_lead_to_event's v_current_count check (which counts
-- all is_deleted=false attendees regardless of lead state). On a 50-cap
-- event, even 2 orphans silently steal seats.
--
-- Backfill at the end: 2 known orphans on V4 Edge volume from the 2026-04-29
-- QA churn (f314d1f7, 1b4a4f13). The trigger does NOT auto-cascade to
-- pre-existing orphans (it only fires on UPDATE), so an explicit one-shot
-- UPDATE catches them. Zero-orphans audit confirms post-backfill.

CREATE OR REPLACE FUNCTION public.cascade_attendee_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE crm_event_attendees
     SET is_deleted = true
   WHERE lead_id = NEW.id
     AND tenant_id = NEW.tenant_id
     AND is_deleted = false;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS crm_leads_cascade_attendee_soft_delete_trg ON public.crm_leads;

CREATE TRIGGER crm_leads_cascade_attendee_soft_delete_trg
AFTER UPDATE OF is_deleted ON public.crm_leads
FOR EACH ROW
WHEN (OLD.is_deleted = false AND NEW.is_deleted = true)
EXECUTE FUNCTION public.cascade_attendee_soft_delete();

-- Backfill: the 2 known orphans on V4 Edge volume (Prizma) created during
-- 2026-04-29 QA when leads were soft-deleted but attendee rows weren't
-- cascaded. The broader zero-orphans audit (Fix B6) covers the general
-- case across both tenants.
UPDATE crm_event_attendees
   SET is_deleted = true
 WHERE id IN (
   'f314d1f7-5498-444c-ace5-bf251c1b2f4d',
   '1b4a4f13-66e3-4311-985f-54a95e3b4e83'
 )
   AND is_deleted = false;

-- Bulk backfill: any remaining orphan (attendee.is_deleted=false where
-- lead.is_deleted=true) gets caught here. Tenant-scoped via the JOIN.
UPDATE crm_event_attendees a
   SET is_deleted = true
  FROM crm_leads l
 WHERE a.lead_id = l.id
   AND a.tenant_id = l.tenant_id
   AND l.is_deleted = true
   AND a.is_deleted = false;
