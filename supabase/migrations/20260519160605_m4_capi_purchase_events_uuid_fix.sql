-- M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX — P0 hotfix for parent SPEC M4_FB_CAPI_PURCHASE_EVENTS
-- Root cause: uuid-ossp extension functions live in schema `extensions` (Supabase convention),
-- not `public`. The parent SPEC's trigger functions referenced `public.uuid_generate_v5(...)`,
-- causing SQLSTATE 42883 on every crm_event_attendees INSERT/UPDATE.
-- Fix: schema-qualify all 6 uuid-ossp call sites to `extensions.` across the 3 trigger functions.
-- Cross-refs: modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/SPEC.md
--             modules/Module 4 - CRM/escalations/2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md

CREATE OR REPLACE FUNCTION public.capi_enqueue_complete_registration_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.crm_capi_dispatch_queue (
    tenant_id, lead_id, event_id, event_name, status
  ) VALUES (
    NEW.tenant_id,
    NEW.lead_id,
    extensions.uuid_generate_v5(extensions.uuid_ns_oid(), NEW.lead_id::text || ':' || 'CompleteRegistration'),
    'CompleteRegistration',
    'queued'
  )
  ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.capi_enqueue_event_attended_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'attended' THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      extensions.uuid_generate_v5(extensions.uuid_ns_oid(), NEW.lead_id::text || ':' || 'EventAttended'),
      'EventAttended',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.capi_enqueue_purchase_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.purchase_amount IS NULL OR OLD.purchase_amount = 0)
     AND NEW.purchase_amount IS NOT NULL
     AND NEW.purchase_amount > 0 THEN
    INSERT INTO public.crm_capi_dispatch_queue (
      tenant_id, lead_id, event_id, event_name, status
    ) VALUES (
      NEW.tenant_id,
      NEW.lead_id,
      extensions.uuid_generate_v5(extensions.uuid_ns_oid(), NEW.lead_id::text || ':' || 'Purchase'),
      'Purchase',
      'queued'
    )
    ON CONFLICT (tenant_id, lead_id, event_name) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
