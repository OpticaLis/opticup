-- M4_STATIC_SHORT_LINK_SELF_SERVE (Sprint 2 Item 4, 2026-05-21).
-- Mirrors what was applied via Supabase MCP apply_migration on 2026-05-21.
-- Self-serve creation of a static short_link (link_type='template_static').
-- Mirrors the M4_DEMO_STATIC_LINKS_BACKFILL pattern: 8-char hex code with
-- collision retry, expires 2099, all FK nullable columns NULL.

CREATE OR REPLACE FUNCTION public.crm_create_static_short_link(
  p_tenant_id uuid,
  p_target_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_code text;
  v_retries int := 0;
  v_new_id uuid;
  v_target_clean text;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'crm_create_static_short_link: tenant mismatch' USING ERRCODE = '42501';
  END IF;

  v_target_clean := btrim(coalesce(p_target_url, ''));
  IF length(v_target_clean) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'url_empty');
  END IF;
  IF v_target_clean !~* '^https?://[^[:space:]]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'url_invalid');
  END IF;
  IF length(v_target_clean) > 2048 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'url_too_long');
  END IF;

  LOOP
    v_code := substr(md5(random()::text || clock_timestamp()::text || p_target_url), 1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_code);
    v_retries := v_retries + 1;
    IF v_retries >= 8 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'code_collision_exhausted');
    END IF;
  END LOOP;

  INSERT INTO short_links (
    tenant_id, code, target_url, link_type, expires_at,
    lead_id, event_id, broadcast_id, message_log_id
  ) VALUES (
    p_tenant_id, v_code, v_target_clean, 'template_static',
    '2099-12-31 23:59:59+00'::timestamptz,
    NULL, NULL, NULL, NULL
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_new_id,
    'code', v_code,
    'target_url', v_target_clean,
    'short_path', '/r/' || v_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_create_static_short_link(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_create_static_short_link(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.crm_create_static_short_link(uuid, text) IS
  'M4_STATIC_SHORT_LINK_SELF_SERVE (Sprint 2 Item 4, 2026-05-21). '
  'Operator-facing creation of a template_static short_link with unique code, '
  'URL validation, 2099 expiry. Returns {ok, code, short_path} on success.';
