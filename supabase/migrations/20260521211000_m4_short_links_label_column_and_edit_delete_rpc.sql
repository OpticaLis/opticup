-- M4_STATIC_SHORT_LINKS_EDIT_DELETE_AND_LABEL (Sprint 3 Item 5, 2026-05-21).
-- 1. Add nullable label column to short_links (persisted from create UI).
-- 2. Update crm_create_static_short_link RPC to accept + persist optional label.
-- 3. Add crm_update_static_short_link RPC (edit target_url + label).
-- 4. Add crm_delete_static_short_link RPC (hard-delete, scoped to template_static type).

-- --- 1. Label column ---
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS label text NULL;

COMMENT ON COLUMN public.short_links.label IS
  'Operator-facing nickname for self-serve static short links (link_type=template_static). NULL for system-generated rows.';

-- --- 2. Extend create RPC to persist label ---
CREATE OR REPLACE FUNCTION public.crm_create_static_short_link(
  p_tenant_id uuid,
  p_target_url text,
  p_label text DEFAULT NULL
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
  v_label_clean text;
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
  IF length(v_target_clean) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'url_empty'); END IF;
  IF v_target_clean !~* '^https?://[^[:space:]]+$' THEN RETURN jsonb_build_object('ok', false, 'error', 'url_invalid'); END IF;
  IF length(v_target_clean) > 2048 THEN RETURN jsonb_build_object('ok', false, 'error', 'url_too_long'); END IF;
  v_label_clean := NULLIF(btrim(coalesce(p_label, '')), '');

  LOOP
    v_code := substr(md5(random()::text || clock_timestamp()::text || p_target_url), 1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_code);
    v_retries := v_retries + 1;
    IF v_retries >= 8 THEN RETURN jsonb_build_object('ok', false, 'error', 'code_collision_exhausted'); END IF;
  END LOOP;

  INSERT INTO short_links (
    tenant_id, code, target_url, link_type, expires_at,
    lead_id, event_id, broadcast_id, message_log_id, label
  ) VALUES (
    p_tenant_id, v_code, v_target_clean, 'template_static',
    '2099-12-31 23:59:59+00'::timestamptz,
    NULL, NULL, NULL, NULL, v_label_clean
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_new_id, 'code', v_code,
    'target_url', v_target_clean, 'short_path', '/r/' || v_code,
    'label', v_label_clean
  );
END;
$$;
REVOKE ALL ON FUNCTION public.crm_create_static_short_link(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_create_static_short_link(uuid, text, text) TO authenticated, service_role;

-- --- 3. Edit RPC ---
CREATE OR REPLACE FUNCTION public.crm_update_static_short_link(
  p_tenant_id uuid,
  p_link_id uuid,
  p_target_url text,
  p_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_target_clean text;
  v_label_clean text;
  v_existing record;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'crm_update_static_short_link: tenant mismatch' USING ERRCODE = '42501';
  END IF;
  v_target_clean := btrim(coalesce(p_target_url, ''));
  IF length(v_target_clean) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'url_empty'); END IF;
  IF v_target_clean !~* '^https?://[^[:space:]]+$' THEN RETURN jsonb_build_object('ok', false, 'error', 'url_invalid'); END IF;
  IF length(v_target_clean) > 2048 THEN RETURN jsonb_build_object('ok', false, 'error', 'url_too_long'); END IF;
  v_label_clean := NULLIF(btrim(coalesce(p_label, '')), '');

  SELECT id, link_type INTO v_existing FROM short_links
    WHERE id = p_link_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_existing.link_type <> 'template_static' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_link_type_only_template_static_editable');
  END IF;

  UPDATE short_links
     SET target_url = v_target_clean, label = v_label_clean
   WHERE id = p_link_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'id', p_link_id, 'target_url', v_target_clean, 'label', v_label_clean);
END;
$$;
REVOKE ALL ON FUNCTION public.crm_update_static_short_link(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_update_static_short_link(uuid, uuid, text, text) TO authenticated, service_role;

-- --- 4. Delete RPC (hard delete; scoped to template_static type) ---
CREATE OR REPLACE FUNCTION public.crm_delete_static_short_link(
  p_tenant_id uuid,
  p_link_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_jwt_tenant uuid;
  v_existing record;
  v_clicks_deleted int := 0;
BEGIN
  BEGIN
    v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'crm_delete_static_short_link: tenant mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT id, link_type INTO v_existing FROM short_links
    WHERE id = p_link_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_existing.link_type <> 'template_static' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_link_type_only_template_static_deletable');
  END IF;

  -- Children: short_link_clicks
  DELETE FROM short_link_clicks WHERE short_link_id = p_link_id;
  GET DIAGNOSTICS v_clicks_deleted = ROW_COUNT;

  DELETE FROM short_links WHERE id = p_link_id AND tenant_id = p_tenant_id;
  RETURN jsonb_build_object('ok', true, 'id', p_link_id, 'clicks_deleted', v_clicks_deleted);
END;
$$;
REVOKE ALL ON FUNCTION public.crm_delete_static_short_link(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_delete_static_short_link(uuid, uuid) TO authenticated, service_role;
