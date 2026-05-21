-- M4_QUEUE_INSERT_ON_CONFLICT (2026-05-21) — atomic enqueue with ON CONFLICT DO NOTHING.
-- See modules/Module 4 - CRM/docs/specs/M4_QUEUE_INSERT_ON_CONFLICT/SPEC.md §9 for rationale.
-- This file mirrors what was applied to the live DB via Supabase MCP apply_migration
-- on 2026-05-21 (migration version 20260521142649).

CREATE OR REPLACE FUNCTION public.enqueue_crm_messages_idempotent(
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_inserted   int := 0;
  v_total      int;
  v_errors     int := 0;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN jsonb_build_object('inserted', 0, 'conflicted', 0, 'errors', 1, 'error_message', 'p_rows_not_array');
  END IF;
  v_total := jsonb_array_length(p_rows);
  IF v_total = 0 THEN
    RETURN jsonb_build_object('inserted', 0, 'conflicted', 0, 'errors', 0);
  END IF;

  IF v_jwt_tenant IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_rows) r
      WHERE (r->>'tenant_id')::uuid IS DISTINCT FROM v_jwt_tenant
    ) THEN
      RAISE EXCEPTION 'enqueue_crm_messages_idempotent: row tenant_id mismatch'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  v_errors := (
    SELECT count(*) FROM jsonb_array_elements(p_rows) r
    WHERE r->>'run_id' IS NULL OR r->>'template_slug' IS NULL
  );
  IF v_errors > 0 THEN
    RETURN jsonb_build_object(
      'inserted', 0, 'conflicted', 0, 'errors', v_errors,
      'error_message', 'rows_missing_run_id_or_template_slug'
    );
  END IF;

  WITH ins AS (
    INSERT INTO public.crm_message_queue (
      tenant_id, event_id, lead_id, run_id, channel, template_slug,
      variables, language, status, scheduled_at, created_at, broadcast_id
    )
    SELECT
      (r->>'tenant_id')::uuid,
      NULLIF(r->>'event_id','')::uuid,
      (r->>'lead_id')::uuid,
      (r->>'run_id')::uuid,
      r->>'channel',
      r->>'template_slug',
      COALESCE(r->'variables', '{}'::jsonb),
      COALESCE(r->>'language', 'he'),
      COALESCE(r->>'status', 'queued'),
      COALESCE((r->>'scheduled_at')::timestamptz, now()),
      now(),
      NULLIF(r->>'broadcast_id','')::uuid
    FROM jsonb_array_elements(p_rows) r
    ON CONFLICT (tenant_id, run_id, lead_id, template_slug, channel)
       WHERE (run_id IS NOT NULL AND template_slug IS NOT NULL
              AND status = ANY (ARRAY['queued','processing','sent']))
       DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'conflicted', v_total - v_inserted,
    'errors', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_crm_messages_idempotent(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_crm_messages_idempotent(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.enqueue_crm_messages_idempotent(jsonb) IS
  'M4_QUEUE_INSERT_ON_CONFLICT (2026-05-21). Idempotent INSERT into crm_message_queue '
  'via ON CONFLICT DO NOTHING against the partial unique index uq_crm_message_queue_idem.';
