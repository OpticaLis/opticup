-- =====================================================================
-- M4_FAILED_MESSAGE_BADGE_CLEANUP — Migration 01
-- Adds the acknowledge mechanism for failed-message badges.
-- Authored: 2026-05-15
-- Spec: modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/SPEC.md
--
-- All changes are additive (3 NULL-able columns, 1 partial index, 1 new RPC,
-- per-tenant permission inserts + role grants). Safe to re-run (idempotent
-- via IF NOT EXISTS + ON CONFLICT DO NOTHING).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Schema additions on crm_message_log
-- ---------------------------------------------------------------------
ALTER TABLE public.crm_message_log
  ADD COLUMN IF NOT EXISTS acknowledged_at  timestamptz NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_by  uuid        NULL REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS acknowledged_reason text     NULL;

COMMENT ON COLUMN public.crm_message_log.acknowledged_at IS
  'When a staff member acknowledged this failed-message row (badge cleared). NULL = active failure visible in chip + badge. Set via RPC acknowledge_failed_messages.';
COMMENT ON COLUMN public.crm_message_log.acknowledged_by IS
  'employees.id of the staff member who acknowledged the row. NULL for system-initiated historical batches.';
COMMENT ON COLUMN public.crm_message_log.acknowledged_reason IS
  'Optional free-text note attached to the acknowledgement.';

-- ---------------------------------------------------------------------
-- 2) Partial composite index for the badge query
--    (tenant_id, acknowledged_at) — supports the WHERE acknowledged_at IS NULL filter
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_message_log_ack
  ON public.crm_message_log (tenant_id, acknowledged_at);

-- ---------------------------------------------------------------------
-- 3) RPC: acknowledge_failed_messages
--    Canonical JWT-claim tenant isolation (Iron Rule 15).
--    SET search_path = 'public' (SECURITY_HOTFIX_2026_05_13 hardening).
--    Idempotent — UPDATE only rows where acknowledged_at IS NULL.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledge_failed_messages(
  p_message_log_ids uuid[],
  p_reason          text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id   uuid;
  v_employee_id uuid;
  v_input_count int;
  v_updated     int;
  v_cross       uuid[];
  v_skipped     int;
  v_errors      jsonb;
BEGIN
  -- Extract JWT claims (canonical pattern, Iron Rule 15)
  v_tenant_id := (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid;
  v_employee_id := NULLIF((((current_setting('request.jwt.claims', true))::json ->> 'employee_id')), '')::uuid;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'updated_count', 0,
      'skipped_count', 0,
      'errors', jsonb_build_array(jsonb_build_object('code', 'no_tenant_in_jwt'))
    );
  END IF;

  v_input_count := COALESCE(array_length(p_message_log_ids, 1), 0);
  IF v_input_count = 0 THEN
    RETURN jsonb_build_object('updated_count', 0, 'skipped_count', 0, 'errors', '[]'::jsonb);
  END IF;

  -- Identify cross-tenant log_ids before touching anything
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_cross
    FROM public.crm_message_log
    WHERE id = ANY (p_message_log_ids)
      AND tenant_id <> v_tenant_id;

  -- UPDATE only rows that:
  --   (a) belong to caller's tenant,
  --   (b) are still unacknowledged (idempotent — re-running is a no-op),
  --   (c) are in the caller-supplied list.
  WITH upd AS (
    UPDATE public.crm_message_log
       SET acknowledged_at     = now(),
           acknowledged_by     = v_employee_id,
           acknowledged_reason = p_reason
     WHERE tenant_id = v_tenant_id
       AND id = ANY (p_message_log_ids)
       AND acknowledged_at IS NULL
     RETURNING id
  )
  SELECT COUNT(*) INTO v_updated FROM upd;

  -- Skipped = (input count) − (updated) − (cross-tenant)
  -- Rows that were already acknowledged, or rows that don't exist at all,
  -- count as skipped (idempotent + permissive).
  v_skipped := GREATEST(0, v_input_count - v_updated - COALESCE(array_length(v_cross, 1), 0));

  -- Build errors array for cross-tenant rejections
  SELECT COALESCE(jsonb_agg(jsonb_build_object('log_id', x, 'code', 'cross_tenant')), '[]'::jsonb)
    INTO v_errors
    FROM unnest(v_cross) AS x;

  RETURN jsonb_build_object(
    'updated_count', v_updated,
    'skipped_count', v_skipped,
    'errors', v_errors
  );
END;
$$;

-- Grant EXECUTE to authenticated (staff) — anon does not need this.
REVOKE ALL ON FUNCTION public.acknowledge_failed_messages(uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acknowledge_failed_messages(uuid[], text) TO authenticated;

COMMENT ON FUNCTION public.acknowledge_failed_messages(uuid[], text) IS
  'M4_FAILED_MESSAGE_BADGE_CLEANUP 2026-05-15. Marks failed-message rows as acknowledged (clears the ⚠️ badge + chip count). Canonical JWT-claim tenant isolation. Idempotent. Returns {updated_count, skipped_count, errors}.';

-- ---------------------------------------------------------------------
-- 4) Permission key (per-tenant), granted to all 5 default roles per tenant
-- ---------------------------------------------------------------------
INSERT INTO public.permissions (id, module, action, name_he, description, tenant_id, created_at)
SELECT 'crm.message_log.acknowledge', 'crm', 'acknowledge',
       'סימון הודעות כושלות כמטופלות',
       'מאפשר לסמן הודעות כושלות בכרטיס הליד כמטופלות; הסימון ⚠️ ייעלם, ההודעה תישאר בהיסטוריה עם תווית "מטופל".',
       t.id,
       now()
  FROM public.tenants t
  WHERE t.id IN (
    '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',  -- Prizma
    '8d8cfa7e-ef58-49af-9702-a862d459cccb'   -- Demo
  )
  ON CONFLICT (id, tenant_id) DO NOTHING;

-- Grant to all 5 default roles in both tenants (10 grants total)
INSERT INTO public.role_permissions (role_id, permission_id, granted, tenant_id)
SELECT r.id, 'crm.message_log.acknowledge', true, r.tenant_id
  FROM public.roles r
  WHERE r.tenant_id IN (
    '6ad0781b-37f0-47a9-92e3-be9ed1477e1c',
    '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  )
  ON CONFLICT (role_id, permission_id, tenant_id) DO NOTHING;

-- =====================================================================
-- End of Migration 01.
-- =====================================================================
