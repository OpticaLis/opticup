-- Migration: m4_capi_purchase_events
-- Module 4 CRM — M4_FB_CAPI_PURCHASE_EVENTS SPEC (2026-05-19)
-- Extends Facebook CAPI from Lead-only to full funnel:
--   CompleteRegistration (AFTER INSERT on crm_event_attendees)
--   EventAttended (AFTER UPDATE OF status to 'attended')
--   Purchase (AFTER UPDATE OF purchase_amount from NULL/0 to >0, per Daniel Option B)
-- Daniel-approved: D-AUTH-1 (purchase_amount signal), D-AUTH-2 (event_name reuse),
--                  D-AUTH-3 (3 triggers), D-AUTH-4 (uuid_generate_v5), D-AUTH-5 (1 destructive op).
-- Forward-only: 84 existing Prizma rows with purchase_amount>0 are NOT backfilled (D-AUTH-1 / D7).
-- Rollback recipe: see SPEC.md §9 (apply a reverse migration via apply_migration).

-- ============================================================
-- STEP 1: Constraint swap (the 1 declared destructive op per Iron Rule 32 / D-AUTH-5)
-- Replaces UNIQUE(tenant_id, lead_id) with UNIQUE(tenant_id, lead_id, event_name)
-- so multiple event types per lead can coexist without conflict.
-- Pre-verified: all 33 existing queue rows have event_name='Lead' and
-- (tenant_id, lead_id) was already unique — new constraint won't conflict.
-- ============================================================

ALTER TABLE public.crm_capi_dispatch_queue
  DROP CONSTRAINT crm_capi_dispatch_queue_tenant_lead_unique;

ALTER TABLE public.crm_capi_dispatch_queue
  ADD CONSTRAINT crm_capi_dispatch_queue_tenant_lead_event_unique
  UNIQUE (tenant_id, lead_id, event_name);

-- ============================================================
-- STEP 2: Trigger function 1 — CompleteRegistration (AFTER INSERT on crm_event_attendees)
-- Enqueues once per lead (idempotent via ON CONFLICT DO NOTHING on new constraint).
-- ============================================================

CREATE OR REPLACE FUNCTION public.capi_enqueue_complete_registration_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Forward-only; INSERT trigger context implies a fresh attendee row.
  INSERT INTO public.crm_capi_dispatch_queue (
    tenant_id, lead_id, event_id, event_name, status
  ) VALUES (
    NEW.tenant_id,
    NEW.lead_id,
    public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'CompleteRegistration'),
    'CompleteRegistration',
    'queued'
  )
  ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  RETURN NEW;
END $$;

-- ============================================================
-- STEP 3: Trigger function 2 — EventAttended (AFTER UPDATE OF status)
-- Fires only on real transition INTO 'attended'. Idempotent via ON CONFLICT.
-- ============================================================

CREATE OR REPLACE FUNCTION public.capi_enqueue_event_attended_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire on a real transition INTO 'attended'.
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'attended' THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'EventAttended'),
      'EventAttended',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================
-- STEP 4: Trigger function 3 — Purchase (AFTER UPDATE OF purchase_amount)
-- Daniel-decision (Option B, 2026-05-19): fire only on purchase_amount transition NULL/0 to >0.
-- Refund-direction (anything to 0): out of scope. Typo correction (>0 to other >0): out of scope.
-- ============================================================

CREATE OR REPLACE FUNCTION public.capi_enqueue_purchase_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Daniel-decision (Option B, 2026-05-19): fire only on purchase_amount transition NULL/0 to >0.
  -- Refund-direction (anything to 0): out of scope. Typo correction (>0 to other >0): out of scope.
  IF (OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0)
     AND NEW.purchase_amount IS NOT NULL
     AND NEW.purchase_amount > 0 THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      public.uuid_generate_v5(public.uuid_ns_oid(), NEW.lead_id::text || ':' || 'Purchase'),
      'Purchase',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================
-- STEP 5: Triggers — one per event type
-- ============================================================

CREATE TRIGGER trg_capi_attendee_registered
AFTER INSERT ON public.crm_event_attendees
FOR EACH ROW EXECUTE FUNCTION public.capi_enqueue_complete_registration_fn();

CREATE TRIGGER trg_capi_attendee_attended
AFTER UPDATE OF status ON public.crm_event_attendees
FOR EACH ROW EXECUTE FUNCTION public.capi_enqueue_event_attended_fn();

CREATE TRIGGER trg_capi_attendee_purchased
AFTER UPDATE OF purchase_amount ON public.crm_event_attendees
FOR EACH ROW EXECUTE FUNCTION public.capi_enqueue_purchase_fn();
