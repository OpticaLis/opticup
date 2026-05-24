-- M4_SHORT_LINKS_CHANNEL_DASHBOARD Phase A: channel-aware short link creation RPC.
-- Creates links with convention-compliant codes (E-prefix=email, S-prefix=SMS).
-- Companion to existing crm_create_static_short_link (which is kept for backward compat).

CREATE OR REPLACE FUNCTION public.crm_create_channeled_short_link(
  p_tenant_id uuid,
  p_target_url text,
  p_label_prefix text,
  p_channel text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_jwt_tenant uuid;
  v_code text;
  v_retries int := 0;
  v_new_id uuid;
  v_target_clean text;
  v_label_prefix_clean text;
  v_channel_letter text;
  v_label text;
BEGIN
  -- JWT tenant check (same pattern as crm_create_static_short_link)
  BEGIN v_jwt_tenant := (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN v_jwt_tenant := NULL;
  END;
  IF v_jwt_tenant IS NOT NULL AND v_jwt_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  -- Validate channel
  IF p_channel NOT IN ('sms', 'email') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_channel');
  END IF;
  v_channel_letter := CASE p_channel WHEN 'sms' THEN 'S' WHEN 'email' THEN 'E' END;

  -- Validate URL
  v_target_clean := btrim(coalesce(p_target_url, ''));
  IF length(v_target_clean) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'url_empty'); END IF;
  IF v_target_clean !~* '^https?://[^[:space:]]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'url_invalid');
  END IF;
  IF length(v_target_clean) > 2048 THEN RETURN jsonb_build_object('ok', false, 'error', 'url_too_long'); END IF;

  -- Validate + build label
  v_label_prefix_clean := NULLIF(btrim(coalesce(p_label_prefix, '')), '');
  IF v_label_prefix_clean IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'label_prefix_required');
  END IF;
  v_label := v_label_prefix_clean || '_' || p_channel;

  -- Generate channel-prefixed code with collision check
  LOOP
    v_code := v_channel_letter || substr(md5(random()::text || clock_timestamp()::text || p_target_url), 1, 7);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_code);
    v_retries := v_retries + 1;
    IF v_retries >= 8 THEN RETURN jsonb_build_object('ok', false, 'error', 'code_collision_exhausted'); END IF;
  END LOOP;

  INSERT INTO short_links (
    tenant_id, code, target_url, link_type, expires_at,
    lead_id, event_id, broadcast_id, message_log_id, label
  )
  VALUES (
    p_tenant_id, v_code, v_target_clean, 'template_static',
    '2099-12-31 23:59:59+00'::timestamptz, NULL, NULL, NULL, NULL, v_label
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'id', v_new_id, 'code', v_code,
    'target_url', v_target_clean, 'short_path', '/r/' || v_code, 'label', v_label);
END; $$;

REVOKE ALL ON FUNCTION public.crm_create_channeled_short_link(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_create_channeled_short_link(uuid, text, text, text) TO authenticated, service_role;
